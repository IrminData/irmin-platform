package embeddings

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"math"
	"os"
	"strings"
)

// SearchResult represents a single search result from vector similarity search.
type SearchResult struct {
	ID          string            `json:"id"`
	SourceFile  string            `json:"source_file"`
	ChunkIndex  int               `json:"chunk_index"`
	Content     string            `json:"content"`
	ContentHash string            `json:"content_hash"`
	Score       float64           `json:"score"`
	Distance    float64           `json:"distance"`
	Metadata    map[string]string `json:"metadata"`
	Priority    float32           `json:"priority"`
}

// SearchSimilar performs vector similarity search on a parquet file containing embeddings.
// It uses DuckDB's vss extension for efficient vector search.
func (c *Client) SearchSimilar(
	ctx context.Context,
	queryVector []float32,
	parquetPath string,
	topK int,
) ([]SearchResult, error) {
	if len(queryVector) == 0 {
		return nil, errors.New("query vector cannot be empty")
	}
	if parquetPath == "" {
		return nil, errors.New("parquet path cannot be empty")
	}
	if topK <= 0 {
		topK = 5 // Default to top 5 results
	}

	c.logger.InfoContext(ctx, "performing vector similarity search",
		"parquet_path", parquetPath,
		"top_k", topK,
		"vector_dimensions", len(queryVector),
	)

	// Install and load the vss extension if not already loaded
	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, "INSTALL vss; LOAD vss;"); err != nil {
		c.logger.WarnContext(ctx, "vss extension may already be loaded or not available", "error", err)
	}

	// Check which optional columns exist in the parquet file for backward compatibility
	colInfo, err := c.getParquetColumnInfo(ctx, parquetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check parquet schema: %w", err)
	}

	// Convert query vector to DuckDB array format
	vectorStr := vectorToArrayString(queryVector)

	// Build the similarity search query using cosine distance
	// Use a subquery to compute distance once and derive score from it
	// Handle missing content_hash and priority columns for backward compatibility
	escapedPath := duckdb.EscapeSQLString(parquetPath)
	colExpr := buildColumnExpressions(colInfo)

	query := fmt.Sprintf(`
		SELECT
			id,
			source_file,
			chunk_index,
			content,
			%s as content_hash,
			CAST(metadata AS VARCHAR) as metadata,
			%s as priority,
			distance,
			(1 - distance) as score
		FROM (
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s
				%s
				metadata,
				array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
			FROM read_parquet('%s')
		)
		ORDER BY distance ASC
		LIMIT %d
	`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.innerContentHash, colExpr.innerPriority,
		len(queryVector), vectorStr, len(queryVector), escapedPath, topK)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil && isColumnNotFoundError(err) {
		// Retry with minimal schema: parquet lacks content_hash/priority
		colExpr = buildColumnExpressions(parquetColumnInfo{})
		query = fmt.Sprintf(`
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s as content_hash,
				CAST(metadata AS VARCHAR) as metadata,
				%s as priority,
				distance,
				(1 - distance) as score
			FROM (
				SELECT
					id,
					source_file,
					chunk_index,
					content,
					%s
					%s
					metadata,
					array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
				FROM read_parquet('%s')
			)
			ORDER BY distance ASC
			LIMIT %d
		`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.innerContentHash, colExpr.innerPriority,
			len(queryVector), vectorStr, len(queryVector), escapedPath, topK)
		rows, err = c.duckDBClient.ExecuteQuery(ctx, query)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to execute similarity search: %w", err)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var result SearchResult
		var metadataJSON string

		if scanErr := rows.Scan(
			&result.ID,
			&result.SourceFile,
			&result.ChunkIndex,
			&result.Content,
			&result.ContentHash,
			&metadataJSON,
			&result.Priority,
			&result.Distance,
			&result.Score,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan result: %w", scanErr)
		}

		// Parse metadata if present
		result.Metadata = make(map[string]string)
		if metadataJSON != "" && metadataJSON != "{}" {
			// Simple parsing for string:string maps
			parseMetadataJSON(metadataJSON, result.Metadata)
		}

		results = append(results, result)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating results: %w", rowsErr)
	}

	c.logger.InfoContext(ctx, "similarity search completed",
		"results_count", len(results),
	)

	return results, nil
}

