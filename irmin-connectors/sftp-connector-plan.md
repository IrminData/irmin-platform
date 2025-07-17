# SFTP Connector Implementation Plan

## Overview

This document provides a comprehensive plan for implementing an SFTP connector for the Irmin Connectors system. The SFTP connector will enable secure file transfer operations (pull and push) with SFTP servers while following the established connector architecture patterns.

## Key Differences from Database Connectors

- **File-based Operations**: SFTP already works with files, so no CSV conversion needed
- **No Subscriptions**: SFTP doesn't support real-time notifications or webhooks
- **No Patch Operations**: Files are replaced entirely rather than updated incrementally
- **Directory Navigation**: Path-based operations to navigate remote directory structures
- **Binary File Support**: Must handle various file types (text, binary, media, etc.)

## Implementation Checklist

### 1. Directory Structure Setup ✅

```
connectors/sftp/
├── models/
│   ├── connectionSettings.go ✅
│   └── connectionDetails.go ✅
├── controllers/
│   ├── controllers.go ✅
│   ├── middlewares.go ✅
│   ├── info.go ✅
│   ├── detailsPage.go ✅
│   ├── configFields.go ✅
│   ├── configValidate.go ✅
│   ├── operationInit.go ✅
│   ├── operationCancel.go ✅
│   ├── operationStatus.go ✅
│   ├── operationSchemaGet.go ✅
│   ├── operationPull.go ✅
│   ├── operationPush.go ✅
│   └── utils.go ✅
├── client/
│   ├── sftpClient.go ✅
│   └── initSftpClient.go ✅
├── config/
│   └── config.go ✅
├── routes.go ✅
└── README.md ✅
```

### 2. Core Models Implementation ✅

#### 2.1 ConnectionSettings (`models/connectionSettings.go`) ✅
- [x] Define non-sensitive configuration options:
  - `remote_path` (string): Default remote directory path ✅
  - `file_patterns` ([]string): File patterns to include/exclude ✅
  - `preserve_timestamps` (bool): Whether to preserve file modification times ✅
  - `overwrite_existing` (bool): Whether to overwrite existing files during push ✅
  - `create_directories` (bool): Whether to create missing directories ✅
  - `transfer_mode` (string): "binary" or "text" transfer mode ✅

#### 2.2 ConnectionDetails (`models/connectionDetails.go`) ✅
- [x] Define sensitive connection credentials:
  - `host` (string): SFTP server hostname/IP ✅
  - `port` (int): SFTP server port (default 22) ✅
  - `username` (string): Authentication username ✅
  - `password` (string): Authentication password (optional if using key) ✅
  - `private_key` (string): SSH private key content (optional if using password) ✅
  - `private_key_passphrase` (string): Passphrase for encrypted private key ✅
  - `host_key_fingerprint` (string): Expected host key fingerprint for verification ✅

### 3. Client Implementation ✅ (Interface Complete - Implementation TODO Phase 2)

#### 3.1 SFTP Client (`client/sftpClient.go`) ✅
- [x] Define SftpClient struct with connection management ✅
- [x] Implement connection establishment with SSH key/password authentication ✅
- [x] Implement host key verification ✅
- [x] Implement directory navigation methods:
  - `ListDirectory(path string) ([]FileInfo, error)` ✅
  - `CreateDirectory(path string) error` ✅
  - `RemoveDirectory(path string) error` ✅
- [x] Implement file operations:
  - `DownloadFile(remotePath string) ([]byte, error)` ✅
  - `UploadFile(localData []byte, remotePath string) error` ✅
  - `DeleteFile(remotePath string) error` ✅
  - `GetFileInfo(remotePath string) (*FileInfo, error)` ✅
- [x] Implement bulk operations:
  - `DownloadDirectory(remotePath string) (map[string][]byte, error)` ✅
  - `UploadDirectory(files map[string][]byte, remotePath string) error` ✅
- [x] Implement connection cleanup and error handling ✅

#### 3.2 Client Initialization (`client/initSftpClient.go`) ✅
- [x] Extract connection details and settings from operation ✅
- [x] Validate required fields ✅
- [x] Establish SFTP connection with proper authentication ✅
- [x] Return initialized client instance ✅

### 4. Controllers Implementation ✅

#### 4.1 Base Controller (`controllers/controllers.go`) ✅
- [x] Define Controllers struct with dependencies ✅
- [x] Implement NewControllers constructor ✅

#### 4.2 Middleware (`controllers/middlewares.go`) ✅
- [x] Implement ValidateSystemTokenMiddleware ✅
- [x] Implement ValidateOperationTokenMiddleware ✅

