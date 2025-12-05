# Compute Sandbox

Execution environment for running user-provided code with basic resource controls and concurrency limits.

## Purpose

Enables execution of user code with:

- **Multi-Language Support**: Python, Node.js, and Go
- **Concurrency Control**: Up to 50 simultaneous executions
- **File Handling**: Input/output file management for workflows
- **Resource Management**: Basic timeout and process limits

## Architecture

### Direct Execution

The compute sandbox uses direct process execution with:

- **Concurrency limits** - Semaphore-based queue (max 50 concurrent)
- **Timeout protection** - Context-based cancellation (10 minutes max)
- **Isolated workspaces** - Each execution in separate temp directory
- **Automatic cleanup** - Workspace directories cleaned up after execution

## Requirements

### Runtime Environment

- **Python 3.11+** - for Python script execution
- **Node.js** - for JavaScript/TypeScript execution
- **Go 1.25** - for Go script execution

### Deployment

Works on any platform - no special configuration needed. Recommended: 2-4GB RAM for concurrent executions.

## Key Components

- **`sandbox.go`**: Main orchestration, script file creation, and file management
- **`executor.go`**: Direct execution with concurrency control
- **`resultParser.go`**: Output file collection and parsing
- **`types.go`**: Execution result and metrics types
- **`constants.go`**: Configuration constants and limits

## Features

### Resource Limits (Per Execution)

```go
Time Limit:      600 seconds (10 minutes via context timeout)
Processes:       Controlled by OS and container limits
```

### Concurrency Control

- **Max Concurrent**: 50 simultaneous executions
- **Semaphore-based**: Automatic queueing when limit reached
- **Context-aware**: Respects cancellation and timeouts
- **Isolated workspaces**: Each execution in separate temp directory

### File Management

- **Script Files**: Script content is written to a temporary file in the workspace directory
- **Input Files**: Copied to isolated workspace before execution
- **Output Files**: Result files tagged with `<RESULT_FILE_WRITTEN>filename</RESULT_FILE_WRITTEN>`
- **Automatic Cleanup**: Workspace directories cleaned up after execution

### Language Support

- **Python 3.11+**: Direct execution with system python3
- **Node.js**: Direct execution with system node
- **Go 1.25**: go run with automatic go mod management

## Security

### Basic Protections

- **Isolated workspaces**: Scripts run in temporary directories
- **Execution locking**: Scripts are locked by ID to prevent concurrent execution of the same script
- **Temporary credentials**: Short-lived API tokens (60 minutes)
- **Time limits**: Scripts auto-killed after 10 minutes via context cancellation
- **Concurrency limits**: Prevents resource exhaustion

### Note on Sandboxing

This implementation uses direct execution without process isolation or filesystem sandboxing. Scripts execute with the same privileges as the main application. Suitable for trusted code execution in controlled environments.

For production environments with untrusted code, consider additional security measures such as:
- Running in isolated containers
- Using VM-based sandboxing
- Implementing additional resource limits at the container/orchestration level

## Health Check

Check sandbox availability:

```bash
GET /api/v1/system/sandbox-health
```

Response:
```json
{
  "message": "Sandbox is healthy and available",
  "data": {
    "status": "healthy",
    "type": "direct"
  }
}
```

## API Usage

### ExecutedStoredScript

Executes a stored script with optional input files.

```go
func (s *ComputeSandbox) ExecutedStoredScript(
    ctx context.Context,
    inputFiles map[string][]byte,
    responsibleUser db.User,
    script *db.StoredScript,
) (ExecutionResult, error)
```

**Parameters:**
- `ctx`: Context for cancellation and timeout control
- `inputFiles`: Map of file paths to file contents that will be available in the `_input` directory
- `responsibleUser`: User responsible for the execution
- `script`: StoredScript object containing the script content, language, and ID

**Locking:**
Scripts are locked by their ID to prevent concurrent execution of the same script. If a script is already running, `ErrScriptAlreadyRunning` is returned.

**Workspace Structure:**
- Script file is written to the workspace root (e.g., `script.py`, `main.go`, `script.js`)
- Input files are written to `_input/` directory
- Temporary files directory: `.tmp/`

## Example Scripts

### Python Script
```python
from irmin_sdk import IrminClient

# Script receives credentials via CLI args
client = IrminClient(api_key, api_url)

# Do work
result = client.query("SELECT * FROM data")

# Write result file
with open('output.json', 'w') as f:
    json.dump(result, f)

# Tag for collection
print("<RESULT_FILE_WRITTEN>output.json</RESULT_FILE_WRITTEN>")
```

### Go Script
```go
package main

import (
    "github.com/IrminData/irmin-sdk-go/api"
)

func main() {
    // SDK auto-installed via go mod
    client := api.NewClient(apiKey, apiURL)
    
    // Execute workflow
    result := client.ExecuteAction(...)
    
    // Write and tag result
    os.WriteFile("output.json", result, 0644)
    fmt.Println("<RESULT_FILE_WRITTEN>output.json</RESULT_FILE_WRITTEN>")
}
```

### JavaScript Script
```javascript
const { IrminClient } = require('irmin-sdk');

// Script receives credentials via CLI args
const client = new IrminClient(apiKey, apiUrl);

// Do work
const result = await client.query("SELECT * FROM data");

// Write result file
const fs = require('fs');
fs.writeFileSync('output.json', JSON.stringify(result));

// Tag for collection
console.log('<RESULT_FILE_WRITTEN>output.json</RESULT_FILE_WRITTEN>');
```
