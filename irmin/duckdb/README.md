# DuckDB Integration

High-performance analytical database integration for data processing, transformations, and query execution. Provides SQL analytics capabilities over various data formats.

## Purpose

Enables advanced data operations through:

- **SQL Queries**: Execute SQL against CSV, JSON, Parquet files
- **Data Transformations**: Apply field mappings and format conversions
- **File Merging**: Combine multiple data sources with union operations
- **Schema Analysis**: Automatic detection of data structures and types
- **Format Support**: Read/write operations across multiple data formats

## Key Components

- **`duckdb.go`**: Main client and connection management
- **`readOptions.go`**: File format detection and configuration
- **`merge.go`**: Data merging and union operations
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

## Integration

Used by the **Data Engine** for:

- Field mapping transformations during import/export operations
- SQL query execution in the query engine
- Schema detection and validation
- Data format conversion and merging

## Configuration

Supports extensive configuration options for different data formats, including custom delimiters, header detection, compression, and encoding settings.
