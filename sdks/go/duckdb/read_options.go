package duckdb

import (
	"context"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// ReadOptions represents the configuration for reading a file with DuckDB.
type ReadOptions struct {
	ReadFunction string            `json:"read_function"` // DuckDB function to use (e.g., "read_json_auto")
	FormatOption string            `json:"format_option"` // Format option for writing (e.g., "JSON")
	Parameters   map[string]string `json:"parameters"`    // Additional parameters for the read function
	Extension    string            `json:"extension"`     // Required DuckDB extension (if any)
	Description  string            `json:"description"`   // Human-readable description
}

// GetDuckDBReadOptionsByExtension maps a file extension to the appropriate DuckDB read options.
func GetDuckDBReadOptionsByExtension(extension string) (*ReadOptions, error) {
	// Normalize extension to lowercase and remove leading dot
	ext := strings.ToLower(strings.TrimPrefix(extension, "."))

	switch ext {
	// JSON formats
	case "json":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters: map[string]string{
				"ignore_errors":       "true",
				"maximum_object_size": "10485760",
				"union_by_name":       "true",
			},
			Extension:   "",
			Description: "Standard JSON format",
		}, nil
	case "jsonl", "ndjson":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters: map[string]string{
				"format":        "newline_delimited",
				"ignore_errors": "true",
				"union_by_name": "true",
			},
			Extension:   "",
			Description: "Newline-delimited JSON",
		}, nil

	// CSV formats
	case "csv":
		return &ReadOptions{
			ReadFunction: "read_csv_auto",
			FormatOption: "CSV (HEADER, DELIMITER ',')",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Comma-separated values",
		}, nil
	case "tsv", "tab":
		return &ReadOptions{
			ReadFunction: "read_csv_auto",
			FormatOption: "CSV (HEADER, DELIMITER '\t')",
			Parameters:   map[string]string{"delim": "\\t"},
			Extension:    "",
			Description:  "Tab-separated values",
		}, nil

	// Parquet format
	case "parquet":
		return &ReadOptions{
			ReadFunction: "read_parquet",
			FormatOption: "PARQUET",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Columnar storage format",
		}, nil

	// Apache formats
	case "avro":
		return &ReadOptions{
			ReadFunction: "read_avro",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "avro",
			Description:  "Apache Avro binary format",
		}, nil
	case "orc":
		return &ReadOptions{
			ReadFunction: "read_orc",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Optimized Row Columnar format",
		}, nil

	// Lakehouse formats
	case "delta":
		return &ReadOptions{
			ReadFunction: "delta_scan",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "delta",
			Description:  "Delta Lake tables",
		}, nil
	case "iceberg":
		return &ReadOptions{
			ReadFunction: "iceberg_scan",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "iceberg",
			Description:  "Apache Iceberg tables",
		}, nil

	// Excel formats
	case "xlsx":
		return &ReadOptions{
			ReadFunction: "st_read",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "spatial",
			Description:  "Excel Open XML format",
		}, nil
	case "xls":
		return &ReadOptions{
			ReadFunction: "st_read",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "spatial",
			Description:  "Excel legacy format",
		}, nil
	case "xlsm":
		return &ReadOptions{
			ReadFunction: "st_read",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "spatial",
			Description:  "Excel with macros",
		}, nil
	case "xlsb":
		return &ReadOptions{
			ReadFunction: "st_read",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "spatial",
			Description:  "Excel binary format",
		}, nil

	// Experimental formats (limited support)
	case "xml":
		return &ReadOptions{
			ReadFunction: "read_csv",
			FormatOption: "CSV (HEADER, DELIMITER ',')",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "XML parsed as text/CSV (experimental)",
		}, nil
	case "yaml", "yml":
		return &ReadOptions{
			ReadFunction: "read_csv",
			FormatOption: "CSV (HEADER, DELIMITER ',')",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "YAML parsed as text/CSV (experimental)",
		}, nil

	default:
		return nil, fmt.Errorf("unsupported file extension: %s", ext)
	}
}

// extractBaseMIMEType extracts the base MIME type by stripping parameters.
// For example, "text/csv; charset=utf-8" becomes "text/csv".
func extractBaseMIMEType(contentType string) string {
	// Split on semicolon to remove parameters (e.g., charset=utf-8)
	if idx := strings.Index(contentType, ";"); idx != -1 {
		return strings.TrimSpace(contentType[:idx])
	}
	return strings.TrimSpace(contentType)
}

