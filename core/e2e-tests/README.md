# Irmin E2E Tests

End-to-end tests for the Irmin API using the Go SDK. These tests verify realistic scenarios against a live Irmin API instance.

## Prerequisites

- Go 1.25 or later
- An Irmin API instance (cloud or self-hosted)
- An API token or JWT for authentication
- golangci-lint (for linting)

## Setup

1. **Install dependencies:**

   ```bash
   go mod download
   ```

2. **Create configuration:**

   Copy the example configuration and fill in your values:

   ```bash
   cp test-config.example.json test-config.json
   ```

   Edit `test-config.json` with your settings:

   ```json
   {
     "api_base_url": "https://api.irmin.co/api",
     "auth_token": "your-api-token-here",
     "cleanup_after_tests": true,
     "verbose": true,
     "connection": {
       "connector_name": "HTTP",
       "details": {
         "base_url": "https://jsonplaceholder.typicode.com"
       },
       "settings": {
         "endpoints": [
           {
             "name": "posts",
             "path": "/posts",
             "method": "GET"
           }
         ]
       }
     }
   }
   ```

   **Configuration options:**
   - `api_base_url`: The Irmin API base URL
   - `auth_token`: Your API token (from Irmin console) or JWT
   - `cleanup_after_tests`: Whether to delete test resources after tests complete
   - `verbose`: Enable verbose logging
   - `connection` (optional): Configuration for testing connections and import/export workflows
     - `connector_name`: The name of the connector to use (e.g., "HTTP", "PostgreSQL", "MySQL"). The connector ID is looked up automatically.
     - `details`: Connector-specific connection details (credentials, endpoints, etc.)
     - `settings`: Connector-specific settings

   **Note:** The test runner automatically creates a temporary workspace, repository, and connection (if configured) for each test run. These are cleaned up after tests complete if `cleanup_after_tests` is enabled. If `connection` is not provided, connection-related tests and import/export workflow tests will be skipped.

## Running Tests

**Run all tests:**

```bash
go run main.go
```

**Run with verbose output:**

```bash
go run main.go -verbose
```

**List all available scenarios:**

```bash
go run main.go -list
```

**Run a specific scenario category:**

```bash
go run main.go -scenario profile
go run main.go -scenario repository
go run main.go -scenario object
go run main.go -scenario object-advanced
go run main.go -scenario branch
go run main.go -scenario commit
go run main.go -scenario query
go run main.go -scenario workspace-tag
go run main.go -scenario git-tag
go run main.go -scenario merge
go run main.go -scenario script
go run main.go -scenario search
go run main.go -scenario workspace
go run main.go -scenario workflow
go run main.go -scenario workflow-run
go run main.go -scenario connection
go run main.go -scenario connector
go run main.go -scenario credential
go run main.go -scenario policy
go run main.go -scenario role
go run main.go -scenario user
go run main.go -scenario invite
go run main.go -scenario log
go run main.go -scenario embedding
go run main.go -scenario ai-app
```

**Use a different config file:**

```bash
go run main.go -config /path/to/config.json
```

## Test Scenarios

### Profile Scenarios
- `Profile_Get` - Get the current user's profile
- `Profile_Update` - Update the current user's profile
- `Workspace_Get` - Get workspace details
- `Workspace_List_Users` - List users in the workspace

### Repository Scenarios
- `Repository_Create_List_Delete` - Full repository lifecycle
- `Repository_Update` - Update repository details

### Object Scenarios
- `Object_Upload_Download_CSV` - Upload and download CSV files
- `Object_Upload_Download_JSON` - Upload and download JSON files
- `Object_List` - List objects in a directory
- `Object_Delete` - Delete objects

### Branch Scenarios
- `Branch_Create_List_Delete` - Full branch lifecycle
- `Branch_Create_From_Commit` - Create branch from a specific commit

