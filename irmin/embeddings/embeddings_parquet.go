package embeddings

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"os"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// SaveEmbeddingsToParquet saves embedding records to a Parquet file.
// The file is written with DuckDB's native array type for the embedding column.
func (c *Client) SaveEmbeddingsToParquet(
	ctx context.Context,
	records []EmbeddingRecord,
	outputPath string,
) error {
	if len(records) == 0 {
		return errors.New("records cannot be empty")
	}
	if outputPath == "" {
		return errors.New("output path cannot be empty")
	}

	c.logger.InfoContext(ctx, "saving embeddings to parquet",
		"record_count", len(records),
		"output_path", outputPath,
	)

	// Get dimensions from first record
	if len(records[0].Embedding) == 0 {
		return errors.New("embedding vector cannot be empty")
	}
	dimensions := len(records[0].Embedding)

	// Generate a unique temp table name to prevent race conditions in concurrent operations
	// Replace hyphens with underscores to ensure valid SQL identifier
	tableName := fmt.Sprintf("embeddings_temp_%s", strings.ReplaceAll(uuid.New().String(), "-", "_"))
	escapedTableName := duckdb.EscapeSQLIdentifier(tableName)

	// Create a temporary table with the embeddings schema
	createTableSQL := fmt.Sprintf(`
		CREATE OR REPLACE TEMP TABLE %s (
			id VARCHAR,
			source_file VARCHAR,
			chunk_index INTEGER,
			content TEXT,
			embedding FLOAT[%d],
			metadata JSON,
			created_at TIMESTAMP
		)
	`, escapedTableName, dimensions)

	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, createTableSQL); err != nil {
		return fmt.Errorf("failed to create temp table: %w", err)
	}

	// Ensure temp table cleanup happens even if the function returns early due to error
	defer func() {
		dropSQL := fmt.Sprintf("DROP TABLE IF EXISTS %s", escapedTableName)
		if _, err := c.duckDBClient.ExecuteNonQuery(ctx, dropSQL); err != nil {
			c.logger.WarnContext(ctx, "failed to drop temp table during cleanup", "error", err)
		}
	}()

	// Insert records in batches
	batchSize := 100
	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}
		batch := records[i:end]

		if err := c.insertEmbeddingBatch(ctx, batch, escapedTableName); err != nil {
			return fmt.Errorf("failed to insert batch %d: %w", i/batchSize, err)
		}
	}

	// Export to Parquet
	escapedPath := duckdb.EscapeSQLString(outputPath)
	exportSQL := fmt.Sprintf(`
		COPY %s TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, escapedTableName, escapedPath)

	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, exportSQL); err != nil {
		return fmt.Errorf("failed to export to parquet: %w", err)
	}

	c.logger.InfoContext(ctx, "embeddings saved to parquet successfully",
		"output_path", outputPath,
		"record_count", len(records),
	)

	return nil
}

// insertEmbeddingBatch inserts a batch of embedding records into the temp table.
// The tableName parameter must be pre-escaped using duckdb.EscapeSQLIdentifier.
func (c *Client) insertEmbeddingBatch(ctx context.Context, records []EmbeddingRecord, tableName string) error {
	if len(records) == 0 {
		return nil
	}

	var values []string
	for _, record := range records {
		// Convert embedding to array literal
		embeddingStr := vectorToArrayString(record.Embedding)

		// Convert metadata to JSON
		metadataBytes, err := json.Marshal(record.Metadata)
		if err != nil {
			metadataBytes = []byte("{}")
		}
		metadataStr := duckdb.EscapeSQLString(string(metadataBytes))

		// Format the row value
		value := fmt.Sprintf(`('%s', '%s', %d, '%s', %s::FLOAT[%d], '%s'::JSON, '%s')`,
			duckdb.EscapeSQLString(record.ID),
			duckdb.EscapeSQLString(record.SourceFile),
			record.ChunkIndex,
			duckdb.EscapeSQLString(record.Content),
			embeddingStr,
			len(record.Embedding),
			metadataStr,
			record.CreatedAt.Format("2006-01-02 15:04:05"),
		)
		values = append(values, value)
	}

	insertSQL := fmt.Sprintf(`
		INSERT INTO %s (id, source_file, chunk_index, content, embedding, metadata, created_at)
		VALUES %s
	`, tableName, strings.Join(values, ", "))

	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, insertSQL); err != nil {
		return fmt.Errorf("failed to insert batch: %w", err)
	}

	return nil
}

// SaveEmbeddingsToParquetBytes saves embedding records and returns the Parquet data as bytes.
func (c *Client) SaveEmbeddingsToParquetBytes(
	ctx context.Context,
	records []EmbeddingRecord,
) ([]byte, error) {
	if len(records) == 0 {
		return nil, errors.New("records cannot be empty")
	}

	// Create a temporary file
	tempFile, err := os.CreateTemp("", "embeddings_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()
	// Register cleanup immediately after getting the path to prevent leaks
	defer os.Remove(tempPath)

	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Save to the temp file
	if saveErr := c.SaveEmbeddingsToParquet(ctx, records, tempPath); saveErr != nil {
		return nil, saveErr
	}

	// Read the file contents
	data, err := os.ReadFile(tempPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read parquet file: %w", err)
	}

	return data, nil
}

// LoadEmbeddingsFromParquet loads embedding records from a Parquet file.
func (c *Client) LoadEmbeddingsFromParquet(
	ctx context.Context,
	parquetPath string,
) ([]EmbeddingRecord, error) {
	if parquetPath == "" {
		return nil, errors.New("parquet path cannot be empty")
	}

	c.logger.InfoContext(ctx, "loading embeddings from parquet",
		"parquet_path", parquetPath,
	)

	escapedPath := duckdb.EscapeSQLString(parquetPath)
	query := fmt.Sprintf(`
		SELECT 
			id, 
			source_file, 
			chunk_index, 
			content, 
			CAST(embedding AS VARCHAR) as embedding,
			CAST(metadata AS VARCHAR) as metadata, 
			created_at
		FROM read_parquet('%s')
	`, escapedPath)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query parquet file: %w", err)
	}
	defer rows.Close()

	var records []EmbeddingRecord
	for rows.Next() {
		var record EmbeddingRecord
		var embeddingStr string
		var metadataStr string

		if scanErr := rows.Scan(
			&record.ID,
			&record.SourceFile,
			&record.ChunkIndex,
			&record.Content,
			&embeddingStr,
			&metadataStr,
			&record.CreatedAt,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan record: %w", scanErr)
		}

		// Parse embedding from string (DuckDB returns arrays as strings after CAST)
		record.Embedding = c.parseEmbeddingBytes(ctx, []byte(embeddingStr))

		// Parse metadata
		record.Metadata = make(map[string]string)
		if metadataStr != "" && metadataStr != "{}" && metadataStr != "null" {
			if jsonErr := json.Unmarshal([]byte(metadataStr), &record.Metadata); jsonErr != nil {
				c.logger.WarnContext(ctx, "failed to parse metadata", "error", jsonErr)
			}
		}
		// Ensure metadata is never nil to prevent panic on map assignment
		if record.Metadata == nil {
			record.Metadata = make(map[string]string)
		}

		records = append(records, record)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating records: %w", rowsErr)
	}

	c.logger.InfoContext(ctx, "embeddings loaded from parquet",
		"record_count", len(records),
	)

	return records, nil
}

// parseEmbeddingBytes parses embedding bytes from DuckDB array format.
// Returns the parsed embedding. Failed values result in 0.0 to preserve dimensionality.
func (c *Client) parseEmbeddingBytes(ctx context.Context, data []byte) []float32 {
	// Handle case where DuckDB returns the array as a string representation
	str := string(data)
	str = strings.TrimPrefix(str, "[")
	str = strings.TrimSuffix(str, "]")

	if str == "" {
		return nil
	}

	parts := strings.Split(str, ",")
	embedding := make([]float32, 0, len(parts))

	for i, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			// Empty parts should be treated as 0.0 to preserve dimensionality
			c.logger.WarnContext(ctx, "empty embedding value, using 0.0",
				"index", i,
			)
			embedding = append(embedding, 0.0)
			continue
		}
		// Use strconv.ParseFloat to handle both fixed-point and exponential notation
		// This is necessary because values are stored with %.9g format (e.g., "1.23e-05")
		val, err := strconv.ParseFloat(part, 32)
		if err != nil {
			// Log parse error and use 0.0 to preserve dimensionality
			// This prevents dimension mismatches in downstream operations
			c.logger.WarnContext(ctx, "failed to parse embedding value, using 0.0",
				"index", i,
				"value", part,
				"error", err,
			)
			embedding = append(embedding, 0.0)
			continue
		}
		embedding = append(embedding, float32(val))
	}

	return embedding
}

// GetEmbeddingCount returns the number of embeddings in a Parquet file.
func (c *Client) GetEmbeddingCount(ctx context.Context, parquetPath string) (int64, error) {
	if parquetPath == "" {
		return 0, errors.New("parquet path cannot be empty")
	}

	escapedPath := duckdb.EscapeSQLString(parquetPath)
	query := fmt.Sprintf(`SELECT COUNT(*) FROM read_parquet('%s')`, escapedPath)

	rows, err := c.duckDBClient.ExecuteQuery(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to count embeddings: %w", err)
	}
	defer rows.Close()

	var count int64
	if rows.Next() {
		if scanErr := rows.Scan(&count); scanErr != nil {
			return 0, fmt.Errorf("failed to scan count: %w", scanErr)
		}
	}

	return count, nil
}

// MergeParquetFiles merges multiple Parquet embedding files into one.
func (c *Client) MergeParquetFiles(
	ctx context.Context,
	inputPaths []string,
	outputPath string,
) error {
	if len(inputPaths) == 0 {
		return errors.New("input paths cannot be empty")
	}
	if outputPath == "" {
		return errors.New("output path cannot be empty")
	}

	c.logger.InfoContext(ctx, "merging parquet files",
		"input_count", len(inputPaths),
		"output_path", outputPath,
	)

	// Build union query
	var queries []string
	for _, path := range inputPaths {
		escapedPath := duckdb.EscapeSQLString(path)
		queries = append(queries, fmt.Sprintf("SELECT * FROM read_parquet('%s')", escapedPath))
	}

	unionQuery := strings.Join(queries, " UNION ALL ")
	escapedOutput := duckdb.EscapeSQLString(outputPath)

	copyQuery := fmt.Sprintf(`
		COPY (%s) TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD)
	`, unionQuery, escapedOutput)

	if _, err := c.duckDBClient.ExecuteNonQuery(ctx, copyQuery); err != nil {
		return fmt.Errorf("failed to merge parquet files: %w", err)
	}

	c.logger.InfoContext(ctx, "parquet files merged successfully",
		"output_path", outputPath,
	)

	return nil
}