// SearchByText performs vector similarity search using a text query.
// It first generates an embedding for the query text, then searches.
func (c *Client) SearchByText(
	ctx context.Context,
	queryText string,
	parquetPath string,
	topK int,
	config EmbeddingConfig,
) ([]SearchResult, error) {
	if queryText == "" {
		return nil, errors.New("query text cannot be empty")
	}

	// Generate embedding for the query text
	queryVector, err := c.CreateEmbeddingForQuery(ctx, queryText, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create query embedding: %w", err)
	}

	// Perform vector search
	return c.SearchSimilar(ctx, queryVector, parquetPath, topK)
}

// SearchSimilarFromBytes performs vector similarity search on parquet content provided as bytes.
func (c *Client) SearchSimilarFromBytes(
	ctx context.Context,
	queryVector []float32,
	parquetContent []byte,
	topK int,
) ([]SearchResult, error) {
	if len(parquetContent) == 0 {
		return nil, errors.New("parquet content cannot be empty")
	}

	// Write to a temporary file
	tempFile, err := os.CreateTemp("", "embed_search_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(parquetContent); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	return c.SearchSimilar(ctx, queryVector, tempFile.Name(), topK)
}

// SearchWithFilter performs vector similarity search with metadata filtering.
func (c *Client) SearchWithFilter(
	ctx context.Context,
	queryVector []float32,
	parquetPath string,
	topK int,
	filter map[string]string,
) ([]SearchResult, error) {
	if len(queryVector) == 0 {
		return nil, errors.New("query vector cannot be empty")
	}
	if parquetPath == "" {
		return nil, errors.New("parquet path cannot be empty")
	}
	if topK <= 0 {
		topK = 5
	}

	// Install and load the vss extension if not already loaded
	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, "INSTALL vss; LOAD vss;"); err != nil {
		c.logger.WarnContext(ctx, "vss extension may already be loaded", "error", err)
	}

	// Check which optional columns exist in the parquet file for backward compatibility
	colInfo, err := c.getParquetColumnInfo(ctx, parquetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check parquet schema: %w", err)
	}

	// Convert query vector to DuckDB array format
	vectorStr := vectorToArrayString(queryVector)

	// Build filter conditions
	var filterConditions []string
	for key, value := range filter {
		// Validate key to prevent JSON path injection
		// Only allow alphanumeric characters, underscores, and hyphens
		if !isValidMetadataKey(key) {
			return nil, fmt.Errorf("invalid metadata key: %s (only alphanumeric, underscore, and hyphen allowed)", key)
		}
		escapedValue := duckdb.EscapeSQLString(value)
		// Key is validated, safe to use directly in JSON path
		filterConditions = append(filterConditions,
			fmt.Sprintf("json_extract_string(metadata, '$.%s') = '%s'", key, escapedValue))
	}

	whereClause := ""
	if len(filterConditions) > 0 {
		whereClause = "WHERE " + strings.Join(filterConditions, " AND ")
	}

	escapedPath := duckdb.EscapeSQLString(parquetPath)
	// Use a subquery to compute distance once and derive score from it
	// Handle missing content_hash and priority columns for backward compatibility
	colExpr := buildColumnExpressions(colInfo)

	query := fmt.Sprintf(`
		SELECT
			id,
			source_file,
			chunk_index,
			content,
			%s as content_hash,
			CAST(metadata AS VARCHAR) as metadata,
			%s as priority,
			distance,
			(1 - distance) as score
		FROM (
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s
				%s
				metadata,
				array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
			FROM read_parquet('%s')
			%s
		)
		ORDER BY distance ASC
		LIMIT %d
	`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.innerContentHash, colExpr.innerPriority,
		len(queryVector), vectorStr, len(queryVector), escapedPath, whereClause, topK)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil && isColumnNotFoundError(err) {
		colExpr = buildColumnExpressions(parquetColumnInfo{})
		query = fmt.Sprintf(`
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s as content_hash,
				CAST(metadata AS VARCHAR) as metadata,
				%s as priority,
				distance,
				(1 - distance) as score
			FROM (
				SELECT
					id,
					source_file,
					chunk_index,
					content,
					%s
					%s
					metadata,
					array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
				FROM read_parquet('%s')
				%s
			)
			ORDER BY distance ASC
			LIMIT %d
		`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.innerContentHash, colExpr.innerPriority,
			len(queryVector), vectorStr, len(queryVector), escapedPath, whereClause, topK)
		rows, err = c.duckDBClient.ExecuteQuery(ctx, query)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to execute filtered search: %w", err)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var result SearchResult
		var metadataJSON string

		if scanErr := rows.Scan(
			&result.ID,
			&result.SourceFile,
			&result.ChunkIndex,
			&result.Content,
			&result.ContentHash,
			&metadataJSON,
			&result.Priority,
			&result.Distance,
			&result.Score,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan result: %w", scanErr)
		}

		result.Metadata = make(map[string]string)
		if metadataJSON != "" && metadataJSON != "{}" {
			parseMetadataJSON(metadataJSON, result.Metadata)
		}

		results = append(results, result)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating results: %w", rowsErr)
	}

	return results, nil
}