#### 4.3 Connector Info (`controllers/info.go`) ✅
- [x] Return connector metadata:
  - Name: "SFTP" ✅
  - Description: "Secure File Transfer Protocol connector" ✅
  - Capabilities: ["pull", "push"] (no "patch" or "subscribe") ✅
  - Version information ✅

#### 4.4 Configuration Management ✅
- [x] `configFields.go`: Return dynamic configuration fields based on connection type ✅
- [x] `configValidate.go`: Validate SFTP connection settings and credentials ✅

#### 4.5 Operation Management ✅
- [x] `operationInit.go`: Initialize SFTP operations with connection testing ✅
- [x] `operationCancel.go`: Cancel ongoing file transfer operations ✅
- [x] `operationStatus.go`: Return operation status and progress ✅
- [x] `operationSchemaGet.go`: Return schema for file operations (directory structure) ✅

#### 4.6 Data Operations

##### Pull Operation (`controllers/operationPull.go`)
- [ ] Parse path parameter to determine target (file or directory)
- [ ] Handle root path "/" to list available directories
- [ ] Handle specific file path to download individual file
- [ ] Handle directory path to download all files in directory (recursive)
- [ ] Create ZIP archive containing downloaded files
- [ ] Preserve directory structure within ZIP
- [ ] Return ZIP file as response stream
- [ ] Handle large files efficiently with streaming
- [ ] Implement error handling for missing files/directories

##### Push Operation (`controllers/operationPush.go`)
- [ ] Extract uploaded ZIP file from request
- [ ] Parse path parameter for target directory
- [ ] Validate file contents and structure
- [ ] Create remote directories if they don't exist
- [ ] Upload files to SFTP server maintaining directory structure
- [ ] Handle file overwrite scenarios based on settings
- [ ] Report upload progress and results
- [ ] Implement batch upload for efficiency
- [ ] Handle upload failures and rollback if needed

#### 4.7 Utility Functions (`controllers/utils.go`)
- [ ] File path normalization and validation
- [ ] ZIP file processing utilities
- [ ] Progress tracking utilities
- [ ] Error formatting helpers

### 5. Routes Configuration (`routes.go`)

- [ ] Set up route group "/sftp"
- [ ] Configure system token authenticated endpoints:
  - `GET /sftp/info`
  - `POST /sftp/configuration/:key/fields`
  - `POST /sftp/configuration/validate`
  - `POST /sftp/operation/init`
  - `POST /sftp/operation/cancel`
  - `POST /sftp/operation/status`
- [ ] Configure operation token authenticated endpoints:
  - `POST /sftp/operation/schema/:operation`
  - `POST /sftp/operation/pull`
  - `POST /sftp/operation/push`
- [ ] Configure public endpoints:
  - `GET /sftp/details`

### 6. Configuration (`config/config.go`)

- [ ] Define configuration field definitions
- [ ] Implement dynamic field generation based on authentication method
- [ ] Add validation rules for each field
- [ ] Define field dependencies and conditional fields

### 7. Main Connector Registration

