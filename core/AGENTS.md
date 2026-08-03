# AGENTS.md

This file provides guidance to coding agents (Claude Code, Gemini CLI, etc.) when working with code in this repository. `CLAUDE.md` and `GEMINI.md` are symlinks to this file.

## Project Overview

Irmin Core API is a Go-based RESTful API that provides data versioning, workflow orchestration, and connector-based data integration. It uses LakeFS for git-like data versioning, DuckDB for analytics, and a custom compute sandbox for code execution.

## Common Development Commands

### Dependencies
```bash
# Install dependencies
go mod download

# Update dependencies
go mod tidy && go get -u ./...
```

### Build and Run
```bash
# Build the binary
go build -o out

# Run the binary
./out

# Run directly
go run main.go

# Run with hot reloading (recommended for development)
air
```

### Database Operations

**Note:** Migrations run automatically on startup. This ensures the database schema is always up-to-date for Railway, Docker, and other deployment platforms.

```bash
# Reset the database (empties all tables)
go run main.go -reset

# Skip automatic migrations (for specific use cases)
go run main.go -skip-migrate

# Run with policy override (replaces existing policies with defaults)
go run main.go -override-policies

# Seed default tags for all workspaces
go run main.go -seed-tags

# Seed templates from embedded files
go run main.go -seed-templates

# Seed global OAuth clients from environment variables
go run main.go -seed-oauth-clients

# Seed Daytona snapshots for the compute sandbox (idempotent; targets DAYTONA_TARGET region)
go run main.go -seed-snapshots

# Run garbage collection (clean up orphans, stale records, temp files, sync LakeFS GC rules)
go run main.go -gc

# Dry-run garbage collection (log what would be cleaned, no deletions)
go run main.go -gc-dry-run
```

### Testing
```bash
# Run all tests with 2-minute timeout
go test -timeout 2m ./...

# Run tests with coverage report
go test -timeout 2m ./... -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out

# Run tests for specific package
go test -timeout 2m ./orchestrator/...
```

### Linting
```bash
# Install golangci-lint (macOS)
brew install golangci-lint

# Run linter
golangci-lint run

# Run linter with autofix
golangci-lint run --fix
```

Configuration enforces:
- 120 character line limit (golines)
- Max 200 lines and 50 statements per function
- Max cyclomatic complexity of 30
- No global variables or init functions
- Use math/rand/v2 (not math/rand) in non-test files
- Use log/slog (not log package) in non-main files
- Deprecated packages blocked: github.com/golang/protobuf, github.com/satori/go.uuid, github.com/gofrs/uuid

### Documentation Generation
```bash
# Generate all documentation (HTML, Markdown, Swagger)
./generate-docs.sh

# View Swagger UI (after running the server)
# Navigate to: http://localhost:8080/swagger
```

### MCP Server Testing
```bash
# Test MCP server with inspector
npx @modelcontextprotocol/inspector
```

## High-Level Architecture

### Core Components

**Layered Architecture:**
```
API Layer (Routes, Controllers, Middlewares)
    ↓
Services Layer (APIServices, Permission Service, Locale Manager)
    ↓
Business Logic Layer (Orchestrator, Data Engine, Compute Sandbox)
    ↓
Core Operations Layer (LakeFS, DuckDB, Database, Connectors)
```

### Key Modules

**1. Controllers** (`/controllers`)
- HTTP request handlers organized by domain (repositories, workflows, queries, connections)
- Entry points for all API endpoints

**2. Data Engine** (`/engine`)
- Central data operations abstraction over LakeFS
- Key responsibilities:
  - Repository lifecycle (CRUD, webhooks, garbage collection)
  - Object operations (upload, download, move, copy)
  - Data import/export with field mappings
  - SQL query execution via DuckDB
  - Branch/commit/tag management
  - Branch protection rules

**3. Orchestrator** (`/orchestrator`)
- Event-driven workflow scheduling and execution engine
- Trigger types:
  - **Time Triggers**: Cron expressions or RRule (iCalendar recurrence)
  - **Repository Triggers**: LakeFS webhooks (commit, branch, tag events)
  - **Workflow Run Triggers**: Pre/post execution hooks
- Workflow types:
  - **Action**: Execute custom code in compute sandbox
  - **Import**: Pull data from external connectors
  - **Export**: Push data to external connectors
  - **Pipeline**: Multi-stage sequential workflows
- Coordination: PostgreSQL LISTEN/NOTIFY + row-level locking for multi-instance deployment
- HTTP dispatch pattern for horizontal scaling

