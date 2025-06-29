# Supported File Formats

This document outlines all the structured file formats supported by Irmin for querying, schema generation, and data parsing using DuckDB.

## Implementation

File format handling is implemented in `readOptions.go` which provides a centralized system for:

- **Format Detection**: Automatic detection based on file extensions or MIME types
- **Read Function Mapping**: Maps formats to appropriate DuckDB read functions
- **Parameter Management**: Handles format-specific parameters (delimiters, headers, etc.)
- **Extension Requirements**: Tracks required DuckDB extensions for each format
- **Query Building**: Constructs proper DuckDB query strings

### Key Functions

```go
// Get read options by file extension
options, err := duckdb.GetDuckDBReadOptionsByExtension(".csv")

// Get read options by MIME type
options, err := duckdb.GetDuckDBReadOptionsByMIMEType("text/csv")

// Automatic detection (tries extension first, then MIME type)
options, err := duckdb.GetDuckDBReadOptions("data.csv")

// Extract from object path (for query parsing)
options, err := duckdb.GetDuckDBReadOptionsFromObject("users.json")

// Build DuckDB query string
query := duckdb.BuildReadQuery("s3://bucket/file.csv", options)
```

## Core Formats (Always Available)

### JSON Formats

| Format     | Extension | Description                          | DuckDB Function                                   |
| ---------- | --------- | ------------------------------------ | ------------------------------------------------- |
| JSON       | `.json`   | Standard JSON format                 | `read_json_auto()`                                |
| JSON Lines | `.jsonl`  | Newline-delimited JSON               | `read_json_auto(..., format='newline_delimited')` |
| NDJSON     | `.ndjson` | Newline-delimited JSON (alternative) | `read_json_auto(..., format='newline_delimited')` |

### CSV Formats

| Format | Extension | Description                        | DuckDB Function                  |
| ------ | --------- | ---------------------------------- | -------------------------------- |
| CSV    | `.csv`    | Comma-separated values             | `read_csv_auto()`                |
| TSV    | `.tsv`    | Tab-separated values               | `read_csv_auto(..., delim='\t')` |
| TAB    | `.tab`    | Tab-separated values (alternative) | `read_csv_auto(..., delim='\t')` |

### Parquet

| Format  | Extension  | Description             | DuckDB Function  |
| ------- | ---------- | ----------------------- | ---------------- |
| Parquet | `.parquet` | Columnar storage format | `read_parquet()` |

## Advanced Analytics Formats (Requires Extensions)

### Apache Formats

| Format | Extension | Description                   | DuckDB Function | Required Extension |
| ------ | --------- | ----------------------------- | --------------- | ------------------ |
| Avro   | `.avro`   | Apache Avro binary format     | `read_avro()`   | `avro`             |
| ORC    | `.orc`    | Optimized Row Columnar format | `read_orc()`    | Built-in           |

### Lakehouse Formats

| Format     | Extension  | Description           | DuckDB Function  | Required Extension |
| ---------- | ---------- | --------------------- | ---------------- | ------------------ |
| Delta Lake | `.delta`   | Delta Lake tables     | `delta_scan()`   | `delta`            |
| Iceberg    | `.iceberg` | Apache Iceberg tables | `iceberg_scan()` | `iceberg`          |

### Office Formats

| Format     | Extension | Description           | DuckDB Function | Required Extension |
| ---------- | --------- | --------------------- | --------------- | ------------------ |
| Excel XLSX | `.xlsx`   | Excel Open XML format | `st_read()`     | `spatial`          |
| Excel XLS  | `.xls`    | Excel legacy format   | `st_read()`     | `spatial`          |
| Excel XLSM | `.xlsm`   | Excel with macros     | `st_read()`     | `spatial`          |
| Excel XLSB | `.xlsb`   | Excel binary format   | `st_read()`     | `spatial`          |

## Experimental Formats (Limited Support)

### Text-Based Formats

| Format | Extension       | Description                | DuckDB Function | Notes              |
| ------ | --------------- | -------------------------- | --------------- | ------------------ |
| XML    | `.xml`          | Extensible Markup Language | `read_csv()`    | Parsed as text/CSV |
| YAML   | `.yaml`, `.yml` | YAML Ain't Markup Language | `read_csv()`    | Parsed as text/CSV |

## Usage Examples

### Query Examples

```sql
-- Query a JSON file
SELECT * FROM $["workspace;repository@branch:path/to/file.json"];

-- Query a Delta Lake table
SELECT * FROM $["workspace;repository@branch:path/to/delta_table.delta"];

-- Query an Excel file
SELECT * FROM $["workspace;repository@branch:path/to/spreadsheet.xlsx"];
```

