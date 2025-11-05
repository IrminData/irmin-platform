# Irmin Connectors E2E Test Suite

Comprehensive end-to-end test suite for validating all Irmin connector capabilities including info retrieval, configuration, operations, and data transfer (pull, push, patch, schema, subscriptions).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Adding New Connectors](#adding-new-connectors)

## Overview

This test suite validates connector functionality by:

1. **Info Retrieval** - Verifying connector metadata and capabilities
2. **Configuration** - Testing config field retrieval and validation
3. **Operations** - Testing operation lifecycle (init, status, cancel)
4. **Pull** - Testing data retrieval from connectors
5. **Push** - Testing data upload to connectors
6. **Patch** - Testing JSON patch operations
7. **Schema** - Testing schema discovery for operations
8. **Subscribe** - Testing webhook subscriptions for change events

The tests use **real data only** (no mocks) and restore the system to its original state after completion.

## Prerequisites

- Go 1.25 or higher
- Access to running connector services
- Valid credentials for each connector you want to test
- Test databases/systems for connectors (optional but recommended for isolated testing)

## Setup

### 1. Initialize Test Configuration

Generate a configuration file from the template:

```bash
cd e2e-tests
go run main.go -init
```

This creates `test-config.json` with example configuration for all available connectors.

### 2. Configure Connectors

Edit `e2e-tests/test-config.json` and:

1. Set `enabled: true` for connectors you want to test
2. Add your connector URLs (e.g., `http://localhost:8080/postgres`)
3. Add system tokens for authentication
4. Configure connection details (host, port, credentials)
5. Configure connection settings (database, schema, etc.)
6. Optionally specify test data paths and files

**Note:** The `test-config.json` file is git-ignored to prevent credential leakage.

## Configuration

### Configuration File Structure

```json
{
  "connectors": {
    "postgres": {
      "enabled": true,
      "url": "http://localhost:8080/postgres",
      "systemToken": "your-system-token",
      "details": {
        "host": "localhost",
        "port": "5432",
        "user": "testuser",
        "password": "testpass",
        "ssl_mode": "disable"
      },
      "settings": {
        "database": "testdb",
        "schema": "public"
      },
      "testData": {
        "pullPath": "",
        "pushPath": "test_table",
        "pushFile": "test-data.parquet",
        "patchFile": "test-patches.json",
        "webhookURL": "https://example.com/webhook",
        "webhookToken": "webhook-token"
      }
    }
  }
}
```

### Configuration Fields

**Connector-level:**
- `enabled` - Whether to run tests for this connector
- `url` - Base URL of the connector service
- `systemToken` - System authentication token

**Details:**
Connection details specific to the connector type (host, credentials, etc.)

**Settings:**
Connection settings specific to the connector type (database, schema, paths, etc.)

**Test Data:**
- `pullPath` - Path to pull data from (empty string for root)
- `pushPath` - Path to push data to
- `pushFile` - Custom file to use for push tests (optional)
- `patchFile` - Custom patch file to use for patch tests (optional)
- `webhookURL` - Webhook URL for subscription tests
- `webhookToken` - Webhook authentication token

## Running Tests

### Run All Tests

```bash
cd e2e-tests
go run main.go
```

### Run Tests for a Specific Connector

```bash
cd e2e-tests
go run main.go -connector postgres
```

### Run a Specific Test Type

```bash
cd e2e-tests

# Test only pull operations across all connectors
go run main.go -test pull

# Test only configuration across all connectors
go run main.go -test config
```

Available test types:
- `info` - Connector information
- `config` - Configuration fields and validation
- `operation` - Operation lifecycle
- `pull` - Pull capability
- `push` - Push capability
- `patch` - Patch capability
- `schema` - Schema retrieval
- `subscribe` - Subscription capability

### Run with Verbose Output

```bash
cd e2e-tests
go run main.go -v
```

### Specify Custom Configuration File

```bash
cd e2e-tests
go run main.go -config path/to/custom-config.json
```

### Specify Locale

```bash
cd e2e-tests
go run main.go -locale fi
```

## Test Coverage

### Info Tests
- Validates all required connector metadata fields
- Checks capabilities array
- Verifies locales and categories

### Config Tests
- Retrieves configuration fields for "details"
- Retrieves configuration fields for "settings"
- Validates correct configuration
- Tests invalid configuration handling

### Operation Tests
- Initializes operation with valid config
- Retrieves operation status
- Verifies operation token generation
- Cancels operation (cleanup)

### Pull Tests
- Pulls all files (empty path)
- Pulls specific path
- Verifies file contents and format

### Push Tests
- Pushes single file to path
- Verifies push success
- Can verify data was pushed via pull

### Patch Tests
- Applies JSON patch operations
- Verifies patch success
- Can verify changes via pull

### Schema Tests
- Retrieves schema for "pull" operation
- Retrieves schema for "push" operation
- Validates ObjectSchema structure

### Subscribe Tests
- Creates subscription with webhook
- Verifies subscription in operation status
- Cancels to cleanup

## Adding New Connectors

To add tests for a new connector:

1. Add connector configuration to `test-config.json`:

```json
"new-connector": {
  "enabled": true,
  "url": "http://localhost:8080/new-connector",
  "systemToken": "token",
  "details": { /* connector-specific */ },
  "settings": { /* connector-specific */ },
  "testData": { /* test paths */ }
}
```

2. Enable the connector: `"enabled": true`

3. Run tests: `cd e2e-tests && go run main.go -connector new-connector`

The test suite automatically:
- Detects connector capabilities from the `/info` endpoint
- Runs only applicable tests based on capabilities
- Skips unsupported operations

## Architecture

```
e2e-tests/
├── main.go                    # CLI entry point
├── test-config.json          # Your configuration (git-ignored)
├── test-config.example.json  # Example template
├── README.md                 # This file
├── connectors-client/        # Vendored connector client
│   ├── client.go
│   └── types.go
├── runner/                   # Test orchestration
│   ├── config.go            # Config loading
│   ├── runner.go            # Test execution
│   └── results.go           # Result formatting
├── tests/                   # Test implementations
│   ├── info_test.go
│   ├── config_test.go
│   ├── operation_test.go
│   ├── pull_test.go
│   ├── push_test.go
│   ├── patch_test.go
│   ├── schema_test.go
│   ├── subscribe_test.go
│   └── helpers.go
└── helpers/                 # Utilities
    ├── client.go           # Client wrapper
    ├── assertions.go       # Test assertions
    └── fixtures.go         # Test data generation
```

## Best Practices

1. **Use dedicated test environments** - Don't run tests against production databases
2. **Start with basic tests** - Begin with `info` and `config` tests before testing operations
3. **Use verbose mode during development** - `-v` flag provides detailed output
4. **Run specific tests first** - Use `-test` flag to debug individual test types
5. **Keep credentials secure** - Never commit `test-config.json` to version control

## Development

### Running Linter

```bash
cd e2e-tests
golangci-lint run --fix
```

### Building

```bash
cd e2e-tests
go build -o e2e-runner main.go
./e2e-runner -v
```
