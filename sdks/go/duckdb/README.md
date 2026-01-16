# DuckDB In-Memory Client

This package provides a DuckDB client designed for in-memory data processing within the Irmin Go SDK. Unlike the API version that operates on S3/LakeFS objects, this client focuses on processing data that's already loaded into memory.

## Features

- **In-Memory Processing**: Works with data structures in Go memory without external storage dependencies
- **Multiple Format Support**: Handles CSV, JSON, Parquet, Avro, ORC, and more
- **Data Merging**: Combine multiple data sources with different merge strategies
- **Type Detection**: Automatically detects column types from Go data structures
- **Query Interface**: Standard SQL interface for data analysis

## Quick Start

```go
package main

import (
    "log/slog"
    "github.com/IrminData/irmin-sdk-go/duckdb"
)

func main() {
    logger := slog.Default()
    
    // Create a new in-memory DuckDB client
    client, err := duckdb.NewInMemoryClient(logger)
    if err != nil {
        panic(err)
    }
    defer client.Close()
    
    // Load data from Go structures
    data := []map[string]any{
        {"id": 1, "name": "John", "age": 30},
        {"id": 2, "name": "Jane", "age": 25},
    }
    
    err = client.CreateTableFromData("users", data)
    if err != nil {
        panic(err)
    }
    
    // Query the data
    results, err := client.QueryToMap("SELECT * FROM users WHERE age > 25")
    if err != nil {
        panic(err)
    }
    
    // Process results
    for _, row := range results {
        fmt.Printf("User: %s, Age: %v\n", row["name"], row["age"])
    }
}
```

## Core Components

### InMemoryClient

The main client for DuckDB operations:

```go
// Create a new client
client, err := duckdb.NewInMemoryClient(logger)

// Execute queries
rows, err := client.ExecuteQuery("SELECT * FROM table")
result, err := client.ExecuteNonQuery("INSERT INTO table VALUES (?, ?)", val1, val2)

// Convert results to Go maps
results, err := client.QueryToMap("SELECT * FROM table")

// Load Go data into DuckDB
err = client.CreateTableFromData("table_name", dataSlice)

// Load binary file content into DuckDB
csvBytes := []byte("name,age\nJohn,30\nJane,25")
err = client.LoadFileFromBytes(csvBytes, "users.csv", "users")
```

### Data Merging

Combine multiple data sources with different strategies:

```go
// Merge in-memory data sources
dataSources := map[string][]map[string]any{
    "source1": data1,
    "source2": data2,
}

result, err := client.MergeDataSources(
    dataSources, 
    "merged_table",
    duckdb.MergeStrategyUnion,
)

// Merge files from byte content
sourceFiles := map[string][]byte{
    "data1.csv": csvContent1,
    "data2.csv": csvContent2,
}

result, err := client.MergeFiles(
    sourceFiles,
    "merged_table", 
    duckdb.MergeStrategyUnionDistinct,
)
```

### Merge Strategies

- **MergeStrategyUnion**: Combines all rows (allows duplicates)
- **MergeStrategyUnionDistinct**: Combines rows but removes exact duplicates
- **MergeStrategyFirstWins**: Keeps rows from first source when conflicts occur
- **MergeStrategyLastWins**: Keeps rows from last source when conflicts occur

### Format Support

Check supported formats and get read options:

```go
// Check if format is supported
supported := duckdb.IsFormatSupported("data.csv")

// Get read options for a file (auto-detects from extension or MIME type)
options, err := duckdb.GetDuckDBReadOptions("data.json")

// Get read options specifically by MIME type
options, err := duckdb.GetDuckDBReadOptionsByMIMEType("application/json")

// Get all supported formats
formats := duckdb.GetSupportedFormats()
```

## Supported File Formats

For a complete list of supported formats and details, see [SUPPORTED_FILE_FORMATS.md](SUPPORTED_FILE_FORMATS.md).

