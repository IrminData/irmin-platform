# PostgreSQL Connector

This document provides detailed information about the PostgreSQL connector implementation in the Irmin Connectors repository.

## Overview

The PostgreSQL connector enables Irmin to interact with PostgreSQL databases for data import, export, and synchronization operations. It implements all standard connector endpoints and provides real-time change subscription capabilities.

## How It Works

The PostgreSQL connector establishes connections to PostgreSQL databases using the provided credentials and configuration. It can perform various operations including:

- **Data Extraction**: Query tables and views to extract data
- **Data Loading**: Insert, update, or upsert data into tables
- **Schema Discovery**: Automatically detect table structures and relationships
- **Change Monitoring**: Subscribe to database changes using PostgreSQL's logical replication

## Data Fetching and Pushing

### Library Used
The connector uses the `pgx` library (via `database/sql` interface) for PostgreSQL connectivity, which provides:
- Connection pooling
- Prepared statement support
- Type-safe parameter binding
- Efficient bulk operations
- PostgreSQL-specific features support

### Data Fetching Process
1. **Connection Establishment**: Creates a connection using the provided settings and credentials
2. **Schema Discovery**: Queries `information_schema` to understand table structures
3. **Data Extraction**: Executes SELECT queries with appropriate filtering and pagination
4. **Format Conversion**: Converts result sets to CSV format within ZIP files
5. **Response Packaging**: Returns data as downloadable ZIP archives

### Data Pushing Process
1. **File Processing**: Extracts and validates uploaded ZIP files containing CSV data
2. **Schema Validation**: Ensures incoming data matches expected table schemas
3. **Data Transformation**: Converts CSV data to appropriate PostgreSQL types
4. **Batch Operations**: Uses efficient bulk insert/update operations
5. **Transaction Management**: Ensures data consistency with proper transaction handling

## Required Configuration Fields

### Connection Settings (`ConnectionSettings`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `database` | string | Yes | The name of the PostgreSQL database to connect to |

### Connection Details (`ConnectionDetails`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | string | Yes | PostgreSQL server hostname or IP address |
| `port` | integer | Yes | PostgreSQL server port (usually 5432) |
| `username` | string | Yes | Database username for authentication |
| `password` | string | Yes | Database password for authentication |
| `ssl_mode` | string | No | SSL connection mode (disable, require, prefer, etc.) |

## Supported Operations

### Pull Operations
- **Table Export**: Extract complete table contents
- **Query Export**: Execute custom SELECT queries
- **Incremental Export**: Export data based on timestamps or sequential IDs
- **Filtered Export**: Apply WHERE conditions for selective data extraction

### Push Operations
- **Table Import**: Import data into existing tables
- **Upsert Operations**: Insert new records or update existing ones
- **Bulk Insert**: Efficient insertion of large datasets
- **Schema Creation**: Automatically create tables based on incoming data structure

### Patch Operations
- **Record Updates**: Update specific records based on key fields
- **Conditional Updates**: Apply updates based on WHERE conditions
- **Partial Updates**: Update only specified columns

## Subscription Features

The PostgreSQL connector supports real-time change monitoring through PostgreSQL's notification system (`pg_notify`). When Irmin creates a subscription, the connector automatically:

1. **Sets up database triggers** on monitored tables
2. **Starts a listener goroutine** that maintains a persistent connection
3. **Sends webhook notifications** to Irmin when data changes occur

### How It Works

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────┐
│  PostgreSQL │──────│ Connector       │──────│   Irmin     │
│  Database   │      │ Listener        │      │   API       │
└─────────────┘      └─────────────────┘      └─────────────┘
      │                      │                       │
      │  1. Data change      │                       │
      │  triggers pg_notify  │                       │
      │─────────────────────>│                       │
      │                      │  2. Listener receives │
      │                      │     notification      │
      │                      │                       │
      │                      │  3. Sends webhook     │
      │                      │     with patch data   │
      │                      │──────────────────────>│
      │                      │                       │
      │                      │                       │  4. Irmin processes
      │                      │                       │     patch and triggers
      │                      │                       │     workflows
