# Workflows & Orchestration

## Overview

Workflows are the backbone of automation within Irmin. They define a series of automated tasks that interact with internal and external data sources, enabling seamless data movement and processing.

Workflows are the backbone of automation within Irmin. They define a series of automated tasks that interact with internal and external data sources, enabling seamless data movement and processing.

Workflow executions are triggered based on the assigned `Schedule`, according to triggers, which can be time or event based. Workflows can be triggered manually by the user as well, by creating a new run. 

Types:

- Import: Facilitate the ingestion of data from external sources into Irmin repositories.
- Export: Enable the transfer of data from Irmin repositories to external systems or destinations.
- Action: Execute custom scripts or actions on data within Irmin repositories.
- Pipeline: Move data through a series of stages, passing results from one stage to the next.

## Workflow Runs

Each execution of a workflow is a new `Workflow Run`, and can be viewed in the workflow run history. Each run has a status and logs.

```typescript
interface WorkflowRun {
  /** Unique identifier of the workflow run */
  id: string;
  /** Timestamp when the workflow run was created */
  created_at: string;
  /** Timestamp when the workflow run was last updated */
  updated_at: string;
  /** Timestamp when the workflow run was started */
  started_at?: string;
  /** (optional) Timestamp when the workflow run was finished */
  finished_at?: string;
  /** Status of the workflow run */
  status: WorkflowStatus;
  /** (optional) The schedule trigger that initiated the workflow run */
  triggered_by?: ScheduleTrigger;
  /** (optional) The user who initiated the workflow run */
  triggered_by_user?: User;
  /** Identifier of the workflow */
  workflow_id: string;
  /** (optional) Logs for the workflow run */
  logs?: string[];
}
```


## Schedules

Workflow Schedules determine the timing and frequency of workflow executions. They define the conditions under which a workflow should be triggered, allowing for both time-based and event-driven automation.

Types of Triggers:

- Time Trigger: Executes the workflow at specified time intervals.
  - Example: Running a workflow every day at midnight.
  - Configuration: Utilises RRule syntax to define recurrence patterns.
- Repository Trigger: Initiates the workflow based on specific repository events.
  - Example: Triggering a workflow before a commit is created.
  - Configuration: Specifies the event type, repository, and branch.
- Workflow Run Trigger: Starts a workflow run in response to another workflow’s execution.
  - Example: Running a formatter action workflow after an import workflow completes.
  - Configuration: Links to the triggering workflow and the event type.

Example Schedule Configuration:
```json
{
  "triggers": [
    { "type": "time", "rrule": "RRULE:FREQ=DAILY;INTERVAL=1;" },
    {
      "type": "repository-event",
      "event": "pre-commit",
      "repository": "repo_001",
      "branch": "main"
    },
    {
      "type": "workflow-run-event",
      "event": "post-workflow-run",
      "workflow": "wf_001"
    }
  ],
  "max_retries": 3,
  "max_runtime": 3600,
  "min_interval": 60
}
```

## Workflowables

Specific configurations based on the workflow type (Import, Export, Action, or Pipeline).

### Actions

Actions are workflows that execute custom logic on data within Irmin repositories. They provide the flexibility to perform bespoke data manipulations, validations, or integrations.

Actions can be of two types:
- **Script**: Executes a custom Go script.
- **Query**: Executes a SQL query (DuckDB) with input files loaded as virtual tables.

#### Example: Script Action
```json
{
  "type": "action",
  "executable_type": "script",
  "script_id": "script_sqid_here",
  /** Input data repositories, refs and paths (optional) */
  "input": [
    {
      "repository": "member-billing",
      "branch": "main",
      "path": "members.csv"
    }
  ],
  /** Where to store the results of the action (optional) */
  "results_repository": "member-billing", 
  "results_branch": "main",
  "results_path": "processed-members.csv"
}
```

#### Example: Query Action
```json
{
  "type": "action",
  "executable_type": "query",
  "query_id": "query_sqid_here",
  "input": [
    {
      "repository": "sales-data",
      "branch": "main",
      "path": "customers.csv"
    },
    {
      "repository": "sales-data",
      "branch": "main",
      "path": "orders.json"
    }
  ],
  "results_repository": "analytics",
  "results_branch": "main",
  "results_path": "/reports/customer_analysis.csv"
}
```

**Note on Query Actions:**
- Input files are loaded as virtual tables (e.g., `customers.csv` → `data_customers_csv`).
- The query result is automatically converted to CSV format.
- Results are saved to the specified results path (defaulting to `query_results.csv` if not renamed).

### Imports

