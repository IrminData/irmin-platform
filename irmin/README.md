<img src="https://github.com/IrminData/irmin-console/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Core API

Irmin Core API is a RESTful API that provides a unified interface to interact with Irmin services. It is built in Go and uses the [Fiber](https://github.com/gofiber/fiber) web framework.

## Requirements

### Compute Sandbox

The compute sandbox enables execution of user-provided Python, Node.js, and Go scripts with basic resource controls and concurrency limits. See [compute-sandbox/README.md](compute-sandbox/README.md) for details.

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
- `-seed-templates`: Seeds templates from embedded files

Example usage:

```bash
# Reset the database
go run main.go -reset

# Run migrations
go run main.go -migrate

# Run migrations and override existing policies
go run main.go -migrate -override-policies

# Seed default tags for all workspaces and templates from embedded files
go run main.go -seed-tags -seed-templates
```

## Linting

This project uses [golangci-lint](https://golangci-lint.run/) for code quality checks. The configuration is defined in `.golangci.yml`.

**Install golangci-lint**

```bash
# macOS
brew install golangci-lint
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

## API Documentation

This project generates comprehensive documentation in multiple formats using a unified workflow.

### Documentation Types

The project generates three types of documentation:

1. **HTML Documentation** - Individual HTML files for each package using `go doc`, stored in `docs/html/` with an index
2. **Markdown Reference** - Combined markdown documentation using `gomarkdoc`, stored in `docs/docs.md`
3. **Swagger/OpenAPI** - API documentation using `swaggo/swag`, stored in `docs/swagger.json`, `docs/swagger.yaml`, and `docs/docs.go`

### Quick Start

**Generate all documentation**:

```bash
./generate-docs.sh
```

This script will:

- Install required tools (`gomarkdoc` and `swag`) if not present
- Generate HTML docs for all packages in `docs/html/`
- Create a combined markdown reference in `docs/docs.md`
- Generate Swagger API documentation in `docs/`
- Ensure proper Go version compatibility

**View documentation**:

- HTML docs: Open `docs/html/index.html` in your browser
- Markdown: View `docs/docs.md`
- Swagger UI: `http://localhost:8080/swagger`

### Manual Generation (Alternative)

If you prefer to generate documentation manually:

```bash
# Install tools
go install github.com/princjef/gomarkdoc/cmd/gomarkdoc@latest
go install github.com/swaggo/swag/cmd/swag@latest

# Generate HTML docs
mkdir -p docs/html
go doc -all ./... > docs/html/packages.html

# Generate markdown docs
gomarkdoc ./... > docs/docs.md

# Generate Swagger docs
swag init -g main.go --output ./docs --parseDependency --parseInternal
```

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

## Billing

Optional Polar.sh integration for subscription management, checkout sessions, and usage-based metering. Disabled by default. See [BILLING.md](BILLING.md) for setup instructions, Polar configuration, and architecture details.

## MCP Server

The MCP server implementation using the official Go SDK is available under `mcp/`. It runs automatically with the main server and is mounted at `MCP_HTTP_PATH` (default `/mcp`). See `mcp/README.md` for details.

Run `npx @modelcontextprotocol/inspector` to test and inspect the MCP server.

## Docker

> For the best Docker experience on macOS, we recommend using [OrbStack](https://orbstack.dev/) instead of Docker Desktop.

### Docker Compose Setup

The project includes a `docker-compose.yml` file for running the complete Irmin infrastructure locally. This includes:

- **API Service** (`api`) - The main Irmin Core API
- **PostgreSQL Database** (`db_api`) - Main application database
- **LakeFS Database** (`db_lakefs`) - LakeFS metadata database
- **MinIO** (`minio`) - S3-compatible object storage
- **LakeFS** (`lakefs`) - Data versioning service

#### Running Local Infrastructure

To start only the infrastructure services (databases, storage, and LakeFS):

```bash
docker compose up -d db_api db_lakefs lakefs minio
```

This command runs the services in detached mode (`-d`) and includes:

- PostgreSQL databases on ports 5433 and 5434
- MinIO on ports 9000 (API) and 9001 (Console)
- LakeFS on port 8000

> Buckets need to be created manually on MinIO. One for LakeFS and one for generic Irmin workspace data.

#### Running the Complete Stack

To run the entire application stack including the API:

```bash
docker compose up -d
```

#### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker compose down -v
```

### Dockerfile Usage

#### Building the Image

```bash
# Build the Docker image
docker build -t irmin .

# Run the container, injecting your local .env file for configuration
docker run -p 8080:8080 --env-file .env irmin
```

#### Multi-Platform Builds

For production deployments across different architectures:

```bash
# Create and use buildx builder
docker buildx create --use

# Verify Buildx is active
docker buildx ls

# Build for multiple platforms
docker buildx build --platform linux/amd64/v2,linux/arm64/v8 -t YOUR_DOCKER_USERNAME/irmin:latest --push .
```

## Environment Variables

Copy the template and fill in the values you need:

```bash
cp .env.example .env
```

[`.env.example`](.env.example) is the single source of truth for every variable the service reads, with defaults, descriptions, and generation hints for any secrets. All variables are runtime configuration (loaded at process startup via `godotenv`) — there are no build-time variables.

### Important: Docker Compose vs Local URLs

When running the API in **docker-compose**, use service names so containers can resolve each other over Docker's internal network:

```bash
LAKE_FS_URL=http://lakefs:8000
S3_ENDPOINT=http://minio:9000
```

When running the API **locally** (outside Docker) against docker-compose infrastructure, use `localhost` to reach the exposed ports:

```bash
LAKE_FS_URL=http://localhost:8000
S3_ENDPOINT=http://localhost:9000
```

## License

This project is licensed under the [Elastic License 2.0 (ELv2)](LICENSE).