```

### Subscription Lifecycle

1. **Subscribe** (`POST /postgres/operation/subscribe`)
   - Irmin calls this endpoint when a user creates a subscription
   - Creates notification triggers on the database
   - Starts a dedicated listener goroutine
   - Returns a subscription ID for management

2. **Listening**
   - The listener maintains a persistent connection to PostgreSQL
   - Uses `LISTEN` command to receive `pg_notify` events
   - Automatically reconnects on connection loss

3. **Notification**
   - When data changes, triggers fire `pg_notify`
   - Listener receives the notification with change details
   - Sends HTTP POST to Irmin's webhook endpoint with patch data

4. **Unsubscribe** (`POST /postgres/operation/unsubscribe`)
   - Stops the listener goroutine
   - Cleans up the subscription record
   - Does NOT remove database triggers (for safety)

### Configuration Requirements
For subscriptions to work, the PostgreSQL instance must have:
- Connection user with `TRIGGER` and `EXECUTE` privileges
- Access to create functions in the target schema
- Firewall rules allowing persistent connections

### Webhook Payload Format
```json
{
  "event_type": "upsert",
  "patches": [
    {
      "op": "replace",
      "path": "/users/123/email",
      "value": "new@example.com"
    }
  ]
}
```

## File Structure

```
connectors/postgres/
├── models/
│   ├── connectionSettings.go    # Database connection configuration
│   └── connectionDetails.go     # User credentials and connection details
├── controllers/
│   └── controllers.go           # HTTP endpoint handlers
├── client/
│   └── client.go               # PostgreSQL client implementation
├── config/
│   └── config.go               # Configuration field definitions
├── routes.go                   # Route definitions and middleware setup
└── listener.go                 # Change subscription listener implementation
```

## Authentication

The PostgreSQL connector uses two levels of authentication:

1. **System Token Authentication**: Required for connector management operations
2. **Operation Token Authentication**: Required for data operations
3. **Database Authentication**: Uses provided username/password for PostgreSQL connections

## Error Handling

The connector provides detailed error messages for common scenarios:
- **Connection Failures**: Network issues, invalid credentials, database unavailable
- **Permission Errors**: Insufficient database privileges
- **Schema Conflicts**: Table structure mismatches
- **Data Validation**: Type conversion errors, constraint violations

## Performance Considerations

### Optimization Features
- **Connection Pooling**: Reuses database connections for efficiency
- **Batch Processing**: Groups operations for better performance
- **Streaming Results**: Handles large datasets without memory overflow
- **Prepared Statements**: Improves query execution performance

### Recommended Practices
- Use appropriate indexes on frequently queried columns
- Consider pagination for large result sets
- Monitor connection pool usage
- Implement appropriate timeout values

## Security Features

### Credential Management
- Credentials are never stored permanently
- Encryption in transit using SSL/TLS
- Support for connection string parameters
- Secure handling of sensitive configuration

### Access Control
- Respects PostgreSQL's built-in permission system
- Supports role-based access control
- Can be configured with read-only users for extraction operations

## Troubleshooting

### Common Issues

**Connection Refused**
- Verify PostgreSQL server is running
- Check firewall settings
- Confirm connection parameters

**Authentication Failed**
- Verify username and password
- Check user permissions
- Ensure database exists

**Permission Denied**
- Grant appropriate table permissions
- For subscriptions, ensure replication permissions
- Check schema access rights

### Debugging

Enable detailed logging by setting appropriate log levels in the Irmin Connectors application. The PostgreSQL connector logs:
- Connection attempts and results
- Query execution details
- Error conditions with context
- Performance metrics

## Example Usage

### Basic Configuration
```json
{
  "settings": {
    "database": "myapp_production"
  },
  "details": {
    "host": "db.example.com",
    "port": 5432,
    "username": "readonly_user",
    "password": "secure_password",
    "ssl_mode": "require"
  }
}
```

### Advanced Configuration with SSL
```json
{
  "settings": {
    "database": "enterprise_db"
  },
  "details": {
    "host": "secure-db.company.com",
    "port": 5432,
    "username": "integration_user",
    "password": "complex_password",
    "ssl_mode": "require",
    "ssl_cert": "/path/to/client-cert.pem",
    "ssl_key": "/path/to/client-key.pem",
    "ssl_root_cert": "/path/to/ca-cert.pem"
  }
}
```

The PostgreSQL connector serves as an excellent reference implementation for creating new database connectors in the Irmin ecosystem.