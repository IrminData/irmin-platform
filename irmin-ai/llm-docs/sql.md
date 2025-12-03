# Querying Irmin, Irmin SQL, and DuckDB

## Overview

Irmin provides powerful SQL querying capabilities through DuckDB, enabling complex data analysis and exploration across versioned data repositories. DuckDB is a high-performance, in-memory analytical database that powers Irmin's query engine.

DuckDB's SQL dialect is based on PostgreSQL. DuckDB tries to closely match PostgreSQL's semantics, however, some use cases require slightly different behavior. 

Please note, that queries can only be ran on data stored in the repositories, not on the connections directly.

## Do not use SQL for schemas

Irmin provides Object Schemas, which are used to describe files/objects, repositories, connections and more. You don't need to write SQL to get the schema of a file, instead opt for getting the schema. A documentation on Object Schemas is available.

## Key Features

- **DuckDB**: High-performance, in-memory analytical database
- **Standard SQL**: Full SQL syntax support with DuckDB extensions
- **Data Versioning**: Query across different versions, branches, and commits
- **Dynamic Table References**: Use placeholders to reference data across workspaces and repositories
- **Real-time Analysis**: Execute queries against live data with instant results

## Query Syntax Options

Irmin supports two syntax options for querying data: **Irmin placeholders (recommended)** and **native DuckDB S3 paths (optional)**.

### Irmin Query Placeholder Syntax (Recommended)

Irmin placeholders are the recommended syntax for querying data across workspaces, repositories, and versions.

```
$["workspace;repository;object@ref"]
```

### Placeholder Rules

1. **Recommended**: Placeholders are the recommended syntax for most use cases
2. **Double Quotes Only**: Placeholders always use double quotes `"`, never single quotes `'` or other braces
3. **Required Components**: Repository and object (file) are always required
4. **Optional Components**: Workspace and ref can be omitted
5. **Separator**: Use semicolons `;` to separate parts. Placeholders never start or end with `;`

### Placeholder Components

- **workspace** (optional): The workspace identifier (e.g., "demo-data")
- **repository** (required): The repository name (e.g., "documents")
- **object** (required): The data object or file path (e.g., "large-file.json", "Meteo.json")
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

### Alternative: Native DuckDB S3 Syntax

For advanced use cases, Irmin also supports native DuckDB functions with direct S3 paths:

```sql
-- Using native DuckDB with S3 paths
SELECT * FROM read_json('s3://workspace-repository/branch/path') LIMIT 10;
SELECT * FROM read_parquet('s3://demo-demo-data/main/lakes.parquet');
```

**S3 Path Format:**
```
s3://{workspace-slug}-{repository-slug}/{branch}/{object-path}
```

**Example mapping:**
- Workspace: `demotila`
- Repository: `kiesi-master-data`
- Branch: `main`
- Object: `search.json`
- **S3 Path:** `s3://demotila-kiesi-master-data/main/search.json`

**Important notes:**
- Permission checks still apply - unauthorized access returns "access denied"
- S3 paths are less portable across workspace/repository renames
- Placeholders are recommended for most use cases
- Both syntaxes can be mixed in the same query

## Write Operations

Irmin supports full SQL write capabilities through DuckDB, including:
- `COPY ... TO 's3://...'` - Export query results to S3/LakeFS
- `CREATE TEMPORARY TABLE/VIEW` - Create temporary tables and views for complex queries
- `INSERT`, `UPDATE`, `DELETE` - Modify data in temporary tables (not persistent to LakeFS)
- Mixed queries - Combine multiple statements (e.g., `CREATE VIEW ...; SELECT ...`)

**Important Notes:**
- Write operations require appropriate permissions (checked against repository/object write access)
- `COPY TO` operations write to LakeFS and require write permissions on the target repository/branch
- Only TEMPORARY tables/views allowed - no persistent database modifications
- Temporary tables/views exist only for the query session duration
- Direct data modifications (UPDATE/DELETE) work on temporary data, not LakeFS objects
- To persist changes to LakeFS: use `COPY TO`

**Security Constraints:**
- Blacklisted operations: `ATTACH DATABASE`, `CREATE/DROP SECRET`, `INSTALL/LOAD` extensions, `EXPORT/IMPORT DATABASE`
- Non-temporary `CREATE TABLE/VIEW` statements are blocked
- All blacklisted commands return generic "access denied" error

### Write Operation Examples

#### Export Query Results
```sql
-- Export filtered data to a new file
COPY (
  SELECT * FROM $["workspace;repo;data.json@main"]
  WHERE status = 'active'
) TO 's3://workspace-repo/main/exports/active-data.parquet' (FORMAT PARQUET);
```

#### Create Temporary Views
```sql
-- Create a view for reusable complex queries
CREATE OR REPLACE TEMPORARY VIEW active_users AS
SELECT * FROM $["workspace;repo;users.json@main"]
WHERE status = 'active';

-- Query the view
SELECT COUNT(*) FROM active_users;
```