#### 7.1 Update `connectors/connectors.go`
- [ ] Add SFTP import: `sftpconnector "irmin-connectors/connectors/sftp"`
- [ ] Add to SetupConnectorRoutes(): `sftpconnector.SetupRoutes(app)`
- [ ] Add to RegisterAllConnectors(): `{"SFTP", "sftp"}`
- [ ] Note: Skip StartConnectorSubscriptionListener (SFTP doesn't support subscriptions)

### 8. Dependencies and Libraries

#### 8.1 Go Dependencies
- [ ] Add to `go.mod`:
  - `golang.org/x/crypto/ssh` - SSH client functionality
  - `github.com/pkg/sftp` - SFTP client implementation
  - Archive/zip handling (already available in standard library)

#### 8.2 Dependency Installation
- [ ] Run `go mod tidy` after adding dependencies
- [ ] Test dependency compatibility

### 9. Error Handling and Security

#### 9.1 Security Considerations
- [ ] Implement proper SSH host key verification
- [ ] Secure private key handling (never log or persist)
- [ ] Path traversal attack prevention
- [ ] File size limits and validation
- [ ] Connection timeout handling
- [ ] Rate limiting for file operations

#### 9.2 Error Handling
- [ ] Network connectivity errors
- [ ] Authentication failures
- [ ] Permission denied errors
- [ ] File not found errors
- [ ] Disk space errors
- [ ] Timeout errors
- [ ] Malformed ZIP file errors

### 10. Testing Strategy

#### 10.1 Unit Tests
- [ ] Connection establishment tests
- [ ] File upload/download tests
- [ ] Error handling tests
- [ ] Path validation tests
- [ ] Authentication method tests

#### 10.2 Integration Tests
- [ ] End-to-end file transfer tests
- [ ] Large file handling tests
- [ ] Directory structure preservation tests
- [ ] Connection failure recovery tests

#### 10.3 Test Environment Setup
- [ ] Docker container with SFTP server for testing
- [ ] Test data sets with various file types
- [ ] Mock SFTP server for unit tests

### 11. Documentation

#### 11.1 README.md
- [ ] Connector overview and purpose
- [ ] Configuration field descriptions
- [ ] Supported authentication methods
- [ ] Usage examples
- [ ] Troubleshooting guide
- [ ] Security considerations

#### 11.2 API Documentation
- [ ] Document all endpoints and their parameters
- [ ] Provide example requests and responses
- [ ] Document error codes and messages

### 12. Performance Optimization

#### 12.1 File Transfer Optimization
- [ ] Implement concurrent file transfers where possible
- [ ] Add support for resumable transfers
- [ ] Optimize memory usage for large files
- [ ] Implement compression for text files

#### 12.2 Connection Management
- [ ] Connection pooling for multiple operations
- [ ] Connection keep-alive handling
- [ ] Automatic reconnection on connection loss

### 13. Monitoring and Logging

#### 13.1 Logging Implementation
- [ ] Connection establishment logging
- [ ] File transfer progress logging
- [ ] Error and warning logging
- [ ] Performance metrics logging

#### 13.2 Metrics Collection
- [ ] Transfer speed metrics
- [ ] Success/failure rates
- [ ] Connection duration metrics
- [ ] File size statistics

## Implementation Priority

### Phase 1: Core Infrastructure (Week 1) ✅ COMPLETED
1. Directory structure setup ✅
2. Basic models implementation ✅
3. Routes configuration ✅
4. Controller scaffolding ✅
5. Client interface definition ✅

### Phase 2: Authentication & Connection (Week 2) ✅ COMPLETED
1. SFTP client implementation ✅
2. Authentication methods (password + SSH key) ✅
3. Connection validation ✅
4. Configuration management ✅

### Phase 3: File Operations (Week 3) ✅ COMPLETED
1. Pull operation implementation ✅
2. Push operation implementation ✅
3. File/directory handling utilities ✅
4. ZIP archive processing ✅

### Phase 4: Error Handling & Security (Week 4)
1. Comprehensive error handling
2. Security hardening
3. Path validation and sanitization
4. Connection security features

### Phase 5: Testing & Documentation (Week 5)
1. Unit test implementation
2. Integration test setup
3. Documentation creation
4. Performance optimization

## Technical Considerations

### File Type Handling
- **Text Files**: UTF-8 encoding support
- **Binary Files**: Preserve exact byte content
- **Large Files**: Streaming support to avoid memory issues
- **Archive Files**: Handle nested ZIP files appropriately

### Path Handling
- **Absolute Paths**: Support for full path specifications
- **Relative Paths**: Relative to configured remote_path
- **Path Normalization**: Convert between Windows/Unix path formats
- **Directory Traversal**: Prevent access outside allowed directories

### Connection Reliability
- **Retry Logic**: Automatic retry for transient failures
- **Timeout Configuration**: Configurable connection and operation timeouts
- **Connection Pooling**: Reuse connections for multiple operations
- **Graceful Degradation**: Handle partial failures in batch operations

### Scalability Considerations
- **Memory Management**: Stream large files to avoid memory exhaustion
- **Concurrent Operations**: Support multiple simultaneous transfers
- **Progress Reporting**: Provide detailed progress for long-running operations
- **Resource Cleanup**: Proper cleanup of connections and temporary files

## Success Criteria

1. **Functional Requirements Met**:
   - Can connect to SFTP servers using password or SSH key authentication
   - Can pull files and directories from SFTP servers
   - Can push files and directories to SFTP servers
   - Preserves file permissions and timestamps when configured
   - Handles various file types correctly

2. **Security Requirements Met**:
   - Secure authentication implementation
   - Host key verification
   - Path traversal protection
   - Secure credential handling

3. **Performance Requirements Met**:
   - Handles files up to 1GB efficiently
   - Supports concurrent file transfers
   - Minimal memory footprint for large file operations

4. **Integration Requirements Met**:
   - Follows established connector patterns
   - Integrates seamlessly with existing connector infrastructure
   - Proper error reporting and logging

5. **Quality Requirements Met**:
   - Comprehensive test coverage (>80%)
   - Complete documentation
   - Follows Go coding standards
   - Handles edge cases gracefully