# Irmin Orchestrator

The Irmin Orchestrator is a central component responsible for managing and executing workflows within the Irmin data platform. It handles workflow scheduling, trigger processing, and the execution of various workflow types.

## Overview

The orchestrator operates as a continuous service that:

- Monitors for time-based triggers (cron/rrule schedules)
- Listens for repository events from LakeFS webhooks
- Processes workflow run events
- Dispatches pending workflow runs for execution
- Executes workflows with retry logic and timeout handling

## Architecture

### Core Components

#### 1. **Orchestrator** (`orchestrator.go`)

The main orchestrator manages multiple event channels and coordinates workflow execution:

- **LakeFS Event Queue**: Receives repository events from LakeFS webhooks
- **Worker Event Queue**: Handles workflow run events (pre/post execution)
- **Dispatched Event Queue**: Processes dispatched workflow executions
- **Time Trigger Scanner**: Periodically checks for scheduled workflows (every 10 seconds)

#### 2. **Dispatcher** (`dispatcher.go`)

Responsible for claiming and dispatching pending workflow runs:

- Listens for PostgreSQL notifications about new workflow runs
- Claims workflow runs using database locks to prevent race conditions
- Dispatches workflow runs to the API execution endpoint via HTTP
- **Load Balancing**: Uses HTTP dispatch to leverage load balancers for distributing workflows across multiple machines in the network
- Updates workflow run status during the dispatch process

#### 3. **Worker** (`worker.go`)

Handles the actual execution of dispatched workflows:

- Executes workflows based on their type
- Sends pre/post execution events to the orchestrator
- Manages workflow execution context and cancellation

### Event Flow

```
Repository Event → LakeFS Webhook → Orchestrator → Trigger Processing → Workflow Run Creation
Time Trigger → Orchestrator Scanner → Next Run Calculation → Workflow Run Creation
Workflow Run Creation → Database Notification → Dispatcher → HTTP Dispatch → Load Balancer → Workflow Execution
```

## Workflow Types

The orchestrator supports four types of workflows:

### 1. **Action Workflows** (`executeActionWorkflowable.go`)

Executes custom code in a compute sandbox:

- **Inputs**: Repository files that are passed to the execution environment
- **Executable**: Custom code/script to run in the sandbox
- **Results**: Optional output files saved back to repositories
- **Use Cases**: Data processing, transformations, custom business logic

### 2. **Import Workflows** (`executeImportWorkflowable.go`)

Imports data from external connectors into repositories:

- **Connection**: Source system (database, API, file system)
- **Connection Paths**: Specific data sources to import from
- **Repository Target**: Destination repository and branch
- **Field Mappings**: Data transformation rules during import

### 3. **Export Workflows** (`executeExportWorkflowable.go`)

Exports data from repositories to external connectors:

- **Repository Sources**: Files/data to export from repositories
- **Connection**: Target system for export
- **Connection Path**: Destination path in the target system
- **Field Mappings**: Data transformation rules during export

### 4. **Pipeline Workflows** (`executePipelineWorkflowable.go`)

Complex multi-stage workflows that execute stages sequentially based on their OrderSequence:

- **Sequential Execution**: Stages are sorted by OrderSequence and executed in order
- **Shared Data Flow**: Results flow between stages through `previousStageResults` map
- **Stage Types**: Action, Connection, or Repository operations
- **Read/Write Control**: Each stage can read input data and/or write output data

#### Pipeline Stage Types:

- **Action Stage**:
  - **Write=true**: Receives `previousStageResults` as input files to compute sandbox
  - **Read=true**: Outputs result files to `previousStageResults` for next stages
- **Connection Stage**:
  - **Write=true**: Pushes `previousStageResults` to external connector
  - **Read=true**: Pulls data from connector into `previousStageResults`
- **Repository Stage**:
  - **Write=true**: Uploads `previousStageResults` to repository
  - **Read=true**: Downloads repository files into `previousStageResults`

## Trigger Types

### 1. **Time Triggers** (`db.TimeTriggerType`)

Schedule workflows based on time:

- **Cron Expressions**: Standard cron format for scheduling
- **RRule**: iCalendar recurrence rules for complex scheduling
- **Next Run Calculation**: Automatically calculates next execution time
- **Timezone Support**: Handles timezone-aware scheduling

### 2. **Repository Triggers** (`db.RepositoryTriggerType`)

Trigger workflows based on repository events:

- **Event Types**: Commit, branch creation, tag creation, etc.
- **Repository Filtering**: Specific repositories to monitor
- **Ref Filtering**: Specific branches, tags, or commits
- **LakeFS Integration**: Receives events via LakeFS webhooks

### 3. **Workflow Run Triggers** (`db.WorkflowRunTriggerType`)

Chain workflows based on the completion of other workflows:

- **Pre/Post Events**: Trigger before or after workflow execution
- **Status-Based**: Trigger based on workflow success/failure
- **Workflow Dependencies**: Create complex workflow pipelines

## Configuration

### Constants (`constants.go`)

