# Compute Sandbox

Secure, isolated execution environment for running user-provided code in containerized environments. Provides Docker-based sandboxing with resource monitoring and security controls.

## Purpose

Enables safe execution of user code through:

- **Isolation**: Docker containers for secure code execution
- **Resource Management**: CPU, memory, and execution time limits
- **File Handling**: Input/output file management for workflows
- **Multi-Language Support**: Support for various programming languages
- **Security**: Prevents unauthorized access to host system

## Key Components

- **`sandbox.go`**: Main orchestration and file management
- **`docker.go`**: Docker container lifecycle management
- **`metrics.go`**: Resource monitoring and usage tracking
- **`resultParser.go`**: Output file collection and parsing
- **`sdks.go`**: Language-specific SDK installation

## Features

- **Docker Isolation**: Complete process and filesystem isolation
- **Resource Monitoring**: Real-time CPU, memory, and I/O tracking
- **Timeout Control**: Configurable execution time limits
- **Input/Output Management**: Secure file transfer to/from containers
- **SDK Installation**: Automatic installation of language runtimes and SDKs
- **Result Collection**: Automatic parsing and collection of output files

## Security

- **Sandboxed Execution**: Code runs in isolated Docker containers
- **Resource Limits**: Prevents resource exhaustion attacks
- **Network Isolation**: Controlled network access for containers
- **Temporary Credentials**: Short-lived API tokens for container access
- **File System Protection**: Read-only access to host filesystem

## Integration

Used by the **Orchestrator** for:

- Action workflow execution in isolated environments
- Pipeline stage execution requiring custom code
- Editor code execution for development and testing