### Commit Scenarios
- `Commit_Create_List` - Create commits and verify history
- `Commit_Get_Details` - Get details of a specific commit

### Query Scenarios
- `Query_Execute_SQL` - Execute SQL queries on uploaded data
- `Query_Stored_Create_Execute_Delete` - Stored query lifecycle
- `Query_Stored_List_Get_Update` - List stored queries, get details, and update
- `Query_List_Templates` - List available query templates

### Object Advanced Scenarios
- `Object_Copy` - Upload a file and copy it to a new location
- `Object_Move` - Upload a file and move it to a new location
- `Object_Schema` - Upload a structured file and get its schema
- `Object_History` - Make multiple changes to a file and get its history
- `Object_Content` - Upload a file and get its content directly
- `Object_Structured_Content` - Upload a structured file and get parsed content
- `Object_Uncommitted_Changes` - Make changes without committing, verify uncommitted changes
- `Object_Revert_Changes` - Upload a file, then revert uncommitted changes
- `Object_Upload_From_URL` - Upload an object from a remote URL
- `Object_Create_Pointer` - Create a pointer to a file in another repository

### Workspace Tag Scenarios
- `WorkspaceTag_Create_List_Delete` - Full workspace tag lifecycle
- `WorkspaceTag_Update` - Update tag name and color
- `WorkspaceTag_Assign_To_Repository` - Assign tags to repositories
- `WorkspaceTag_Assign_To_Connection` - Assign tags to connections (requires connection config)
- `WorkspaceTag_Assign_To_Workflow` - Assign tags to workflows
- `WorkspaceTag_Assign_To_Script` - Assign tags to stored scripts
- `WorkspaceTag_Assign_To_Query` - Assign tags to stored queries

### Git Tag Scenarios
- `GitTag_Create_List_Delete` - Full git tag lifecycle on a repository
- `GitTag_Get_Details` - Get details of a specific git tag

### Merge/Compare Scenarios
- `Compare_Branches` - Compare two branches and view differences
- `Merge_Branches` - Create branches, make changes, merge them

### Script Scenarios
- `Script_Create_List_Delete` - Create a stored script, verify in list, delete it
- `Script_Update` - Create a script, update it, verify changes
- `Script_Execute_Python` - Create and execute a Python script
- `Script_Get_Details` - Create a script and get its details
- `Script_List_Templates` - List available script templates

### Search Scenarios
- `Search_Repositories` - Create repositories and search for them
- `Search_With_Type_Filter` - Search with specific type filter
- `Search_With_Pagination` - Search with limit and offset

### Workspace Scenarios
- `Workspace_List` - List all workspaces for the current user
- `Workspace_Get` - Get details of the current workspace
- `Workspace_Update` - Update workspace name and description
- `Workspace_Create_Delete` - Create a new workspace and delete it
- `Workspace_Schema` - Get workspace schema

### Workflow Scenarios
- `Workflow_Action_Lifecycle` - Create, list, get, update, and delete an action workflow
- `Workflow_Import_Lifecycle` - Create and manage an import workflow (requires connection config)
- `Workflow_Export_Lifecycle` - Create and manage an export workflow (requires connection config)
- `Workflow_Pipeline_Lifecycle` - Create and manage a pipeline workflow with multiple stages
- `Workflow_Pause_Start` - Create a workflow, pause it, then start it
- `Workflow_List_By_Type` - List workflows filtered by type
- `Workflow_Update_Schedule` - Create workflow and update its schedule
- `Workflow_Update_Workflowable` - Create workflow and update its workflowable configuration

### Workflow Run Scenarios
- `WorkflowRun_Trigger_List` - Trigger a workflow run and list runs
- `WorkflowRun_List_All` - List all workflow runs in workspace

### Connection Scenarios
- `Connection_List` - List all connections in the workspace
- `Connection_Get` - Get connection details (requires connection config)
- `Connection_Update` - Update a connection (requires connection config)
- `Connection_Create_Delete` - Create and delete a connection (requires connection config)

