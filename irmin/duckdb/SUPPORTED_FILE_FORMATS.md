# Supported File Formats

This document outlines all the structured file formats supported by Irmin for querying, schema generation, and data parsing using DuckDB.

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

   - File format is determined by file extension
   - Ensure correct file extensions are used

3. **Performance Issues**
   - Large uncompressed CSV/TSV files may be slow
   - Consider converting to Parquet for better performance
   - Use appropriate indexing and partitioning

### Error Messages

- "Unsupported file type" - File extension not recognized
- "Failed to load extension" - Required DuckDB extension unavailable
- "Failed to create view" - File content doesn't match expected format

## Future Enhancements

Planned additions include:

- Support for additional compression formats
- Enhanced XML/YAML parsing capabilities
- Support for more office document formats
- Integration with additional lakehouse formats
- Performance optimizations for large files

For the most up-to-date information on supported formats, refer to the [DuckDB documentation](https://duckdb.org/docs/stable/guides/file_formats/overview.html).
