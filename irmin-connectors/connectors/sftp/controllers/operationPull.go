package sftpcontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/db"
	"log/slog"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
)

// SFTPPullProvider implements the PullOperationProvider interface for SFTP.
type SFTPPullProvider struct {
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns nil today — Phase 3 of the
// progress-events rollout adds per-file transfer progress
// (ProgressKindFile) so 10k-file directory pulls stop looking like
// a multi-minute hang. Until then, the baseline heartbeat from the
// common pull handler covers the gap.
func (p *SFTPPullProvider) ProgressHandler(_ *db.Operation) common.ProgressHandler {
	return nil
}

// InitializeClient initializes the SFTP client for pull operations.
func (p *SFTPPullProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, err := sftpclient.InitSftpClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialize SFTP client: %w", err)
	}

	// Connect to SFTP server
	err = client.Connect()
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to connect to SFTP server: %w", err)
	}

	cleanup := func() {
		if closeErr := client.Close(); closeErr != nil {
			logger.Error("Failed to close SFTP client", "error", closeErr)
		}
	}

	// SFTP doesn't have a "database name" concept, so return nil
	return client, nil, cleanup, nil
}

// GetAllFiles downloads all files from the root directory.
func (p *SFTPPullProvider) GetAllFiles(c fiber.Ctx, client any) ([]string, [][]byte, error) {
	sftpClient, ok := client.(*sftpclient.SftpClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for SFTP pull provider")
	}

	operation, _ := c.Locals("operation").(*db.Operation)

	// For SFTP, "all files" means all files in the root directory
	path := "/"
	filePaths, fileContents, err := p.downloadFromPath(c, sftpClient, path)

	if err != nil && operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to download files from SFTP root directory",
			map[string]any{
				"error": err.Error(),
				"path":  path,
			},
		)
	}

	return filePaths, fileContents, err
}

// GetFileByPath downloads a specific file by path.
func (p *SFTPPullProvider) GetFileByPath(c fiber.Ctx, client any, rawPath string) (string, []byte, error) {
	sftpClient, ok := client.(*sftpclient.SftpClient)
	if !ok {
		return "", nil, errors.New("invalid client type for SFTP pull provider")
	}

	operation, _ := c.Locals("operation").(*db.Operation)

	// SFTP-specific path processing - normalize for file system
	path := normalizePath(rawPath)

	// Check if path exists and whether it's a file or directory
	fileInfo, err := sftpClient.GetFileInfo(path)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get SFTP file info",
				map[string]any{
					"error": err.Error(),
					"path":  path,
				},
			)
		}
		return "", nil, fmt.Errorf("failed to get file info for %s: %w", path, err)
	}

	if fileInfo.IsDir {
		// For directories, we can't return them as a single "file"
		// Return an error since a directory can't be a single file
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"SFTP path is a directory, not a file",
				map[string]any{
					"path": path,
				},
			)
		}
		return "", nil, fmt.Errorf("path %s is a directory, not a file", path)
	}

	// Download single file
	fileContent, err := sftpClient.DownloadFile(path)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to download SFTP file",
				map[string]any{
					"error": err.Error(),
					"path":  path,
				},
			)
		}
		return "", nil, fmt.Errorf("failed to download file %s: %w", path, err)
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Successfully downloaded SFTP file",
			map[string]any{
				"path":      path,
				"file_size": len(fileContent),
			},
		)
	}

	fileName := filepath.Base(path)
	return fileName, fileContent, nil
}

// downloadFromPath downloads files from SFTP server based on path.
//
//nolint:gocognit // Complex? Maybe, but it's okay for now
func (p *SFTPPullProvider) downloadFromPath(
	c fiber.Ctx,
	client *sftpclient.SftpClient,
	path string,
) ([]string, [][]byte, error) {
	operation, _ := c.Locals("operation").(*db.Operation)

	// Check if path exists and whether it's a file or directory
	fileInfo, err := client.GetFileInfo(path)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get SFTP file info during download",
				map[string]any{
					"error": err.Error(),
					"path":  path,
				},
			)
		}
		return nil, nil, fmt.Errorf("failed to get file info for %s: %w", path, err)
	}

	if fileInfo.IsDir {
		// Download entire directory
		dirFiles, dirErr := client.DownloadDirectory(path)
		if dirErr != nil {
			if operation != nil && p.dbInstance != nil && p.logger != nil {
				common.LogOperationEvent(
					p.dbInstance,
					p.logger,
					operation.ID,
					db.LogEventTypeError,
					"Failed to download SFTP directory",
					map[string]any{
						"error": dirErr.Error(),
						"path":  path,
					},
				)
			}
			return nil, nil, fmt.Errorf("failed to download directory %s: %w", path, dirErr)
		}

		if operation != nil && p.dbInstance != nil && p.logger != nil {
			totalSize := 0
			for _, content := range dirFiles {
				totalSize += len(content)
			}
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeInfo,
				"Successfully downloaded SFTP directory",
				map[string]any{
					"path":       path,
					"file_count": len(dirFiles),
					"total_size": totalSize,
				},
			)
		}

		// Convert map to slices
		filePaths := make([]string, 0, len(dirFiles))
		fileContents := make([][]byte, 0, len(dirFiles))

		for filePath, content := range dirFiles {
			filePaths = append(filePaths, filePath)
			fileContents = append(fileContents, content)
		}

		return filePaths, fileContents, nil
	}

	// Download single file
	fileContent, err := client.DownloadFile(path)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to download SFTP file from path",
				map[string]any{
					"error": err.Error(),
					"path":  path,
				},
			)
		}
		return nil, nil, fmt.Errorf("failed to download file %s: %w", path, err)
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Successfully downloaded SFTP file from path",
			map[string]any{
				"path":      path,
				"file_size": len(fileContent),
			},
		)
	}

	fileName := filepath.Base(path)
	return []string{fileName}, [][]byte{fileContent}, nil
}

// OperationPull godoc
// @Summary Pull files from SFTP server
// @Description Download files from an SFTP server using the operation token and specified path
// @Tags sftp
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string true "Path to file or directory on SFTP server to download"
// @Success 200 {object} fiber.Map "Files pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or path"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "File or directory not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &SFTPPullProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB)
}
