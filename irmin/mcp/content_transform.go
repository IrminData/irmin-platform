package mcp

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"irmin-api/duckdb"

	"github.com/ledongthuc/pdf"

	// Import DuckDB driver
	_ "github.com/marcboeker/go-duckdb"
)

// File extension constants for content transformation.
const (
	extPDF     = ".pdf"
	extCSV     = ".csv"
	extTSV     = ".tsv"
	extParquet = ".parquet"
	extXLSX    = ".xlsx"
	extXLS     = ".xls"
	extXLSM    = ".xlsm"
	extXLSB    = ".xlsb"
)

// ContentTransformResult represents the result of content transformation.
type ContentTransformResult struct {
	Content  string
	MimeType string
	Format   string // "text", "json", "original"
}

// TransformContentForLLM transforms file content into a format suitable for LLM consumption.
// It handles PDFs (extracts text) and tabular files (converts to JSON).
func TransformContentForLLM(content []byte, path string) (*ContentTransformResult, error) {
	ext := strings.ToLower(filepath.Ext(path))

	switch ext {
	case extPDF:
		return transformPDF(content)
	case extCSV, extTSV:
		return transformTabular(content, ext, path)
	case extParquet:
		return transformParquet(content, path)
	case extXLSX, extXLS, extXLSM, extXLSB:
		return transformExcel(content, ext, path)
	default:
		// Return original content for text-based files
		return &ContentTransformResult{
			Content:  string(content),
			MimeType: "text/plain",
			Format:   "original",
		}, nil
	}
}

// IsBinaryFormatSupported checks if the file extension is a supported binary format
// that can be transformed for LLM consumption.
func IsBinaryFormatSupported(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case extPDF, extParquet, extXLSX, extXLS, extXLSM, extXLSB:
		return true
	default:
		return false
	}
}

// IsTabularTextFormat checks if the file extension is a tabular text format
// that should be converted to JSON for better LLM consumption.
func IsTabularTextFormat(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case extCSV, extTSV:
		return true
	default:
		return false
	}
}

