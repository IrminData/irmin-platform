# API Routes

HTTP route definitions and API endpoint organization for the Irmin platform (Fiber v3).

**Source of truth**: `routes/routes.go`. This README documents the **high-level structure** (route groups, nesting, middleware boundaries). It is **not an exhaustive endpoint list**.

## Purpose

Organizes API endpoints for:

- **Resource Management**: RESTful routes for all platform resources
- **Authentication**: Public and protected route separation
- **Permission Control**: Role-based access control integration
- **Middleware Integration**: Request processing pipeline
- **API Versioning**: Authenticated REST API is versioned under `/api/v1`

## Route Structure

### Public Routes

No authentication required:

- **Index**: `GET /` (returns `"Irmin API"`)
- **Health probes**: `GET /livez`, `GET /readyz`, `GET /startupz`
- **Docs**: Swagger UI + spec under `/swagger`
- **Public system**: small set of system endpoints (e.g. sandbox health)

### AI Application API Routes (`/api/v1/ai-app`)

Authenticated by **AI Application API key** (middleware: `AIApplicationAPIKeyAuth`, expects `Authorization: Bearer ai_...`):

- **App metadata & prompting** (info/system prompt)
- **Querying** (LLM query endpoint)
- **Object/content access** (list + fetch)
- **Schema access**
- **Embeddings search**
- **Custom tools** (list + execute via `/tools/:tool_name/...`)

### Authenticated REST API (`/api/v1`)

All routes in this group use:

- `LocaleMiddleware` (sets `locale` + `dict` in request locals)
- `AuthMiddleware` (expects `Authorization: Bearer ...`, identifies user via Clerk token and sets `user` in request locals)

#### Top-level resources under `/api/v1`

These are “global” (non-workspace-scoped) resources:

- **System** (webhooks, schema helpers)
- **Profile** (current user)
- **Roles**
- **Connectors** (plus connector-scoped actions; loaded via `ConnectorMiddleware`)
- **Credentials**
- **Workspaces** (index/create, plus workspace-scoped subtree; loaded via `WorkspaceMiddleware`)
- **Invites** (current-user invite management; loaded via `InviteMiddleware`)

#### Workspace-scoped resources (`/api/v1/workspaces/:workspace/...`)

Most platform resources are nested under a workspace. The structure is:

- `/api/v1/workspaces/:workspace` (show/update/delete + a few workspace actions)
- Nested sub-resources under the workspace (each with its own loader + permission middleware)

Key workspace sub-resources (not exhaustive):

- **Access control**: policies, users, invites, audit logs
- **Data operations**: SQL, saved queries, scripts
- **Connectivity**: connections
- **Automation**: workflows (+ workflow runs)
- **AI**: AI applications (+ tool logs)
- **Versioned data**: repositories
  - Nested under a repository: objects, branches, tags, commits, embeddings

## Middleware Integration

- **Authentication middleware**:
  - **User auth**: `AuthMiddleware` (Bearer token; identifies user via Clerk)
  - **AI App auth**: `AIApplicationAPIKeyAuth` (Bearer `ai_...` API key)
- **Localization middleware**: `LocaleMiddleware`
- **Permission middleware**: granular `*PermissionMiddleware(...)` checks on many endpoints
- **Resource loading middleware**: `*Middleware` loaders (workspace, repository, object, etc.) to resolve route params into entities

## API Design

- **RESTful Architecture**: Standard HTTP methods and resource paths
- **Nested Resources**: Hierarchical resource organization
- **Permission Boundaries**: Granular access control at route level
- **Consistent Patterns**: Uniform URL structure and naming conventions

## Integration

Routes connect:

- **HTTP Requests** to appropriate **Controller** methods
- **Middleware** for cross-cutting concerns (auth, permissions, localization)
- **Resource Loading** for parameter validation and entity retrieval