Imports are workflows designed to bring data from external sources into Irmin repositories. They automate the data ingestion process, ensuring that repositories are consistently updated with the latest information from various data sources.

Example Import workflowable configuration:
```json
{
  "type": "import",
  /** Source connection */
  "connection_id": "conn_001",
  /** Path within the connection's schema to fetch data from */
  "import_from_connection_paths": ["users.csv","invoices.csv"], // Importing users and invoices from the connection
  /**  Destination repository slug in Irmin */
  "repository": "member-billing",
  /** Destination branch in the repository */
  "repository_branch": "main",
  /** Path within the repository to store the imported data */
  "import_to_repository_path": "", // Importing to the root of the repository
  /** Field mappings for the import */
  "field_mappings": [
      {
         /** Source file path */
         "source_path": "users.csv",
         /** Field name in the source file */
         "source_field": "email",
         /** Destination file path */
         "destination_path": "members.csv",
         /** Field name in the destination file */
         "destination_field": "email_address"
      }
  ]
}
```

### Exports

Exports are workflows that handle the movement of data from Irmin repositories to external systems or destinations. They automate the data distribution process, ensuring that external platforms receive up-to-date information from Irmin.


Example Import workflowable configuration:
```json
{
  "type": "export",
  /** Source repository slug in Irmin */
  "repository": "member-billing",
  /** Source branch in the repository */
  "repository_branch": "main",
  /** Path within the repository to fetch data from */
  "export_from_repository_path": ["invoices-with-users.csv"], // Exporting invoices with users from the repository
  /**  Destination Connection ID in Irmin */
  "connection_id": "conn_002", // Connection ID
  /** Path within the connection's schema to store the exported data */
  "export_to_connection_paths": ["transactions.csv"], // Exporting to the users file in the connection
  /** Field mappings for the export */
  "field_mappings": [
      {
         /** Source file path */
         "source_path": "invoices-with-users.csv",
         /** Field name in the source file */
         "source_field": "email",
         /** Destination file path */
         "destination_path": "transactions.csv",
         /** Field name in the destination file */
         "destination_field": "email_address"
      }
  ]
}
```

### Pipelines

Pipelines Workflows move data through a series of stages, passing results from one stage to the next.

Pipeline Stages are used in order and the data goes from one stage to the next in a chain, passing results from one stage to the next until the final stage is reached.

Stages are the building blocks of a pipeline. Each stage can get data in and pass data out to the next stage.

Stages can be of three types:

- `Action`: Execute a custom script or query.
   - Input: Passed to the script/query for processing.
   - Output: Resulting data from the script/query.
- `Connection`: Interact with an external service.
   - Input: Exported to an external service using the connection.
   - Output: Fetched from an external service using the connection.
- `Repository`: Interact with a repository.
  - Input: Passed to the script for processing.
  - Output: Resulting data from the script.

Example Pipeline workflowable configuration:
```json
{
  "type": "pipeline",
  "stages": [
    {
        /** Explanation as to what this stage is responsible for */
        "description": "Fetch users and invoices from the database",
        /** Whether the input of the stage should be used */
        "write": false,
  /** Whether the result of the stage should be passed to the next stage */
        "read": true,
        /** The order of the stage in the pipeline */
        "order_sequence": 1,
        /** The type of stage and it's configuration */
        "type": "connection",
        "connection_id": "conn_001", // Connection ID
        "connection_write_path": "", // No write path needed, since it's the first stage
        "connection_read_paths": ["users.csv","invoices.csv"] // Paths to read from the connection
      },
    {
      "description": "Save the data users and invoices to the repository, so it stays versioned",
      "write": true,
      "read": false,
      "order_sequence": 2,
      "type": "repository",
      "repository": "member-billing",
      "repository_branch": "main",
      "repository_write_path": "", // Write to the root of the repository
      "repository_read_paths": [] // Not reading in this stage, so results from the previous stage are going to be passed to the next stage
    },
    {
      "description": "Combine the users and invoices in to `transactions.csv`",
      "write": true,
      "read": true,
      "order_sequence": 3,
      "type": "action",
      "executable_type": "script", // Can be "script" or "query"
      "script_id": "script_sqid", // Use script_id for scripts, query_id for queries
    },
    {
      "description": "Send the transactions to the accounting system",
      "write": true,
      "read": false,
      "order_sequence": 4,
      "type": "connection",
      "connection_id": "conn_002", // Connection ID for the accounting system
      "connection_write_path": "", // Write to the root of the connection
      "connection_read_paths": [] // Paths to read from the connection
    }
  ]
}
```