// transformPDF extracts text content from PDF files.
func transformPDF(content []byte) (*ContentTransformResult, error) {
	// Create a temporary file for the PDF content
	tempFile, err := os.CreateTemp("", "mcp_pdf_*.pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Open the PDF file
	f, r, err := pdf.Open(tempFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF: %w", err)
	}
	defer f.Close()

	// Extract plain text from the PDF
	var buf bytes.Buffer
	b, err := r.GetPlainText()
	if err != nil {
		return nil, fmt.Errorf("failed to extract text from PDF: %w", err)
	}
	if _, copyErr := buf.ReadFrom(b); copyErr != nil {
		return nil, fmt.Errorf("failed to read PDF text: %w", copyErr)
	}

	text := strings.TrimSpace(buf.String())
	if text == "" {
		return &ContentTransformResult{
			Content:  "[PDF contains no extractable text]",
			MimeType: "text/plain",
			Format:   "text",
		}, nil
	}

	return &ContentTransformResult{
		Content:  text,
		MimeType: "text/plain",
		Format:   "text",
	}, nil
}

// transformTabular converts CSV/TSV content to JSON using DuckDB.
func transformTabular(content []byte, ext, _ string) (*ContentTransformResult, error) {
	// Create a temporary file for the tabular content
	tempFile, err := os.CreateTemp("", "mcp_tabular_*"+ext)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Get DuckDB read options for this extension
	readOpts, err := duckdb.GetDuckDBReadOptionsByExtension(ext)
	if err != nil {
		return nil, fmt.Errorf("unsupported file format: %w", err)
	}

	// Build the read query with parameters
	readQuery := buildReadQuery(tempFile.Name(), readOpts)

	// Execute query and convert to JSON
	jsonContent, err := executeQueryToJSON(readQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to convert to JSON: %w", err)
	}

	return &ContentTransformResult{
		Content:  jsonContent,
		MimeType: "application/json",
		Format:   "json",
	}, nil
}

// transformParquet converts Parquet content to JSON using DuckDB.
func transformParquet(content []byte, _ string) (*ContentTransformResult, error) {
	// Create a temporary file for the parquet content
	tempFile, err := os.CreateTemp("", "mcp_parquet_*.parquet")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Build read query for parquet
	escapedPath := duckdb.EscapeSQLString(tempFile.Name())
	readQuery := fmt.Sprintf("SELECT * FROM read_parquet('%s') LIMIT 1000", escapedPath)

	// Execute query and convert to JSON
	jsonContent, err := executeQueryToJSON(readQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to convert parquet to JSON: %w", err)
	}

	return &ContentTransformResult{
		Content:  jsonContent,
		MimeType: "application/json",
		Format:   "json",
	}, nil
}

// transformExcel converts Excel content to JSON using DuckDB excel extension.
func transformExcel(content []byte, ext, _ string) (*ContentTransformResult, error) {
	// Create a temporary file for the Excel content
	tempFile, err := os.CreateTemp("", "mcp_excel_*"+ext)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tempFile.Name())

	if _, writeErr := tempFile.Write(content); writeErr != nil {
		_ = tempFile.Close()
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Install and load the excel extension, then read the file
	escapedPath := duckdb.EscapeSQLString(tempFile.Name())

	// Determine the correct function based on file extension
	// xlsx files use read_xlsx, older xls files need st_read with GDAL
	var readQuery string
	if ext == extXLSX || ext == extXLSM || ext == extXLSB {
		readQuery = fmt.Sprintf(
			"INSTALL excel; LOAD excel; SELECT * FROM read_xlsx('%s') LIMIT 1000",
			escapedPath,
		)
	} else {
		// For older .xls format, try using st_read with spatial extension as fallback
		readQuery = fmt.Sprintf(
			"INSTALL spatial; LOAD spatial; SELECT * FROM st_read('%s') LIMIT 1000",
			escapedPath,
		)
	}

	// Execute query and convert to JSON
	jsonContent, err := executeQueryToJSON(readQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to convert Excel to JSON: %w", err)
	}

	return &ContentTransformResult{
		Content:  jsonContent,
		MimeType: "application/json",
		Format:   "json",
	}, nil
}

// buildReadQuery constructs a DuckDB read query with the given options.
func buildReadQuery(filePath string, opts *duckdb.ReadOptions) string {
	escapedPath := duckdb.EscapeSQLString(filePath)

	// Build parameters string
	var params []string
	for key, value := range opts.Parameters {
		// Handle boolean and numeric values
		if value == "true" || value == "false" || isNumeric(value) {
			params = append(params, fmt.Sprintf("%s=%s", key, value))
		} else {
			params = append(params, fmt.Sprintf("%s='%s'", key, value))
		}
	}

	paramStr := ""
	if len(params) > 0 {
		paramStr = ", " + strings.Join(params, ", ")
	}

	return fmt.Sprintf("SELECT * FROM %s('%s'%s) LIMIT 1000", opts.ReadFunction, escapedPath, paramStr)
}

// executeQueryToJSON executes a DuckDB query and returns the results as JSON.
func executeQueryToJSON(query string) (string, error) {
	ctx := context.Background()

	// Create a minimal in-memory DuckDB connection for local file processing
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return "", fmt.Errorf("failed to open DuckDB connection: %w", err)
	}
	defer db.Close()

	// Execute the query
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return "", fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return "", fmt.Errorf("failed to get columns: %w", err)
	}

	// Collect results
	var results []map[string]any
	for rows.Next() {
		// Create a slice of interface{} to hold the row values
		values := make([]any, len(columns))
		valuePtrs := make([]any, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if scanErr := rows.Scan(valuePtrs...); scanErr != nil {
			return "", fmt.Errorf("failed to scan row: %w", scanErr)
		}

		// Create a map for this row
		rowMap := make(map[string]any)
		for i, col := range columns {
			rowMap[col] = values[i]
		}
		results = append(results, rowMap)
	}

	if rows.Err() != nil {
		return "", fmt.Errorf("error iterating rows: %w", rows.Err())
	}

	// Convert to JSON
	if len(results) == 0 {
		return "[]", nil
	}

	jsonBytes, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal to JSON: %w", err)
	}

	return string(jsonBytes), nil
}

// isNumeric checks if a string represents a numeric value.
func isNumeric(s string) bool {
	if len(s) == 0 {
		return false
	}

	hasDigit := false
	hasDot := false
	for i, c := range s {
		switch {
		case c == '-':
			// Minus sign only allowed at the start
			if i != 0 {
				return false
			}
		case c == '.':
			// Only one decimal point allowed
			if hasDot {
				return false
			}
			hasDot = true
		case c >= '0' && c <= '9':
			hasDigit = true
		default:
			return false
		}
	}

	// Must have at least one digit (not just "-" or "." or "-.")
	return hasDigit
}
