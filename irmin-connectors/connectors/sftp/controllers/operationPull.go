package sftpcontrollers

import (
	"bytes"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"path/filepath"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// OperationPull downloads files from SFTP server based on the request path.
// It can return:
// - all files in the remote directory as a ZIP archive,
// - a single file as a ZIP archive,
// - a directory structure as a ZIP archive.
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Initialize SFTP client
	client, err := sftpclient.InitSftpClient(c, cs.Logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize SFTP client: " + err.Error(),
		})
	}

	// Connect to SFTP server
	err = client.Connect()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to connect to SFTP server: " + err.Error(),
		})
	}
	defer client.Close()

	// Parse "path" field from form
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	path := "/"
	if pathValue, exists := fields["path"]; exists && pathValue != "" {
		path = normalizePath(pathValue)
	}

	cs.Logger.Info("Starting file download from SFTP server",
		"operation_id", operation.ID,
		"path", path)

	// Create performance tracker
	tracker := sftpclient.NewPerformanceTracker("pull_operation", client.GetMetrics())

	// Download files from SFTP server
	resultFiles, err := cs.downloadFromSFTP(client, path, tracker)
	if err != nil {
		tracker.Finish(false, err.Error())
		cs.Logger.Error("Failed to download from SFTP server", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to download files: " + err.Error(),
		})
	}

	// Create a ZIP archive of the result files
	zipBytes, err := irminutils.ZipFiles(resultFiles)
	if err != nil {
		tracker.Finish(false, "Failed to create ZIP archive: "+err.Error())
		cs.Logger.Error("Failed to create ZIP archive", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create ZIP archive",
		})
	}

	// Complete performance tracking
	tracker.Finish(true, "")

	cs.Logger.Info("File download completed successfully", "operation_id", operation.ID)

	// Return the result files as a ZIP archive stream
	c.Response().Header.Set("Content-Type", "application/zip")
	c.Response().Header.Set("Content-Disposition", "attachment; filename=sftp_pull_result.zip")
	return c.Status(fiber.StatusOK).SendStream(bytes.NewReader(zipBytes))
}

// downloadFromSFTP downloads files from SFTP server based on path.
func (cs *Controllers) downloadFromSFTP(
	client *sftpclient.SftpClient,
	path string,
	tracker *sftpclient.PerformanceTracker,
) (map[string][]byte, error) {
	// Check if path exists and whether it's a file or directory
	fileInfo, err := client.GetFileInfo(path)
	if err != nil {
		return nil, err
	}

	resultFiles := make(map[string][]byte)

	if fileInfo.IsDir {
		// Download entire directory
		dirFiles, dirErr := client.DownloadDirectory(path)
		if dirErr != nil {
			return nil, dirErr
		}
		resultFiles = dirFiles

		// Track metrics for directory download
		for _, content := range dirFiles {
			tracker.AddBytes(int64(len(content)))
			tracker.AddFiles(1)
		}
	} else {
		// Download single file
		fileContent, fileErr := client.DownloadFile(path)
		if fileErr != nil {
			return nil, fileErr
		}
		// Use filename for single file download
		fileName := filepath.Base(path)
		resultFiles[fileName] = fileContent

		// Track metrics for single file download
		tracker.AddBytes(int64(len(fileContent)))
		tracker.AddFiles(1)
	}

	return resultFiles, nil
}
