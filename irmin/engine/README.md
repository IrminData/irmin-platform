# Irmin Data Engine

The Irmin Data Engine is the central data operations component that provides all data manipulation, version control, and analytics capabilities within the Irmin platform. It serves as an abstraction layer over LakeFS, providing a unified API for repository management, object operations, data transformations, and query execution.

## Overview

The Data Engine provides:

- **Repository Management**: Create, manage, and configure data repositories with version control
- **Object Operations**: Upload, download, move, copy, and delete files with full versioning
- **Data Movement**: Import/export data between repositories and external connectors
- **Data Transformation**: Apply field mappings and transformations using DuckDB
- **Query Execution**: Run SQL queries against repository data in various formats
- **Version Control**: Branch, commit, merge, and tag operations with protection rules
- **Schema Management**: Automatic schema detection and validation for structured data

## Architecture

### Core Components

#### 1. **Engine Client** (`engine.go`)

The main client that coordinates all data engine operations:

- **LakeFS Integration**: Manages connection to LakeFS backend
- **Context Management**: Handles request contexts and cancellation
- **Logging**: Structured logging for all operations
- **Environment Configuration**: Manages connection settings and credentials

#### 2. **Repository Management** (`repositories.go`)

Complete repository lifecycle management:

- **CRUD Operations**: Create, read, update, delete repositories
- **Storage Management**: Handles underlying S3 storage namespaces
- **Webhook Configuration**: Sets up LakeFS action files for event notifications
- **Garbage Collection**: Manages data retention policies and cleanup
- **Immutability Control**: Configures read-only repository settings

#### 3. **Object Management** (`objects.go`)

File and directory operations with version control:

- **File Operations**: Upload, download, move, copy, delete files
- **Directory Traversal**: Navigate repository folder structures
- **Content Retrieval**: Fetch file contents for processing
- **Metadata Management**: Handle object timestamps, sizes, content types
- **Path Security**: Prevent access to system paths and unauthorized locations
- **Batch Operations**: Efficient handling of multiple file operations

#### 4. **Data Movement** (`dataMovement.go`)

Import/export operations between repositories and external systems:

- **Import Operations**: Pull data from external connectors into repositories
- **Export Operations**: Push repository data to external connectors
- **Connector Integration**: Initialize and manage connector operations
- **File Processing**: Zip/unzip operations for efficient data transfer
- **Concurrent Operations**: Parallel processing for performance optimization
- **Error Handling**: Comprehensive error collection and reporting

#### 5. **Field Mappings** (`applyFieldMappings.go`)

Advanced data transformation capabilities:

- **Field Routing**: Route fields to different destination files
- **Column Mapping**: Map source columns to destination columns with renaming
- **Format Conversion**: Transform between CSV, JSON, Parquet formats
- **Data Merging**: Combine multiple source files into single destinations
- **Schema Validation**: Ensure data integrity during transformations
- **DuckDB Integration**: Leverage high-performance SQL engine for transformations

#### 6. **Query Engine** (`queries.go`)

SQL execution against repository data:

- **Multi-Format Support**: Query CSV, JSON, Parquet files
- **Dynamic Path Resolution**: Resolve workspace/repository/object paths in queries
- **Format Detection**: Automatic format detection from file extensions and MIME types
- **Result Processing**: Format query results with proper error handling
- **Performance Optimization**: Efficient query execution using DuckDB
- **Dual Syntax Support**: Supports both Irmin placeholders and native DuckDB S3 paths
- **Permission Enforcement**: All S3 paths validated against user permissions

#### 7. **Version Control Operations**

##### Branch Management (`branches.go`)

- **Branch Lifecycle**: Create, update, delete branches
- **Protection Rules**: Implement branch protection and immutability
- **Concurrent Operations**: Parallel API calls for performance
- **Default Branch Handling**: Manage repository default branches
- **Branch Renaming**: Safe branch renaming with protection rule updates

##### Commit Management (`commits.go`)

- **Commit Operations**: Create commits with custom metadata
- **Commit History**: List and retrieve commit details with pagination
- **Author Tracking**: Handle commit authorship and timestamps
- **Change Reverting**: Revert uncommitted changes with path-specific resets
- **Empty Commits**: Support for empty commits when needed

##### Comparison & Merging (`compare.go`)

- **Reference Comparison**: Compare branches, commits, and tags
- **Merge Operations**: Merge branches with various strategies
- **Diff Generation**: Generate detailed change lists between references
- **Merge Base Detection**: Find common ancestors for comparisons
- **Conflict Resolution**: Handle merge conflicts and strategies

#### 8. **Schema Management**

##### Schema Detection (`schema.go`)

- **Automatic Detection**: Analyze file structures and generate schemas
- **Multi-Type Support**: Handle structured, binary, and group objects
- **Recursive Analysis**: Deep analysis of directory structures
- **Content Type Validation**: Validate and restrict allowed content types
- **JSON Schema Generation**: Convert database schemas to JSON Schema format