#### Complex ETL with Temporary Tables
```sql
-- Create temp table from source data
CREATE TEMPORARY TABLE raw_data AS
SELECT * FROM $["workspace;repo;source.json@main"];

-- Transform and export
COPY (
  SELECT 
    id,
    UPPER(name) as name,
    status
  FROM raw_data
  WHERE created_at >= '2024-01-01'
) TO 's3://workspace-repo/main/processed/clean-data.parquet';
```

#### Merge and Export Multiple Sources
```sql
-- Combine data from different branches
CREATE TEMPORARY TABLE combined AS
SELECT *, 'main' as source FROM $["workspace;repo;data.json@main"]
UNION ALL
SELECT *, 'dev' as source FROM $["workspace;repo;data.json@dev"];

-- Export combined results
COPY combined TO 's3://workspace-repo/main/reports/combined.csv' (HEADER, DELIMITER ',');
```

#### Export JOIN Results (Combining Multiple Sources)
```sql
-- Join posts with user data and export enriched dataset
COPY (
  SELECT 
    p.id AS post_id,
    p.title,
    p.body,
    p.userId,
    u.name AS author_name,
    u.email AS author_email,
    u.company.NAME AS author_company
  FROM $["demo-data;posts.json@main"] AS p
  LEFT JOIN $["demo-data;users.json@main"] AS u ON p.userId = u.id
  WHERE p.userId IS NOT NULL
) TO 's3://demo-data/main/exports/posts-with-authors.parquet' (FORMAT PARQUET);
```

#### Export Aggregated Analytics
```sql
-- Calculate and export category-level statistics
COPY (
  SELECT 
    category,
    COUNT(*) as total_records,
    AVG(value) as average_value,
    SUM(amount) as total_amount,
    MIN(created_at) as earliest_date,
    MAX(created_at) as latest_date
  FROM $["workspace;repo;transactions.json@main"]
  WHERE created_at >= '2024-01-01'
  GROUP BY category
  HAVING COUNT(*) > 10
  ORDER BY total_amount DESC
) TO 's3://workspace-repo/main/analytics/category-stats.csv' (HEADER, DELIMITER ',');
```

#### Multi-Step Data Transformation Pipeline
```sql
-- Step 1: Create base filtered data
CREATE TEMPORARY TABLE active_users AS
SELECT DISTINCT u.*
FROM $["demo-data;users.json@main"] AS u
INNER JOIN $["demo-data;posts.json@main"] AS p ON u.id = p.userId;

-- Step 2: Calculate user activity statistics
CREATE TEMPORARY TABLE user_stats AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.company.NAME AS company,
  COUNT(p.id) AS total_posts,
  AVG(LENGTH(p.body)) AS avg_post_length,
  MAX(p.id) AS latest_post_id
FROM active_users AS u
LEFT JOIN $["demo-data;posts.json@main"] AS p ON u.id = p.userId
GROUP BY u.id, u.name, u.email, u.company.NAME;

-- Step 3: Export results
COPY user_stats TO 's3://demo-data/main/analytics/user-activity-report.parquet';
```

#### Working with Nested JSON in Exports
```sql
-- Unnest nested arrays and export flattened data
COPY (
  SELECT 
    d.id,
    d.name,
    elem.MAKE,
    elem.MODEL,
    elem.YEAR,
    elem.PRICE
  FROM $["demo-data;vehicles.json@main"] AS d,
  UNNEST(d.vehicles) AS u(elem)
  WHERE elem.YEAR >= 2020
    AND elem.MAKE IN ('Toyota', 'Tesla')
) TO 's3://demo-data/main/exports/modern-vehicles.csv' (HEADER, DELIMITER ',');
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

### Querying Nested JSON Structures

```sql
-- Query nested JSON arrays using UNNEST
-- This example queries the vehicles array field from data.json
SELECT 
    v.*
FROM $["cars;data.json"]
CROSS JOIN UNNEST(vehicles) AS t(v)
WHERE v.MAKE = 'Toyota' 
  AND v.YEAR >= 2020
ORDER BY v.YEAR DESC;
```

The `UNNEST` function expands nested JSON arrays into rows, allowing you to query array elements as if they were individual table rows. Use `CROSS JOIN UNNEST(column_name)` to flatten the array and access nested object properties directly.

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

1. **Invalid Placeholder Format**: 
   - Ensure proper syntax with semicolons `;` separating parts
   - Always use double quotes `"`, never single quotes `'`
   - Placeholders never start or end with `;`
   - Repository and object (file) are always required
2. **Missing Placeholder**: Every query must contain at least one placeholder
3. **Missing Data**: Check that the referenced workspace, repository, and object exist
4. **Reference Errors**: Verify that the specified branch or commit exists
5. **Schema Mismatches**: Use `information_schema` to explore table structure before querying

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