**4. Compute Sandbox** (`/compute-sandbox`)
- Isolated code execution for Python 3.11+, Node.js, and Go 1.26 via Daytona sandboxes
- Limits: 50 concurrent executions, 10-minute timeout
- Features: Script locking (PostgreSQL advisory locks), input/output file management
- Security: Separate temp directories, automatic cleanup
- **Baked-in SDKs via Daytona snapshots**: each runtime can boot from a pre-built snapshot that has its SDK install already applied — per-run `installRuntimeSDK` is skipped when the sandbox booted from a snapshot. Today only Go is wired up (`DAYTONA_SNAPSHOT_GO`); Python and Node fall back to raw images until their SDKs ship. `DAYTONA_TARGET` (`eu`/`us`) selects the region; snapshots are per-region. See [compute-sandbox/README.md](./compute-sandbox/README.md) for the per-runtime extension recipe.
- **Snapshot rebuild flow**: bump the runtime's `Snapshot<Runtime>Default` version suffix in [`compute-sandbox/constants.go`](./compute-sandbox/constants.go) → set `DAYTONA_TARGET` → `go run main.go -seed-snapshots` (seeds every wired-up runtime, idempotent per name) → deploy with new `DAYTONA_SNAPSHOT_<RUNTIME>`.

**5. Database Layer** (`/db`)
- PostgreSQL with pgx + GORM
- 30+ models covering users, workspaces, repositories, workflows, connections
- Connection pooling: 15 connections per process (pgxpool)
- PostgreSQL LISTEN/NOTIFY for workflow events
- Advisory locks for distributed coordination

**6. LakeFS Integration** (`/lakefs`)
- Git-like data versioning backend
- Provides: branches, commits, tags, merges, webhooks
- S3-compatible object storage
- Repository-level isolation

**7. DuckDB Integration** (`/duckdb`)
- Columnar analytics engine for SQL queries
- Field mapping transformations during import/export
- Format conversions (CSV, JSON, Parquet)
- Schema detection and analysis

**8. MCP Server** (`/mcp`)
- Model Context Protocol implementation using official go-sdk
- Endpoints:
  - `/mcp` - Full Streamable HTTP flow
  - `/mcp/attach` - Single-step HTTP attach for HTTP-only clients
- Provides AI models programmatic access via tools and resources
- Authentication: Bearer tokens (Clerk JWT or API tokens)

**9. Permission System** (`/permissions`)
- Workspace-scoped role-based access control (RBAC)
- Policy evaluation order:
  1. Workspace owner → always allowed
  2. Explicit deny → deny
  3. Explicit allow → allow
  4. Default deny (no match)
- In-memory caching: Owner policies (1 hour), other roles (5 minutes)

**10. Garbage Collection** (`/gc`)
- CLI-driven data cleanup invoked via `-gc` / `-gc-dry-run` flags
- Phases: LakeFS GC rule sync, workflow run/log event retention, orphan record cleanup, soft-delete purge, temp file removal
- Orphan detection: data-driven rules covering all FK relationships (~50 rules)
- PostgreSQL advisory lock prevents concurrent runs across instances
- Batched deletes (1000 per transaction) to avoid long locks

**11. Supporting Modules**
- `/cache`: Response caching middleware
- `/locales`: Internationalization support
- `/lib`: Shared utilities (workflow creation, role assignment, notifications)
- `/middlewares`: Authentication (Clerk JWT + API tokens), authorization, context extraction
- `/formatter`: API response formatting
- `/embeddings`: Vector embeddings and search
- `/connectors-client`: Client wrapper for external connector service

### Request Processing Pipeline

```
HTTP Request
  → CORS → Request ID → Logging → Security Headers (Helmet)
  → Cache (gatekeeper) → Idempotency → Compression Setup
  → Locale Extraction → Authentication → Authorization
  → Workspace/Resource Context → Controller → Service Layer
  → Engine/Database Operations → Response Formatting
  → Compression → HTTP Response
```

### Key Data Flows

**Import Workflow:**
```
API Request → Controller → Orchestrator → Engine.DataImport()
  → Connector.Pull() → DuckDB.ApplyFieldMappings() → LakeFS.UploadObject()
```

**Query Execution:**
```
API Request → Controller → Engine.ExecuteQuery()
  → Parse Paths → Resolve References → DuckDB → Format Results
```

**Action Workflow:**
```
Trigger Event → Orchestrator → Dispatcher (HTTP) → Worker
  → Engine.GetObjectContent() → ComputeSandbox.ExecuteStoredScript()
  → Engine.UploadObject() → Update Status
```

