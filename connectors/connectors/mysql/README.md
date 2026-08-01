# MySQL Connector

The MySQL connector enables data import, export, and real-time change monitoring for MySQL databases through the Irmin platform.

## Features

- **Database Connection**: Connect to MySQL servers using standard connection parameters
- **Schema Introspection**: Automatically discover database structure, tables, and columns
- **Data Operations**:
  - **Pull**: Extract data from MySQL tables and export as structured files
  - **Push**: Import data into MySQL tables with transaction safety
  - **Patch**: Apply targeted updates to specific rows and columns
- **Change Notifications**: Monitor MySQL binary logs for real-time change detection
- **Transaction Safety**: All operations use database transactions to ensure data consistency

## Connection Requirements

### Required Fields
- **Host**: MySQL server hostname or IP address
- **Port**: MySQL server port (default: 3306)
- **User**: MySQL username with appropriate permissions
- **Password**: MySQL user password

### Optional Fields
- **Default Database**: Initial database to connect to (useful for listing available databases)

### Database Selection
After providing connection details, you can select from available databases on the server. System databases (`information_schema`, `mysql`, `performance_schema`, `sys`) are automatically filtered out.

## Supported Operations

### Pull Operations
Extract data from MySQL tables:
- Supports individual table or full database exports
- Data returned as structured files (CSV/JSON format)
- Maintains column types and relationships
- Handles large datasets efficiently

### Push Operations
Import data into MySQL tables:
- Replaces existing table data (truncate and insert)
- Maintains referential integrity through transactions
- Supports batch processing for large datasets
- Automatic schema validation

### Patch Operations
Update specific data within tables:
- Row-level and column-level modifications
- Atomic transactions ensure consistency
- Supports conditional updates
- Returns summary of changes made

### Change Subscriptions
Monitor database changes in real-time through MySQL's binary log and trigger-based change tracking:

#### How It Works

When Irmin creates a subscription, the connector automatically:

1. **Sets up change tracking triggers** on monitored tables
2. **Starts a listener goroutine** that polls for changes
3. **Sends webhook notifications** to Irmin when data changes occur

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────┐
│   MySQL     │──────│ Connector       │──────│   Irmin     │
│  Database   │      │ Listener        │      │   API       │
└─────────────┘      └─────────────────┘      └─────────────┘
      │                      │                       │
      │  1. Data change      │                       │
      │  triggers tracking   │                       │
      │                      │                       │
      │                      │  2. Listener polls    │
      │                      │     change table      │
      │<─────────────────────│                       │
      │                      │                       │
      │                      │  3. Sends webhook     │
      │                      │     with patch data   │
      │                      │──────────────────────>│
      │                      │                       │
      │                      │                       │  4. Irmin processes
      │                      │                       │     patch and triggers
      │                      │                       │     workflows
```

#### Subscription Lifecycle

1. **Subscribe** (`POST /mysql/operation/subscribe`)
   - Irmin calls this endpoint when a user creates a subscription
   - Creates change tracking infrastructure
   - Starts a dedicated listener goroutine
   - Returns a subscription ID for management

2. **Listening**
   - The listener polls for changes at regular intervals
   - Detects INSERT, UPDATE, DELETE operations
   - Automatically handles connection issues

3. **Notification**
   - When changes are detected, builds patch operations
   - Sends HTTP POST to Irmin's webhook endpoint
   - Includes event type and detailed change data

4. **Unsubscribe** (`POST /mysql/operation/unsubscribe`)
   - Stops the listener goroutine
   - Cleans up the subscription record

#### Webhook Payload Format
```json
{
  "event_type": "upsert",
  "patches": [
    {
      "op": "replace",
      "path": "/customers/456/name",
      "value": "Updated Name"
    }
  ]
}
```

## Security Considerations

- Credentials are never stored permanently
- All connections use secure authentication
- Database operations are logged for audit purposes
- Minimal required permissions recommended

## Recommended MySQL User Permissions

For basic data operations:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON your_database.* TO 'irmin_user'@'%';
```

For change monitoring with trigger-based tracking:
```sql
GRANT CREATE, DROP, TRIGGER ON your_database.* TO 'irmin_user'@'%';
```

For advanced change monitoring using binary logs (optional):
```sql
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'irmin_user'@'%';
```

## Configuration Examples

### Basic Connection
```json
{
  "details": {
    "host": "mysql.example.com",
    "port": "3306",
    "username": "irmin_user",
    "password": "secure_password",
    "default_db": "mysql"
  },
  "settings": {
    "database": "production_db"
  }
}
```

## Limitations

- Binary log monitoring requires MySQL server configuration for replication
- Large table operations may require adequate system memory
- Change notifications depend on MySQL binary log format and retention
- Real-time monitoring requires appropriate MySQL user privileges

## Troubleshooting

### Connection Issues
1. Verify MySQL server is accessible from connector host
2. Check firewall settings for port 3306 (or custom port)
3. Confirm user credentials and permissions
4. Test connection using MySQL client tools

### Performance Considerations
- Use appropriate indexes for large table operations
- Consider connection pooling for high-frequency operations
- Monitor MySQL server resources during large data transfers
- Configure appropriate timeout values for long-running operations

## Support

For connector-specific issues, check the logs for detailed error messages. Common issues include:
- Network connectivity problems
- Insufficient user permissions
- MySQL server configuration limitations
- Resource constraints during large operations

## Implementation Notes

This connector uses the standard Go MySQL driver (`github.com/go-sql-driver/mysql`) and implements connection pooling for optimal performance. Binary log monitoring is simplified in this implementation - production deployments may require specialized binlog parsing libraries for full feature support.