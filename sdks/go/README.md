<img src="https://raw.githubusercontent.com/IrminData/.github/refs/heads/development/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin SDK for Go

A comprehensive Go SDK for the Irmin platform, providing type-safe access to the Core API, data models, validation, utilities, and connector management.

## What's Included

- **🔌 API Client**: Complete REST client for all Irmin Core API endpoints
- **📋 Data Models**: Strongly typed Go structs for all API entities
- **✅ Validation**: Client-side request validation with enhanced security features
- **🆔 SQID Management**: Unique identifier generation and validation
- **🔗 Connector Client**: Manage data source connections and operations
- **📊 DuckDB Client**: In-memory data processing with SQL analytics for CSV, JSON, Parquet and more
- **📡 Observability**: Shared progress-event vocabulary for long-running operations (see [observability/](#observability))
- **🛠️ Utilities**: Helper functions for common tasks (JSON schema generation, file handling, etc.)

## Installation

```bash
go get github.com/IrminData/irmin-sdk-go
```

## Quick Start

### Basic API Client Usage

```go
package main

import (
    "context"
    "fmt"
    "log"

    irmincore "github.com/IrminData/irmin-sdk-go/api"
    "github.com/IrminData/irmin-sdk-go/models"
)

func main() {
    // Create a context for API calls
    ctx := context.Background()

    // Create a new client
    client := irmincore.NewClient("https://api.irmin.co/api", "your-token", "en")

    // Create a workspace
    workspace, resp, err := client.CreateWorkspace(ctx, irmincore.CreateWorkspaceRequest{
        Name:        "My Workspace",
        Description: "A workspace for data analysis",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Created workspace: %s\n", workspace.Name)
}
```

### Working with Connectors

```go
import (
    "context"
    irminconnector "github.com/IrminData/irmin-sdk-go/connector"
)

// Create a context
ctx := context.Background()

// Create a connector client
connectorClient := irminconnector.NewClient("https://connector.irmin.co", "your-token", "en")

// Get connector information
info, err := connectorClient.GetInfo(ctx)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Connector: %s\n", info.Name)
```

### In-Memory Data Processing with DuckDB

```go
import (
    "fmt"
    "log"
    "log/slog"
    "github.com/IrminData/irmin-sdk-go/duckdb"
)

// Create DuckDB client for in-memory analytics
logger := slog.Default()
duckClient, err := duckdb.NewInMemoryClient(logger)
if err != nil {
    log.Fatal(err)
}
defer duckClient.Close()

// Load CSV data from bytes
csvData := []byte(`name,age,city
John,30,New York
Jane,25,Los Angeles`)

err = duckClient.LoadFileFromBytes(csvData, "users.csv", "users")
if err != nil {
    log.Fatal(err)
}

// Run SQL analytics
results, err := duckClient.QueryToMap(`
    SELECT city, COUNT(*) as count, AVG(age) as avg_age
    FROM users
    GROUP BY city
`)
if err != nil {
    log.Fatal(err)
}

for _, row := range results {
    fmt.Printf("City: %s, Count: %v, Avg Age: %.1f\n",
        row["city"], row["count"], row["avg_age"])
}
```

### Using Data Models

```go
import "github.com/IrminData/irmin-sdk-go/models"

// Work with strongly typed models
var connection models.Connection
connection.Name = "My Database"
connection.Connector = "postgres"

// All API responses are mapped to these models automatically
```

## API Client Features

The Core API client provides methods for all Irmin endpoints:

### Workspaces

```go
ctx := context.Background()

// Create, update, delete workspaces
workspace, _, err := client.CreateWorkspace(ctx, request)
workspaces, _, err := client.GetWorkspaces(ctx)
_, err = client.UpdateWorkspace(ctx, "workspace-id", updateRequest)
```

### Connections

```go
ctx := context.Background()

// Manage data source connections
connection, _, err := client.CreateConnection(ctx, "workspace-id", request)
connections, _, err := client.GetConnections(ctx, "workspace-id")
```

### Workflows & Queries

```go
ctx := context.Background()

// Create and manage workflows
workflow, _, err := client.CreateWorkflow(ctx, "workspace-id", request)

// Execute and manage SQL queries
query, _, err := client.CreateQuery(ctx, "workspace-id", request)
```

### Repositories & Version Control

```go
ctx := context.Background()

// Git-like data versioning
repo, _, err := client.CreateRepository(ctx, "workspace-id", request)
branches, _, err := client.ListBranches(ctx, "workspace-id", "repo-id")
commits, _, err := client.GetRepositoryCommits(ctx, "workspace-id", "repo-id", "branch")
```

### User & Role Management

```go
ctx := context.Background()

// Manage users and permissions
users, _, err := client.GetUsers(ctx)
roles, _, err := client.GetRoles(ctx)
```

## Validation

The SDK includes comprehensive client-side validation to catch errors before API calls.

### Automatic Validation

All API methods automatically validate requests:

```go
ctx := context.Background()

// This will fail validation before making the HTTP request
_, _, err := client.CreateConnection(ctx, "workspace", irmincore.CreateConnectionRequest{
    // Missing required fields
    Description: "Invalid request",
})
if err != nil {
    fmt.Printf("Validation error: %v\n", err)
}
```

### Manual Validation

```go
request := irmincore.CreateConnectionRequest{
    Name:      "My Connection",
    Connector: "postgres",
}

// Validate without sending
if err := client.ValidateRequest(request); err != nil {
    fmt.Printf("Invalid request: %v\n", err)
    return
}
```

### Enhanced Validation Features

- **SQL Security**: Validates SQL queries, blocking dangerous operations
- **Markdown Safety**: Validates documentation fields as safe markdown
- **URL Validation**: Restricts URLs to safe schemes with format checks
- **Phone Numbers**: E.164 format validation
- **Custom Tags**: Support for specialized validation tags

```go
// Enhanced validation with detailed error messages
result := client.ValidateRequestEnhanced(request)
if result.HasErrors() {
    fmt.Printf("Error: %s\n", result.GetUserMessage())
    for field, message := range result.GetFieldErrors() {
        fmt.Printf("Field '%s': %s\n", field, message)
    }
}
```

## SQID Management

Generate and validate unique identifiers:

```go
import irminsqids "github.com/IrminData/irmin-sdk-go/sqids"

// Create SQID manager
sqidManager := irminsqids.NewSQIDManager("your-alphabet")

// Use with API client for server-side validation
client := irmincore.NewClientWithSQIDManager(
    "https://api.irmin.co/api",
    "your-token",
    "en",
    sqidManager,
)
```

## Connector Operations

The connector client supports various data operations:

```go
ctx := context.Background()

// Pull data from a source
result, err := connectorClient.OperationPull(ctx, "path/to/data")

// Push data to a destination
err = connectorClient.OperationPush(ctx, "path/to/destination", file)

// Subscribe to real-time updates
subscription, err := connectorClient.SubscribeToChanges(ctx, webhookURL, webhookToken)
```

## DuckDB In-Memory Analytics

The DuckDB client provides powerful in-memory data processing capabilities:

### Key Features

- **Multiple Format Support**: CSV, JSON, Parquet, Avro, ORC, Delta, Iceberg
- **SQL Analytics**: Full SQL interface for data analysis and aggregation
- **Data Merging**: Combine multiple data sources with different strategies
- **In-Memory Processing**: No external storage dependencies

### Basic Usage

```go
import (
    "fmt"
    "log/slog"
    "github.com/IrminData/irmin-sdk-go/duckdb"
)

// Create client
logger := slog.Default()
client, err := duckdb.NewInMemoryClient(logger)
defer client.Close()

// Load data from Go structures
data := []map[string]any{
    {"product": "Widget A", "price": 19.99, "category": "Tools"},
    {"product": "Widget B", "price": 29.99, "category": "Electronics"},
}
err = client.CreateTableFromData("products", data)

// Load binary file content
csvBytes := []byte("name,age\nJohn,30\nJane,25")
err = client.LoadFileFromBytes(csvBytes, "users.csv", "users")

// Merge multiple data sources
sourceFiles := map[string][]byte{
    "data1.csv": csvContent1,
    "data2.json": jsonContent2,
}
result, err := client.MergeFiles(sourceFiles, "merged", duckdb.MergeStrategyUnion)

// Run complex analytics
results, err := client.QueryToMap(`
    SELECT category, COUNT(*) as count, AVG(price) as avg_price
    FROM products
    GROUP BY category
`)
```

📚 **[Full DuckDB Documentation →](./duckdb/README.md)**

## Observability

Shared progress-event vocabulary for long-running operations. Producers
fire `ProgressEvent`s into a `ProgressHandler`; the handler routes them
to the right sink (operation log row, workflow log, NDJSON stream).
The taxonomy is consistent across services so a `"page"` event means
the same thing whether it comes from a connector, a Core workflow, or
the AI service.

```go
import "github.com/IrminData/irmin-sdk-go/observability"

// Define a handler that emits to your sink:
handler := observability.ProgressHandler(func(ev observability.ProgressEvent) {
    // ...persist, log, or stream the event...
})

// Producers fire events from inside long loops:
handler(observability.ProgressEvent{
    Kind:         observability.ProgressKindPage,
    ResourcePath: "/v1/customers",
    Page:         5,
    RecordsSoFar: 500,
    Cursor:       "cus_abc",
})
```

The kinds (`page`, `rate_limit`, `batch`, `query`, `file`, `heartbeat`)
are stable wire-format strings; an irmin-ai TypeScript consumer will
see the same values. Sink-aware helpers (DB persistence, throttling,
heartbeat tickers) live in the consuming service — irmin-connectors
ships its own under `connectors/common`.

## Utilities

The SDK includes helpful utilities:

```go
import "github.com/IrminData/irmin-sdk-go/utils"

// Generate JSON schema from Go structs
schema, err := utils.GenerateJSONSchema(myStruct)

// Handle file operations
files, err := utils.GetInputFiles(directory)

// Create ZIP archives
err = utils.CreateZipArchive(files, outputPath)
```

## Configuration

### Custom HTTP Client

```go
import "time"

client := irmincore.NewClient("https://api.irmin.co/api", "your-token", "en")
client.HTTPClient.Timeout = 30 * time.Second
```

### Content Type Support

The SDK supports multiple content types:

- JSON requests/responses
- Multipart form data
- File uploads
- Custom headers

## Error Handling

Comprehensive error information with validation details:

```go
ctx := context.Background()

result, resp, err := client.CreateConnection(ctx, "workspace", request)
if err != nil {
    // Check for validation errors
    if strings.Contains(err.Error(), "validation failed") {
        fmt.Println("Request validation failed")
    }

    // Check API response errors
    if resp != nil && len(resp.Errors) > 0 {
        fmt.Printf("API errors: %v\n", resp.Errors)
    }
}
```

## Examples & Testing

Run the comprehensive test suite to see the SDK in action:

```bash
# Run all tests
go test ./...

# Run specific component tests
go test ./validator -v
go test ./core-api -v
go test ./connector -v
go test ./duckdb -v
```

## Contributing

The SDK is organized into focused packages:

- `core-api/` - Main API client
- `models/` - Data models
- `validator/` - Validation logic
- `sqids/` - SQID management
- `connector/` - Connector client
- `duckdb/` - In-memory data processing and analytics
- `utils/` - Utility functions

## License

This project is licensed under the [MIT License](LICENSE).
