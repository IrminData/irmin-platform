package lib

import (
	"context"
	"database/sql"
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"os"
	"path/filepath"
	"strings"

	"log/slog"
)

// generateCreateViewSQL generates the appropriate SQL for creating a view based on file extension.
func generateCreateViewSQL(
	ctx context.Context,
	qc *duckdb.QueryClient,
	fileName, viewName, tmpFilePath string,
) (string, error) {
	// Helper to quote identifiers
	quoteIdent := func(s string) string {
		return fmt.Sprintf(`"%s"`, strings.ReplaceAll(s, `"`, `""`))
	}

	// Check if this is an Excel file - needs special fallback handling
	ext := strings.ToLower(filepath.Ext(fileName))
	if ext == ".xlsx" || ext == ".xls" || ext == ".xlsm" || ext == ".xlsb" {
		return generateExcelViewSQL(ctx, qc, viewName, tmpFilePath, quoteIdent)
	}

	// Get read options from the centralized duckdb package
	readOptions, readOptsErr := duckdb.GetDuckDBReadOptionsByExtension(filepath.Ext(fileName))
	if readOptsErr != nil {
		return "", fmt.Errorf("unsupported file type %s: %w", fileName, readOptsErr)
	}

	// Install required extensions
	requiredExtensions := duckdb.GetRequiredExtensions(readOptions)
	for _, ext := range requiredExtensions {
		installSQL := fmt.Sprintf("INSTALL %s; LOAD %s;", ext, ext)
		if _, installErr := qc.ExecuteNonQuery(ctx, installSQL); installErr != nil {
			// For some extensions like avro, delta, iceberg, we want to fail
			// if they can't be loaded since there's no fallback
			if ext != "httpfs" {
				return "", fmt.Errorf(
					"%s format is not supported on this platform - DuckDB %s extension could not be loaded: %w",
					ext, ext, installErr,
				)
			}
		}
	}

	// Build the read query using the centralized function
	readQuery := duckdb.BuildReadQuery(tmpFilePath, readOptions)

	// Create the view SQL
	return fmt.Sprintf(
		"CREATE OR REPLACE TEMPORARY VIEW %s AS SELECT * FROM %s;",
		quoteIdent(viewName),
		readQuery,
	), nil
}

// generateExcelViewSQL handles Excel file processing with a three-tier fallback strategy.
// Tier 1: Try spatial extension with st_read
// Tier 2: Try excel extension with st_read
// Tier 3: Fall back to CSV parsing with read_csv_auto
func generateExcelViewSQL(
	ctx context.Context,
	qc *duckdb.QueryClient,
	viewName, tmpFilePath string,
	quoteIdent func(string) string,
) (string, error) {
	// Escape the file path to prevent SQL injection
	// Single quotes in file paths are escaped by doubling them
	escapedPath := strings.ReplaceAll(tmpFilePath, "'", "''")

	// Tier 1: Try spatial extension with st_read
	_, spatialErr := qc.ExecuteNonQuery(ctx, "INSTALL spatial; LOAD spatial;")
	if spatialErr == nil {
		createViewSQL := fmt.Sprintf(
			"CREATE OR REPLACE TEMPORARY VIEW %s AS SELECT * FROM st_read('%s');",
			quoteIdent(viewName),
			escapedPath,
		)
		if _, execErr := qc.ExecuteNonQuery(ctx, createViewSQL); execErr == nil {
			return createViewSQL, nil
		}
	}

	// Tier 2: Try excel extension with st_read
	_, excelErr := qc.ExecuteNonQuery(ctx, "INSTALL excel; LOAD excel;")
	if excelErr == nil {
		createViewSQL := fmt.Sprintf(
			"CREATE OR REPLACE TEMPORARY VIEW %s AS SELECT * FROM st_read('%s');",
			quoteIdent(viewName),
			escapedPath,
		)
		if _, execErr := qc.ExecuteNonQuery(ctx, createViewSQL); execErr == nil {
			return createViewSQL, nil
		}
	}

	// Tier 3: Fall back to CSV parsing
	return fmt.Sprintf(
		"CREATE OR REPLACE TEMPORARY VIEW %s AS SELECT * FROM read_csv_auto('%s');",
		quoteIdent(viewName),
		escapedPath,
	), nil
}

