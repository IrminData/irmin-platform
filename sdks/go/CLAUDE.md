# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the official Go SDK for the Irmin data platform, providing client libraries for both the Core API and Connector APIs. The SDK offers type-safe models, validation utilities, and helper functions for integrating with Irmin's data versioning and workflow orchestration features.

## Project Architecture

### Core Components

- **`core-api/`**: HTTP client for Irmin Core API (repositories, workflows, authentication, analytics)
- **`connector/`**: HTTP client for Irmin Connector APIs (data source integrations, streaming operations)
- **`models/`**: Data models with validation tags for all API structures
- **`validator/`**: Custom validation package with Irmin-specific validators
- **`utils/`**: Helper utilities for common operations (file handling, JSON schemas, compute operations)
- **`sqids/`**: Type-safe ID encoding/decoding using SQID format

### Key Technologies

- **HTTP Clients**: Custom HTTP clients with configurable timeouts and multipart support
- **Validation**: `github.com/go-playground/validator/v10` with custom validation rules
- **IDs**: `github.com/sqids/sqids-go` for type-safe identifier encoding
- **Scheduling**: `github.com/robfig/cron/v3` and `github.com/teambition/rrule-go` for workflow scheduling
- **JSON Schema**: `github.com/invopop/jsonschema` for dynamic schema generation

### Architecture Patterns

- Dual-client design (Core API and Connector API) with shared model types
- Type-safe ID management using SQID encoding with validation
- Comprehensive validation system with custom rules for Irmin-specific data types
- Helper utilities for containerized compute operations and file handling

## Development Commands

### Dependencies

```bash
go mod download
go mod tidy
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests with timeout and coverage
go test -timeout 2m ./... -coverprofile=coverage.out

# View coverage report
go tool cover -html=coverage.out

# Run specific test package
go test ./validator/
```

### Linting

```bash
# Run linter
golangci-lint run

# Run linter with autofix
golangci-lint run --fix
```

### Building

```bash
# Build executable (if needed)
go build -o out

# Build for specific package
go build ./validator/
```

## Code Quality Standards

### Linting Configuration

- Uses strict golangci-lint configuration (`.golangci.yml`)
- Maximum function length: 200 lines, 50 statements
- Maximum cyclomatic complexity: 30
- Enforces structured logging with `log/slog`
- Prohibits global variables and `init()` functions

### Custom Validation Rules

- `validtoken`: API token validation (must start with "cred\_")
- `validslug`: Slug validation for identifiers
- `validsqid`: SQID validation with type checking
- `validrrule`: RRule validation for recurring schedules
- `validcron`: Cron expression validation
- `validschedule`: Complex schedule trigger validation

## Common Usage Patterns

### Client Initialization

```go
// Core API Client
coreClient := irmincore.NewClient("https://api.irmin.co/api", "your-token", "en")

// Connector Client
connectorClient := irminconnectorclient.NewClient("https://connectors.irmin.dev/postgres", "your-token", "en")
```

### Validation Setup

```go
// Initialize validator with SQID manager
sqidManager := irminsqids.NewSQIDManager("your-alphabet")
validator := irminsdkvalidator.NewValidator(sqidManager)

// Validate models
err := validator.Validate(userModel)
```

### API Requests

```go
// Standard API call pattern
opts := RequestOptions{
    Method: "GET",
    Endpoint: "/repositories",
    ContentType: "application/json",
}
```

## Available Utilities

### File Operations

- `GetInputFile()` / `ListInputFiles()`: Handle `_input` directory for containerized compute
- `ZipFiles()` / `UnzipFiles()`: Archive operations for file handling

### API Helpers

- `GetAPIFromFlags()`: Extract API credentials from command-line flags
- `SendComputeResult()`: Send computation results in containerized environments

### Schema Generation

- `JSONSchemaFromStruct()`: Generate JSON schemas from Go structs for dynamic validation

## Testing Strategy

- Table-driven tests for validation scenarios
- Mock data creation using SQID manager
- Comprehensive validation testing for all custom validation rules
- Unit tests focus on validator functionality and model validation
- Coverage reports generated with `go tool cover`

## Dependencies

### Core Dependencies

- `github.com/go-playground/validator/v10`: Struct validation
- `github.com/sqids/sqids-go`: Type-safe ID encoding
- `github.com/invopop/jsonschema`: JSON schema generation

### Scheduling Dependencies

- `github.com/robfig/cron/v3`: Cron expression parsing
- `github.com/teambition/rrule-go`: RRule scheduling support

## Environment Setup

The SDK requires:

- Go 1.23.1 or later
- Valid Irmin API credentials
- Access to Irmin Core API and/or Connector API endpoints

## Module Structure

```
github.com/IrminData/irmin-sdk-go/
├── core-api/          # Core API client methods
├── connector/         # Connector API client methods
├── models/           # Shared data models with validation tags
├── validator/        # Custom validation package
├── utils/           # Helper utilities
├── sqids/           # SQID management
```
