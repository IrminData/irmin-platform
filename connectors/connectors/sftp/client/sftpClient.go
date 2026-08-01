package sftpclient

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"irmin-connectors/connectors/common"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

const (
	// DefaultMaxRetries is the default number of retry attempts.
	DefaultMaxRetries = 3
	// DefaultMaxDelaySeconds is the default maximum delay in seconds.
	DefaultMaxDelaySeconds = 30
	// DefaultBackoffFactor is the default backoff multiplier.
	DefaultBackoffFactor = 2.0
)

// FileInfo represents information about a remote file or directory.
type FileInfo struct {
	Name        string    `json:"name"`
	Path        string    `json:"path"`
	Size        int64     `json:"size"`
	ModTime     time.Time `json:"mod_time"`
	IsDir       bool      `json:"is_dir"`
	Permissions string    `json:"permissions"`
	Owner       string    `json:"owner,omitempty"`
	Group       string    `json:"group,omitempty"`
}

// SftpClient represents an SFTP client connection.
type SftpClient struct {
	sshClient      *ssh.Client
	sftpClient     *sftp.Client
	config         *ConnectionConfig
	securityConfig *SecurityConfig
	retryConfig    *RetryConfig
	metrics        *MetricsCollector
	// progressHandler is the optional observability hook for the
	// per-file transfer loops in DownloadDirectory / UploadDirectory
	// and the retry loop in executeWithRetry. Without it, a 10k-file
	// dir transfer silently consumes 5-10 minutes between
	// operation/init and the final response — the same field-incident
	// shape Stripe got fixed for. Pull / push controllers wire this
	// up via SetProgressHandler.
	progressHandler common.ProgressHandler
}

// ConnectionConfig holds the configuration for SFTP connections.
type ConnectionConfig struct {
	Host                 string
	Port                 int
	Username             string
	Password             string
	PrivateKey           string
	PrivateKeyPassphrase string
	HostKeyFingerprint   string
	Timeout              time.Duration
}

// RetryConfig holds retry configuration for SFTP operations.
type RetryConfig struct {
	MaxRetries      int
	InitialDelay    time.Duration
	MaxDelay        time.Duration
	BackoffFactor   float64
	RetryableErrors []string
}

// DefaultRetryConfig returns default retry configuration.
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:    DefaultMaxRetries,
		InitialDelay:  1 * time.Second,
		MaxDelay:      DefaultMaxDelaySeconds * time.Second,
		BackoffFactor: DefaultBackoffFactor,
		RetryableErrors: []string{
			"connection reset",
			"timeout",
			"network is unreachable",
			"connection refused",
			"temporary failure",
		},
	}
}

// NewSftpClient creates a new SFTP client instance.
func NewSftpClient(config *ConnectionConfig) (*SftpClient, error) {
	return &SftpClient{
		config:         config,
		securityConfig: DefaultSecurityConfig(),
		retryConfig:    DefaultRetryConfig(),
		metrics:        NewMetricsCollector(),
	}, nil
}

// NewSftpClientWithSecurity creates a new SFTP client instance with custom security config.
func NewSftpClientWithSecurity(
	config *ConnectionConfig,
	securityConfig *SecurityConfig,
	retryConfig *RetryConfig,
) (*SftpClient, error) {
	if securityConfig == nil {
		securityConfig = DefaultSecurityConfig()
	}
	if retryConfig == nil {
		retryConfig = DefaultRetryConfig()
	}

	return &SftpClient{
		config:         config,
		securityConfig: securityConfig,
		retryConfig:    retryConfig,
		metrics:        NewMetricsCollector(),
	}, nil
}

// SetProgressHandler installs an observability hook for the
// per-file transfer + retry loops. Pass nil to disable. Picked over
// the functional-options pattern used in Stripe / Pinecone clients
// because SFTP's NewSftpClient signature is shared with multiple
// callers and adding a variadic option there would ripple wider
// than the one-line setter.
func (c *SftpClient) SetProgressHandler(h common.ProgressHandler) {
	c.progressHandler = h
}

