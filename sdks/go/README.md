# Irmin SDK for Go

A comprehensive Go SDK for the Irmin platform, providing type-safe access to the Core API, data models, validation, utilities, and connector management.

## What's Included

- **🔌 API Client**: Complete REST client for all Irmin Core API endpoints
- **📋 Data Models**: Strongly typed Go structs for all API entities  
- **✅ Validation**: Client-side request validation with enhanced security features
- **🆔 SQID Management**: Unique identifier generation and validation
- **🔗 Connector Client**: Manage data source connections and operations
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
    "fmt"
    "log"

    irmincore "github.com/IrminData/irmin-sdk-go/core-api"
    "github.com/IrminData/irmin-sdk-go/models"
)

func main() {
    // Create a new client
    client := irmincore.NewClient("https://api.irmin.co/api", "your-token", "en")

    // Create a workspace
    workspace, resp, err := client.CreateWorkspace(irmincore.CreateWorkspaceRequest{
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
    irminconnector "github.com/IrminData/irmin-sdk-go/connector"
)

// Create a connector client
connectorClient := irminconnector.NewClient("https://connector.irmin.co", "your-token")

// Get connector information
info, err := connectorClient.GetInfo("postgres")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Connector: %s\n", info.Name)
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
// Create, update, delete workspaces
workspace, _, err := client.CreateWorkspace(request)
workspaces, _, err := client.GetWorkspaces()
_, err = client.UpdateWorkspace("workspace-id", updateRequest)
```

### Connections
```go
// Manage data source connections
connection, _, err := client.CreateConnection("workspace-id", request)
connections, _, err := client.GetConnections("workspace-id")
```

### Workflows & Queries
```go
// Create and manage workflows
workflow, _, err := client.CreateWorkflow("workspace-id", request)

// Execute and manage SQL queries
query, _, err := client.CreateQuery("workspace-id", request)
```

### Repositories & Version Control
```go
// Git-like data versioning
repo, _, err := client.CreateRepository("workspace-id", request)
branches, _, err := client.GetRepositoryBranches("workspace-id", "repo-id")
commits, _, err := client.GetRepositoryCommits("workspace-id", "repo-id", "branch")
```

### User & Role Management
```go
// Manage users and permissions
users, _, err := client.GetUsers()
roles, _, err := client.GetRoles()
```

## Validation

The SDK includes comprehensive client-side validation to catch errors before API calls.

### Automatic Validation

All API methods automatically validate requests:

```go
// This will fail validation before making the HTTP request
_, _, err := client.CreateConnection("workspace", irmincore.CreateConnectionRequest{
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
// Pull data from a source
result, err := connectorClient.Pull("connector-id", pullConfig)

// Push data to a destination  
err = connectorClient.Push("connector-id", pushConfig, data)

// Subscribe to real-time updates
err = connectorClient.Subscribe("connector-id", subscribeConfig)
```

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
result, resp, err := client.CreateConnection("workspace", request)
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
```

## Contributing

The SDK is organized into focused packages:
- `core-api/` - Main API client
- `models/` - Data models  
- `validator/` - Validation logic
- `sqids/` - SQID management
- `connector/` - Connector client
- `utils/` - Utility functions
