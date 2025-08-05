<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Core API

Irmin Core API is a RESTful API that provides a unified interface to interact with Irmin services. It is built in Go and uses the [Fiber](https://github.com/gofiber/fiber) web framework.

## Commands

**Install dependencies**
`go mod download`

**Update dependencies**
`go mod tidy` and `go get -u ./...`

**Build**
`go build -o out`

And then run the binary file `./out`

**Run**
`go run main.go`

**Run with hot reloading (recommended for development)**
`air`

This project includes [Air](https://github.com/air-verse/air) configuration for hot reloading during development. Air automatically rebuilds and restarts the application when you make changes to the code. Follow the instructions in the Air README to install it.

**Run tests**
`go test -timeout 2m ./...`

**Run tests with coverage**
`go test -timeout 2m ./... -coverprofile=coverage.out`

**View coverage**
`go tool cover -html=coverage.out`

## Command Line Flags

The following command line flags are available when running the application:

- `-reset`: Reset the database (empties all tables)
- `-migrate`: Run database migrations (creates tables, adds indexes, seeds initial roles, sets default policies)
- `-override-policies`: When used with `-migrate`, overrides existing policies with default ones
- `-seed-tags`: Seeds default tags for all workspaces

**Run with flags**
`go run main.go -migrate` or `air -- -migrate` (run database migrations)

`go run main.go -migrate -override-policies` or `air -- -migrate -override-policies` (run database migrations and override existing policies)

`go run main.go -seed-tags` or `air -- -seed-tags` (seed default tags for all workspaces)

Example usage:

```bash
# Reset the database
go run main.go -reset

# Run migrations
go run main.go -migrate

# Run migrations and override existing policies
go run main.go -migrate -override-policies
```

## Linting

This project uses [golangci-lint](https://golangci-lint.run/) for code quality checks. The configuration is defined in `.golangci.yml`.

**Install golangci-lint**

```bash
# macOS
brew install golangci-lint

# Linux
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.2
```

**Run the linter**

```bash
golangci-lint run
```

**Run the linter with autofix**

```bash
golangci-lint run --fix
```

The linter is configured to be strict but practical, with a focus on code quality and maintainability. It includes checks for:

- Code formatting (goimports, golines)
- Error handling
- Code complexity
- Security issues
- Best practices
- And many more

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
// @Security ApiKeyAuth
// @Param id path string true "User ID"
// @Param search query string false "Search term"
// @Param active query bool false "Filter by active status"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User}
// @Failure 400 {object} irminmodels.IrminAPIResponse
// @Router /users/{id} [get]

// CreateUser godoc
// @Summary Create a new user
// @Tags users
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param body body CreateUserRequest true "User creation data"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.User}
// @Failure 400 {object} irminmodels.IrminAPIResponse
// @Router /users [post]

// UpdateUser godoc
// @Summary Update user
// @Tags users
// @Security ApiKeyAuth
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

## Docker

1. Build the image:

	docker build -t irmin .

2. Run the container, injecting your local .env file for configuration:

	docker run -p 8080:8080 --env-file .env irmin

## Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```bash
PORT=8082 # Port to run the API server on
URL=http://localhost:8082 # URL of the API server
TOKEN=... # Token to authenticate system requests to the API

PREFORK_ENABLED=true # Enable prefork
HELMET_ENABLED=true # Enable helmet
IDEMPOTENCY_ENABLED=true # Enable idempotency
CORS_ENABLED=true # Enable CORS
ALLOWED_ORIGINS=https://console.irmin.dev,https://connectors.irmin.dev # Allowed origins for CORS

ORCHESTRATOR_ENABLED=true # Enable the orchestrator

SQID_ALPHABET=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 # Alphabet to use for SQIDs

DATABASE_CONNECTION_STRING=postgresql://user:pwd@localhost:5432/irmin # Postgres DB connection string

RESEND_API_KEY=re_... # Resend API Key for emails

CONSOLE_URL=https://console.irmin.dev # URL of the Irmin Console

INVITE_EXPIRES_IN_DAYS=7 # Number of days before an invite expires

CLERK_PUBLIC_KEY=pk_test_... # Clerk Public API Key
CLERK_SECRET_KEY=sk_test_... # Clerk Secret API Key
CLERK_SIGNING_KEY=... # Clerk Signing Key for JWT
CLERK_SIGNING_ALGORITHM=HS512 # Clerk Signing Algorithm for JWT

NOVU_SECRET_KEY=abc123 # Novu secret key

LAKE_FS_URL=https://lake.irmin.dev # URL of the Lake FS instance for versioning
LAKE_FS_ACCESS_KEY_ID=... # Access key ID for the Lake FS instance
LAKE_FS_SECRET_ACCESS_KEY=... # Secret access key for the Lake FS instance
LAKE_FS_S3_BUCKET=lakefs # Bucket name used by Lake FS for storing repositories

IRMIN_S3_BUCKET=irmin # Bucket name used by Irmin for storing non-repository objects

S3_ENDPOINT=https://ams3.digitaloceanspaces.com # Endpoint of the S3-compatible object store
S3_REGION=us-east-1 # Region of the S3-compatible object store
S3_ACCESS_KEY_ID=... # Access key ID for the S3-compatible object store
S3_ACCESS_SECRET=... # Secret access key for the S3-compatible object store

SKIP_OPTIONAL_DUCKDB_EXTENSIONS=true # Skip optional extensions (e.g. parquet, orc)

TEST_CONNECTOR_BASE_URL=https://connectors.irmin.dev/postgres # Base URL of the connector to test with
TEST_CONNECTOR_TOKEN=... # Connector's operation token for testing
TEST_CONNECTOR_PATH=/test.json # Path to the test file in the connector
TEST_OBJECT_NAME=test.json # Name of the test object in the object store, expected to be a structured JSON file
TEST_USER_EMAIL=test@irmin.dev # Email of the test user
TEST_WORKSPACE=test-workspace # Workspace to test with
TEST_REPOSITORY=test-repository # Repository to test with
TEST_BRANCH=dev # Branch to test with
TEST_TAG=test-tag # Tag to test with
```