// GetDuckDBReadOptionsByMIMEType maps a MIME type to the appropriate DuckDB read options.
// It handles MIME types with parameters (e.g., "text/csv; charset=utf-8") by extracting
// the base type before matching.
func GetDuckDBReadOptionsByMIMEType(contentType string) (*ReadOptions, error) {
	// Extract base MIME type, stripping any parameters like charset
	baseType := extractBaseMIMEType(contentType)

	switch baseType {
	// JSON formats
	case "application/json":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters: map[string]string{
				"ignore_errors":       "true",
				"maximum_object_size": "10485760",
				"union_by_name":       "true",
			},
			Extension:   "",
			Description: "Standard JSON format",
		}, nil
	case "application/jsonl", "application/x-ndjson":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters: map[string]string{
				"format":        "newline_delimited",
				"ignore_errors": "true",
				"union_by_name": "true",
			},
			Extension:   "",
			Description: "Newline-delimited JSON",
		}, nil

	// CSV and TSV formats
	case "text/csv":
		return &ReadOptions{
			ReadFunction: "read_csv_auto",
			FormatOption: "CSV (HEADER, DELIMITER ',')",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Comma-separated values",
		}, nil
	case "text/tab-separated-values":
		return &ReadOptions{
			ReadFunction: "read_csv_auto",
			FormatOption: "CSV (HEADER, DELIMITER '\t')",
			Parameters:   map[string]string{"delim": "\\t"},
			Extension:    "",
			Description:  "Tab-separated values",
		}, nil

	// Parquet format
	case "application/vnd.apache.parquet":
		return &ReadOptions{
			ReadFunction: "read_parquet",
			FormatOption: "PARQUET",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Columnar storage format",
		}, nil

	// Excel formats
	case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
		"application/vnd.ms-excel.sheet.macroEnabled.12",
		"application/vnd.ms-excel.sheet.binary.macroEnabled.12":
		return &ReadOptions{
			ReadFunction: "st_read",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "spatial",
			Description:  "Excel spreadsheet format",
		}, nil

	// Advanced analytics formats
	case "application/vnd.apache.avro":
		return &ReadOptions{
			ReadFunction: "read_avro",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "avro",
			Description:  "Apache Avro binary format",
		}, nil
	case "application/x-delta-lake":
		return &ReadOptions{
			ReadFunction: "delta_scan",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "delta",
			Description:  "Delta Lake tables",
		}, nil
	case "application/x-iceberg":
		return &ReadOptions{
			ReadFunction: "iceberg_scan",
			FormatOption: "PARQUET", // Export as Parquet for consistency
			Parameters:   map[string]string{},
			Extension:    "iceberg",
			Description:  "Apache Iceberg tables",
		}, nil

	// Compressed formats (DuckDB handles decompression transparently)
	case "application/gzip", "application/x-bzip2", "application/x-xz",
		"application/x-lz4", "application/zstd":
		// Assume compressed CSV, which is a common use case
		return &ReadOptions{
			ReadFunction: "read_csv_auto",
			FormatOption: "CSV (HEADER, DELIMITER ',')",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Compressed CSV format",
		}, nil

	default:
		return nil, fmt.Errorf("unsupported content type: %s", contentType)
	}
}

// GetDuckDBReadOptions automatically detects the format from filename and returns read options.
func GetDuckDBReadOptions(filePathOrMIMEType string) (*ReadOptions, error) {
	// MIME types have the format "type/subtype" (e.g., "application/json", "text/csv")
	// They start with known type prefixes like "text/", "application/", "image/", etc.
	// Check if it starts with a MIME type prefix to distinguish from file paths with "/"
	validMIMETypePrefixes := []string{"text/", "application/", "image/", "audio/", "video/", "multipart/"}
	for _, prefix := range validMIMETypePrefixes {
		if strings.HasPrefix(filePathOrMIMEType, prefix) {
			return GetDuckDBReadOptionsByMIMEType(filePathOrMIMEType)
		}
	}

	// Otherwise, treat it as a file path and extract extension
	// This handles paths like "data/file.csv" or "/path/to/data.json" correctly
	extension := filepath.Ext(filePathOrMIMEType)
	if extension != "" {
		return GetDuckDBReadOptionsByExtension(extension)
	}

	// If no extension found, try MIME type mapping as a fallback
	return GetDuckDBReadOptionsByMIMEType(filePathOrMIMEType)
}

