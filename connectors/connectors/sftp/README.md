# SFTP Connector

This document provides detailed information about the SFTP connector implementation in the Irmin Connectors repository.

## Overview

The SFTP connector enables Irmin to interact with SFTP servers for secure file transfer operations. It implements the standard connector endpoints for file upload and download operations, supporting both password and SSH key authentication.

## How It Works

The SFTP connector establishes secure SSH connections to SFTP servers using the provided credentials and configuration. It can perform various operations including:

- **File Download (Pull)**: Download files and directories from SFTP servers
- **File Upload (Push)**: Upload files and directories to SFTP servers  
- **Directory Navigation**: Browse remote directory structures
- **Authentication**: Support for password and SSH private key authentication

## Key Features

### Supported Operations
- **Pull**: Download files or entire directories from SFTP server as ZIP archives
- **Push**: Upload ZIP archives containing files and directories to SFTP server

### Unsupported Operations  
- **Patch**: Not supported (files are replaced entirely rather than updated incrementally)
- **Subscribe**: Not supported (SFTP doesn't provide real-time notifications)

### Authentication Methods
- **Password Authentication**: Username and password
- **SSH Key Authentication**: Private key with optional passphrase
- **Host Key Verification**: Optional SSH host key fingerprint verification

## Data Transfer Format

All data operations use ZIP archives to maintain consistency with other Irmin connectors:

### Pull Operations
- Downloads are packaged as ZIP files containing the requested files/directories
- Directory structure is preserved within the ZIP archive
- File metadata (timestamps, permissions) can be preserved based on configuration

### Push Operations  
- Accepts ZIP files containing the files and directories to upload
- Extracts and uploads files maintaining the directory structure
- Supports configurable file overwriting and directory creation

## Required Configuration Fields

### Connection Settings (`ConnectionSettings`)

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `remote_path` | string | No | Default remote directory path | `/` |
| `file_patterns` | array | No | File patterns to include/exclude | `["*"]` |
| `preserve_timestamps` | boolean | No | Preserve file modification times | `true` |
| `overwrite_existing` | boolean | No | Overwrite existing files during push | `false` |
| `create_directories` | boolean | No | Create missing directories during upload | `true` |
| `transfer_mode` | string | No | File transfer mode ("binary" or "text") | `"binary"` |

### Connection Details (`ConnectionDetails`)

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `host` | string | Yes | SFTP server hostname or IP address | - |
| `port` | int | No | SFTP server port | `22` |
| `username` | string | Yes | Username for authentication | - |
| `password` | string | No* | Password for authentication | - |
| `private_key` | string | No* | SSH private key content | - |
| `private_key_passphrase` | string | No | Passphrase for encrypted private key | - |
| `host_key_fingerprint` | string | No | Expected SSH host key fingerprint | - |

*Either `password` or `private_key` must be provided for authentication.

## API Endpoints

### System Token Authenticated Endpoints

- `GET /sftp/info` - Returns connector information and capabilities
- `POST /sftp/configuration/:key/fields` - Returns dynamic configuration fields
- `POST /sftp/configuration/validate` - Validates connection configuration  
- `POST /sftp/operation/init` - Initializes a new operation
- `POST /sftp/operation/cancel` - Cancels a running operation
- `POST /sftp/operation/status` - Returns operation status

### Operation Token Authenticated Endpoints

- `POST /sftp/operation/schema/:operation` - Returns schema for the operation
- `POST /sftp/operation/pull` - Downloads files from SFTP server
- `POST /sftp/operation/push` - Uploads files to SFTP server

### Public Endpoints

- `GET /sftp/details` - Public information about the connector

## Usage Examples

### Pull Operation (Download)
```bash
# Download all files from root directory
curl -X POST /sftp/operation/pull \
  -H "Authorization: Bearer <operation_token>" \
  -F "path=/"

# Download specific directory
curl -X POST /sftp/operation/pull \
  -H "Authorization: Bearer <operation_token>" \
  -F "path=/documents"

# Download specific file
curl -X POST /sftp/operation/pull \
  -H "Authorization: Bearer <operation_token>" \
  -F "path=/documents/file.txt"
```

### Push Operation (Upload)
```bash
# Upload files to root directory
curl -X POST /sftp/operation/push \
  -H "Authorization: Bearer <operation_token>" \
  -F "path=/" \
  -F "file=@files.zip"

# Upload files to specific directory
curl -X POST /sftp/operation/push \
  -H "Authorization: Bearer <operation_token>" \
  -F "path=/uploads" \
  -F "file=@files.zip"
```

## Error Handling

The connector handles various error conditions:

- **Connection Errors**: Network connectivity, authentication failures
- **Permission Errors**: Insufficient access rights on remote server
- **File System Errors**: File not found, disk space issues
- **Protocol Errors**: SFTP protocol-specific errors
- **Security Errors**: Host key verification failures, malformed keys

All errors are returned with appropriate HTTP status codes and descriptive messages.

## Security Considerations

### Authentication Security
- Private keys are handled securely in memory only
- Credentials are never logged or persisted  
- Support for encrypted private keys with passphrases

### Connection Security
- All communications encrypted via SSH/SFTP
- Optional host key fingerprint verification
- Configurable connection timeouts

### File Operation Security  
- Path traversal attack prevention
- Input validation for all file paths
- Safe handling of file permissions and timestamps

## Performance Considerations

### File Transfer Optimization
- Efficient handling of large files through streaming
- Concurrent file transfers where possible
- Memory-efficient ZIP processing

### Connection Management
- Connection reuse for multiple operations
- Automatic connection cleanup
- Configurable timeouts and retry logic

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify username and password/private key
   - Check SSH key format (OpenSSH format required)
   - Ensure private key passphrase is correct if key is encrypted

2. **Connection Issues**
   - Verify host and port are correct
   - Check network connectivity to SFTP server
   - Validate host key fingerprint if provided

3. **Permission Issues**
   - Ensure user has read/write permissions for target directories
   - Check if target directories exist (enable `create_directories` if needed)
   - Verify file overwrite permissions if `overwrite_existing` is enabled

4. **File Transfer Issues**
   - Check file size limits and available disk space
   - Verify ZIP file format for push operations
   - Ensure proper file path formatting (Unix-style paths)

### Debug Information

Enable detailed logging by setting the log level to debug. The connector logs:
- Connection establishment and authentication
- File transfer progress and statistics
- Error details and stack traces
- Performance metrics

## Security Features

### Path Security
- **Path Validation**: Prevents path traversal attacks and validates path structure
- **Path Sanitization**: Automatically cleans and normalizes file paths
- **Filename Validation**: Blocks dangerous filenames and invalid characters
- **Extension Filtering**: Configurable allow/block lists for file extensions

### Transfer Security
- **File Size Limits**: Configurable maximum file and transfer sizes
- **File Count Limits**: Prevents excessive file transfers
- **Directory Depth Limits**: Protects against deep directory structures
- **Host Key Verification**: SHA256 fingerprint validation for secure connections

### Security Configuration
```go
config := &SecurityConfig{
    MaxFileSize:         1024 * 1024 * 1024, // 1GB
    MaxTotalSize:        5 * 1024 * 1024 * 1024, // 5GB
    MaxFilesPerTransfer: 1000,
    MaxPathLength:       4096,
    MaxDirectoryDepth:   32,
    BlockedExtensions:   []string{".exe", ".bat", ".cmd"},
    AllowPathTraversal:  false,
}
```

## Performance Monitoring

### Metrics Collection
- **Operation Tracking**: Records success/failure rates, durations, and retry counts
- **Transfer Metrics**: Monitors bytes transferred and files processed
- **Performance Statistics**: Calculates transfer speeds and averages
- **Error Analysis**: Tracks error patterns and retry statistics

### Usage Example
```go
// Get metrics from SFTP client
metrics := client.GetMetrics()
summary := metrics.GetSummary()

fmt.Printf("Success Rate: %.1f%%\n", summary.SuccessRate)
fmt.Printf("Total Bytes: %s\n", FormatFileSize(summary.TotalBytesTransferred))
fmt.Printf("Average Duration: %v\n", summary.AverageDuration)
```

### Retry Logic
- **Exponential Backoff**: Configurable retry delays with backoff factor
- **Retryable Errors**: Smart detection of temporary vs permanent failures
- **Connection Recovery**: Automatic reconnection for network issues
- **Configurable Limits**: Customizable retry counts and timeouts

## Implementation Status

**Current Phase**: Phase 4 - Error Handling & Security ✅ COMPLETED  
**Next Phase**: Phase 5 - Testing & Optimization

### Completed
- ✅ Directory structure setup
- ✅ Models implementation (ConnectionSettings, ConnectionDetails)
- ✅ Routes configuration
- ✅ Controller implementation with real SFTP operations
- ✅ Client implementation with full SFTP functionality
- ✅ Configuration management with connection testing
- ✅ Documentation
- ✅ SFTP connection implementation
- ✅ SSH authentication (password and key-based)
- ✅ Host key verification
- ✅ File transfer operations (pull/push)
- ✅ Directory operations and recursive transfers
- ✅ ZIP archive processing
- ✅ Enhanced error handling and retry logic
- ✅ Security hardening (path validation, file restrictions)
- ✅ Performance monitoring and metrics collection
- ✅ Advanced security features (path traversal protection)
- ✅ Transfer speed tracking and formatted reporting
- ✅ Comprehensive test suite for security and monitoring

### TODO (Phase 5)
- [ ] Integration tests with mock SFTP server
- [ ] End-to-end testing with real SFTP servers
- [ ] Performance benchmarks and stress testing
- [ ] Production deployment documentation
- [ ] Security audit and penetration testing

## Dependencies

### Required Go Packages
- `golang.org/x/crypto/ssh` - SSH client functionality
- `github.com/pkg/sftp` - SFTP client implementation
- Standard library packages for ZIP and file handling

### Installation
```bash
go mod tidy
```

## Contributing

When contributing to the SFTP connector:

1. Follow the established patterns from PostgreSQL/MySQL connectors
2. Maintain security best practices for credential handling
3. Include comprehensive error handling
4. Add appropriate logging for debugging
5. Write tests for new functionality
6. Update documentation for any API changes

## Support

For issues or questions regarding the SFTP connector:
- Check the troubleshooting section above
- Review the connector implementation plan
- Open an issue with detailed error information and logs