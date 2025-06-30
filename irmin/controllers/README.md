# Controllers

HTTP request handlers that implement the Irmin API endpoints. Controllers process incoming requests, validate inputs, enforce permissions, and coordinate with other components to deliver responses.

## Purpose

Provides REST API endpoints for:

- **Data Management**: Repository, object, and version control operations
- **Workflow Operations**: Workflow creation, execution, and monitoring
- **User Management**: Authentication, permissions, and workspace access
- **Data Operations**: Queries, connections, and data transformations
- **System Operations**: Health checks, webhooks, and system configuration

## Architecture

- **Request Validation**: Input validation and parameter parsing
- **Permission Enforcement**: Role-based access control via middlewares
- **Business Logic**: Coordinates with engine, orchestrator, and database
- **Response Formatting**: Uses formatter package for consistent API responses
- **Error Handling**: Structured error responses with appropriate HTTP status codes

## Integration

Controllers serve as the API layer between HTTP clients and the core Irmin components (engine, orchestrator, database). They handle HTTP concerns while delegating business logic to appropriate services.