// emitFileProgress invokes the configured progress handler with a
// per-file transfer event. No-op when no handler is set.
func (c *SftpClient) emitFileProgress(file string, transferred, total int64) {
	if c.progressHandler == nil {
		return
	}
	c.progressHandler(common.ProgressEvent{
		Kind:             common.ProgressKindFile,
		ResourcePath:     c.resourcePath(),
		File:             file,
		BytesTransferred: transferred,
		BytesTotal:       total,
	})
}

// emitRetryProgress invokes the configured progress handler with a
// retry-backoff event. No-op when no handler is set. Without these
// events a flaky network mid-transfer looks identical to a hung
// operation.
func (c *SftpClient) emitRetryProgress(operation string, attempt int, wait time.Duration) {
	if c.progressHandler == nil {
		return
	}
	c.progressHandler(common.ProgressEvent{
		Kind:         common.ProgressKindRateLimit,
		ResourcePath: c.resourcePath() + "#" + operation,
		Attempt:      attempt,
		Wait:         wait,
	})
}

// resourcePath formats the sftp://<host>:<port> identifier used in
// progress events. Operators with multiple SFTP connections in one
// workflow can tell which host a stuck transfer belongs to.
func (c *SftpClient) resourcePath() string {
	if c.config == nil {
		return "sftp://"
	}
	return "sftp://" + net.JoinHostPort(c.config.Host, strconv.Itoa(c.config.Port))
}

// GetMetrics returns the metrics collector for this client.
func (c *SftpClient) GetMetrics() *MetricsCollector {
	return c.metrics
}

// Connect establishes an SFTP connection to the server with retry logic.
func (c *SftpClient) Connect() error {
	return c.executeWithRetry("connect", func() error {
		return c.connectOnce()
	})
}

// connectOnce attempts to connect once without retry.
func (c *SftpClient) connectOnce() error {
	// Create SSH client configuration
	config := &ssh.ClientConfig{
		User:    c.config.Username,
		Timeout: c.config.Timeout,
	}

	// Configure authentication methods
	if err := c.setupAuthentication(config); err != nil {
		return fmt.Errorf("failed to setup authentication: %w", err)
	}

	// Configure host key verification
	if err := c.setupHostKeyVerification(config); err != nil {
		return fmt.Errorf("failed to setup host key verification: %w", err)
	}

	// Establish SSH connection
	addr := fmt.Sprintf("%s:%d", c.config.Host, c.config.Port)
	sshConn, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return fmt.Errorf("failed to establish SSH connection to %s: %w", addr, err)
	}

	// Create SFTP client
	sftpConn, err := sftp.NewClient(sshConn)
	if err != nil {
		if closeErr := sshConn.Close(); closeErr != nil {
			return fmt.Errorf(
				"failed to create SFTP client: %w (and failed to close SSH connection: %w)",
				err,
				closeErr,
			)
		}
		return fmt.Errorf("failed to create SFTP client: %w", err)
	}

	c.sshClient = sshConn
	c.sftpClient = sftpConn

	return nil
}

