# Querying Irmin, Irmin SQL, and DuckDB

## Overview

Irmin provides powerful SQL querying capabilities through DuckDB, enabling complex data analysis and exploration across versioned data repositories. DuckDB is a high-performance, in-memory analytical database that powers Irmin's query engine.

Please note, that queries can only be ran on data stored in the repositories, not on the connections directly.

## Key Features

- **DuckDB**: High-performance, in-memory analytical database
- **Standard SQL**: Full SQL syntax support with DuckDB extensions
- **Data Versioning**: Query across different versions, branches, and commits
- **Dynamic Table References**: Use placeholders to reference data across workspaces and repositories
- **Real-time Analysis**: Execute queries against live data with instant results

## Irmin Query Placeholder Syntax

Irmin uses a special placeholder syntax to reference data across workspaces, repositories, and versions:

```
$["workspace;repository;object@ref"]
```

### Placeholder Components

- **workspace** (optional): The workspace identifier (e.g., "demo-data")
- **repository**: The repository name (e.g., "documents")
- **object**: The data object or file path (e.g., "large-file.json", "Meteo.json")
- **ref** (optional): The branch, tag, or commit reference (e.g., "main", "dev", "abc123")

### Placeholder Examples

```sql
-- Full syntax with workspace and reference
$["demo-data;documents;large-file.json@main"]

-- Simplified syntax without workspace (uses default)
$["documents;large-file.json@main"]

-- Without reference (uses default branch)
$["demo-data;documents;large-file.json"]

-- Minimal syntax
$["documents;file.json"]
```

## Basic Query Examples

### 1. Creating Temporary Views

```sql
CREATE OR REPLACE TEMPORARY VIEW table_view AS 
SELECT * FROM $["demo-data;documents;large-file.json@main"];

-- Query the created view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'main' AND table_name = 'table_view';
```

### 2. Direct Data Queries

```sql
-- Query specific data with filters
SELECT * FROM $["demo-data;Meteo.json@main"] 
WHERE "Granularity" = 'Hour' 
LIMIT 2;

-- Cross-branch analysis
SELECT 
    branch,
    COUNT(*) as record_count,
    AVG(value) as avg_value
FROM $["workspace;repo;data.json"]
GROUP BY branch;
```

### 3. Schema Exploration

```sql
-- Explore available columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = $["demo-data;documents;large-file.json@main"];

-- Get table information
SELECT table_name, table_type, table_schema
FROM information_schema.tables
WHERE table_schema = 'main';
```

## Advanced Query Patterns

### Cross-Repository Analysis

```sql
-- Compare data across different repositories
SELECT 
    'repo1' as source,
    COUNT(*) as count
FROM $["workspace1;repo1;data.json@main"]
UNION ALL
SELECT 
    'repo2' as source,
    COUNT(*) as count
FROM $["workspace1;repo2;data.json@main"];
```

### Version Comparison

```sql
-- Compare data between different branches
SELECT 
    'main' as branch,
    COUNT(*) as record_count
FROM $["workspace;repo;data.json@main"]
UNION ALL
SELECT 
    'dev' as branch,
    COUNT(*) as record_count
FROM $["workspace;repo;data.json@dev"];
```

### Data Aggregation

```sql
-- Complex aggregations with grouping
SELECT 
    category,
    COUNT(*) as total_records,
    AVG(numeric_value) as average_value,
    MIN(date_column) as earliest_date,
    MAX(date_column) as latest_date
FROM $["workspace;repo;data.json@main"]
WHERE date_column >= '2024-01-01'
GROUP BY category
HAVING COUNT(*) > 10
ORDER BY total_records DESC;
```

## DuckDB-Specific Features

### Window Functions

```sql
-- Use window functions for advanced analytics
SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY value DESC) as rank_in_category,
    LAG(value) OVER (ORDER BY date_column) as previous_value
FROM $["workspace;repo;data.json@main"];
```

### JSON Functions

```sql
-- Parse and query JSON data
SELECT 
    json_extract(data_column, '$.field_name') as extracted_field,
    json_extract_string(data_column, '$.nested.field') as nested_field
FROM $["workspace;repo;json-data.json@main"]
WHERE json_valid(data_column);
```

### Time Series Analysis

```sql
-- Time-based aggregations
SELECT 
    DATE_TRUNC('hour', timestamp_column) as hour_bucket,
    COUNT(*) as events_per_hour,
    AVG(metric_value) as avg_metric
FROM $["workspace;repo;time-series.json@main"]
WHERE timestamp_column >= NOW() - INTERVAL 24 HOUR
GROUP BY hour_bucket
ORDER BY hour_bucket;
```

## Best Practices

### 1. Use Temporary Views for Complex Queries

```sql
-- Create a view for complex data preparation
CREATE OR REPLACE TEMPORARY VIEW prepared_data AS
SELECT 
    *,
    CASE 
        WHEN value > 100 THEN 'high'
        WHEN value > 50 THEN 'medium'
        ELSE 'low'
    END as value_category
FROM $["workspace;repo;data.json@main"]
WHERE active = true;

-- Query the prepared data
SELECT value_category, COUNT(*) as count
FROM prepared_data
GROUP BY value_category;
```

### 2. Optimize with LIMIT and WHERE Clauses

```sql
-- Always use LIMIT for exploratory queries
SELECT * FROM $["workspace;repo;large-dataset.json@main"]
WHERE date_column >= '2024-01-01'
LIMIT 1000;

-- Use specific WHERE conditions to reduce data transfer
SELECT column1, column2, column3
FROM $["workspace;repo;data.json@main"]
WHERE category IN ('A', 'B', 'C')
  AND value BETWEEN 10 AND 100;
```

### 3. Handle Missing References Gracefully

```sql
-- Use COALESCE for optional references
SELECT * FROM $["workspace;repo;data.json@main"]
WHERE COALESCE(optional_field, 'default') = 'expected_value';
```

## Error Handling

### Common Issues and Solutions

1. **Invalid Placeholder Format**: Ensure proper syntax with semicolons and optional @ symbol
2. **Missing Data**: Check that the referenced workspace, repository, and object exist
3. **Reference Errors**: Verify that the specified branch or commit exists
4. **Schema Mismatches**: Use `information_schema` to explore table structure before querying

### Debugging Queries

```sql
-- Check if table exists and get its schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name LIKE '%demo-data%';

-- Explore column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'your_table_name';
```

## Performance Considerations

- **Memory Usage**: DuckDB loads data into memory, so large datasets may require optimization
- **Query Complexity**: Break complex queries into smaller, manageable parts using temporary views
- **Indexing**: DuckDB automatically creates indexes, but complex WHERE clauses can benefit from optimization
- **Data Freshness**: Queries always return the latest data from the specified reference
