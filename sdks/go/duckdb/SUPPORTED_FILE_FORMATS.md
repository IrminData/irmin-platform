# Supported File Formats

This document outlines all the structured file formats supported by the Irmin Go SDK for querying, schema generation, and data parsing using DuckDB.

## Implementation

File format handling is implemented in `read_options.go` which provides a centralized system for:

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

// Build DuckDB read query string
query, err := duckdb.BuildReadQuery("data.csv", options)
```

## Core Formats (Always Available)

### JSON Formats

| Format | Extension | Description | DuckDB Function |
| - | - | - | - |
| JSON | `.json` | Standard JSON format | `read_json_auto()` |
| JSON Lines | `.jsonl` | Newline-delimited JSON | `read_json_auto(..., format='newline_delimited')` |
| NDJSON | `.ndjson` | Newline-delimited JSON (alternative) | `read_json_auto(..., format='newline_delimited')` |

### CSV Formats

| Format | Extension | Description | DuckDB Function |
| - | - | - | - |
| CSV | `.csv` | Comma-separated values | `read_csv_auto()` |
| TSV | `.tsv` | Tab-separated values | `read_csv_auto(..., delim='\t')` |
| TAB | `.tab` | Tab-separated values (alternative) | `read_csv_auto(..., delim='\t')` |

### Parquet

| Format | Extension | Description | DuckDB Function |
| - | - | - | - |
| Parquet | `.parquet` | Columnar storage format | `read_parquet()` |

## Advanced Analytics Formats (Requires Extensions)

### Apache Formats

| Format | Extension | Description | DuckDB Function | Required Extension |
| - | - | - | - | - |
| Avro | `.avro` | Apache Avro binary format | `read_avro()` | `avro` |
| ORC | `.orc` | Optimized Row Columnar format | `read_orc()` | Built-in |

### Lakehouse Formats

| Format | Extension | Description | DuckDB Function | Required Extension |
| - | - | - | - | - |
| Delta Lake | `.delta` | Delta Lake tables | `delta_scan()` | `delta` |
| Iceberg | `.iceberg` | Apache Iceberg tables | `iceberg_scan()` | `iceberg` |

### Office Formats

| Format | Extension | Description | DuckDB Function | Required Extension |
| - | - | - | - | - |
| Excel XLSX | `.xlsx` | Excel Open XML format | `st_read()` | `spatial` |
| Excel XLS | `.xls` | Excel legacy format | `st_read()` | `spatial` |
| Excel XLSM | `.xlsm` | Excel with macros | `st_read()` | `spatial` |
| Excel XLSB | `.xlsb` | Excel binary format | `st_read()` | `spatial` |

## Experimental Formats (Limited Support)

### Text-Based Formats

| Format | Extension | Description | DuckDB Function | Notes |
| - | - | - | - | - |
| XML | `.xml` | Extensible Markup Language | `read_csv()` | Parsed as text/CSV |
| YAML | `.yaml`, `.yml` | YAML Ain't Markup Language | `read_csv()` | Parsed as text/CSV |

## Extension Requirements

Some file formats require specific DuckDB extensions to be installed:

### Core Extensions (Auto-installed)

- `spatial` - Provides Excel file reading capabilities

### Optional Extensions (Auto-installed when available)

- `avro` - Apache Avro support
- `delta` - Delta Lake support
- `iceberg` - Apache Iceberg support
- `autocomplete` - Enhanced CLI experience
- `json` - Enhanced JSON processing
- `vss` - Vector Similarity Search

### Extension Installation

Extensions are automatically installed when the DuckDB client is created. If an extension fails to install, the application will log a warning but continue to operate with the available formats.