Common formats include:
- **JSON**: `.json`, `.jsonl`, `.ndjson`
- **CSV**: `.csv`, `.tsv`, `.tab`
- **Columnar**: `.parquet`, `.orc`
- **Apache**: `.avro`
- **Lakehouse**: `.delta`, `.iceberg`
- **Excel**: `.xlsx`, `.xls`, `.xlsm`, `.xlsb`
- **Experimental**: `.xml`, `.yaml`, `.yml`

## Vector Similarity Search (VSS)

The SDK supports the DuckDB VSS extension for vector similarity search operations. The extension is automatically loaded if available.

```go
// Example usage of VSS functions in queries
query := `
    SELECT array_cosine_distance(embedding, [0.1, 0.2, 0.3]::FLOAT[3]) as distance
    FROM embeddings
    ORDER BY distance
    LIMIT 5
`
results, err := client.QueryToMap(ctx, query)
```

## Utility Functions

The package provides several utility functions for SQL generation and data processing:

```go
// Escape single quotes in SQL strings to prevent injection
safeString := duckdb.EscapeSQLString("O'Reilly") // Returns "O''Reilly"

// Validate and quote SQL identifiers (tables, columns)
safeIdentifier, err := duckdb.ValidateSQLIdentifier("user_table") // Returns "\"user_table\""

// Check if a file extension represents structured data
isStructured := duckdb.IsStructuredFormat(".parquet") // Returns true
```

## Usage Examples

### Basic Data Loading

```go
// Load CSV-like data from Go structures
csvData := []map[string]any{
    {"product": "Widget A", "price": 19.99, "category": "Tools"},
    {"product": "Widget B", "price": 29.99, "category": "Electronics"},
}

err = client.CreateTableFromData("products", csvData)

// Load binary file content (CSV example)
csvBytes := []byte(`name,age,city
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`)

err = client.LoadFileFromBytes(csvBytes, "users.csv", "users")

// Load JSON file content
jsonBytes := []byte(`[
    {"name": "Alice", "age": 28, "city": "Boston"},
    {"name": "Charlie", "age": 32, "city": "Seattle"}
]`)

err = client.LoadFileFromBytes(jsonBytes, "users.json", "json_users")
```

### Complex Queries

```go
// Aggregate queries
results, err := client.QueryToMap(`
    SELECT category, COUNT(*) as count, AVG(price) as avg_price 
    FROM products 
    GROUP BY category
`)

// Join operations (after loading multiple tables)
results, err := client.QueryToMap(`
    SELECT p.product, p.price, c.discount
    FROM products p
    JOIN coupons c ON p.category = c.category
`)
```

### Data Type Handling

The client automatically detects types:
- `int`, `int32`, `int64` → `INTEGER`
- `float32`, `float64` → `DOUBLE`
- `bool` → `BOOLEAN`
- Everything else → `VARCHAR`

## Error Handling

All functions return errors for proper error handling:

```go
client, err := duckdb.NewInMemoryClient(logger)
if err != nil {
    log.Fatalf("Failed to create client: %v", err)
}

err = client.CreateTableFromData("table", data)
if err != nil {
    log.Printf("Failed to create table: %v", err)
    return
}
```

## Testing

Run the test suite:

```bash
cd duckdb/
go test -v
```

The tests cover:
- Client creation and basic operations
- Data loading and querying
- Format detection and support
- Merge operations with different strategies

## Differences from API Version

This SDK version differs from the API implementation:

- **No S3/LakeFS Dependencies**: Works purely in-memory
- **Go Data Structures**: Direct integration with Go `[]map[string]any`
- **Simplified Configuration**: No external storage configuration needed
- **Memory Focused**: Optimized for processing data already in memory

## Performance Considerations

- DuckDB is optimized for analytical workloads
- Large datasets benefit from columnar storage formats
- Use appropriate merge strategies to minimize memory usage
- Consider batch processing for very large datasets