// SearchWithFilterFromBytes performs vector similarity search with metadata filtering on parquet content provided as bytes.
func (c *Client) SearchWithFilterFromBytes(
	ctx context.Context,
	queryVector []float32,
	parquetContent []byte,
	topK int,
	filter map[string]string,
) ([]SearchResult, error) {
	if len(parquetContent) == 0 {
		return nil, errors.New("parquet content cannot be empty")
	}

	// Write to a temporary file
	tempFile, err := os.CreateTemp("", "embed_search_filter_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(parquetContent); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	return c.SearchWithFilter(ctx, queryVector, tempFile.Name(), topK, filter)
}

// SearchWithPriority performs vector similarity search with priority weighting.
// The final score combines similarity score and priority: score * (1 + priority * priorityWeight).
// Higher priority embeddings are boosted in the results.
func (c *Client) SearchWithPriority(
	ctx context.Context,
	queryVector []float32,
	parquetPath string,
	topK int,
	priorityWeight float64,
) ([]SearchResult, error) {
	if len(queryVector) == 0 {
		return nil, errors.New("query vector cannot be empty")
	}
	if parquetPath == "" {
		return nil, errors.New("parquet path cannot be empty")
	}
	if topK <= 0 {
		topK = 5
	}
	if priorityWeight < 0 {
		priorityWeight = 0.5 // Default priority weight
	}

	c.logger.InfoContext(ctx, "performing priority-weighted similarity search",
		"parquet_path", parquetPath,
		"top_k", topK,
		"priority_weight", priorityWeight,
	)

	// Install and load the vss extension if not already loaded
	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, "INSTALL vss; LOAD vss;"); err != nil {
		c.logger.WarnContext(ctx, "vss extension may already be loaded", "error", err)
	}

	// Check which optional columns exist in the parquet file for backward compatibility
	colInfo, err := c.getParquetColumnInfo(ctx, parquetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check parquet schema: %w", err)
	}

	vectorStr := vectorToArrayString(queryVector)
	escapedPath := duckdb.EscapeSQLString(parquetPath)

	// Build expressions for optional columns
	colExpr := buildColumnExpressions(colInfo)

	// Compute weighted score: similarity_score * (1 + priority * weight)
	// This boosts higher-priority embeddings while maintaining similarity ordering
	query := fmt.Sprintf(`
		SELECT
			id,
			source_file,
			chunk_index,
			content,
			%s as content_hash,
			CAST(metadata AS VARCHAR) as metadata,
			%s as priority,
			distance,
			(1 - distance) as similarity_score,
			(1 - distance) * (1 + %s * %f) as weighted_score
		FROM (
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s
				%s
				metadata,
				array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
			FROM read_parquet('%s')
		)
		ORDER BY weighted_score DESC
		LIMIT %d
	`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.outerPriority, priorityWeight,
		colExpr.innerContentHash, colExpr.innerPriority,
		len(queryVector), vectorStr, len(queryVector), escapedPath, topK)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil && isColumnNotFoundError(err) {
		colExpr = buildColumnExpressions(parquetColumnInfo{})
		query = fmt.Sprintf(`
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s as content_hash,
				CAST(metadata AS VARCHAR) as metadata,
				%s as priority,
				distance,
				(1 - distance) as similarity_score,
				(1 - distance) * (1 + %s * %f) as weighted_score
			FROM (
				SELECT
					id,
					source_file,
					chunk_index,
					content,
					%s
					%s
					metadata,
					array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
				FROM read_parquet('%s')
			)
			ORDER BY weighted_score DESC
			LIMIT %d
		`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.outerPriority, priorityWeight,
			colExpr.innerContentHash, colExpr.innerPriority,
			len(queryVector), vectorStr, len(queryVector), escapedPath, topK)
		rows, err = c.duckDBClient.ExecuteQuery(ctx, query)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to execute priority-weighted search: %w", err)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var result SearchResult
		var metadataJSON string
		var weightedScore float64

		if scanErr := rows.Scan(
			&result.ID,
			&result.SourceFile,
			&result.ChunkIndex,
			&result.Content,
			&result.ContentHash,
			&metadataJSON,
			&result.Priority,
			&result.Distance,
			&result.Score, // similarity_score
			&weightedScore,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan result: %w", scanErr)
		}

		// Use weighted score as the final score, clamped to [0,1] to satisfy the API contract.
		// The weighted formula can exceed 1.0 (e.g. similarity=0.9, priority=1.0, weight=1.0 → 1.8),
		// but ordering is already handled by the SQL ORDER BY weighted_score DESC.
		result.Score = math.Max(math.Min(weightedScore, 1.0), 0.0)

		result.Metadata = make(map[string]string)
		if metadataJSON != "" && metadataJSON != "{}" {
			parseMetadataJSON(metadataJSON, result.Metadata)
		}

		results = append(results, result)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating results: %w", rowsErr)
	}

	c.logger.InfoContext(ctx, "priority-weighted search completed",
		"results_count", len(results),
	)

	return results, nil
}

