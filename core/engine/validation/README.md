# Schema Validation

The `validation` package provides unified schema validation capabilities for the Irmin data engine. It supports JSON schema validation, DuckDB-based structured file validation (CSV, Parquet, etc.), and schema compatibility checking.

## Overview

This package consolidates all validation logic that was previously spread across `lib/` and the top-level `validation/` package into a single, well-tested location.

## Validation Types

### 1. JSON Validation

Validates JSON files against JSON Schema with detailed error reporting:

- Type validation (string, number, integer, boolean, null, array, object)
- Required field validation
- Nested object validation
- Array item validation with row index tracking
- Constraint validation (minLength, maxLength, minimum, maximum, enum)
- Detailed error paths (e.g., `users[0].profile.email`)
- Actionable suggestions for fixes

### 2. Structured File Validation

Uses DuckDB to validate non-JSON structured files:

- CSV validation against schema
- Parquet validation
- Excel file validation (xlsx, xls)
- Type compatibility checking between DuckDB types and JSON Schema types
- Missing/extra field detection

### 3. Schema Compatibility

Compares two schemas to detect breaking and non-breaking changes:

- Added/removed fields
- Type changes
- Required field changes
- Nullability changes

## Usage

### Basic Validation

```go
import (
    "context"
    enginevalidation "irmin-api/engine/validation"
)

// Validate a single JSON file
result := enginevalidation.ValidateFile(
    ctx,
    "data.json",
    jsonData,
    schema,
    nil, // No config needed for JSON validation
)

if !result.Valid {
    for _, err := range result.Errors {
        fmt.Printf("Error at %s: %s\n", err.FieldPath, err.Message)
    }
}
```

### Validate Multiple Files

```go
files := map[string][]byte{
    "users.json": usersData,
    "orders.json": ordersData,
}

result := enginevalidation.ValidateFiles(ctx, files, groupSchema, nil)
```

### Validate Non-JSON Files (CSV, Parquet)

```go
config := &enginevalidation.Config{
    Ctx:    ctx,
    Env:    env,
    Logger: logger,
}

result := enginevalidation.ValidateFile(ctx, "data.csv", csvData, schema, config)
```

### Check Schema Compatibility

```go
diff := enginevalidation.CheckSchemaCompatibility(dataSchema, targetSchema)

if !diff.Compatible {
    issues := enginevalidation.GetSchemaCompatibilityIssues(diff)
    for _, issue := range issues {
        fmt.Println(issue)
    }
}
```

## Result Structure

The `SchemaValidationResult` provides detailed error information:

```go
type SchemaValidationResult struct {
    Valid                 bool                     // True if validation passed
    Errors                []SchemaValidationError  // Detailed errors
    Warnings              []string                 // Non-fatal issues
    FilesSummary          map[string]int           // Error counts by file
    TotalRecordsValidated *int                     // Records validated
    FailedRecords         *int                     // Records with errors
}

type SchemaValidationError struct {
    Type          SchemaValidationErrorType // Error category
    FieldPath     string                    // JSON path to field
    Message       string                    // Human-readable message
    ExpectedType  *string                   // Expected type
    ActualType    *string                   // Actual type found
    ActualValue   any                       // The invalid value
    ExpectedValue any                       // What was expected
    Suggestion    *string                   // How to fix it
    FileName      *string                   // File containing error
    RowIndex      *int                      // Array index if applicable
}
```

## Error Types

- `missing_required_field` - A required field is not present
- `type_mismatch` - Data type doesn't match schema
- `constraint_violation` - Value violates min/max constraints
- `format_invalid` - Invalid data format (e.g., malformed JSON)
- `unexpected_field` - Extra field not in schema (warnings)
- `null_not_allowed` - Null value where not permitted
- `invalid_enum_value` - Value not in allowed enum list
- `invalid_array_items` - Array items don't match schema

## DuckDB Type Mapping

When validating structured files, the following DuckDB to JSON Schema type mappings are used:

| JSON Schema | Compatible DuckDB Types |
|-------------|-------------------------|
| string | VARCHAR, TEXT, DATE, TIME, TIMESTAMP, UUID, etc. |
| integer | TINYINT, SMALLINT, INTEGER, BIGINT, DECIMAL(p,0) |
| number | FLOAT, DOUBLE, DECIMAL, all integer types |
| boolean | BOOLEAN, BOOL |
| array | TYPE[], LIST(TYPE), ARRAY<TYPE> |
| object | STRUCT, MAP, JSON |

## Testing

Run the validation tests:

```bash
go test -v ./engine/validation/...
```
