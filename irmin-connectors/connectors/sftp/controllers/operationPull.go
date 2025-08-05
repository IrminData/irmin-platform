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
type SFTPPullProvider struct{}

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
func (p *SFTPPullProvider) GetAllFiles(_ fiber.Ctx, client any) ([]string, [][]byte, error) {
	sftpClient, ok := client.(*sftpclient.SftpClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for SFTP pull provider")
	}

	// For SFTP, "all files" means all files in the root directory
	path := "/"
	return p.downloadFromPath(sftpClient, path)
}

// GetFileByPath downloads a specific file by path.
func (p *SFTPPullProvider) GetFileByPath(_ fiber.Ctx, client any, rawPath string) (string, []byte, error) {
	sftpClient, ok := client.(*sftpclient.SftpClient)
	if !ok {
		return "", nil, errors.New("invalid client type for SFTP pull provider")
	}

	// SFTP-specific path processing - normalize for file system
	path := normalizePath(rawPath)

	// Check if path exists and whether it's a file or directory
	fileInfo, err := sftpClient.GetFileInfo(path)
	if err != nil {
		return "", nil, fmt.Errorf("failed to get file info for %s: %w", path, err)
	}

	if fileInfo.IsDir {
		// For directories, we can't return them as a single "file"
		// Return an error since a directory can't be a single file
		return "", nil, fmt.Errorf("path %s is a directory, not a file", path)
	}

	// Download single file
	fileContent, err := sftpClient.DownloadFile(path)
	if err != nil {
		return "", nil, fmt.Errorf("failed to download file %s: %w", path, err)
	}

	fileName := filepath.Base(path)
	return fileName, fileContent, nil
}

// downloadFromPath downloads files from SFTP server based on path.
func (p *SFTPPullProvider) downloadFromPath(client *sftpclient.SftpClient, path string) ([]string, [][]byte, error) {
	// Check if path exists and whether it's a file or directory
	fileInfo, err := client.GetFileInfo(path)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get file info for %s: %w", path, err)
	}

	if fileInfo.IsDir {
		// Download entire directory
		dirFiles, dirErr := client.DownloadDirectory(path)
		if dirErr != nil {
			return nil, nil, fmt.Errorf("failed to download directory %s: %w", path, dirErr)
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
		return nil, nil, fmt.Errorf("failed to download file %s: %w", path, err)
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
	provider := &SFTPPullProvider{}
	return common.HandleOperationPull(c, provider, cs.Logger)
}