### API Examples

```go
// Parse multiple file formats
files := map[string][]byte{
    "data.json":     jsonData,
    "data.csv":      csvData,
    "data.tsv":      tsvData,
    "data.jsonl":    jsonlData,
    "data.xlsx":     excelData,
    "data.parquet":  parquetData,
}

results, err := lib.ParseStructuredFiles(ctx, files, env, logger)
```

### Programmatic Usage

```go
// Get read options for a specific format
options, err := duckdb.GetDuckDBReadOptionsByExtension(".csv")
if err != nil {
    return err
}

// Check if format is supported
if duckdb.IsFormatSupported("data.avro") {
    // Handle Avro file
}

// Get required extensions
extensions := duckdb.GetRequiredExtensions(options)
// Returns: ["httpfs"] for CSV, ["httpfs", "spatial"] for Excel, etc.

// Build query string
query := duckdb.BuildReadQuery("s3://bucket/data.csv", options)
// Returns: "read_csv_auto('s3://bucket/data.csv')"
```

## Extension Requirements

Some file formats require specific DuckDB extensions to be installed:

### Core Extensions (Auto-installed)

- `httpfs` - Required for S3/HTTP access
- `spatial` - Provides Excel file reading capabilities

### Optional Extensions (Auto-installed when available)

- `avro` - Apache Avro support
- `delta` - Delta Lake support
- `iceberg` - Apache Iceberg support
- `autocomplete` - Enhanced CLI experience

### Extension Installation

Extensions are automatically installed when the DuckDB client is created. If an extension fails to install, the application will log a warning but continue to operate with the available formats.

## Integration with Query Engine

The `readOptions.go` implementation is integrated with the query engine in `engine/queries.go`:

1. **Format Detection**: Uses MIME type first, falls back to file extension
2. **Query Construction**: Automatically builds appropriate DuckDB read queries
3. **Error Handling**: Provides clear error messages for unsupported formats
4. **Parameter Management**: Handles format-specific parameters automatically

### Query Processing Flow

```
1. Parse Irmin query placeholder
2. Extract object path and content type
3. Get read options (MIME type → file extension fallback)
4. Build DuckDB read query with proper parameters
5. Execute query with required extensions
```

## Performance Considerations

### Optimal Formats for Analytics

1. **Parquet** - Best for analytical workloads, columnar storage
2. **Delta Lake** - Good for large datasets with ACID transactions
3. **Iceberg** - Good for large datasets with schema evolution
4. **CSV** - Good for smaller datasets, human-readable

### Large Files

- Use formats with good compression (Parquet, Delta Lake)
- Consider partitioning for very large datasets
- TSV/CSV may be slower for large analytical queries

## Troubleshooting

### Common Issues

1. **Extension Not Available**

   - Some extensions may not be available on all platforms
   - Check DuckDB version compatibility
   - Fallback handling is built-in for most cases

2. **File Format Detection**

   - File format is determined by file extension or MIME type
   - Ensure correct file extensions are used
   - MIME type detection has priority over extension detection

3. **Performance Issues**
   - Large uncompressed CSV/TSV files may be slow
   - Consider converting to Parquet for better performance
   - Use appropriate indexing and partitioning

### Error Messages

- "Unsupported file extension" - File extension not recognized
- "Unsupported content type" - MIME type not recognized
- "Failed to load extension" - Required DuckDB extension unavailable
- "Failed to create view" - File content doesn't match expected format

## Adding New Formats

To add support for a new file format:

1. **Update `readOptions.go`**:

   ```go
   case "newformat":
       return &ReadOptions{
           ReadFunction: "read_newformat",
           FormatOption: "PARQUET",
           Parameters:   map[string]string{},
           Extension:    "newformat_ext",
           Description:  "New format description",
       }, nil
   ```

2. **Update MIME type mapping** (if applicable):

   ```go
   case "application/x-newformat":
       return &ReadOptions{...}, nil
   ```

3. **Update this documentation** with format details

4. **Test with sample files** to ensure proper functionality

## Future Enhancements

Planned additions include:

- Support for additional compression formats
- Enhanced XML/YAML parsing capabilities
- Support for more office document formats
- Integration with additional lakehouse formats
- Performance optimizations for large files
- Automatic format detection based on file content

For the most up-to-date information on supported formats, refer to the [DuckDB documentation](https://duckdb.org/docs/stable/guides/file_formats/overview.html).
