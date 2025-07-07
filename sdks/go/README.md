# Irmin SDK for Go

Go SDK for the Irmin Core API.

## Features

- **Complete API Coverage**: Full support for all Irmin Core API endpoints
- **Type Safety**: Strongly typed requests and responses
- **Client-Side Validation**: Validate requests before sending them to the API
- **Flexible HTTP Client**: Customizable HTTP client with timeout and proxy support
- **Multiple Content Types**: Support for JSON, multipart form data, and file uploads

## Installation

```bash
go get github.com/IrminData/irmin-sdk-go
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    irmincore "github.com/IrminData/irmin-sdk-go/core-api"
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

## Client-Side Validation

The SDK includes built-in validation for all request types. Requests are automatically validated before being sent to the API, helping you catch errors early.

### Automatic Validation

All API methods automatically validate request data:

```go
// This will fail validation before making the HTTP request
_, _, err := client.CreateConnection("my-workspace", irmincore.CreateConnectionRequest{
    // Missing required "Name" and "Connector" fields
    Description: "Invalid request",
})
if err != nil {
    // Error will mention validation failure
    fmt.Printf("Error: %v\n", err)
}
```

### Manual Validation

You can also validate requests without sending them:

```go
request := irmincore.CreateConnectionRequest{
    Name:      "My Connection",
    Connector: "postgres",
}

// Validate without sending
if err := client.ValidateRequest(request); err != nil {
    fmt.Printf("Request is invalid: %v\n", err)
    return
}

// Now send the validated request
connection, _, err := client.CreateConnection("my-workspace", request)
```

### Individual Field Validation

You can validate individual fields using validation tags:

```go
// Validate an email address
if err := client.ValidateVar("user@example.com", "email"); err != nil {
    fmt.Printf("Invalid email: %v\n", err)
}

// Validate a required field
if err := client.ValidateVar("", "required"); err != nil {
    fmt.Printf("Field is required: %v\n", err)
}
```

### SQID Validation

SQID (unique identifier) validation is automatically skipped on the client side since clients don't have access to the server's SQID alphabet. SQID fields will be validated on the server when requests are sent.

## Advanced Usage

### Custom HTTP Client

```go
import "time"

client := irmincore.NewClient("https://api.irmin.co/api", "your-token", "en")
client.HTTPClient.Timeout = 30 * time.Second
```

### Server-Side Validation (for servers with SQID access)

If you're using the SDK on the server side and have access to the SQID alphabet:

```go
import (
    irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
    irmincore "github.com/IrminData/irmin-sdk-go/core-api"
)

sqidManager := irminsqids.NewSQIDManager("your-sqid-alphabet")
client := irmincore.NewClientWithSQIDManager(
    "https://api.irmin.co/api",
    "your-token",
    "en",
    sqidManager,
)
```

## API Reference

The SDK provides methods for all Irmin Core API endpoints:

- **Workspaces**: Create, update, delete, and manage workspaces
- **Connections**: Manage data source connections
- **Workflows**: Create and manage data workflows
- **Repositories**: Git-like data versioning
- **Queries**: SQL query management
- **Users & Permissions**: User and role management
- And much more...

## Error Handling

The SDK provides detailed error information:

```go
connection, resp, err := client.CreateConnection("workspace", request)
if err != nil {
    // Check if it's a validation error
    if strings.Contains(err.Error(), "validation failed") {
        fmt.Println("Request validation failed")
    }
    // Check API response for more details
    if resp != nil && len(resp.Errors) > 0 {
        fmt.Printf("API errors: %v\n", resp.Errors)
    }
}
```

## Examples and Tests

Comprehensive validation examples and usage patterns can be found in the test files:

- `validator/validator_test.go` - Contains tests for both client-side and server-side validation
- Core API request validation examples
- SQID validation behavior demonstrations

Run the tests to see validation in action:

```bash
cd irmin-sdk-go
go test ./validator -v
```
