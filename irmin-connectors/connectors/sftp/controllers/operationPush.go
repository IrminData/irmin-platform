package sftpcontrollers

import (
	"context"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/db"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// SFTPPushProvider implements the PushOperationProvider interface for SFTP.
type SFTPPushProvider struct {
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns the per-file observability callback the
// SFTP client fires from inside UploadDirectory's per-file loop and
// the executeWithRetry backoff loop. Without it, a 10k-file upload
// or a flaky-network retry storm silently consumes 5-10 minutes
// between operation/init and the final response.
//
// Always returns a non-nil handler. Nil-safety lives one layer down
// in common.LogOperationProgress.
func (p *SFTPPushProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandler(p.dbInstance, p.logger, operation)
}

// InitializeClient initializes the SFTP client for push operations.
func (p *SFTPPushProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	// Hydrate logger before building the handler so the closure
	// p.ProgressHandler returns has a valid logger.
	p.logger = logger
	client, err := sftpclient.InitSftpClient(ctx, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialize SFTP client: %w", err)
	}
	client.SetProgressHandler(p.ProgressHandler(operation))

	// Connect to SFTP server
	err = client.Connect()
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to connect to SFTP server: %w", err)
	}

	cleanup := func() {
		if closeErr := client.Close(); closeErr != nil {
			logger.ErrorContext(ctx, "Failed to close SFTP client", "error", closeErr)
		}
	}

	// SFTP doesn't have a "database name" concept, so return nil
	return client, nil, cleanup, nil
}

// ProcessFiles processes the extracted files and uploads them to the SFTP server.
func (p *SFTPPushProvider) ProcessFiles(
	ctx context.Context,
	client any,
	operation *db.Operation,
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

	// Calculate total size and count files
	totalSize := int64(0)
	for _, fileData := range files {
		fileSize := int64(len(fileData))
		tracker.AddBytes(fileSize)
		tracker.AddFiles(1)
		totalSize += fileSize
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Starting SFTP file upload",
			map[string]any{
				"target_path": targetPath,
				"file_count":  len(files),
				"total_size":  totalSize,
			},
		)
	}

	// Upload files to SFTP server
	err := sftpClient.UploadDirectoryContext(ctx, files, targetPath)
	if err != nil {
		tracker.Finish(false, err.Error())
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to upload files to SFTP server",
				map[string]any{
					"error":       err.Error(),
					"target_path": targetPath,
					"file_count":  len(files),
				},
			)
		}
		return fmt.Errorf("failed to upload files: %w", err)
	}

	// Complete performance tracking
	tracker.Finish(true, "")

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Successfully uploaded files to SFTP server",
			map[string]any{
				"target_path": targetPath,
				"file_count":  len(files),
				"total_size":  totalSize,
			},
		)
	}

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
	provider := &SFTPPushProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB, cs.App)
}
