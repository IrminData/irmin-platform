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

// getFileExtension extracts the actual file extension.
func getFileExtension(fileName string) string {
	lowerFileName := strings.ToLower(fileName)
	return filepath.Ext(lowerFileName)
}

// generateCreateViewSQL generates the appropriate SQL for creating a view based on file extension.
func generateCreateViewSQL(qc *duckdb.QueryClient, fileName, viewName, tmpFilePath string) (string, error) {
	fileExt := getFileExtension(fileName)

	// Helper to quote identifiers and paths
	quoteIdent := func(s string) string {
		return fmt.Sprintf(`"%s"`, strings.ReplaceAll(s, `"`, `""`))
	}
	quotePath := func(s string) string {
		return fmt.Sprintf(`'%s'`, strings.ReplaceAll(s, `'`, `''`))
	}

	switch fileExt {
	// JSON formats
	case ".json":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_json_auto(%s);
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil
	case ".jsonl", ".ndjson":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_json_auto(%s, format='newline_delimited');
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil

	// CSV and TSV formats
	case ".csv":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_csv_auto(%s);
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil
	case ".tsv", ".tab":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_csv_auto(%s, delim='\t');
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil

	// Parquet format
	case ".parquet":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_parquet(%s);
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil

	// Excel formats
	case ".xlsx", ".xls", ".xlsm", ".xlsb":
		return handleExcelFormat(qc, fileName, viewName, tmpFilePath)

	// Advanced analytics formats
	case ".avro":
		return handleAvroFormat(qc, fileName, viewName, tmpFilePath)
	case ".orc":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_orc(%s);
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil
	case ".delta":
		return handleDeltaFormat(qc, fileName, viewName, tmpFilePath)
	case ".iceberg":
		return handleIcebergFormat(qc, fileName, viewName, tmpFilePath)

	// XML and YAML formats (experimental support)
	case ".xml", ".yaml", ".yml":
		return fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM read_csv_auto(%s, delim='\t', header=false);
		`, quoteIdent(viewName), quotePath(tmpFilePath)), nil

	default:
		return "", fmt.Errorf("unsupported file type: %s", fileName)
	}
}

// handleExcelFormat handles Excel file formats.
func handleExcelFormat(qc *duckdb.QueryClient, _, viewName, tmpFilePath string) (string, error) {
	// First try to install and load the Excel extension
	_, spatialErr := qc.ExecuteNonQuery("INSTALL spatial; LOAD spatial;")
	if spatialErr == nil {
		// Spatial extension loaded successfully, try to use it
		createViewSQL := fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM st_read('%s');
		`, viewName, tmpFilePath)

		// If spatial works, return it; otherwise fall back below
		if _, execErr := qc.ExecuteNonQuery(createViewSQL); execErr == nil {
			return createViewSQL, nil
		}
	}

	// Try alternative Excel extension installation
	if _, excelErr := qc.ExecuteNonQuery("INSTALL excel; LOAD excel;"); excelErr == nil {
		// Excel extension loaded, try to use it with spatial read
		createViewSQL := fmt.Sprintf(`
			CREATE OR REPLACE TEMPORARY VIEW %s AS 
			SELECT * FROM st_read('%s');
		`, viewName, tmpFilePath)

		// If it works, return it; otherwise fall back below
		if _, execErr := qc.ExecuteNonQuery(createViewSQL); execErr == nil {
			return createViewSQL, nil
		}
	}

	// If no Excel extensions are available, fall back to treating as CSV
	return fmt.Sprintf(`
		CREATE OR REPLACE TEMPORARY VIEW %s AS 
		SELECT * FROM read_csv_auto('%s');
	`, viewName, tmpFilePath), nil
}

