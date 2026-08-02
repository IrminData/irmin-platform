<img src="https://raw.githubusercontent.com/IrminData/.github/refs/heads/development/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin Connectors

A collection of deployable connectors for Irmin that enable universal interaction with external services, data sources, and export targets in a simple, standardized, stateless and safe fashion.

### Available Connectors

- **[PostgreSQL](connectors/postgres/README.md)** - Database connector for PostgreSQL.
- **[MySQL](connectors/mysql/README.md)** - Database connector for MySQL.
- **[Stripe](connectors/stripe/README.md)** - Payment connector for Stripe.
- **[Linear](connectors/linear/README.md)** - Project management connector for Linear.
- **[Google Drive](connectors/googledrive/README.md)** - File storage connector for Google Drive.

## What are Irmin Connectors?

Irmin Connectors are a collection of API services that allow the Irmin platform to interact with virtually any external system. Connectors define standardized interfaces that enable seamless data import, export, and synchronization across diverse platforms and services.

### Documentation Quick Links

- **[Concepts and Processes](concepts-and-processes.md)** - Understanding how connectors work
- **[How to Create Connectors](how-to-create-connectors.md)** - Developer guide for building new connectors
- **[E2E Test Suite](e2e-tests/README.md)** - Comprehensive end-to-end testing guide

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

Copy the template and fill in the values you need:

```bash
cp .env.example .env
```

[`.env.example`](.env.example) is the single source of truth for every variable the service reads, with defaults and inline descriptions. All vars are runtime configuration (loaded at process startup via `godotenv`) — there are no build-time vars.

> **UNIVERSAL_CONNECTOR_API_KEY** (optional) is a shared API key for all connectors, used for manual testing to bypass per-connector registration. Never set this in production.

### Accessing env vars in code

Don't call `os.Getenv` directly. All vars are loaded and validated once at startup in [`utils/loadEnvs.go`](utils/loadEnvs.go) into the typed `ConnectorsEnv` struct, which is threaded through the app as `ConnectorsApp.Env`.

Adding a new var: update `.env.example`, add a field to `ConnectorsEnv`, load it with `getEnv(...)` in `LoadEnv`, and read it from `app.Env.YourField` at the call site.

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

## Testing

### End-to-End Test Suite

The project includes a comprehensive E2E test suite for validating all connector capabilities.

**Quick start:**

```bash
# Navigate to the e2e-tests directory
cd e2e-tests

# Initialize test configuration
go run main.go -init

# Edit test-config.json with your connector credentials

# Run all tests
go run main.go -v

# Run tests for a specific connector
go run main.go -connector postgres -v
```

The test suite validates:

- Connector info and metadata
- Configuration field retrieval and validation
- Operation lifecycle (init, status, cancel)
- Data operations (pull, push, patch)
- Schema discovery
- Webhook subscriptions

For detailed documentation, see **[E2E Test Suite README](e2e-tests/README.md)**.

## Docker

> For the best Docker experience on macOS, we recommend using [OrbStack](https://orbstack.dev/) instead of Docker Desktop.

### Docker Compose Setup

The project includes a `docker-compose.yml` file for running the complete Irmin infrastructure locally. This includes:

- **API Service** (`connectors`) - The main Irmin Connectors API
- **PostgreSQL Database** (`db_connectors`) - Main application database

#### Running Local Infrastructure

To start only the infrastructure services (database):

```bash
docker compose up -d db_connectors
```

This command runs the services in detached mode (`-d`) and includes:

- PostgreSQL database on port 5435

#### Running the Complete Stack

To run the entire application stack including the API and database:

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
docker build -t irmin-connectors .

# Run the container, injecting your local .env file for configuration
docker run -p 8080:8080 --env-file .env irmin-connectors
```

#### Multi-Platform Builds

For production deployments across different architectures:

```bash
# Create and use buildx builder
docker buildx create --use

# Verify Buildx is active
docker buildx ls

# Build for multiple platforms
docker buildx build --platform linux/amd64/v2,linux/arm64/v8 -t YOUR_DOCKER_USERNAME/irmin-connectors:latest --push .

# Run the container, injecting your local .env file for configuration
docker run -p 8080:8080 --env-file .env irmin-connectors
```

## Async Operations Protocol

Long-running operations follow a `202 Accepted → poll → fetch
result` protocol so clients never hold an open request across a
multi-minute pull. Three top-level endpoints govern job lifecycle:

| Endpoint | Method | Body |
|----------|--------|------|
| `/operation/status/:job_id` | GET | `sdkmodels.OperationJobStatusResponse` on 2xx, `sdkmodels.JobErrorBody` on 4xx/5xx |
| `/operation/result/:job_id` | GET | `application/zip` stream on 200; `409` until worker finishes (client treats as "keep polling"); `410 Gone` when the janitor reaped the file |
| `/operation/cancel/:job_id` | POST | `sdkmodels.CancelOperationJobResponse` with `was_active` on 2xx, `JobErrorBody` on 4xx/5xx |

All three require `Authorization: Bearer <operation-token>` where
the token matches the Operation row backing the job. Cancel is
idempotent — calling on a terminal job still returns 200 with
`was_active=false`.

### Structured error envelopes

Every non-2xx response from these endpoints carries
`sdkmodels.JobErrorBody`:

```json
{
  "error":    "transient database error",
  "reason":   "transient_db_error",
  "retryable": true,
  "job_id":   "opjob_9m3x7k2n8q5p"
}
```

Reasons are stable strings (`transient_db_error`,
`corrupted_job_state`, `not_found`, `invalid_request`, `internal`)
— SDK clients use them to classify failures without parsing the
human-readable `error` field. `retryable=true` is the signal to
back off and retry; `false` is terminal for the caller.

The pre-async `{"error":"..."}` shape has been replaced across all
5 handler call sites (pull, push, schema, pinecone push, stripe
patch). The SDK falls back to `*APIError` for any body missing the
`reason` discriminator, so staged rollouts of SDK clients against
this service continue to work.

### 409 with job_id

A 409 "Operation is already running" response now carries the
blocking job's details via `sdkmodels.AlreadyRunningBody`:

```json
{
  "error":         "Operation is already running",
  "job_id":        "opjob_9m3x7k2n8q5p",
  "operation_id":  42,
  "kind":          "pull",
  "started_at":    "2026-04-24T10:30:00Z"
}
```

Clients can pipe `job_id` straight into
`POST /operation/cancel/:job_id` or `GET /operation/status/:job_id`
to either stop or poll the blocker — no substring matching on the
error message.

### Lock + guard semantics

Every handler that takes the operation-execution lock routes
through `common.JobManager.Begin`, which pins a Postgres session
for the full operation lifetime and releases the session-scoped
`pg_advisory_lock` synchronously via the `OperationGuard.Release`
defer. The older `db.TryLockOperationExecution` /
`db.UnlockOperationExecution` helpers are `Deprecated` — they
used pool handles for acquire/release which could route the
unlock to a different session than the acquire, silently leaking
locks until the original connection was closed.

Async workers additionally go through
`JobManager.StartJobWithGuard`, which recovers panics so a
provider bug never leaves a row stuck at `status=running`. A
janitor pass also reclaims rows whose advisory lock is free but
whose `updated_at` is older than the configured `StuckThreshold`
(default 30 minutes, ~60 heartbeats) as a belt-and-suspenders
safety net for pod crashes.

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

## License

This project is licensed under the [Elastic License 2.0 (ELv2)](LICENSE).