##### DuckDB Integration (`getDuckDBSchema.go`, `duckDBToJSONSchema.go`)

- **Schema Querying**: Use DuckDB to analyze file schemas
- **Type Mapping**: Convert DuckDB types to JSON Schema types
- **Format Support**: Handle various data formats (CSV, JSON, Parquet)
- **Error Handling**: Graceful fallback for unsupported formats

#### 9. **Tag Management** (`tags.go`)

- **Tag Lifecycle**: Create, list, retrieve, delete tags
- **Reference Tracking**: Link tags to specific commits
- **Version Marking**: Mark important versions and releases

#### 10. **Branch Protection** (`branchProtectionManager.go`)

- **Protection Rules**: Implement and manage branch protection
- **Rule Updates**: Safely update protection settings
- **Branch Renaming**: Handle protection rules during branch operations
- **Immutability Enforcement**: Prevent unauthorized changes to protected branches

## Data Operations Flow

### Import Workflow

```
External Connector → Pull Data → Apply Field Mappings → Process & Merge → Upload to Repository
                                        ↓
                               DuckDB Transformations → Format Conversion → Version Control
```

### Export Workflow

```
Repository → Fetch Objects → Apply Field Mappings → Process & Merge → Push to Connector
                                     ↓
                            DuckDB Transformations → Format Conversion → External System
```

### Query Execution

```
SQL Query → Parse Paths → Resolve References → Execute via DuckDB → Format Results
                ↓
        Repository/Workspace/Object Resolution → Schema Detection → Query Optimization
```

### Object Operations

```
Upload/Download → Path Validation → LakeFS Operations → Metadata Processing → Version Tracking
                        ↓
                System Path Check → Content Type Detection → Storage Management
```

## Data Transformation Pipeline

### Field Mapping Process

1. **Input Validation**: Validate source files and mapping configurations
2. **Schema Detection**: Analyze source file structures using DuckDB
3. **Field Routing**: Route fields to appropriate destination files
4. **Transformation**: Apply column mappings and format conversions
5. **Merging**: Combine multiple sources mapping to same destination
6. **Output Generation**: Create transformed files in target formats

### Supported Transformations

- **Column Mapping**: Rename columns during transformation
- **Field Filtering**: Include only specified fields in output
- **Format Conversion**: Convert between CSV, JSON, Parquet
- **Data Merging**: Combine files with union operations
- **Schema Validation**: Ensure data integrity throughout process

## Version Control Features

### Repository Operations

- **Multi-Workspace Support**: Isolated workspaces with separate repositories
- **Storage Isolation**: Separate S3 namespaces per repository
- **Webhook Integration**: Automatic event notifications for repository changes
- **Garbage Collection**: Configurable data retention and cleanup policies
- **Access Control**: Repository-level permissions and restrictions

### Branch Management

- **Protection Rules**: Prevent unauthorized changes to critical branches
- **Immutable Branches**: Create read-only branches for stable data
- **Branch Policies**: Enforce naming conventions and access controls
- **Merge Strategies**: Multiple merge strategies for different use cases

### Change Tracking

- **Commit Metadata**: Rich metadata including author, timestamp, custom fields
- **Change Detection**: Track all modifications with detailed diff information
- **History Preservation**: Complete audit trail of all changes
- **Rollback Capabilities**: Revert changes at file or repository level

## Query Capabilities

### Supported Formats

- **CSV**: Comma-separated values with header detection
- **TSV**: Tab-separated values with custom delimiter support
- **JSON**: JSON objects and arrays with nested structure support
- **Parquet**: Columnar format with efficient querying
- **Auto-Detection**: Automatic format detection from file extensions

### Query Features

- **Workspace Scoping**: Query data within specific workspaces
- **Path Resolution**: Dynamic resolution of repository paths in queries
- **Schema Inference**: Automatic schema detection for query optimization
- **Result Formatting**: Structured result sets with metadata
- **Error Handling**: Comprehensive error reporting for debugging
- **Dual Syntax Support**: Supports both Irmin placeholders and native DuckDB S3 paths
- **Permission Enforcement**: All S3 paths validated against user permissions

### Write Operations Support

The engine supports full SQL write capabilities:
- **COPY TO**: Export query results to LakeFS
- **CREATE TEMPORARY TABLE/VIEW**: Temporary tables for complex queries
- **INSERT/UPDATE/DELETE**: Modify temporary data
- **Mixed Queries**: Multiple statements in one query

All write operations enforce permission checks based on context analysis.

**Security Constraints:**
- Only TEMPORARY tables/views allowed (no persistent database state)
- Blacklisted operations: ATTACH DATABASE, CREATE/DROP SECRET, INSTALL/LOAD extensions, EXPORT/IMPORT DATABASE
- Non-temporary CREATE TABLE/VIEW statements are blocked
- All write operations require appropriate permissions on target repositories