// handleAvroFormat handles Avro file format.
func handleAvroFormat(qc *duckdb.QueryClient, fileName, viewName, tmpFilePath string) (string, error) {
	if _, avroErr := qc.ExecuteNonQuery("INSTALL avro; LOAD avro;"); avroErr != nil {
		// If Avro extension is not available, return a more descriptive error
		return "", fmt.Errorf(
			"avro format is not supported on this platform - DuckDB Avro extension could not be loaded for %s: %w",
			fileName,
			avroErr,
		)
	}
	return fmt.Sprintf(`
		CREATE OR REPLACE TEMPORARY VIEW %s AS 
		SELECT * FROM read_avro('%s');
	`, viewName, tmpFilePath), nil
}

// handleDeltaFormat handles Delta Lake file format.
func handleDeltaFormat(qc *duckdb.QueryClient, fileName, viewName, tmpFilePath string) (string, error) {
	if _, deltaErr := qc.ExecuteNonQuery("INSTALL delta; LOAD delta;"); deltaErr != nil {
		// If Delta extension is not available, return a more descriptive error
		return "", fmt.Errorf(
			"delta Lake format is not supported on this platform - DuckDB Delta extension could not be loaded for %s: %w",
			fileName,
			deltaErr,
		)
	}
	return fmt.Sprintf(`
		CREATE OR REPLACE TEMPORARY VIEW %s AS 
		SELECT * FROM delta_scan('%s');
	`, viewName, tmpFilePath), nil
}

// handleIcebergFormat handles Iceberg file format.
func handleIcebergFormat(qc *duckdb.QueryClient, fileName, viewName, tmpFilePath string) (string, error) {
	if _, icebergErr := qc.ExecuteNonQuery("INSTALL iceberg; LOAD iceberg;"); icebergErr != nil {
		// If Iceberg extension is not available, return a more descriptive error
		return "", fmt.Errorf(
			"iceberg format is not supported on this platform - DuckDB Iceberg extension could not be loaded for %s: %w",
			fileName,
			icebergErr,
		)
	}
	return fmt.Sprintf(`
		CREATE OR REPLACE TEMPORARY VIEW %s AS 
		SELECT * FROM iceberg_scan('%s');
	`, viewName, tmpFilePath), nil
}

// createTemporaryView creates a temporary view in DuckDB for the given file content.
// Returns the view name and temp file path (which must be cleaned up by caller).
func createTemporaryView(qc *duckdb.QueryClient, fileName string, content []byte) (string, string, error) {
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
	createViewSQL, sqlErr := generateCreateViewSQL(qc, fileName, viewName, tmpFile.Name())
	if sqlErr != nil {
		_ = os.Remove(tmpFile.Name()) // Handle removal error by ignoring it
		return "", "", sqlErr
	}

	if _, execViewErr := qc.ExecuteNonQuery(createViewSQL); execViewErr != nil {
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
func processFile(qc *duckdb.QueryClient, fileName string, content []byte) ([]map[string]any, error) {
	viewName, tmpFilePath, err := createTemporaryView(qc, fileName, content)
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFilePath) // Clean up temp file after processing

	// Always quote the view name for the SELECT query
	quotedViewName := fmt.Sprintf(`"%s"`, strings.ReplaceAll(viewName, `"`, `""`))
	rows, err := qc.ExecuteQuery(fmt.Sprintf("SELECT * FROM %s", quotedViewName))
	if err != nil {
		return nil, fmt.Errorf("failed to query data from %s: %w", fileName, err)
	}
	defer rows.Close()

	return processRows(rows, fileName)
}

// ParseStructuredFilesWithContext is a context-aware version of ParseStructuredFiles.
func ParseStructuredFilesWithContext(
	ctx context.Context,
	files map[string][]byte,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
) (map[string][]map[string]any, error) {
	qc, err := duckdb.NewQueryClient(env, logger)
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
			fileData, processFileErr := processFile(qc, fileName, content)
			if processFileErr != nil {
				return nil, processFileErr
			}
			parsedResults[fileName] = fileData
		}
	}

	return parsedResults, nil
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
	files map[string][]byte,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
) (map[string][]map[string]any, error) {
	return ParseStructuredFilesWithContext(context.Background(), files, env, logger)
}