// SearchWithFilterAndPriority performs vector similarity search with both metadata filtering and priority weighting.
// Rows are first filtered by metadata, then scored using: similarity * (1 + priority * priorityWeight).
//
//nolint:funlen // Amount of statements is reasonable for this function
func (c *Client) SearchWithFilterAndPriority(
	ctx context.Context,
	queryVector []float32,
	parquetPath string,
	topK int,
	filter map[string]string,
	priorityWeight float64,
) ([]SearchResult, error) {
	if len(queryVector) == 0 {
		return nil, errors.New("query vector cannot be empty")
	}
	if parquetPath == "" {
		return nil, errors.New("parquet path cannot be empty")
	}
	if topK <= 0 {
		topK = 5
	}
	if priorityWeight < 0 {
		priorityWeight = 0.5
	}

	c.logger.InfoContext(ctx, "performing filtered priority-weighted similarity search",
		"parquet_path", parquetPath,
		"top_k", topK,
		"priority_weight", priorityWeight,
		"filter_count", len(filter),
	)

	// Install and load the vss extension if not already loaded
	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, "INSTALL vss; LOAD vss;"); err != nil {
		c.logger.WarnContext(ctx, "vss extension may already be loaded", "error", err)
	}

	// Check which optional columns exist in the parquet file for backward compatibility
	colInfo, err := c.getParquetColumnInfo(ctx, parquetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to check parquet schema: %w", err)
	}

	vectorStr := vectorToArrayString(queryVector)

	// Build filter conditions
	var filterConditions []string
	for key, value := range filter {
		if !isValidMetadataKey(key) {
			return nil, fmt.Errorf("invalid metadata key: %s (only alphanumeric, underscore, and hyphen allowed)", key)
		}
		escapedValue := duckdb.EscapeSQLString(value)
		filterConditions = append(filterConditions,
			fmt.Sprintf("json_extract_string(metadata, '$.%s') = '%s'", key, escapedValue))
	}

	whereClause := ""
	if len(filterConditions) > 0 {
		whereClause = "WHERE " + strings.Join(filterConditions, " AND ")
	}

	escapedPath := duckdb.EscapeSQLString(parquetPath)
	colExpr := buildColumnExpressions(colInfo)

	// Compute weighted score: similarity_score * (1 + priority * weight)
	// This boosts higher-priority embeddings while maintaining similarity ordering
	query := fmt.Sprintf(`
		SELECT
			id,
			source_file,
			chunk_index,
			content,
			%s as content_hash,
			CAST(metadata AS VARCHAR) as metadata,
			%s as priority,
			distance,
			(1 - distance) as similarity_score,
			(1 - distance) * (1 + %s * %f) as weighted_score
		FROM (
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s
				%s
				metadata,
				array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
			FROM read_parquet('%s')
			%s
		)
		ORDER BY weighted_score DESC
		LIMIT %d
	`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.outerPriority, priorityWeight,
		colExpr.innerContentHash, colExpr.innerPriority,
		len(queryVector), vectorStr, len(queryVector), escapedPath, whereClause, topK)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil && isColumnNotFoundError(err) {
		colExpr = buildColumnExpressions(parquetColumnInfo{})
		query = fmt.Sprintf(`
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				%s as content_hash,
				CAST(metadata AS VARCHAR) as metadata,
				%s as priority,
				distance,
				(1 - distance) as similarity_score,
				(1 - distance) * (1 + %s * %f) as weighted_score
			FROM (
				SELECT
					id,
					source_file,
					chunk_index,
					content,
					%s
					%s
					metadata,
					array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
				FROM read_parquet('%s')
				%s
			)
			ORDER BY weighted_score DESC
			LIMIT %d
		`, colExpr.outerContentHash, colExpr.outerPriority, colExpr.outerPriority, priorityWeight,
			colExpr.innerContentHash, colExpr.innerPriority,
			len(queryVector), vectorStr, len(queryVector), escapedPath, whereClause, topK)
		rows, err = c.duckDBClient.ExecuteQuery(ctx, query)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to execute filtered priority-weighted search: %w", err)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var result SearchResult
		var metadataJSON string
		var weightedScore float64

		if scanErr := rows.Scan(
			&result.ID,
			&result.SourceFile,
			&result.ChunkIndex,
			&result.Content,
			&result.ContentHash,
			&metadataJSON,
			&result.Priority,
			&result.Distance,
			&result.Score, // similarity_score
			&weightedScore,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan result: %w", scanErr)
		}

		// Use weighted score as the final score, clamped to [0,1] to satisfy the API contract.
		result.Score = math.Min(weightedScore, 1.0)

		result.Metadata = make(map[string]string)
		if metadataJSON != "" && metadataJSON != "{}" {
			parseMetadataJSON(metadataJSON, result.Metadata)
		}

		results = append(results, result)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating results: %w", rowsErr)
	}

	c.logger.InfoContext(ctx, "filtered priority-weighted search completed",
		"results_count", len(results),
	)

	return results, nil
}