### Connector Scenarios
- `Connector_List` - List all available connectors
- `Connector_Get` - Get details of a specific connector
- `Connector_Fields` - Get configuration fields for a connector

### Credential Scenarios
- `Credential_Create_List_Delete` - Create an API token, list tokens, and delete it

### Policy Scenarios
- `Policy_Create_List_Delete` - Create a policy, list policies, and delete it
- `Policy_Update` - Create a policy and update it
- `Policy_Check_Permission` - Check if user has permission for an action
- `Policy_Summary` - Get policy summaries for user and roles
- `Policy_Resource_Options` - Get policy resource options for workspace

### Role Scenarios
- `Role_List` - List all available roles

### User Scenarios
- `User_List` - List all users in the workspace
- `User_Get` - Get details of a specific user
- `User_Update_Roles` - Update roles for a user

### Invite Scenarios
- `Invite_Send_List_Delete` - Send an invite, list invites, and delete it
- `Invite_Inbox` - List invites in the user's inbox
- `Invite_Update_Resend` - Send an invite, update role, and resend

### Log Scenarios
- `Log_List_Workspace` - List audit log events for the workspace
- `Log_List_Repository` - List audit log events for a repository
- `Log_List_User` - List audit log events for a specific user
- `Log_List_Connection` - List audit log events for a connection

### Embedding Scenarios
- `Embedding_List` - List embeddings in a repository
- `Embedding_Vectorize_Search` - Vectorize objects and search embeddings

### AI Application Scenarios
- `AIApp_Create_List_Delete` - Create an AI application, list apps, and delete it
- `AIApp_Update` - Create an AI application and update it

## Sample Test Data

The `testdata/` folder contains sample files used by tests:
- `sample.csv` - Sample CSV with user data
- `sample.json` - Sample JSON with product data
- `metrics.parquet.json` - Sample metrics data structure

## Development

### Linting

```bash
golangci-lint run
```

### Adding New Scenarios

1. Create a new file in `scenarios/` (e.g., `scenarios/myfeature.go`)
2. Define your test functions and return them in a `MyFeatureScenarios()` function
3. Add the scenario to the `scenarioRegistry` map in `main.go`

Example:

```go
package scenarios

import (
    "context"
    irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
    "github.com/IrminData/irmin-e2e-tests/config"
    "github.com/IrminData/irmin-e2e-tests/runner"
)

func MyFeatureScenarios() []runner.TestCase {
    return []runner.TestCase{
        {
            Name:        "MyFeature_Test",
            Description: "Test my feature",
            Run:         testMyFeature,
        },
    }
}

func testMyFeature(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
    // Your test logic here
    return nil
}
```

## Project Structure

```
e2e-tests/
├── main.go                    # Entry point
├── go.mod                     # Go module definition
├── .golangci.yml             # Linter configuration
├── test-config.example.json  # Example configuration
├── test-config.json          # Your configuration (gitignored)
├── README.md                 # This file
├── config/
│   └── config.go             # Configuration loading
├── runner/
│   └── runner.go             # Test runner with workspace management
├── scenarios/
│   ├── helpers.go            # Shared helpers
│   ├── profile.go            # Profile/workspace tests
│   ├── repository.go         # Repository tests
│   ├── objects.go            # Object/file tests
│   ├── objects_advanced.go   # Advanced object operations
│   ├── branches.go           # Branch tests
│   ├── commits.go            # Commit tests
│   ├── queries.go            # Query tests
│   ├── workspace_tags.go     # Workspace tag tests
│   ├── git_tags.go           # Git tag tests
│   ├── merge_compare.go      # Merge and compare tests
│   ├── scripts.go            # Stored script tests
│   ├── search.go             # Search tests
│   ├── workspaces.go         # Workspace CRUD tests
│   ├── workflows.go          # Workflow tests
│   ├── workflow_runs.go      # Workflow run tests
│   ├── connections.go        # Connection tests
│   ├── connectors.go         # Connector tests
│   ├── credentials.go        # API token tests
│   ├── policies.go           # Policy tests
│   ├── roles.go              # Role tests
│   ├── users.go              # User tests
│   ├── invites.go            # Invite tests
│   ├── logs.go               # Audit log tests
│   ├── embeddings.go         # Embedding tests
│   └── ai_applications.go    # AI application tests
└── testdata/
    ├── sample.csv            # Sample CSV file
    ├── sample.json           # Sample JSON file
    └── metrics.parquet.json  # Sample metrics data
```

