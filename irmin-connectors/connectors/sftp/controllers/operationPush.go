package sftpcontrollers

import (
	"io"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// OperationPush uploads files to SFTP server.
// It reads a ZIP file from the request, extracts it, and uploads the files
// to the SFTP server maintaining the directory structure.
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Initialize SFTP client
	ctx := c.Context()
	client, err := sftpclient.InitSftpClient(ctx, cs.Logger, operation)
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

	// Parse path parameter for target directory
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	targetPath := "/"
	if pathValue, exists := fields["path"]; exists && pathValue != "" {
		targetPath = normalizePath(pathValue)
	}

	cs.Logger.Info("Starting file upload to SFTP server",
		"operation_id", operation.ID,
		"target_path", targetPath)

	// Handle uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded: " + err.Error(),
		})
	}

	// Open the uploaded file
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open uploaded file: " + err.Error(),
		})
	}
	defer file.Close()

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read uploaded file: " + err.Error(),
		})
	}

	// Extract ZIP file
	files, err := irminutils.UnzipFiles(fileContent)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to extract ZIP file: " + err.Error(),
		})
	}

	if len(files) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ZIP file contains no files",
		})
	}

	// Create performance tracker
	tracker := sftpclient.NewPerformanceTracker("push_operation", client.GetMetrics())

	// Track the files to be uploaded
	for _, fileData := range files {
		tracker.AddBytes(int64(len(fileData)))
		tracker.AddFiles(1)
	}

	// Upload files to SFTP server
	err = client.UploadDirectory(files, targetPath)
	if err != nil {
		tracker.Finish(false, err.Error())
		cs.Logger.Error("Failed to upload files to SFTP server", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to upload files: " + err.Error(),
		})
	}

	// Complete performance tracking
	tracker.Finish(true, "")

	// Calculate upload statistics
	uploadedFiles := len(files)
	totalSize := int64(0)
	for _, fileData := range files {
		totalSize += int64(len(fileData))
	}

	cs.Logger.Info("Successfully uploaded files",
		"operation_id", operation.ID,
		"uploaded_files", uploadedFiles,
		"total_size", totalSize,
		"target_path", targetPath)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":        "Files uploaded successfully",
		"uploaded_files": uploadedFiles,
		"total_size":     totalSize,
		"target_path":    targetPath,
		"status":         "completed",
	})
}
