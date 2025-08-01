package duckdb

import (
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
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Standard JSON format",
		}, nil
	case "jsonl", "ndjson":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters:   map[string]string{"format": "newline_delimited"},
			Extension:    "",
			Description:  "Newline-delimited JSON",
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

	default:
		return nil, fmt.Errorf("unsupported file extension: %s", ext)
	}
}

// GetDuckDBReadOptions automatically detects the format from filename and returns read options.
func GetDuckDBReadOptions(filename string) (*ReadOptions, error) {
	ext := filepath.Ext(filename)
	if ext == "" {
		return nil, fmt.Errorf("no file extension found in filename: %s", filename)
	}
	return GetDuckDBReadOptionsByExtension(ext)
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
func (c *InMemoryClient) LoadFileFromBytes(data []byte, filename string, tableName string) error {
	options, err := GetDuckDBReadOptions(filename)
	if err != nil {
		return fmt.Errorf("unsupported format for %s: %w", filename, err)
	}

	// Install required extensions
	for _, ext := range GetRequiredExtensions(options) {
		installQuery := fmt.Sprintf("INSTALL %s;", ext)
		loadQuery := fmt.Sprintf("LOAD %s;", ext)

		if _, installErr := c.db.Exec(installQuery); installErr != nil {
			c.logger.Warn("failed to install extension", "extension", ext, "error", installErr)
		}
		if _, loadErr := c.db.Exec(loadQuery); loadErr != nil {
			c.logger.Warn("failed to load extension", "extension", ext, "error", loadErr)
		}
	}

	return c.loadFileAsTable(data, filename, tableName)
}