// escapeSQLStringLiteral escapes a string literal for safe use in DuckDB SQL queries.
// It escapes single quotes by doubling them, which is the standard SQL escaping method.
func escapeSQLStringLiteral(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

// validateParameterKey validates that a parameter key is a safe SQL identifier.
// This helps prevent SQL injection through parameter names.
func validateParameterKey(key string) error {
	// Allow only alphanumeric characters and underscores, starting with a letter or underscore
	validIdentifier := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
	if !validIdentifier.MatchString(key) {
		return fmt.Errorf("invalid parameter key: %s (only alphanumeric and underscore characters allowed)", key)
	}
	return nil
}

// BuildReadQuery constructs a DuckDB query string for reading data with the given options.
// This function now properly escapes all user input to prevent SQL injection.
func BuildReadQuery(filePath string, options *ReadOptions) (string, error) {
	var params []string

	// Add parameters from the options with proper validation and escaping
	for key, value := range options.Parameters {
		// Validate parameter key to prevent SQL injection through parameter names
		if err := validateParameterKey(key); err != nil {
			return "", err
		}
		// Escape the parameter value to prevent SQL injection through values
		params = append(params, fmt.Sprintf("%s=%s", key, escapeSQLStringLiteral(value)))
	}

	paramStr := ""
	if len(params) > 0 {
		paramStr = ", " + strings.Join(params, ", ")
	}

	// Escape the file path to prevent SQL injection through the file path
	escapedFilePath := escapeSQLStringLiteral(filePath)
	return fmt.Sprintf("%s(%s%s)", options.ReadFunction, escapedFilePath, paramStr), nil
}

// GetRequiredExtensions returns a list of required DuckDB extensions for the given read options.
func GetRequiredExtensions(options *ReadOptions) []string {
	var extensions []string

	// Format-specific extensions
	if options.Extension != "" {
		extensions = append(extensions, options.Extension)
	}

	// Special cases
	if options.ReadFunction == "st_read" {
		extensions = append(extensions, "spatial")
	}

	return extensions
}

// IsFormatSupported checks if a file format is supported.
func IsFormatSupported(filename string) bool {
	_, err := GetDuckDBReadOptions(filename)
	return err == nil
}

// GetSupportedFormats returns a list of all supported file extensions.
func GetSupportedFormats() []string {
	return []string{
		"json", "jsonl", "ndjson",
		"csv", "tsv", "tab",
		"parquet",
		"avro", "orc",
		"delta", "iceberg",
		"xlsx", "xls", "xlsm", "xlsb",
		"xml", "yaml", "yml",
	}
}

// LoadFileFromBytes loads data from byte content into DuckDB as a table.
// This is useful for processing binary file content like CSV, JSON, etc.
//
// Parameters:
//   - data: The binary content of the file
//   - filename: The original filename (used for format detection)
//   - tableName: The name of the table to create in DuckDB
//
// Example:
//
//	csvData := []byte("name,age\nJohn,30\nJane,25")
//	err := client.LoadFileFromBytes(csvData, "users.csv", "users")
func (c *InMemoryClient) LoadFileFromBytes(ctx context.Context, data []byte, filename string, tableName string) error {
	options, err := GetDuckDBReadOptions(filename)
	if err != nil {
		return fmt.Errorf("unsupported format for %s: %w", filename, err)
	}

	// Install required extensions
	for _, ext := range GetRequiredExtensions(options) {
		installQuery := fmt.Sprintf("INSTALL %s;", ext)
		loadQuery := fmt.Sprintf("LOAD %s;", ext)

		if _, installErr := c.db.ExecContext(ctx, installQuery); installErr != nil {
			c.logger.WarnContext(ctx, "failed to install extension", "extension", ext, "error", installErr)
		}
		if _, loadErr := c.db.ExecContext(ctx, loadQuery); loadErr != nil {
			c.logger.WarnContext(ctx, "failed to load extension", "extension", ext, "error", loadErr)
		}
	}

	return c.loadFileAsTable(ctx, data, filename, tableName)
}
