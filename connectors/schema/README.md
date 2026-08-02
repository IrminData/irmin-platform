# Schema Generation Package

This package provides powerful schema generation capabilities for the Irmin Connectors project. It uses DuckDB's analytical engine to analyze data structures and generate comprehensive schemas with support for nested data, type inference, and JSON Schema generation.

## Features

- **Multiple Format Support**: Analyze CSV, JSON, Parquet, Avro, ORC, TSV, and more
- **Nested Structure Analysis**: Handles complex nested objects and arrays
- **Type Inference**: Automatically detects data types from content
- **JSON Schema Generation**: Creates JSON Schema representations
- **Statistics Collection**: Gathers useful metadata about the data
- **In-Memory Processing**: Works with both binary data and Go data structures

## Quick Start

```go
package main

import (
    "fmt"
    "log"
    "log/slog"
    
    "irmin-connectors/schema"
)

func main() {
    logger := slog.Default()
    
    // Create a schema generator
    generator, err := schema.NewGenerator(logger)
    if err != nil {
        log.Fatal(err)
    }
    defer generator.Close()
    
    // Analyze CSV data
    csvData := []byte(`name,age,city,salary
John,30,New York,75000.50
Jane,25,Los Angeles,82000.00
Bob,35,Chicago,68000.75`)
    
    options := schema.DefaultSchemaGenerationOptions()
    result, err := generator.GenerateSchemaFromBytes(csvData, "employees.csv", options)
    if err != nil {
        log.Fatal(err)
    }
    
    // Print schema information
    fmt.Printf("Format: %s\n", result.Schema.Format)
    fmt.Printf("Rows: %d\n", *result.Schema.RowCount)
    fmt.Printf("Size: %d bytes\n", *result.Schema.SizeBytes)
    fmt.Printf("Fields:\n")
    
    for _, field := range result.Schema.Fields {
        fmt.Printf("  - %s: %s (required: %t)\n", 
            field.Name, field.Type, field.Required)
    }
}
```

## Core Components

### Generator

The main entry point for schema generation:

```go
// Create a new generator
generator, err := schema.NewGenerator(logger)
defer generator.Close()

// Analyze binary file content
result, err := generator.GenerateSchemaFromBytes(data, "file.csv", options)

// Analyze Go data structures
result, err := generator.GenerateSchemaFromData(goData, "csv", options)
```

### Schema Types

#### DataSchema
Contains the complete schema information:
```go
type DataSchema struct {
    Fields      []SchemaField          `json:"fields"`
    Format      string                 `json:"format"`
    RowCount    *int                   `json:"row_count,omitempty"`
    SizeBytes   *int64                 `json:"size_bytes,omitempty"`
    Metadata    map[string]any `json:"metadata,omitempty"`
    JSONSchema  *json.RawMessage       `json:"json_schema,omitempty"`
}
```

#### SchemaField
Represents individual fields with support for nested structures:
```go
type SchemaField struct {
    Name     string        `json:"name"`
    Type     string        `json:"type"`
    Required bool          `json:"required"`
    Children []SchemaField `json:"children,omitempty"`
}
```

### Configuration Options

```go
type SchemaGenerationOptions struct {
    IncludeJSONSchema bool `json:"include_json_schema"`
    SampleSize        int  `json:"sample_size"`
    InferTypes        bool `json:"infer_types"`
    DetectRequired    bool `json:"detect_required"`
}

// Use defaults
options := schema.DefaultSchemaGenerationOptions()

// Or customize
options := schema.SchemaGenerationOptions{
    IncludeJSONSchema: true,
    SampleSize:        500,
    InferTypes:        true,
    DetectRequired:    false,
}
```

## Usage Examples

### Analyzing CSV Data

```go
csvData := []byte(`product,price,category,in_stock
Widget A,19.99,Tools,true
Widget B,29.99,Electronics,false
Widget C,15.50,Tools,true`)

result, err := generator.GenerateSchemaFromBytes(csvData, "products.csv", options)
if err != nil {
    log.Fatal(err)
}

// Access field information
for _, field := range result.Schema.Fields {
    fmt.Printf("Field: %s, Type: %s\n", field.Name, field.Type)
}
```

### Analyzing JSON with Nested Structures

```go
jsonData := []byte(`[
    {
        "user": "john_doe",
        "profile": {
            "name": "John Doe",
            "age": 30,
            "tags": ["developer", "golang"]
        },
        "orders": [
            {"id": 1, "amount": 99.99},
            {"id": 2, "amount": 149.99}
        ]
    }
]`)

result, err := generator.GenerateSchemaFromBytes(jsonData, "users.json", options)
if err != nil {
    log.Fatal(err)
}

// The schema will include nested structures:
// - profile: STRUCT with name, age fields
// - orders: ARRAY<STRUCT> with id, amount fields
```

