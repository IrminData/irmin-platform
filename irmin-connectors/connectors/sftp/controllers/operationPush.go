package sftpcontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/db"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// SFTPPushProvider implements the PushOperationProvider interface for SFTP.
type SFTPPushProvider struct{}

// InitializeClient initializes the SFTP client for push operations.
func (p *SFTPPushProvider) InitializeClient(
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

// ProcessFiles processes the extracted files and uploads them to the SFTP server.
func (p *SFTPPushProvider) ProcessFiles(
	_ fiber.Ctx,
	client any,
	files map[string][]byte,
	rawPath string,
) error {
	sftpClient, ok := client.(*sftpclient.SftpClient)
	if !ok {
		return errors.New("invalid client type for SFTP push provider")
	}

	// SFTP-specific path processing
	targetPath := "/"
	if rawPath != "" {
		targetPath = normalizePath(rawPath)
	}

	// Create performance tracker
	tracker := sftpclient.NewPerformanceTracker("push_operation", sftpClient.GetMetrics())

	// Track the files to be uploaded
	for _, fileData := range files {
		tracker.AddBytes(int64(len(fileData)))
		tracker.AddFiles(1)
	}

	// Upload files to SFTP server
	err := sftpClient.UploadDirectory(files, targetPath)
	if err != nil {
		tracker.Finish(false, err.Error())
		return fmt.Errorf("failed to upload files: %w", err)
	}

	// Complete performance tracking
	tracker.Finish(true, "")

	return nil
}

// OperationPush godoc
// @Summary Push files to SFTP server
// @Description Upload files to an SFTP server using the operation token and file data
// @Tags sftp
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param file formData file true "File to upload to SFTP server"
// @Param path formData string false "Target path on SFTP server (defaults to root directory)"
// @Success 200 {object} fiber.Map "File uploaded successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &SFTPPushProvider{}
	return common.HandleOperationPush(c, provider, cs.Logger)
}
