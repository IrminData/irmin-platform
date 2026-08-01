# DuckDB Integration

High-performance analytical database integration for data processing, transformations, query execution, and vector similarity search. Provides SQL analytics capabilities over various data formats with support for embeddings and semantic search.

## Purpose

Enables advanced data operations through:

- **SQL Queries**: Execute SQL against CSV, JSON, Parquet files
- **Data Transformations**: Apply field mappings and format conversions
- **File Merging**: Combine multiple data sources with union operations
- **Schema Analysis**: Automatic detection of data structures and types
- **Format Support**: Read/write operations across multiple data formats
- **Vector Similarity Search**: Perform semantic search using the VSS extension

## Key Components

- **`duckdb.go`**: Main client and connection management
- **`readOptions.go`**: File format detection and configuration
- **`merge.go`**: Data merging and union operations
- **`vss_test.go`**: Vector Similarity Search (VSS) extension testing
- **`SUPPORTED_FILE_FORMATS.md`**: Comprehensive format support documentation

## Supported Formats

- **CSV/TSV**: Comma and tab-separated values with configurable delimiters
- **JSON**: JSON objects and arrays with nested structure support
- **Parquet**: Columnar format with efficient querying
- **Auto-Detection**: Intelligent format detection from file extensions and content

## Features

- **High Performance**: Columnar query engine optimized for analytics
- **Memory Efficient**: Stream processing for large datasets
- **Schema Inference**: Automatic data type detection
- **SQL Compatibility**: Standard SQL syntax with analytical extensions
- **Concurrent Access**: Thread-safe operations for parallel processing
- **Vector Search**: Built-in VSS extension for embeddings and similarity search

## VSS Extension

The Vector Similarity Search (VSS) extension provides efficient semantic search capabilities:

### Features

- **Cosine Similarity/Distance**: `array_cosine_similarity()` and `array_cosine_distance()`
- **Array Operations**: Native support for FLOAT arrays of fixed dimensions
- **Parquet Integration**: Direct vector search on Parquet files
- **High-Dimensional Vectors**: Supports embeddings up to thousands of dimensions
- **NULL Handling**: Graceful handling of NULL vectors

### Functions

```sql
-- Cosine similarity (returns -1 to 1, higher is more similar)
SELECT array_cosine_similarity([1.0, 2.0, 3.0]::FLOAT[3], [1.1, 2.1, 2.9]::FLOAT[3]);

-- Cosine distance (returns 0 to 2, lower is more similar)
SELECT array_cosine_distance([1.0, 2.0, 3.0]::FLOAT[3], [1.1, 2.1, 2.9]::FLOAT[3]);

-- Search embeddings in a table
SELECT id, content, array_cosine_distance(embedding, query_vector) as distance
FROM embeddings
ORDER BY distance ASC
LIMIT 10;

-- Search embeddings in a Parquet file
SELECT id, content, array_cosine_distance(embedding::FLOAT[1536], query_vector) as distance
FROM read_parquet('embeddings.parquet')
ORDER BY distance ASC
LIMIT 10;
```

### Testing

Comprehensive VSS tests verify:
- Extension installation and loading
- Cosine similarity/distance accuracy
- Table and Parquet file searches
- High-dimensional vector support (128+ dimensions)
- Performance with large datasets (1000+ embeddings)
- Error handling (dimension mismatches, NULL values)

Run VSS tests:
```bash
go test ./duckdb -v -run TestVSS
```

## Integration

Used by the **Data Engine** for:

- Field mapping transformations during import/export operations
- SQL query execution in the query engine
- Schema detection and validation
- Data format conversion and merging
- **Embeddings package**: Vector storage and similarity search

## Configuration

Supports extensive configuration options for different data formats, including custom delimiters, header detection, compression, and encoding settings.

### Optional Extensions

The client automatically installs optional extensions including:
- `spatial` - Excel file reading via st_read()
- `avro` - Apache Avro files
- `delta` - Delta Lake format
- `iceberg` - Apache Iceberg format
- `autocomplete` - Enhanced autocomplete
- `vss` - Vector Similarity Search for embeddings

Set `SkipOptionalDuckDBExtensions=true` to disable optional extension loading.