// Close closes the SFTP and SSH connections.
func (c *SftpClient) Close() error {
	var errors []error

	if c.sftpClient != nil {
		if err := c.sftpClient.Close(); err != nil {
			errors = append(errors, fmt.Errorf("failed to close SFTP client: %w", err))
		}
	}

	if c.sshClient != nil {
		if err := c.sshClient.Close(); err != nil {
			errors = append(errors, fmt.Errorf("failed to close SSH client: %w", err))
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors closing connections: %v", errors)
	}

	return nil
}

// setupAuthentication configures authentication methods for SSH connection.
func (c *SftpClient) setupAuthentication(config *ssh.ClientConfig) error {
	var authMethods []ssh.AuthMethod

	// Add password authentication if provided
	if c.config.Password != "" {
		authMethods = append(authMethods, ssh.Password(c.config.Password))
	}

	// Add private key authentication if provided
	if c.config.PrivateKey != "" {
		signer, err := c.parsePrivateKey(c.config.PrivateKey, c.config.PrivateKeyPassphrase)
		if err != nil {
			return fmt.Errorf("failed to parse private key: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	if len(authMethods) == 0 {
		return errors.New("no authentication methods provided (need password or private key)")
	}

	config.Auth = authMethods
	return nil
}

// parsePrivateKey parses a private key string with optional passphrase.
func (c *SftpClient) parsePrivateKey(keyData, passphrase string) (ssh.Signer, error) {
	var signer ssh.Signer
	var err error

	if passphrase != "" {
		signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(keyData), []byte(passphrase))
	} else {
		signer, err = ssh.ParsePrivateKey([]byte(keyData))
	}

	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	return signer, nil
}

// setupHostKeyVerification configures host key verification.
func (c *SftpClient) setupHostKeyVerification(config *ssh.ClientConfig) error {
	if config == nil {
		return errors.New("SSH config cannot be nil")
	}

	if c.config.HostKeyFingerprint == "" {
		return errors.New("host key fingerprint is required")
	}

	config.HostKeyCallback = c.verifyHostKeyFingerprint
	return nil
}

// verifyHostKeyFingerprint verifies the host key against the expected fingerprint.
func (c *SftpClient) verifyHostKeyFingerprint(_ string, _ net.Addr, key ssh.PublicKey) error {
	fingerprint := ssh.FingerprintSHA256(key)

	// Compare with expected fingerprint
	if fingerprint != c.config.HostKeyFingerprint {
		return fmt.Errorf("host key fingerprint mismatch: got %s, expected %s",
			fingerprint, c.config.HostKeyFingerprint)
	}

	return nil
}

// executeWithRetry executes a function with retry logic.
func (c *SftpClient) executeWithRetry(operation string, fn func() error) error {
	return c.executeWithRetryContext(context.Background(), operation, fn)
}

// executeWithRetryContext executes a function with retry logic and aborts when ctx is cancelled.
func (c *SftpClient) executeWithRetryContext(ctx context.Context, operation string, fn func() error) error {
	var lastErr error
	delay := c.retryConfig.InitialDelay

	for attempt := 0; attempt <= c.retryConfig.MaxRetries; attempt++ {
		if err := ctx.Err(); err != nil {
			return err
		}
		if attempt > 0 {
			// Surface the upcoming sleep before we take it — a flaky
			// network mid-transfer looks identical to a hung
			// operation otherwise.
			c.emitRetryProgress(operation, attempt, delay)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
			delay = min(
				time.Duration(float64(delay)*c.retryConfig.BackoffFactor),
				c.retryConfig.MaxDelay,
			)
		}

		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Check if error is retryable
		if !c.isRetryableError(err) {
			break
		}
	}

	return fmt.Errorf("operation %s failed after %d attempts: %w", operation, c.retryConfig.MaxRetries+1, lastErr)
}

// isRetryableError checks if an error is retryable.
func (c *SftpClient) isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	for _, retryableErr := range c.retryConfig.RetryableErrors {
		if strings.Contains(errStr, retryableErr) {
			return true
		}
	}
	return false
}

// ListDirectory lists files and directories in the specified remote path.
func (c *SftpClient) ListDirectory(path string) ([]FileInfo, error) {
	if c.sftpClient == nil {
		return nil, errors.New("SFTP client not connected")
	}

	// Validate path
	if err := c.securityConfig.ValidatePath(path); err != nil {
		return nil, fmt.Errorf("invalid path: %w", err)
	}

	// Sanitize path
	cleanPath := SanitizePath(path)

	var fileInfos []FileInfo
	err := c.executeWithRetry("list_directory", func() error {
		// List directory contents
		entries, err := c.sftpClient.ReadDir(cleanPath)
		if err != nil {
			return fmt.Errorf("failed to read directory %s: %w", cleanPath, err)
		}

		fileInfos = make([]FileInfo, 0, len(entries))
		for _, entry := range entries {
			fileInfo := FileInfo{
				Name:        entry.Name(),
				Path:        filepath.Join(cleanPath, entry.Name()),
				Size:        entry.Size(),
				ModTime:     entry.ModTime(),
				IsDir:       entry.IsDir(),
				Permissions: entry.Mode().String(),
			}
			fileInfos = append(fileInfos, fileInfo)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return fileInfos, nil
}

// CreateDirectory creates a directory on the remote server.
func (c *SftpClient) CreateDirectory(path string) error {
	if c.sftpClient == nil {
		return errors.New("SFTP client not connected")
	}

	// Check if directory already exists
	_, err := c.sftpClient.Stat(path)
	if err == nil {
		// Directory already exists
		return nil
	}

	// Create directory with default permissions
	err = c.sftpClient.Mkdir(path)
	if err != nil {
		return fmt.Errorf("failed to create directory %s: %w", path, err)
	}

	return nil
}

// RemoveDirectory removes a directory from the remote server.
func (c *SftpClient) RemoveDirectory(path string) error {
	if c.sftpClient == nil {
		return errors.New("SFTP client not connected")
	}

	// Check if directory exists
	stat, err := c.sftpClient.Stat(path)
	if err != nil {
		return fmt.Errorf("directory %s does not exist: %w", path, err)
	}

	if !stat.IsDir() {
		return fmt.Errorf("%s is not a directory", path)
	}

	// Remove directory (must be empty)
	err = c.sftpClient.Remove(path)
	if err != nil {
		return fmt.Errorf("failed to remove directory %s: %w", path, err)
	}

	return nil
}

// DownloadFile downloads a single file from the remote server.
func (c *SftpClient) DownloadFile(remotePath string) ([]byte, error) {
	if c.sftpClient == nil {
		return nil, errors.New("SFTP client not connected")
	}

	// Validate path
	if err := c.securityConfig.ValidatePath(remotePath); err != nil {
		return nil, fmt.Errorf("invalid path: %w", err)
	}

	// Sanitize path
	cleanPath := SanitizePath(remotePath)

	var content []byte
	err := c.executeWithRetry("download_file", func() error {
		// Get file info to check size
		stat, err := c.sftpClient.Stat(cleanPath)
		if err != nil {
			return fmt.Errorf("failed to get file info for %s: %w", cleanPath, err)
		}

		// Validate file size
		if validateErr := c.securityConfig.ValidateFileSize(stat.Size()); validateErr != nil {
			return fmt.Errorf("file size validation failed: %w", validateErr)
		}

		// Open remote file for reading
		remoteFile, err := c.sftpClient.Open(cleanPath)
		if err != nil {
			return fmt.Errorf("failed to open remote file %s: %w", cleanPath, err)
		}
		defer remoteFile.Close()

		// Read file content
		content, err = io.ReadAll(remoteFile)
		if err != nil {
			return fmt.Errorf("failed to read remote file %s: %w", cleanPath, err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return content, nil
}

// UploadFile uploads a single file to the remote server.
func (c *SftpClient) UploadFile(localData []byte, remotePath string) error {
	return c.UploadFileContext(context.Background(), localData, remotePath)
}

// UploadFileContext uploads a single file to the remote server and aborts when ctx is cancelled.
func (c *SftpClient) UploadFileContext(ctx context.Context, localData []byte, remotePath string) error {
	if c.sftpClient == nil {
		return errors.New("SFTP client not connected")
	}

	// Validate path
	if err := c.securityConfig.ValidatePath(remotePath); err != nil {
		return fmt.Errorf("invalid path: %w", err)
	}

	// Validate filename
	filename := filepath.Base(remotePath)
	if err := c.securityConfig.ValidateFileName(filename); err != nil {
		return fmt.Errorf("invalid filename: %w", err)
	}

	// Validate file size
	if err := c.securityConfig.ValidateFileSize(int64(len(localData))); err != nil {
		return fmt.Errorf("file size validation failed: %w", err)
	}

	// Sanitize path
	cleanPath := SanitizePath(remotePath)

	return c.executeWithRetryContext(ctx, "upload_file", func() error {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return ctxErr
		}
		// Create remote file for writing
		remoteFile, err := c.sftpClient.Create(cleanPath)
		if err != nil {
			return fmt.Errorf("failed to create remote file %s: %w", cleanPath, err)
		}
		defer remoteFile.Close()

		// Write file content
		if ctxErr := ctx.Err(); ctxErr != nil {
			return ctxErr
		}
		_, err = remoteFile.Write(localData)
		if err != nil {
			return fmt.Errorf("failed to write to remote file %s: %w", cleanPath, err)
		}

		return nil
	})
}

// DeleteFile deletes a file from the remote server.
func (c *SftpClient) DeleteFile(remotePath string) error {
	if c.sftpClient == nil {
		return errors.New("SFTP client not connected")
	}

	// Check if file exists
	stat, err := c.sftpClient.Stat(remotePath)
	if err != nil {
		return fmt.Errorf("file %s does not exist: %w", remotePath, err)
	}

	if stat.IsDir() {
		return fmt.Errorf("%s is a directory, not a file", remotePath)
	}

	// Delete the file
	err = c.sftpClient.Remove(remotePath)
	if err != nil {
		return fmt.Errorf("failed to delete file %s: %w", remotePath, err)
	}

	return nil
}

// GetFileInfo retrieves information about a remote file or directory.
func (c *SftpClient) GetFileInfo(remotePath string) (*FileInfo, error) {
	if c.sftpClient == nil {
		return nil, errors.New("SFTP client not connected")
	}

	// Get file stats
	stat, err := c.sftpClient.Stat(remotePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info for %s: %w", remotePath, err)
	}

	fileInfo := &FileInfo{
		Name:        stat.Name(),
		Path:        remotePath,
		Size:        stat.Size(),
		ModTime:     stat.ModTime(),
		IsDir:       stat.IsDir(),
		Permissions: stat.Mode().String(),
	}

	return fileInfo, nil
}

// DownloadDirectory downloads all files in a directory recursively.
func (c *SftpClient) DownloadDirectory(remotePath string) (map[string][]byte, error) {
	if c.sftpClient == nil {
		return nil, errors.New("SFTP client not connected")
	}

	files := make(map[string][]byte)

	err := c.downloadDirectoryRecursive(remotePath, "", files)
	if err != nil {
		return nil, fmt.Errorf("failed to download directory %s: %w", remotePath, err)
	}

	return files, nil
}

// downloadDirectoryRecursive recursively downloads files from a directory.
func (c *SftpClient) downloadDirectoryRecursive(remotePath, relativePath string, files map[string][]byte) error {
	// List directory contents
	entries, err := c.sftpClient.ReadDir(remotePath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %w", remotePath, err)
	}

	for _, entry := range entries {
		fullRemotePath := filepath.Join(remotePath, entry.Name())
		fullRelativePath := filepath.Join(relativePath, entry.Name())

		if entry.IsDir() {
			// Recursively download subdirectory
			err = c.downloadDirectoryRecursive(fullRemotePath, fullRelativePath, files)
			if err != nil {
				return err
			}
		} else {
			// Download file
			fileContent, downloadErr := c.DownloadFile(fullRemotePath)
			if downloadErr != nil {
				return fmt.Errorf("failed to download file %s: %w", fullRemotePath, downloadErr)
			}
			files[fullRelativePath] = fileContent
			// Surface per-file progress so a 10k-file directory
			// transfer doesn't look like a multi-minute silent hang.
			// Total bytes is unknown ahead of time (would need a
			// pre-walk) — pass 0 to omit the bytes_total field.
			c.emitFileProgress(fullRelativePath, int64(len(fileContent)), 0)
		}
	}

	return nil
}

// UploadDirectory uploads multiple files maintaining directory structure.
func (c *SftpClient) UploadDirectory(files map[string][]byte, remotePath string) error {
	return c.UploadDirectoryContext(context.Background(), files, remotePath)
}

// UploadDirectoryContext uploads multiple files maintaining directory structure and aborts when ctx is cancelled.
func (c *SftpClient) UploadDirectoryContext(ctx context.Context, files map[string][]byte, remotePath string) error {
	if c.sftpClient == nil {
		return errors.New("SFTP client not connected")
	}

	// Validate base path
	if err := c.securityConfig.ValidatePath(remotePath); err != nil {
		return fmt.Errorf("invalid base path: %w", err)
	}

	// Calculate total size and validate transfer
	totalSize := int64(0)
	for _, content := range files {
		totalSize += int64(len(content))
	}

	if err := c.securityConfig.ValidateTransferSize(totalSize, len(files)); err != nil {
		return fmt.Errorf("transfer validation failed: %w", err)
	}

	// Sanitize base path
	cleanBasePath := SanitizePath(remotePath)

	// Ensure base remote path exists
	err := c.CreateDirectory(cleanBasePath)
	if err != nil {
		return fmt.Errorf("failed to create base directory %s: %w", cleanBasePath, err)
	}

	// Upload each file
	var bytesUploaded int64
	for relativeFilePath, content := range files {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return ctxErr
		}
		fullRemotePath := filepath.Join(cleanBasePath, relativeFilePath)

		// Validate each file path and name
		if pathErr := c.securityConfig.ValidatePath(fullRemotePath); pathErr != nil {
			return fmt.Errorf("invalid file path %s: %w", fullRemotePath, pathErr)
		}

		filename := filepath.Base(relativeFilePath)
		if nameErr := c.securityConfig.ValidateFileName(filename); nameErr != nil {
			return fmt.Errorf("invalid filename %s: %w", filename, nameErr)
		}

		// Create directory for file if needed
		dir := filepath.Dir(fullRemotePath)
		if dir != cleanBasePath {
			err = c.createDirectoryRecursive(dir)
			if err != nil {
				return fmt.Errorf("failed to create directory %s: %w", dir, err)
			}
		}

		// Upload file
		err = c.UploadFileContext(ctx, content, fullRemotePath)
		if err != nil {
			return fmt.Errorf("failed to upload file %s: %w", fullRemotePath, err)
		}
		// Surface per-file progress so a 10k-file directory upload
		// doesn't look like a multi-minute silent hang.
		// BytesTransferred must be on the same scale as BytesTotal —
		// here, both are cumulative across the directory so the log
		// row reads as "X / Y bytes" rather than "this-file-size /
		// total-dir-size" which is meaningless to operators.
		bytesUploaded += int64(len(content))
		c.emitFileProgress(relativeFilePath, bytesUploaded, totalSize)
	}

	return nil
}

// createDirectoryRecursive creates directories recursively.
func (c *SftpClient) createDirectoryRecursive(remotePath string) error {
	// Normalize path
	remotePath = filepath.Clean(remotePath)

	// Check if directory already exists
	_, err := c.sftpClient.Stat(remotePath)
	if err == nil {
		return nil // Directory already exists
	}

	// Create parent directory first
	parent := filepath.Dir(remotePath)
	if parent != remotePath && parent != "." && parent != "/" {
		err = c.createDirectoryRecursive(parent)
		if err != nil {
			return err
		}
	}

	// Create this directory
	err = c.sftpClient.Mkdir(remotePath)
	if err != nil {
		return fmt.Errorf("failed to create directory %s: %w", remotePath, err)
	}

	return nil
}

// TestConnection tests the SFTP connection without performing operations.
func (c *SftpClient) TestConnection() error {
	// Establish connection
	err := c.Connect()
	if err != nil {
		return fmt.Errorf("connection test failed: %w", err)
	}
	defer c.Close()

	// Perform basic operation to verify connection works
	_, err = c.sftpClient.Getwd()
	if err != nil {
		return fmt.Errorf("connection test failed to get working directory: %w", err)
	}

	return nil
}
