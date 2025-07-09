# Concepts and Processes

This document explains the core concepts, architecture, and processes behind the Irmin Connectors system.

## Core Concepts

### What is a Connector?

A connector is a specialized application that:
- **Defines Interfaces**: Standardized endpoints for system interaction
- **Handles Authentication**: Manages secure connections to external systems
- **Processes Data**: Transforms and transfers data between Irmin and external services
- **Maintains State**: Operates in a stateless manner for reliability and scalability
- **Ensures Safety**: Implements secure practices for credential and data handling

### What is an Operation?

An operation represents a specific task or workflow involving data transfer:
- **Pull Operations**: Extract data from external systems into Irmin
- **Push Operations**: Send data from Irmin to external systems
- **Patch Operations**: Update existing data in external systems
- **Subscribe Operations**: Monitor external systems for real-time changes

Operations have defined lifecycles with initialization, execution, and completion phases.

### "Everything is a File" Philosophy

Connectors follow the principle that all data should be treated as files:
- **Database Tables** → CSV files within ZIP archives
- **API Responses** → JSON files
- **Documents** → Files in their original format
- **Media Content** → Binary files

This approach provides consistency regardless of the underlying data source and simplifies data handling across different systems.

## How Connector Registration Works

### Registration Process

1. **Startup Registration**: When the connector server starts, it automatically registers all available connectors with the Irmin API
2. **Token Generation**: Each connector receives a unique system token for authentication
3. **Database Storage**: Registration details are stored locally for token validation
4. **Health Verification**: The Irmin API validates connector availability through health checks
5. **Update Handling**: Existing connectors are updated rather than re-registered

### Registration Components

- **System Tokens**: Long-lived tokens for connector management operations
- **Connector Metadata**: Name, capabilities, endpoints, and configuration requirements
- **Health Endpoints**: Used by Irmin API to verify connector availability
- **Version Information**: Tracks connector versions and compatibility

## Database Usage

The local database serves several critical functions:

### What is Stored?

- **Connector Registrations**: Links between local connectors and Irmin API registrations
- **System Tokens**: Authentication tokens for each registered connector
- **Operation Tokens**: Temporary tokens for active data operations
- **Subscription Data**: Information about active change subscriptions
- **Configuration Cache**: Cached configuration data for performance

### Database Schema

The database maintains tables for:
- `connector_registrations`: Connector registration and token information
- `operations`: Active and historical operation records
- `subscriptions`: Real-time change subscription configurations

## Data Transmission

### How Data Flows Between Connectors and Irmin API

1. **ZIP Archive Format**: All data is transmitted as ZIP files containing structured data
2. **HTTP/HTTPS Transport**: Secure HTTP connections for all data transfer
3. **Chunked Transfer**: Large datasets are handled with appropriate chunking
4. **Compression**: Built-in compression reduces transfer time and bandwidth usage
5. **Error Recovery**: Robust error handling and retry mechanisms

### Data Security

- **Encryption in Transit**: All data transmission uses HTTPS/TLS
- **Token-Based Authentication**: Operation and system tokens secure all endpoints
- **Credential Isolation**: User credentials are never stored permanently
- **Audit Logging**: Comprehensive logging of all data operations

## Webhooks and Generic Features

### Webhook Support

Connectors can implement webhook endpoints for:
- **Real-time Notifications**: Receive immediate updates from external systems
- **Event Processing**: Handle specific events and trigger appropriate responses
- **Status Updates**: Provide operation status updates to the Irmin API
- **Error Reporting**: Report errors and exceptions to central monitoring

### Generic Connector Features

All connectors implement standard endpoints:
- **Information Endpoint**: Provides connector capabilities and metadata
- **Configuration Endpoints**: Handle dynamic configuration field generation
- **Validation Endpoints**: Validate connection settings and credentials
- **Operation Lifecycle**: Initialize, execute, and monitor operations
- **Health Checks**: Report connector health and availability

## Security and Credential Management

### Credential Handling Principles

- **No Permanent Storage**: Credentials are only held during active operations
- **Encryption**: All sensitive data is encrypted at rest and in transit
- **Access Control**: Role-based access to connector operations
- **Audit Trails**: Complete audit logs for credential access and usage