// SearchWithFilterAndPriorityFromBytes performs filtered priority-weighted search on parquet content provided as bytes.
func (c *Client) SearchWithFilterAndPriorityFromBytes(
	ctx context.Context,
	queryVector []float32,
	parquetContent []byte,
	topK int,
	filter map[string]string,
	priorityWeight float64,
) ([]SearchResult, error) {
	if len(parquetContent) == 0 {
		return nil, errors.New("parquet content cannot be empty")
	}

	// Write to a temporary file
	tempFile, err := os.CreateTemp("", "embed_search_filter_priority_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(parquetContent); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	return c.SearchWithFilterAndPriority(ctx, queryVector, tempFile.Name(), topK, filter, priorityWeight)
}

// SearchWithPriorityFromBytes performs priority-weighted search on parquet content provided as bytes.
func (c *Client) SearchWithPriorityFromBytes(
	ctx context.Context,
	queryVector []float32,
	parquetContent []byte,
	topK int,
	priorityWeight float64,
) ([]SearchResult, error) {
	if len(parquetContent) == 0 {
		return nil, errors.New("parquet content cannot be empty")
	}

	// Write to a temporary file
	tempFile, err := os.CreateTemp("", "embed_search_priority_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(parquetContent); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	return c.SearchWithPriority(ctx, queryVector, tempFile.Name(), topK, priorityWeight)
}

// vectorToArrayString converts a float32 slice to DuckDB array literal format.
// Uses %.9g format to preserve full float32 precision (approximately 7 significant digits).
func vectorToArrayString(vector []float32) string {
	parts := make([]string, len(vector))
	for i, v := range vector {
		// Use %.9g to preserve full float32 precision
		// g format removes trailing zeros and uses exponential notation when appropriate
		parts[i] = fmt.Sprintf("%.9g", v)
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

// parseMetadataJSON parses JSON metadata string into a map.
// Uses proper JSON unmarshaling to handle all valid JSON values correctly.
func parseMetadataJSON(jsonStr string, dest map[string]string) {
	jsonStr = strings.TrimSpace(jsonStr)

	if jsonStr == "" || jsonStr == "{}" {
		return
	}

	// Use proper JSON parsing instead of naive string splitting
	if err := json.Unmarshal([]byte(jsonStr), &dest); err != nil {
		// If parsing fails, log but don't crash
		// This maintains backward compatibility with the old behavior
		return
	}
}

// ComputeCosineSimilarity computes the cosine similarity between two vectors.
func ComputeCosineSimilarity(a, b []float32) (float64, error) {
	if len(a) != len(b) {
		return 0, fmt.Errorf("vectors must have the same dimension: %d != %d", len(a), len(b))
	}

	var dotProduct, normA, normB float64
	for i := range a {
		dotProduct += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}

	if normA == 0 || normB == 0 {
		return 0, nil
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB)), nil
}

// isValidMetadataKey validates that a metadata key contains only safe characters
// to prevent JSON path injection attacks.
func isValidMetadataKey(key string) bool {
	if key == "" {
		return false
	}
	for _, r := range key {
		if (r < 'a' || r > 'z') &&
			(r < 'A' || r > 'Z') &&
			(r < '0' || r > '9') &&
			r != '_' && r != '-' {
			return false
		}
	}
	return true
}

// parquetColumnInfo holds information about optional columns in a parquet file.
type parquetColumnInfo struct {
	hasContentHash bool
	hasPriority    bool
	hasUpdatedAt   bool
}

// getParquetColumnInfo checks which optional columns exist in a parquet file.
// Uses DESCRIBE on read_parquet to get the exact columns DuckDB will return,
// which correctly handles parquet files that lack content_hash and priority.
// parquet_schema can return nested schema nodes; DESCRIBE reflects actual columns.
func (c *Client) getParquetColumnInfo(ctx context.Context, parquetPath string) (parquetColumnInfo, error) {
	escapedPath := duckdb.EscapeSQLString(parquetPath)
	// DESCRIBE returns the columns that read_parquet actually produces (top-level only).
	// Fallback to parquet_schema if DESCRIBE fails (e.g. empty file).
	query := fmt.Sprintf(`DESCRIBE SELECT * FROM read_parquet('%s')`, escapedPath)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil {
		// Fallback: parquet_schema returns internal schema; filter to top-level columns only
		// by checking we have exactly "name" (parquet_schema) - for nested types, we only
		// treat as present if it's a top-level column. parquet_schema may return multiple
		// rows per logical column for nested types; we use it as fallback.
		return c.getParquetColumnInfoFromSchema(ctx, parquetPath)
	}
	defer rows.Close()

	info := parquetColumnInfo{}
	for rows.Next() {
		var colName string
		var colType, nullFlag, key, defaultVal, extra interface{} // DESCRIBE: column_name, column_type, null, key, default, extra
		if scanErr := rows.Scan(&colName, &colType, &nullFlag, &key, &defaultVal, &extra); scanErr != nil {
			continue
		}
		switch colName {
		case "content_hash":
			info.hasContentHash = true
		case "priority":
			info.hasPriority = true
		case "updated_at":
			info.hasUpdatedAt = true
		}
	}

	return info, nil
}

// getParquetColumnInfoFromSchema uses parquet_schema as fallback when DESCRIBE fails.
func (c *Client) getParquetColumnInfoFromSchema(ctx context.Context, parquetPath string) (parquetColumnInfo, error) {
	escapedPath := duckdb.EscapeSQLString(parquetPath)
	query := fmt.Sprintf(`SELECT name FROM parquet_schema('%s')`, escapedPath)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil {
		return parquetColumnInfo{}, fmt.Errorf("failed to query parquet schema: %w", err)
	}
	defer rows.Close()

	info := parquetColumnInfo{}
	for rows.Next() {
		var colName string
		if scanErr := rows.Scan(&colName); scanErr != nil {
			continue
		}
		switch colName {
		case "content_hash":
			info.hasContentHash = true
		case "priority":
			info.hasPriority = true
		case "updated_at":
			info.hasUpdatedAt = true
		}
	}

	return info, nil
}

// isColumnNotFoundError returns true if the error indicates a missing column (Binder Error).
// When parquet lacks content_hash/priority, DuckDB throws "column not found" or similar.
func isColumnNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "column") && (strings.Contains(msg, "not found") ||
		strings.Contains(msg, "binder") || strings.Contains(msg, "does not exist"))
}

// columnExpressions holds SQL expressions for optional columns in both inner and outer queries.
type columnExpressions struct {
	// innerContentHash is the column reference for inner SELECT (empty if column doesn't exist)
	innerContentHash string
	// innerPriority is the column reference for inner SELECT (empty if column doesn't exist)
	innerPriority string
	// outerContentHash is the expression for outer SELECT (COALESCE or literal)
	outerContentHash string
	// outerPriority is the expression for outer SELECT (COALESCE or literal)
	outerPriority string
	// updatedAt is the expression for the updated_at column (COALESCE with created_at or just created_at)
	updatedAt string
}

// buildColumnExpressions returns SQL expressions for optional columns based on parquet schema.
// For columns that exist: inner query includes the column, outer query uses COALESCE.
// For missing columns: inner query omits the column, outer query uses literal default.
func buildColumnExpressions(info parquetColumnInfo) columnExpressions {
	expr := columnExpressions{}

	if info.hasContentHash {
		expr.innerContentHash = "content_hash,"
		expr.outerContentHash = "COALESCE(content_hash, '')"
	} else {
		expr.innerContentHash = ""
		expr.outerContentHash = "''"
	}

	if info.hasPriority {
		expr.innerPriority = "priority,"
		expr.outerPriority = "COALESCE(priority::FLOAT, 1.0)::FLOAT"
	} else {
		expr.innerPriority = ""
		expr.outerPriority = "1.0::FLOAT"
	}

	if info.hasUpdatedAt {
		expr.updatedAt = "COALESCE(updated_at, created_at) as updated_at"
	} else {
		expr.updatedAt = "created_at as updated_at"
	}

	return expr
}

// CreateVectorIndex creates an HNSW index on the embeddings for faster search.
// This is useful for large embedding collections.
func (c *Client) CreateVectorIndex(
	ctx context.Context,
	parquetPath string,
	indexName string,
) error {
	if parquetPath == "" {
		return errors.New("parquet path cannot be empty")
	}
	if indexName == "" {
		return errors.New("index name cannot be empty")
	}

	c.logger.InfoContext(ctx, "creating vector index",
		"parquet_path", parquetPath,
		"index_name", indexName,
	)

	// Install and load the vss extension
	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, "INSTALL vss; LOAD vss;"); err != nil {
		c.logger.WarnContext(ctx, "vss extension may already be loaded", "error", err)
	}

	escapedPath := duckdb.EscapeSQLString(parquetPath)
	escapedIndex := duckdb.EscapeSQLIdentifier(indexName)
	escapedIndexWithSuffix := duckdb.EscapeSQLIdentifier(indexName + "_idx")

	// Create a table from the parquet file
	createTableQuery := fmt.Sprintf(`
		CREATE OR REPLACE TABLE %s AS SELECT * FROM read_parquet('%s')
	`, escapedIndex, escapedPath)

	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, createTableQuery); err != nil {
		return fmt.Errorf("failed to create table: %w", err)
	}

	// Create HNSW index on the embedding column
	createIndexQuery := fmt.Sprintf(`
		CREATE INDEX %s ON %s USING HNSW (embedding)
	`, escapedIndexWithSuffix, escapedIndex)

	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, createIndexQuery); err != nil {
		return fmt.Errorf("failed to create HNSW index: %w", err)
	}

	c.logger.InfoContext(ctx, "vector index created successfully",
		"index_name", indexName,
	)

	return nil
}