- `DefaultChannelBufferSize`: 100 (buffer size for event channels)
- `TriggerScanInterval`: 10 seconds (time trigger check frequency)
- `ListenForStatusChangesTimeout`: 90 seconds (status change listen timeout)
- `DefaultMaxWorkflowRuntime`: 120 seconds (default workflow timeout)

### Workflow Properties

- **Max Runtime**: Configurable timeout per workflow (defaults to 120 seconds)
- **Max Retries**: Number of retry attempts on failure
- **Field Mappings**: Data transformation rules for import/export workflows
- **Schedule Configuration**: Trigger definitions and scheduling rules

## Execution Flow

### 1. **Workflow Run Creation**

```
Trigger Event → Trigger Processing → Workflow Run Creation → Database Notification
```

### 2. **Workflow Dispatch**

```
Database Notification → Dispatcher → Claim Workflow Run → Update Status → HTTP Dispatch to API → Load Balancer → Available Machine
```

### 3. **Workflow Execution**

```
API Dispatch → Worker → Execute by Type → Update Status → Send Events → Complete
```

### 4. **Error Handling**

- Automatic retries based on workflow configuration
- Timeout handling with configurable limits
- Comprehensive logging at each stage
- Context cancellation support for graceful shutdown

## Database Integration

### Workflow Run Status Management

- **Pending**: Newly created, waiting for dispatch
- **Initiating**: Claimed by dispatcher, being prepared for execution
- **Running**: Currently executing
- **Complete**: Successfully finished
- **Error**: Failed execution
- **Cancelled**: Manually cancelled by user

### Locking Strategy

- Uses PostgreSQL row-level locking with `SELECT FOR UPDATE SKIP LOCKED`
- Prevents race conditions when multiple orchestrator instances run
- Ensures each workflow run is executed exactly once

## Error Handling and Monitoring

### Logging

- Structured logging with context throughout execution
- Detailed error messages with relevant metadata
- Execution logs captured and stored with workflow runs

### Cancellation Support

- Graceful handling of context cancellation
- Preserves partial execution logs when cancelled
- Proper cleanup of resources on cancellation

### Retry Logic

- Configurable retry attempts per workflow
- Exponential backoff (implementation dependent)
- Separate logging for each retry attempt

## Usage Examples

### Creating a Time-Triggered Import Workflow

```go
// Time trigger with cron expression
trigger := &db.WorkflowTrigger{
    Type: db.TimeTriggerType,
    Cron: "0 */6 * * *", // Every 6 hours
}

// Import workflowable
importWorkflow := &db.ImportWorkflowable{
    ConnectionID: connectionID,
    ImportFromConnectionPaths: []string{"data/source.csv"},
    Repository: targetRepo,
    ImportToRepositoryPath: "imported/data.csv",
    RepositoryBranch: "main",
}
```

### Creating a Repository Event Trigger

```go
// Repository trigger for commits
trigger := &db.WorkflowTrigger{
    Type: db.RepositoryTriggerType,
    RepositoryID: &repoID,
    RepositoryEvent: &"commit",
    RepositoryRef: &"main",
}
```

## Performance Considerations

- **Channel Buffering**: Event channels use buffered channels to prevent blocking
- **Database Connections**: Efficient connection pooling for database operations
- **Concurrent Execution**: Multiple workflows can execute simultaneously
- **Resource Management**: Proper cleanup of compute sandbox resources
- **Monitoring**: Built-in metrics and health checks

## Scalability & Load Distribution

### Horizontal Scaling Architecture

The orchestrator is designed for horizontal scaling across multiple machines:

- **HTTP-Based Dispatch**: Workflows are dispatched via HTTP to enable load balancing
- **Load Balancer Integration**: HTTP requests can be distributed across multiple API instances
- **Stateless Execution**: Each machine can independently execute workflows
- **Database Coordination**: PostgreSQL notifications and locking coordinate distributed orchestrators
- **Machine Assignment**: Load balancers automatically route workflows to the most suitable available machine

### Multi-Instance Deployment

- **Multiple Orchestrators**: Can run multiple orchestrator instances simultaneously
- **Automatic Failover**: If one machine fails, others continue processing workflows
- **Resource Optimization**: Distribute computational load across available hardware
- **Geographic Distribution**: Deploy orchestrators in different regions for latency optimization

## Integration with Other Components

The orchestrator relies on several core components to execute workflows:

### 1. **Data Engine** (`/engine`)

The engine is the central data operations component that provides:

#### Repository Management (`repositories.go`)

- **Repository Operations**: Create, read, update, delete repositories
- **LakeFS Integration**: Manages repositories as LakeFS backends
- **Webhook Configuration**: Sets up repository event notifications
- **Garbage Collection**: Manages data retention policies

#### Object Management (`objects.go`)

- **File Operations**: Upload, download, move, copy, delete files
- **Directory Traversal**: Navigate repository folder structures
- **Content Retrieval**: Fetch file contents for action workflow inputs
- **Object Metadata**: Size, timestamps, content types

#### Data Movement (`dataMovement.go`)

- **Import Operations**: Pull data from external connectors into repositories
- **Export Operations**: Push repository data to external connectors
- **Connector Integration**: Initialize and manage connector operations
- **File Processing**: Zip/unzip operations for data transfer

