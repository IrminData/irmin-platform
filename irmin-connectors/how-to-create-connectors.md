# How to Create Connectors

This guide explains how to add a new connector to the Irmin Connectors repository.

## Overview

Connectors define the interfaces that allow Irmin to interact with external systems in a simple, standardized, stateless and safe fashion. Each connector implements a set of standard endpoints that handle authentication, configuration, and data operations.

## Adding a New Connector

### 1. Create the Connector Directory Structure

Create a new directory in the `connectors/` folder with your connector name:

```
connectors/
└── your-connector/
    ├── models/
    │   ├── connectionSettings.go
    │   └── connectionDetails.go
    ├── controllers/
    │   └── controllers.go
    ├── client/
    │   └── client.go
    ├── config/
    │   └── config.go
    ├── routes.go
    └── listener.go (if your connector supports subscriptions)
```

### 2. Files That Need to be Edited

When adding a new connector, you must edit these files:

1. **`connectors/connectors.go`** - Add your connector to:
   - `SetupConnectorRoutes()` function
   - `StartConnectorSubscriptionListener()` function (if supporting subscriptions)
   - `RegisterAllConnectors()` function

2. **`public/`** directory - Add your connector's logo and any public assets

### 3. Standard Connector Endpoints

Every connector must implement these endpoints:

#### System Token Authenticated Endpoints

These endpoints are called by the Irmin API and require a system token for authentication:

- **`GET /{connector-slug}/info`** - Returns connector information and capabilities
- **`POST /{connector-slug}/configuration/{key}/fields`** - Returns dynamic configuration fields
- **`POST /{connector-slug}/configuration/validate`** - Validates connection configuration
- **`POST /{connector-slug}/operation/init`** - Initializes a new operation
- **`POST /{connector-slug}/operation/cancel`** - Cancels a running operation
- **`POST /{connector-slug}/operation/status`** - Returns operation status

#### Operation Token Authenticated Endpoints

These endpoints are called during active operations and require an operation token:

- **`POST /{connector-slug}/operation/schema/{operation}`** - Returns schema for the operation
- **`POST /{connector-slug}/operation/push`** - Pushes data to the external system
- **`POST /{connector-slug}/operation/patch`** - Updates data in the external system
- **`POST /{connector-slug}/operation/pull`** - Pulls data from the external system
- **`POST /{connector-slug}/operation/subscribe`** - Subscribes to changes (optional)

#### Public Endpoints

- **`GET /{connector-slug}/details`** - Public information about the connector

### 4. Authentication

#### System Tokens
- Used for connector management operations
- Generated during connector registration
- Validated against the database
- Required for configuration and operation lifecycle endpoints

#### Operation Tokens
- Used for data operations within a specific workflow
- Generated when an operation is initialized
- Have limited lifetime and scope
- Required for data push/pull/patch operations

### 5. Data Structures

#### Required Models

**ConnectionSettings** - Connector-specific configuration:
```go
type ConnectionSettings struct {
    // Add your connector's required settings
    Host     string `json:"host"`
    Port     int    `json:"port"`
    Database string `json:"database"`
    // ... other fields
}
```

**ConnectionDetails** - User credentials and sensitive data:
```go
type ConnectionDetails struct {
    Username string `json:"username"`
    Password string `json:"password"`
    // ... other sensitive fields
}
```

### 6. What Connectors Should Accept and Return

#### Input Expectations
- **Configuration**: JSON objects containing connection settings and details
- **Data Operations**: Structured data in JSON format
- **Authentication**: Bearer tokens in headers

#### Output Requirements
- **Data**: Return data as files in ZIP format
- **Errors**: Structured error responses with meaningful messages
- **Status**: Clear operation status indicators
- **Schema**: Detailed schema information for data validation

### 7. "Everything is a File" Concept

Connectors should treat all data as files:
- Database tables → CSV files
- API responses → JSON files
- Documents → Original format files
- Images/Media → Binary files

This provides a consistent interface regardless of the underlying data source.

### 8. Implementation Steps

1. **Copy an existing connector** (e.g., postgres) as a template
2. **Modify the models** to match your external system's requirements
3. **Implement the controllers** for each required endpoint
4. **Create the client** to interface with your external system
5. **Add configuration logic** for dynamic field generation
6. **Implement data operations** (push, pull, patch)
7. **Add your connector to connectors.go** in all required functions
8. **Test thoroughly** with various configurations and data types

### 9. Best Practices

- **Security**: Never store credentials permanently, only during operations
- **Error Handling**: Provide clear, actionable error messages
- **Validation**: Validate all inputs thoroughly
- **Performance**: Implement efficient data transfer mechanisms
- **Logging**: Add comprehensive logging for debugging and monitoring
- **Documentation**: Document all configuration fields and their purposes

### 10. Example Implementation Pattern

```go
// routes.go
func SetupRoutes(app *models.ConnectorsApp) {
    controller := controllers.NewControllers(app)
    routes := app.App.Group("/your-connector")
    
    // System token endpoints
    routes.Get("/info", controller.Info, controller.ValidateSystemTokenMiddleware)
    routes.Post("/configuration/:key/fields", controller.ConfigFields, controller.ValidateSystemTokenMiddleware)
    // ... other endpoints
    
    // Operation token endpoints
    routes.Post("/operation/pull", controller.OperationPull, controller.ValidateOperationTokenMiddleware)
    // ... other endpoints
}
```

### 11. Testing Your Connector

Before submitting:
1. Test connector registration with Irmin API
2. Verify all endpoints respond correctly
3. Test data operations with sample data
4. Validate error handling scenarios
5. Check authentication mechanisms work properly

## Need Help?

If you're stuck or have questions about implementing a connector, feel free to open an issue or reach out to the team. We're here to help make connector development as smooth as possible!