### Query Syntax Options

#### Irmin Placeholders (Recommended)

```sql
SELECT * FROM $["workspace;repository;path@ref"] LIMIT 10;
```

**Advantages:**
- Portable across workspace/repository renames
- Clear version/branch specification
- Cleaner SQL syntax

#### Native DuckDB S3 Paths (Optional)

```sql
SELECT * FROM read_json('s3://workspace-repository/branch/path') LIMIT 10;
```

**S3 Path Format:** `s3://{workspace-slug}-{repository-slug}/{branch}/{object-path}`

**Use cases:**
- Advanced DuckDB features requiring native functions
- Direct S3 access patterns
- Integration with existing DuckDB workflows

**Security:** Both syntaxes enforce the same permission checks at workspace, repository, and object levels.

## Integration Points

### LakeFS Backend

- **Repository Storage**: All repositories stored as LakeFS repositories
- **Version Control**: Leverages LakeFS for all versioning operations
- **Object Storage**: Uses LakeFS object storage with S3 backend
- **Event System**: Integrates with LakeFS webhook system for notifications

### DuckDB Analytics

- **Query Engine**: Uses DuckDB for all SQL query execution
- **Data Transformation**: Leverages DuckDB for field mapping operations
- **Schema Analysis**: Uses DuckDB for automatic schema detection
- **Performance**: Benefits from DuckDB's columnar query optimization

### Connector Ecosystem

- **External Systems**: Integrates with database, API, and file system connectors
- **Data Transfer**: Handles bulk data import/export operations
- **Authentication**: Manages connector authentication and authorization
- **Error Recovery**: Robust error handling for external system failures

## Security & Access Control

### Path Security

- **System Path Protection**: Prevents access to internal LakeFS paths
- **Path Validation**: Validates all file paths for security
- **Access Restrictions**: Enforces workspace and repository boundaries

### Data Protection

- **Immutable Repositories**: Support for read-only data repositories
- **Branch Protection**: Configurable protection rules for critical branches
- **Audit Logging**: Complete audit trail of all operations
- **Error Sanitization**: Prevents sensitive information leakage in errors

## Performance Optimization

### Concurrent Operations

- **Parallel Processing**: Concurrent execution of independent operations
- **Async Patterns**: Non-blocking operations where possible
- **Connection Pooling**: Efficient management of external connections
- **Batch Operations**: Optimized handling of multiple file operations

### Caching & Optimization

- **Schema Caching**: Cache schema information for repeated queries
- **Connection Reuse**: Reuse connections to external systems
- **Query Optimization**: Leverage DuckDB's query optimization
- **Resource Management**: Efficient cleanup of temporary resources

## Error Handling & Recovery

### Comprehensive Error Handling

- **Validation Errors**: Clear messages for invalid inputs
- **External System Errors**: Graceful handling of connector failures
- **Resource Errors**: Proper cleanup when operations fail
- **Context Cancellation**: Support for operation cancellation

### Recovery Mechanisms

- **Partial Success**: Handle partial failures in batch operations
- **Retry Logic**: Automatic retry for transient failures
- **Fallback Options**: Alternative approaches when primary methods fail
- **State Cleanup**: Ensure clean state after failed operations

## Usage Examples

### Repository Operations

```go
// Create a new repository
repo, err := engine.CreateRepository(
    "workspace1",
    "data-repo",
    "main",
    false, // not immutable
    &30,   // 30-day retention
    &7,    // 7-day branch retention
)

// Upload a file
object, err := engine.UploadObject(
    "workspace1",
    "data-repo",
    "data/file.csv",
    "main",
    fileReader,
)
```

### Data Import with Field Mappings

```go
// Define field mappings
fieldMappings := []irminmodels.FieldMapping{
    {
        SourcePath: "source.csv",
        SourceField: &"customer_id",
        DestinationPath: "customers.csv",
        DestinationField: &"id",
    },
}

// Import data with transformations
objects, errors := engine.DataImport(
    connection,
    []string{"data/source.csv"},
    "workspace1",
    "data-repo",
    "main",
    "imported/",
    fieldMappings,
)
```

### Query Execution

```go
// Execute SQL query against repository data
result := engine.ExecuteQuery(
    "workspace1",
    "SELECT * FROM read('workspace1/data-repo@main/data/file.csv') LIMIT 10",
)
```

### Branch Operations

```go
// Create a protected branch
branch, err := engine.CreateBranch(
    "workspace1",
    "data-repo",
    "production",
    "main",
    true, // immutable
)

// Compare branches
diff, err := engine.CompareRefs(
    ctx,
    "workspace1",
    "data-repo",
    "main",
    "production",
)
```
