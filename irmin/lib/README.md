# Shared Library

Common business logic, utilities, and shared functions used across the Irmin platform. Provides reusable components for authentication, permissions, data processing, and system operations.

## Purpose

Provides shared functionality for:

- **Permission Management**: Access control and authorization logic
- **Data Processing**: File parsing, schema analysis, and data transformations
- **User Operations**: Role assignment, notifications, and user management
- **Workflow Support**: Workflow run creation and scheduling utilities
- **Object Management**: Repository object handling and metadata operations

## Features

- **Permission Service**: Centralized access control logic
- **Data Validation**: Input validation and data integrity checks
- **File Processing**: Structured data parsing and analysis
- **Schema Management**: Automatic schema detection and caching
- **Notification System**: Email and in-app notification handling
- **Resource ID Management**: Secure resource identifier generation

## Business Logic

- **Access Control**: Complex permission evaluation with role-based access
- **Data Integrity**: Validation and consistency checks across operations
- **User Experience**: Notification and invitation workflow management
- **Resource Management**: Object lifecycle and metadata handling
- **System Initialization**: Default data seeding and setup

## Integration

Used by:

- **Controllers** for business logic and validation
- **Orchestrator** for workflow operations
- **Engine** for data processing and schema management
- **Authentication** for permission checking and user operations