#### Field Mappings (`applyFieldMappings.go`)

- **Data Transformation**: Apply field mappings during import/export
- **Schema Detection**: Analyze file structures and column types
- **Format Conversion**: Transform between CSV, JSON, Parquet formats
- **DuckDB Integration**: Execute complex data transformations

#### Query Engine (`queries.go`)

- **SQL Execution**: Run queries against repository data
- **Format Support**: Query CSV, JSON, Parquet files
- **Workspace Scoping**: Parse workspace-specific query syntax
- **Result Processing**: Format query results and handle errors

### 2. **Compute Sandbox** (`/compute-sandbox`)

Provides isolated execution environment for action workflows:

#### Execution Environment (`sandbox.go`)

- **Docker Isolation**: Run user code in secure containers
- **File Management**: Provide input files and collect output files
- **SDK Support**: Install language-specific SDKs (Go, Python, etc.)
- **Resource Limits**: Control CPU, memory, and execution time

#### Security & Monitoring (`metrics.go`, `docker.go`)

- **Resource Tracking**: Monitor CPU, memory, I/O usage
- **Temporary Tokens**: Create short-lived API access tokens
- **Container Cleanup**: Ensure proper resource disposal
- **Execution Logs**: Capture stdout/stderr from user code

### 3. **DuckDB** (`/duckdb`)

High-performance data processing engine:

#### Data Transformation

- **Field Mapping Execution**: Apply complex transformations during import/export
- **Query Processing**: Execute SQL queries against repository files
- **Format Conversion**: Convert between different data formats
- **Schema Analysis**: Detect and validate data structures

#### Merge Operations

- **File Merging**: Combine multiple source files into single destinations
- **Deduplication**: Remove duplicate records during merging
- **Union Operations**: Merge data using various strategies

### 4. **LakeFS Client** (`/lakefs`)

Version control backend for repositories:

#### Repository Operations

- **Branch Management**: Create, merge, compare branches
- **Commit Operations**: Track changes and create snapshots
- **Object Storage**: Store and retrieve files with versioning
- **Webhook Events**: Send notifications for repository changes

#### Event Integration

- **Repository Triggers**: Workflow triggers based on commits, branches, tags
- **Webhook Delivery**: Real-time event notifications to orchestrator
- **Event Filtering**: Match specific repositories, branches, or event types

### 5. **Connector System** (`/connectors`)

External system integration:

#### Data Source Connectivity

- **Database Connectors**: PostgreSQL, MySQL, SQL Server, etc.
- **API Connectors**: REST APIs, GraphQL endpoints
- **File System Connectors**: Local files, cloud storage
- **Custom Connectors**: Extensible connector framework

#### Operation Management

- **Connection Pooling**: Manage database connections efficiently
- **Authentication**: Handle various authentication mechanisms
- **Schema Discovery**: Detect available tables and fields
- **Data Transfer**: Optimized bulk data operations

## Component Interaction Flow

### Import Workflow Execution

```
Orchestrator → Engine.DataImport() → Connector.Pull() → DuckDB.ApplyFieldMappings() → LakeFS.UploadObject()
```

### Export Workflow Execution

```
Orchestrator → Engine.DataExport() → LakeFS.GetObjectContent() → DuckDB.ApplyFieldMappings() → Connector.Push()
```

### Action Workflow Execution

```
Orchestrator → Engine.GetObjectContent() → ComputeSandbox.ExecuteEditorItem() → Engine.UploadObject()
```

### Pipeline Workflow Execution

```
Orchestrator → Sort Stages by OrderSequence → Execute Stage 1 → Execute Stage 2 → Execute Stage N
                                                    ↓               ↓               ↓
                                              previousStageResults (shared data flow)
```

Each stage is executed sequentially in order and handled based on its type:

- **Action Stage**: Can read from `previousStageResults` (Write=true), execute code in sandbox, write results back (Read=true)
- **Connection Stage**: Can read from connectors or write `previousStageResults` to connectors
- **Repository Stage**: Can read from repositories or write `previousStageResults` to repositories

## Data Flow Architecture

1. **Input Sources**: External connectors, repository files, user code
2. **Processing Layer**: DuckDB transformations, compute sandbox execution
3. **Storage Layer**: LakeFS repositories with version control
4. **Output Destinations**: External connectors, repository files

## Error Handling & Recovery

Each component provides comprehensive error handling:

- **Engine**: Validates paths, handles LakeFS errors, manages timeouts
- **Compute Sandbox**: Container failures, resource limits, security violations
- **DuckDB**: Query errors, format issues, transformation failures
- **Connectors**: Connection failures, authentication errors, data issues

## Extending the Orchestrator

To add new workflow types:

1. Create execution handler in `execute[Type]Workflowable.go`
2. Add type case in `executeWorkflowableByType()`
3. Add getter case in `getWorkflowableByType()`
4. Define database model for the new workflowable type
5. Update API controllers and formatters as needed

The orchestrator is designed to be extensible and can accommodate new workflow types and trigger mechanisms as needed.