## Environment Setup

### Required Services
- PostgreSQL 12+ (primary data store)
- LakeFS (data versioning backend)
- S3-compatible object storage (MinIO, DigitalOcean Spaces, AWS S3)
- Clerk (authentication)

### Optional Services
- Polar.sh (billing & subscriptions) — set `BILLING_ENABLED=true` and configure `POLAR_*` env vars

### Configuration
```bash
# Copy example environment file
cp .env.example .env

# Required variables to configure:
# - DATABASE_CONNECTION_STRING: PostgreSQL connection
# - LAKE_FS_URL, LAKE_FS_ACCESS_KEY_ID, LAKE_FS_SECRET_ACCESS_KEY
# - S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_ACCESS_SECRET
# - CLERK_SECRET_KEY, CLERK_SIGNING_KEY

# Optional (billing):
# - BILLING_ENABLED, POLAR_API_KEY, POLAR_WEBHOOK_SECRET
# - POLAR_PRODUCT_ID
```

### Docker Compose
```bash
# Start infrastructure only (databases, MinIO, LakeFS)
docker compose up -d db_api db_lakefs lakefs minio

# Note: Buckets must be created manually on MinIO
# - One bucket for LakeFS (configured as LAKE_FS_S3_BUCKET)
# - One bucket for Irmin workspace data (configured as IRMIN_S3_BUCKET)

# Start full stack (infrastructure + API)
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes all data)
docker compose down -v
```

### Important: Docker vs Local URLs

When API runs in **docker-compose**, use service names:
```bash
LAKE_FS_URL=http://lakefs:8000
S3_ENDPOINT=http://minio:9000
```

When API runs **locally** with docker-compose infrastructure:
```bash
LAKE_FS_URL=http://localhost:8000
S3_ENDPOINT=http://localhost:9000
```

Docker containers use internal network names; host machine uses localhost.

## Code Quality Standards

### Testing Practices
- Unit tests for all packages with significant logic
- Integration tests for database and external service interactions
- 2-minute timeout to prevent hanging tests
- Test coverage reports to identify gaps

### Error Handling
- Use structured logging with slog (not log package, except in main.go)
- Context-aware error messages
- Wrap errors with additional context
- Graceful degradation on non-critical failures
- Transaction rollback on database errors

### Security Considerations
- Path security checks to prevent system path access
- Permission enforcement at every layer
- Short-lived temporary credentials (60 min for sandbox execution)
- Script execution locking via PostgreSQL advisory locks
- Resource ID obfuscation using SQIDs

### Swagger Annotations

Annotate controllers with Swagger comments for API documentation:

```go
// GetUser godoc
// @Summary Get user by ID
// @Tags users
// @Security ApiKeyAuth
// @Param id path string true "User ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User}
// @Failure 400 {object} irminmodels.IrminAPIResponse
// @Router /users/{id} [get]
```

Parameter types: `path`, `query`, `formData`, `body`
Run `./generate-docs.sh` to update Swagger documentation

## Deployment Considerations

### Single Instance
- 15 database connections per process
- Orchestrator runs as background goroutine
- Suitable for development and small deployments

### Multi-Instance (High Availability)
- Load balancer distributes HTTP requests
- Orchestrator instances coordinate via PostgreSQL LISTEN/NOTIFY
- Row-level locking ensures single execution per workflow run
- Stateless design allows horizontal scaling
- LakeFS backend shared across all instances

### Resource Requirements
- CPU: 2-4 cores recommended
- Memory: 2-4GB (depends on concurrent compute sandbox executions)
- Database: PostgreSQL 12+ with connection pooling
- Storage: S3-compatible object storage for LakeFS and Irmin buckets

## Extension Points

To extend the platform:

1. **New Workflow Types**: Add `execute[Type]Workflowable.go` in `/orchestrator` directory
2. **New Trigger Types**: Extend trigger processing logic in orchestrator main loop
3. **New MCP Tools/Resources**: Add to `/mcp/tools` and `/mcp/resources` with registration
4. **Custom Connectors**: Implement connector interface in separate service, use via connectors-client
5. **Additional Formatters**: Add to `/formatter` for new data formats (CSV, JSON, Parquet, etc.)
6. **Custom Middleware**: Add to `/middlewares` for request processing hooks

## Handoff

Before handing off work — finishing a task, opening a PR, or passing to another agent — run the `document-release` skill to reconcile docs (README, ARCHITECTURE, CONTRIBUTING, this AGENTS.md) with what actually shipped. This is required, not optional: it prevents doc drift and ensures the next agent picks up accurate context.
