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
	ID         string            `json:"id"`
	SourceFile string            `json:"source_file"`
	ChunkIndex int               `json:"chunk_index"`
	Content    string            `json:"content"`
	Score      float64           `json:"score"`
	Distance   float64           `json:"distance"`
	Metadata   map[string]string `json:"metadata"`
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

	// Convert query vector to DuckDB array format
	vectorStr := vectorToArrayString(queryVector)

	// Build the similarity search query using cosine distance
	// Use a subquery to compute distance once and derive score from it
	escapedPath := duckdb.EscapeSQLString(parquetPath)
	query := fmt.Sprintf(`
		SELECT
			id,
			source_file,
			chunk_index,
			content,
			CAST(metadata AS VARCHAR) as metadata,
			distance,
			(1 - distance) as score
		FROM (
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				metadata,
				array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
			FROM read_parquet('%s')
		)
		ORDER BY distance ASC
		LIMIT %d
	`, len(queryVector), vectorStr, len(queryVector), escapedPath, topK)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
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
			&metadataJSON,
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
	query := fmt.Sprintf(`
		SELECT
			id,
			source_file,
			chunk_index,
			content,
			CAST(metadata AS VARCHAR) as metadata,
			distance,
			(1 - distance) as score
		FROM (
			SELECT
				id,
				source_file,
				chunk_index,
				content,
				metadata,
				array_cosine_distance(embedding::FLOAT[%d], %s::FLOAT[%d]) as distance
			FROM read_parquet('%s')
			%s
		)
		ORDER BY distance ASC
		LIMIT %d
	`, len(queryVector), vectorStr, len(queryVector), escapedPath, whereClause, topK)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
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
			&metadataJSON,
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
