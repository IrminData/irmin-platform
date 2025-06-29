package duckdb

import (
	"fmt"
	"path/filepath"
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
		return nil, fmt.Errorf("unsupported file extension: %s", extension)
	}
}

// GetDuckDBReadOptionsByMIMEType maps a MIME type to the appropriate DuckDB read options.
func GetDuckDBReadOptionsByMIMEType(contentType string) (*ReadOptions, error) {
	switch contentType {
	// JSON formats
	case "application/json":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters:   map[string]string{},
			Extension:    "",
			Description:  "Standard JSON format",
		}, nil
	case "application/jsonl", "application/x-ndjson":
		return &ReadOptions{
			ReadFunction: "read_json_auto",
			FormatOption: "JSON",
			Parameters:   map[string]string{"format": "newline_delimited"},
			Extension:    "",
			Description:  "Newline-delimited JSON",
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

// GetDuckDBReadOptions automatically determines the appropriate read options
// based on either a file path (extension) or MIME type.
func GetDuckDBReadOptions(filePathOrMIMEType string) (*ReadOptions, error) {
	// First, try to treat it as a file path and extract extension
	if strings.Contains(filePathOrMIMEType, ".") || !strings.Contains(filePathOrMIMEType, "/") {
		extension := filepath.Ext(filePathOrMIMEType)
		if extension != "" {
			return GetDuckDBReadOptionsByExtension(extension)
		}
	}

	// If no extension found or it looks like a MIME type, try MIME type mapping
	return GetDuckDBReadOptionsByMIMEType(filePathOrMIMEType)
}

// GetDuckDBReadOptionsFromObject extracts read options from an object path
// This integrates with the query parsing functionality.
func GetDuckDBReadOptionsFromObject(object string) (*ReadOptions, error) {
	// Extract file extension from object path
	extension := filepath.Ext(object)
	if extension == "" {
		return nil, fmt.Errorf("no file extension found in object: %s", object)
	}

	return GetDuckDBReadOptionsByExtension(extension)
}

// BuildReadQuery constructs a DuckDB query string for reading a file.
func BuildReadQuery(filePath string, options *ReadOptions) string {
	// Build parameter string
	var params []string
	for key, value := range options.Parameters {
		params = append(params, fmt.Sprintf("%s='%s'", key, value))
	}

	paramStr := ""
	if len(params) > 0 {
		paramStr = ", " + strings.Join(params, ", ")
	}

	return fmt.Sprintf("%s('%s'%s)", options.ReadFunction, filePath, paramStr)
}

// GetRequiredExtensions returns a list of required DuckDB extensions for the given read options.
func GetRequiredExtensions(options *ReadOptions) []string {
	var extensions []string

	// Core extensions that are always needed
	extensions = append(extensions, "httpfs") // For S3/HTTP access

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
func IsFormatSupported(filePathOrMIMEType string) bool {
	_, err := GetDuckDBReadOptions(filePathOrMIMEType)
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