### Analyzing Go Data Structures

```go
data := []map[string]any{
    {
        "id":       1,
        "name":     "John",
        "active":   true,
        "score":    85.5,
        "metadata": map[string]any{"role": "admin", "level": 3},
    },
    {
        "id":       2,
        "name":     "Jane",
        "active":   false,
        "score":    92.3,
        "metadata": map[string]any{"role": "user", "level": 1},
    },
}

result, err := generator.GenerateSchemaFromData(data, "users", options)
if err != nil {
    log.Fatal(err)
}
```

### Working with JSON Schema Output

```go
options := schema.DefaultSchemaGenerationOptions()
options.IncludeJSONSchema = true

result, err := generator.GenerateSchemaFromBytes(data, "data.json", options)
if err != nil {
    log.Fatal(err)
}

if result.Schema.JSONSchema != nil {
    // Use the JSON Schema for validation, documentation, etc.
    var jsonSchema map[string]any
    json.Unmarshal(*result.Schema.JSONSchema, &jsonSchema)
    
    fmt.Printf("JSON Schema:\n%s\n", 
        mustMarshalIndent(jsonSchema, "", "  "))
}
```

## Supported Data Types

The schema generator recognizes and handles:

### Primitive Types
- `VARCHAR/TEXT` → String data
- `INTEGER/BIGINT` → Integer numbers
- `DOUBLE/REAL` → Floating-point numbers
- `BOOLEAN` → Boolean values
- `DATE` → Date values
- `TIMESTAMP` → Date-time values

### Complex Types
- `STRUCT` → Nested objects
- `ARRAY<type>` → Arrays of primitives
- `ARRAY<STRUCT>` → Arrays of objects

### Format Support
- **CSV/TSV**: Comma/tab-separated values
- **JSON/JSONL**: JSON objects and arrays
- **Parquet**: Columnar storage format
- **Avro**: Binary serialization format
- **ORC**: Optimized Row Columnar format

## Integration with Connectors

This schema package is designed to integrate seamlessly with Irmin connectors:

```go
// In a connector implementation
func (c *MyConnector) AnalyzeSchema(data []byte, filename string) (*schema.SchemaAnalysisResult, error) {
    generator, err := schema.NewGenerator(c.logger)
    if err != nil {
        return nil, err
    }
    defer generator.Close()
    
    options := schema.DefaultSchemaGenerationOptions()
    return generator.GenerateSchemaFromBytes(data, filename, options)
}
```

## Performance Considerations

- **Sample Size**: Use `SampleSize` option to limit analysis to first N rows for large datasets
- **Memory Usage**: The generator creates temporary DuckDB tables; ensure adequate memory
- **File Size**: Large files are processed efficiently thanks to DuckDB's analytical engine
- **Cleanup**: Always call `generator.Close()` to free DuckDB resources

## Error Handling

```go
result, err := generator.GenerateSchemaFromBytes(data, filename, options)
if err != nil {
    // Handle specific error cases
    switch {
    case strings.Contains(err.Error(), "unsupported format"):
        // Handle unsupported file format
    case strings.Contains(err.Error(), "failed to load data"):
        // Handle data loading issues
    default:
        // Handle other errors
    }
    return err
}

// Check for warnings
if len(result.Warnings) > 0 {
    for _, warning := range result.Warnings {
        log.Printf("Warning: %s", warning)
    }
}
```

## Testing

Run the test suite:

```bash
go test ./schema -v
```

The tests cover:
- Schema generation from various data formats
- Nested structure handling
- JSON Schema generation
- Type inference accuracy
- Error conditions and edge cases

## Differences from Core API

This connector schema package differs from the Core API implementation:

- **No S3/LakeFS Dependencies**: Works with in-memory data only
- **Simplified Interface**: Focused on connector use cases
- **Enhanced Statistics**: More detailed metadata collection
- **Format Detection**: Automatic format detection from filenames
- **Connector Integration**: Designed for easy integration with connector implementations

## Advanced Usage

### Custom Statistics Collection

```go
// Access detailed statistics
result, _ := generator.GenerateSchemaFromBytes(data, filename, options)

fmt.Printf("Row Count: %v\n", result.Statistics["row_count"])
fmt.Printf("Column Count: %v\n", result.Statistics["column_count"])
```

### Schema Comparison

```go
// Generate schemas for different datasets
schema1, _ := generator.GenerateSchemaFromBytes(data1, "file1.csv", options)
schema2, _ := generator.GenerateSchemaFromBytes(data2, "file2.csv", options)

// Compare field counts
fmt.Printf("Schema 1 has %d fields\n", len(schema1.Schema.Fields))
fmt.Printf("Schema 2 has %d fields\n", len(schema2.Schema.Fields))
```

This schema generation package provides a robust foundation for data analysis and connector development within the Irmin ecosystem!