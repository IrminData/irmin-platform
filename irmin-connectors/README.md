<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Connectors

A collection of deployable connectors for Irmin that enable universal interaction with external services, data sources, and export targets in a simple, standardized, stateless and safe fashion.

### Available Connectors

- **[PostgreSQL](connectors/postgres/README.md)** - Database connector for PostgreSQL.
- **[MySQL](connectors/mysql/README.md)** - Database connector for MySQL.
- **[SFTP](connectors/sftp/README.md)** - File transfer protocol connector for SFTP.

## What are Irmin Connectors?

Irmin Connectors are a collection of API services that allow the Irmin platform to interact with virtually any external system. Connectors define standardized interfaces that enable seamless data import, export, and synchronization across diverse platforms and services.

### Documentation Quick Links

- **[Concepts and Processes](concepts-and-processes.md)** - Understanding how connectors work
- **[How to Create Connectors](how-to-create-connectors.md)** - Developer guide for building new connectors

## Technology Stack

### Core Technologies

- **Language**: Go (Golang) for performance and concurrent processing
- **Web Framework**: Fiber for high-performance HTTP handling
- **Database**: PostgreSQL for reliable data storage
- **Authentication**: JWT-based token systems
- **Logging**: Structured logging with configurable levels
- **Templates**: Embedded HTML templates for connector detail pages

### Development Tools

- **Hot Reloading**: Air for development efficiency
- **Code Quality**: golangci-lint for comprehensive code analysis
- **Dependency Management**: Go modules for package management
- **Testing**: Built-in Go testing framework with custom extensions

## Getting Started

### Prerequisites

- Go 1.25 or higher
- PostgreSQL database
- Access to Irmin API instance

### Installation and Setup

**Install dependencies**

```bash
go mod download
```

**Update dependencies**

```bash
go mod tidy && go get -u ./...
```

**Environment Configuration**

Create a `.env` file with the following variables:

```bash
PORT=8080
URL=http://localhost:8080

PREFORK_ENABLED=true
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_ORIGINS=https://api.irmin.dev

IRMIN_API_BASE_URL=https://api.irmin.dev
IRMIN_API_TOKEN=your_api_token_here

DATABASE_CONNECTION_STRING=postgres://user:password@localhost:5432/database
```

### Running the Application

**Development (with hot reloading)**

```bash
air
```

**Production build**

```bash
go build -o out
./out
```

**With flags**

```bash
go run main.go -migrate               # Run database migrations on startup
go run main.go -skip-registrations    # Skip connector registrations
go run main.go -migrate -skip-registrations  # Combine both flags
```

### Code Quality

**Run linter**

```bash
golangci-lint run
```

**Run with autofix**

```bash
golangci-lint run --fix
```

## Docker

1. Build the image:

	docker build -t irmin-connectors .

2. Run the container, injecting your local .env file for configuration:

	docker run -p 8080:8080 --env-file .env irmin-connectors

## API Documentation (Swagger)

This project uses [swaggo/swag](https://github.com/swaggo/swag) to automatically generate OpenAPI/Swagger documentation from Go annotations.

### Quick Start

**Generate documentation**:
```bash
go install github.com/swaggo/swag/cmd/swag@latest
go run github.com/swaggo/swag/cmd/swag@latest init --parseDependency
```

**View documentation**: `http://localhost:8080/swagger`

### Basic Annotation Examples

```go
// GetUser godoc
// @Summary Get user by ID
// @Tags users
// @Security SystemTokenAuth
// @Param id path string true "User ID"
// @Param search query string false "Search term"
// @Param active query bool false "Filter by active status"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User}
// @Failure 400 {object} irminmodels.IrminAPIResponse
// @Router /users/{id} [get]

// CreateUser godoc
// @Summary Create a new user
// @Tags users
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param body body CreateUserRequest true "User creation data"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.User}
// @Failure 400 {object} irminmodels.IrminAPIResponse
// @Router /users [post]

// UpdateUser godoc
// @Summary Update user
// @Tags users
// @Security SystemTokenAuth
// @Param id path string true "User ID"
// @Param name formData string false "User name"
// @Param email formData string false "User email"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User}
// @Router /users/{id} [patch]
```

**Parameter types**:
- `path` - URL path parameter
- `query` - Query string parameter  
- `formData` - Form field
- `body` - JSON request body (requires `@Accept json`)

**Response types**:
- Single object: `{object} Model`
- Array: `{object} irminmodels.IrminAPIResponse{data=[]Model}`
- Composed: `{object} irminmodels.IrminAPIResponse{data=Model}`

### Annotating Request/Response Structs

Define structs with proper tags for better documentation:

```go
type CreateUserRequest struct {
    Name     string                 `json:"name" example:"John Doe" validate:"required"`
    Email    string                 `json:"email" example:"john@example.com" validate:"required,email"`
    Roles    []string               `json:"roles" example:"admin,user,viewer" validate:"required,dive,oneof=admin user viewer"`
    Active   bool                   `json:"active" example:"true"`
    Metadata map[string]any         `json:"metadata,omitempty" example:"{\"department\":\"engineering\"}"`
    Settings map[string]any         `json:"settings"` // Values for the user's settings as JSON object, like {"notifications":true, "theme":"dark"}
}

type User struct {
    ID       string    `json:"id" example:"user_123"`
    Name     string    `json:"name" example:"John Doe"`
    Email    string    `json:"email" example:"john@example.com"`
    Roles    []string  `json:"roles" example:"admin,user,viewer"`
    Active   bool      `json:"active" example:"true"`
    Created  time.Time `json:"created" example:"2023-01-01T00:00:00Z"`
}
```

**Useful struct tags**:
- `json:"field_name"` - JSON field name
- `example:"value"` - Example value in Swagger UI
- `validate:"required"` - Mark field as required
- `enums:"val1,val2,val3"` - Enum values
- `swaggerignore:"true"` - Exclude field from docs

For detailed documentation and advanced features, see [swaggo/swag](https://github.com/swaggo/swag).