### Authentication Levels

1. **System Authentication**: Connector-to-Irmin API communication
2. **Operation Authentication**: Specific operation authorization
3. **External Authentication**: Credentials for external system access

## Repository Structure

This repository contains:
- **Connector Implementations**: Individual connector modules in the `connectors/` directory
- **Shared Libraries**: Common utilities and models in `lib/` and `models/`
- **Database Layer**: Connection and registration management in `db/`
- **Public Assets**: Connector logos and resources in `public/`
- **Documentation**: Comprehensive guides and specifications

## Standard Connector Architecture

### Required Endpoints

Every connector must implement these endpoints:

#### System Token Authenticated Endpoints
- **`GET /{connector-slug}/info`** - Returns connector information and capabilities
- **`POST /{connector-slug}/configuration/{key}/fields`** - Returns dynamic configuration fields
- **`POST /{connector-slug}/configuration/validate`** - Validates connection configuration
- **`POST /{connector-slug}/operation/init`** - Initializes a new operation
- **`POST /{connector-slug}/operation/cancel`** - Cancels a running operation
- **`POST /{connector-slug}/operation/status`** - Returns operation status

#### Operation Token Authenticated Endpoints
- **`POST /{connector-slug}/operation/schema/{operation}`** - Returns schema for the operation
- **`POST /{connector-slug}/operation/push`** - Pushes data to the external system
- **`POST /{connector-slug}/operation/patch`** - Updates data in the external system
- **`POST /{connector-slug}/operation/pull`** - Pulls data from the external system
- **`POST /{connector-slug}/operation/subscribe`** - Subscribes to changes (optional)

#### Public Endpoints
- **`GET /{connector-slug}/details`** - Public information about the connector

### File Structure Convention

```
connectors/{connector-name}/
├── models/
│   ├── connectionSettings.go    # Connector-specific configuration
│   └── connectionDetails.go     # User credentials and connection details
├── controllers/
│   └── controllers.go           # HTTP endpoint handlers
├── client/
│   └── client.go               # External system client implementation
├── config/
│   └── config.go               # Configuration field definitions
├── routes.go                   # Route definitions and middleware setup
├── listener.go                 # Change subscription listener (if applicable)
└── README.md                   # Connector-specific documentation
```

## Operation Lifecycle

### Operation States

1. **Initialization**: Operation is created and configured
2. **Validation**: Configuration and credentials are validated
3. **Execution**: Data transfer operations are performed
4. **Monitoring**: Progress and status are tracked
5. **Completion**: Operation finishes successfully or with errors
6. **Cleanup**: Temporary resources are cleaned up

### Token Management

- **System Tokens**: Generated during connector registration, long-lived
- **Operation Tokens**: Generated per operation, short-lived, scoped to specific tasks
- **Token Validation**: All endpoints validate tokens against the local database
- **Token Expiry**: Operation tokens expire after completion or timeout

## Error Handling and Recovery

### Error Categories

- **Configuration Errors**: Invalid settings or missing required fields
- **Authentication Errors**: Invalid credentials or expired tokens
- **Network Errors**: Connection issues or timeouts
- **Data Errors**: Schema mismatches or validation failures
- **System Errors**: Internal server errors or resource limitations

### Recovery Mechanisms

- **Automatic Retry**: Transient errors are retried with exponential backoff
- **Graceful Degradation**: Partial failures are handled appropriately
- **Error Reporting**: Detailed error information is provided to users
- **Rollback Capabilities**: Failed operations can be rolled back when possible

## Performance Considerations

### Optimization Strategies

- **Connection Pooling**: Reuse database and external service connections
- **Batch Processing**: Group operations for efficiency
- **Streaming**: Handle large datasets without loading everything into memory
- **Caching**: Cache frequently accessed configuration and schema data
- **Compression**: Compress data transfer to reduce bandwidth usage

### Monitoring and Metrics

- **Operation Metrics**: Track success rates, duration, and throughput
- **Resource Usage**: Monitor CPU, memory, and network utilization
- **Error Rates**: Track and alert on error patterns
- **Performance Trends**: Analyze performance over time

This document provides the foundational understanding needed to work with and extend the Irmin Connectors system.