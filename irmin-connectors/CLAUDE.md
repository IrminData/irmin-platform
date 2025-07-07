# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Irmin Connectors is a Go-based microservice that provides a universal way to interact with external services, data sources, and export targets. It serves as the connector layer in the Irmin data platform, handling data import/export operations through a plugin-based architecture.

## Architecture

### Core Components

- **main.go**: Application entry point with Fiber v3 web server setup, middleware configuration, and connector initialization
- **connectors/**: Plugin-based connector implementations
  - **connectors.go**: Central connector registration and routing system
  - **postgres/**: PostgreSQL connector implementation with real-time change detection
  - **registerConnector.go**: Handles connector registration with Irmin Core API
- **db/**: Database layer using GORM with PostgreSQL
  - **db.go**: Database connection and migration management
  - **operations.go**: Operation tracking and management
  - **subscriptions.go**: Real-time subscription handling
- **models/**: Data structures and application models
- **utils/**: Utility functions for environment loading, token generation, and parsing
- **lib/**: Core business logic for connector validation and database operations

### Key Technologies

- **Web Framework**: Fiber v3 with middleware (CORS, Helmet, compression, caching)
- **Database**: PostgreSQL with GORM ORM
- **Real-time**: PostgreSQL LISTEN/NOTIFY for change detection
- **SDK Integration**: Irmin SDK Go for API communication
- **Configuration**: Environment-based with .env file support

### Architecture Patterns

- **Plugin System**: Extensible connector architecture allowing easy addition of new data sources
- **Token-based Authentication**: System tokens for core API communication, operation tokens for data operations
- **Event-driven Subscriptions**: Real-time data change notifications via webhook callbacks
- **Middleware Pipeline**: Request validation, authentication, and logging
- **Database Migrations**: Automatic schema management via GORM AutoMigrate

## Development Commands

### Dependencies
```bash
go mod download          # Install dependencies
go mod tidy              # Clean up dependencies
go get -u ./...          # Update all dependencies
```

### Build and Run
```bash
go build -o out          # Build binary
./out                    # Run binary
go run main.go           # Run directly
air                      # Run with hot reloading (recommended for development)
```

### Command Line Flags
```bash
go run main.go -skip-registrations    # Skip connector registrations with Irmin API
go run main.go -migrate              # Run database migrations
air -- -skip-registrations          # Use flags with Air hot reloading
```

### Code Quality
```bash
golangci-lint run        # Run linter
golangci-lint run --fix  # Run linter with automatic fixes
```

### Testing
```bash
go test ./...            # Run all tests
go test -v ./...         # Run tests with verbose output
go test -race ./...      # Run tests with race detection
```

## Environment Configuration

Required environment variables in `.env`:
```bash
# Server Configuration
PORT=8080
URL=http://localhost:8080
PREFORK_ENABLED=true
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGINS=https://api.irmin.dev

# Irmin API Integration
IRMIN_API_BASE_URL=https://api.irmin.dev
IRMIN_API_TOKEN=...

# Database
DATABASE_CONNECTION_STRING=postgres://user:password@localhost:5432/database
```

## Code Quality Standards

- **golangci-lint**: Extremely strict configuration with 50+ linters enabled
- **Maximum Function Length**: 200 lines, 50 statements
- **Cyclomatic Complexity**: Maximum 30
- **No Global Variables**: Enforced via gochecknoglobals
- **No Init Functions**: Enforced via gochecknoinits
- **Structured Logging**: Use log/slog, not standard log package
- **Error Handling**: All errors must be checked and properly wrapped

## Adding New Connectors

1. Create new directory in `connectors/` (e.g., `connectors/mysql/`)
2. Implement connector interface with:
   - `routes.go`: HTTP route definitions
   - `controllers/`: Business logic handlers
   - `client/`: Data source client implementation
   - `models/`: Connector-specific data structures
   - `listener.go`: Real-time change detection (if applicable)
3. Register in `connectors/connectors.go`:
   - Add to `SetupConnectorRoutes()` function
   - Add to `StartConnectorSubscriptionListener()` function
   - Add to `RegisterAllConnectors()` function
4. Place public assets (logos, etc.) in `public/` directory

## Database Operations

The application uses GORM with PostgreSQL and supports:
- **Auto-migrations**: Run with `-migrate` flag
- **Operation Tracking**: All data operations are logged and tracked
- **Real-time Subscriptions**: PostgreSQL LISTEN/NOTIFY for change detection
- **Connection Management**: Proper connection pooling and cleanup

## Hot Reloading

Air configuration (`.air.toml`) provides:
- Automatic rebuilds on Go file changes
- Exclusion of test files and temporary directories
- Build error logging
- Graceful restart handling