// createTemporaryView creates a temporary view in DuckDB for the given file content.
// Returns the view name and temp file path (which must be cleaned up by caller).
func createTemporaryView(
	ctx context.Context,
	qc *duckdb.QueryClient,
	fileName string,
	content []byte,
) (string, string, error) {
	// Sanitize fileName for temp file creation (replace path separators with underscores)
	safeFileName := strings.ReplaceAll(strings.ReplaceAll(fileName, "/", "_"), "\\", "_")

	// Create a temporary file
	tmpFile, err := os.CreateTemp(
		"",
		fmt.Sprintf(
			"irmin_%s_*%s",
			strings.TrimSuffix(safeFileName, filepath.Ext(safeFileName)),
			filepath.Ext(safeFileName),
		),
	)
	if err != nil {
		return "", "", fmt.Errorf("failed to create temporary file for %s: %w", fileName, err)
	}

	// Write content to the temporary file
	if _, writeErr := tmpFile.Write(content); writeErr != nil {
		_ = os.Remove(tmpFile.Name()) // Handle removal error by ignoring it
		return "", "", fmt.Errorf("failed to write content to temporary file for %s: %w", fileName, writeErr)
	}
	if closeErr := tmpFile.Close(); closeErr != nil {
		_ = os.Remove(tmpFile.Name()) // Handle removal error by ignoring it
		return "", "", fmt.Errorf("failed to close temporary file for %s: %w", fileName, closeErr)
	}

	// Create view name without file extension and special characters
	baseFileName := strings.TrimSuffix(safeFileName, filepath.Ext(safeFileName))

	// Clean the base name for use as view name
	viewName := fmt.Sprintf("temp_view_%s", strings.ReplaceAll(strings.ReplaceAll(baseFileName, "/", "_"), ".", "_"))

	// Generate the appropriate SQL for this file type
	createViewSQL, sqlErr := generateCreateViewSQL(ctx, qc, fileName, viewName, tmpFile.Name())
	if sqlErr != nil {
		_ = os.Remove(tmpFile.Name()) // Handle removal error by ignoring it
		return "", "", sqlErr
	}

	if _, execViewErr := qc.ExecuteNonQuery(ctx, createViewSQL); execViewErr != nil {
		_ = os.Remove(tmpFile.Name()) // Handle removal error by ignoring it
		return "", "", fmt.Errorf("failed to create view for %s: %w", fileName, execViewErr)
	}

	return viewName, tmpFile.Name(), nil
}

// processRows converts database rows into a slice of maps.
func processRows(rows *sql.Rows, fileName string) ([]map[string]any, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns for %s: %w", fileName, err)
	}

	values := make([]any, len(columns))
	valuePtrs := make([]any, len(columns))
	for i := range columns {
		valuePtrs[i] = &values[i]
	}

	var fileData []map[string]any
	for rows.Next() {
		if scanErr := rows.Scan(valuePtrs...); scanErr != nil {
			return nil, fmt.Errorf("failed to scan row for %s: %w", fileName, scanErr)
		}

		rowMap := make(map[string]any)
		for i, col := range columns {
			val := values[i]
			if val == nil {
				rowMap[col] = nil
				continue
			}
			if b, ok := val.([]byte); ok {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = val
			}
		}
		fileData = append(fileData, rowMap)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error iterating rows for %s: %w", fileName, rowsErr)
	}

	return fileData, nil
}

// processFile handles the processing of a single file.
func processFile(
	ctx context.Context,
	qc *duckdb.QueryClient,
	fileName string,
	content []byte,
) ([]map[string]any, error) {
	viewName, tmpFilePath, err := createTemporaryView(ctx, qc, fileName, content)
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFilePath) // Clean up temp file after processing

	// Always quote the view name for the SELECT query
	quotedViewName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(viewName, `"`, `""`))
	rows, err := qc.ExecuteQuery(ctx, fmt.Sprintf("SELECT * FROM %s", quotedViewName))
	if err != nil {
		return nil, fmt.Errorf("failed to query data from %s: %w", fileName, err)
	}
	defer rows.Close()

	return processRows(rows, fileName)
}

// ParseStructuredFiles parses structured data files into a map of file names to arrays of maps.
// Supported formats:
//   - JSON (.json)
//   - JSONL/NDJSON (.jsonl, .ndjson)
//   - CSV (.csv)
//   - TSV/TAB (.tsv, .tab)
//   - XML (.xml)
//   - YAML (.yaml, .yml)
//   - Parquet (.parquet)
//   - ORC (.orc)
//   - Excel (.xlsx, .xls, .xlsm, .xlsb)
//   - Avro (.avro)
//   - Delta Lake (.delta)
//   - Iceberg (.iceberg)
func ParseStructuredFiles(
	ctx context.Context,
	files map[string][]byte,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
) (map[string][]map[string]any, error) {
	qc, err := duckdb.NewQueryClient(ctx, env, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}
	defer qc.Close()

	parsedResults := make(map[string][]map[string]any)

	for fileName, content := range files {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
			fileData, processFileErr := processFile(ctx, qc, fileName, content)
			if processFileErr != nil {
				return nil, processFileErr
			}
			parsedResults[fileName] = fileData
		}
	}

	return parsedResults, nil
}