## Current Status

- **Passed:** 93/93 tests (100%)

## TODO: Missing Test Coverage

The following API endpoints are not yet covered by e2e tests:

### Transfer Ownership Operations
- [ ] `POST /workspaces/:workspace/transfer-ownership` - Transfer workspace ownership
- [ ] `POST /workspaces/:workspace/queries/:query/transfer-ownership` - Transfer query ownership
- [ ] `POST /workspaces/:workspace/scripts/:script/transfer-ownership` - Transfer script ownership
- [ ] `POST /workspaces/:workspace/connections/:connection/transfer-ownership` - Transfer connection ownership
- [ ] `POST /workspaces/:workspace/workflows/:workflow/transfer-ownership` - Transfer workflow ownership
- [ ] `POST /workspaces/:workspace/ai-applications/:ai_application/transfer-ownership` - Transfer AI application ownership
- [ ] `POST /workspaces/:workspace/repositories/:repository/transfer-ownership` - Transfer repository ownership

### Delete Operations
- [ ] `DELETE /workspaces/:workspace/users/:user` - Remove user from workspace
- [ ] `DELETE /workspaces/:workspace/workflows/:workflow/runs/:run` - Delete workflow run

### Connection Operations
- [ ] `PATCH /workspaces/:workspace/connections/:connection/configuration` - Update connection configuration
- [ ] `GET /workspaces/:workspace/connections/:connection/schema` - Get connection schema
- [ ] `POST /workspaces/:workspace/connections/:connection/test` - Test connection

### Validation Endpoints
- [ ] `POST /workspaces/:workspace/repositories/:repository/objects/validate` - Validate object
- [ ] `POST /connectors/:connector/validate` - Validate connector configuration

### Branch Operations
- [ ] `PATCH /workspaces/:workspace/repositories/:repository/branches/:branch` - Update branch

### Workspace Operations
- [ ] `POST /workspaces/:workspace/leave` - Leave workspace

### Invite Operations
- [ ] `POST /invites/:invite/accept` - Accept invite
- [ ] `POST /invites/:invite/decline` - Decline invite

### AI Application API (Separate Authentication)
These endpoints use AI Application API key authentication (`/api/v1/ai-app/*`):
- [ ] `GET /ai-app/info` - Get AI application info
- [ ] `GET /ai-app/system-prompt` - Get system prompt
- [ ] `POST /ai-app/query` - Execute query
- [ ] `GET /ai-app/objects` - List objects
- [ ] `GET /ai-app/content` - Get object content
- [ ] `GET /ai-app/schema` - Get schema
- [ ] `POST /ai-app/embeddings/search` - Search embeddings
- [ ] `GET /ai-app/tools` - List custom tools
- [ ] `POST /ai-app/tools/:tool_name/execute` - Execute custom tool

### System Endpoints
- [ ] `POST /system/webhook` - System webhook handler
- [ ] `POST /system/schema-from-file` - Generate schema from file

## Notes

- The test runner creates a shared workspace and repository at startup
- Tests use unique paths/names within the shared repository to avoid conflicts
- When `cleanup_after_tests` is enabled, the workspace (and all its resources) is deleted after tests
- Failed tests will cause the program to exit with code 1
- The test runner provides a summary at the end showing passed/failed tests
