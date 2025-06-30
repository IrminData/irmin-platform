# API Routes

HTTP route definitions and API endpoint organization for the Irmin platform. Defines RESTful API structure with middleware integration, authentication, and permission controls.

## Purpose

Organizes API endpoints for:

- **Resource Management**: RESTful routes for all platform resources
- **Authentication**: Public and protected route separation
- **Permission Control**: Role-based access control integration
- **Middleware Integration**: Request processing pipeline
- **API Versioning**: Structured versioning with `/api/v1` prefix

## Route Structure

### Public Routes

- **`/`**: Platform index and health checks
- **`/health`**: System health and status endpoints

### Protected Routes (`/api/v1`)

All routes require authentication and include localization middleware:

- **System Routes**: Webhook endpoints for external integrations
- **Profile Management**: User profile operations
- **Workspace Management**: Multi-tenant workspace operations
- **Repository Operations**: Data repository lifecycle
- **Object Management**: File and data object operations
- **Version Control**: Branch, commit, tag, and merge operations
- **Workflow System**: Workflow creation, execution, and monitoring
- **Data Operations**: Queries, connections, and transformations
- **Access Control**: Users, roles, policies, and permissions
- **Search & Discovery**: Full-text search across platform resources

## Middleware Integration

- **Authentication Middleware**: JWT token validation
- **Localization Middleware**: Multi-language support
- **Permission Middleware**: Resource-based access control
- **Resource Middleware**: Parameter validation and resource loading

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
