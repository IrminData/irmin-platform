package sftpcontrollers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"irmin-connectors/connectors/common"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"net/http"
	"path"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary Apply patch operations to SFTP files
// @Description Apply JSON Patch operations to files on the SFTP server. Supports add (upload), remove (delete), replace (overwrite), move, and copy operations.
// @Tags sftp
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param patches formData file true "JSON file containing array of patch operations"
// @Success 200 {object} fiber.Map "Patch operations applied successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid patch format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Log operation execution start
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"SFTP patch operation execution started",
		nil,
	)

	// Initialize SFTP client
	sftpClient, cleanup, err := initSftpClientFromOperation(c, cs.Logger, operation)
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to initialize SFTP client for patch operation",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize SFTP client: " + err.Error(),
		})
	}
	defer cleanup()

	// Get base path from connection settings
	basePath := getBasePath(operation)

	// Retrieve the patch file from the form
	fileHeader, err := c.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"No JSON patch file uploaded",
			nil,
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No JSON patch file uploaded with form field 'patches'",
		})
	}
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to retrieve patch file",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve form file: " + err.Error(),
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to open patch file",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open form file: " + err.Error(),
		})
	}
	defer file.Close()

	// Read the patch file
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to read patch file",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read uploaded file: " + err.Error(),
		})
	}

	// Parse the patch operations
	var patches []irminmodels.PatchOperation
	if err = json.Unmarshal(fileBytes, &patches); err != nil {
		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to parse patch operations JSON",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse JSON data: " + err.Error(),
		})
	}

	// Apply each patch operation
	for i, patch := range patches {
		if err = executeSftpPatch(sftpClient, patch, basePath); err != nil {
			common.LogOperationEvent(
				cs.DB,
				cs.Logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to execute SFTP patch operation",
				map[string]any{
					"error":     err.Error(),
					"operation": patch.Op,
					"path":      patch.Path,
					"index":     i,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Failed to execute patch %d (%s on %s): %s", i, patch.Op, patch.Path, err.Error()),
			})
		}

		common.LogOperationEvent(
			cs.DB,
			cs.Logger,
			operation.ID,
			db.LogEventTypeInfo,
			"SFTP patch operation executed",
			map[string]any{
				"operation": patch.Op,
				"path":      patch.Path,
				"index":     i,
			},
		)
	}

	// Log successful completion
	common.LogOperationEvent(
		cs.DB,
		cs.Logger,
		operation.ID,
		db.LogEventTypeInfo,
		"SFTP patch operation completed successfully",
		map[string]any{"operation_count": len(patches)},
	)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
		"count":   len(patches),
	})
}

// initSftpClientFromOperation initializes an SFTP client from an operation.
func initSftpClientFromOperation(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (*sftpclient.SftpClient, func(), error) {
	// Parse connection details from operation
	var details map[string]string
	if err := json.Unmarshal(operation.Details, &details); err != nil {
		return nil, nil, fmt.Errorf("failed to unmarshal operation details: %w", err)
	}

	// Create client configuration from details
	config := &sftpclient.ConnectionConfig{
		Host:     details["host"],
		Username: details["username"],
	}

	// Set port (default to 22)
	if portStr, ok := details["port"]; ok && portStr != "" {
		var port int
		if _, err := fmt.Sscanf(portStr, "%d", &port); err == nil {
			config.Port = port
		} else {
			config.Port = 22
		}
	} else {
		config.Port = 22
	}

	// Set authentication
	if password, ok := details["password"]; ok {
		config.Password = password
	}
	if privateKey, ok := details["private_key"]; ok {
		config.PrivateKey = privateKey
	}
	if passphrase, ok := details["private_key_passphrase"]; ok {
		config.PrivateKeyPassphrase = passphrase
	}
	if fingerprint, ok := details["host_key_fingerprint"]; ok {
		config.HostKeyFingerprint = fingerprint
	}

	// Create and connect the client
	client, err := sftpclient.NewSftpClient(config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create SFTP client: %w", err)
	}

	if err = client.Connect(); err != nil {
		return nil, nil, fmt.Errorf("failed to connect to SFTP server: %w", err)
	}

	cleanup := func() {
		if closeErr := client.Close(); closeErr != nil {
			logger.Error("Error closing SFTP client", "error", closeErr)
		}
	}

	return client, cleanup, nil
}

// getBasePath extracts the base path from operation settings.
func getBasePath(operation *db.Operation) string {
	var settings map[string]string
	if err := json.Unmarshal(operation.Settings, &settings); err != nil {
		return "/"
	}
	if basePath, ok := settings["remote_path"]; ok && basePath != "" {
		return basePath
	}
	return "/"
}

// executeSftpPatch executes a single SFTP patch operation.
func executeSftpPatch(client *sftpclient.SftpClient, patch irminmodels.PatchOperation, basePath string) error {
	// Normalize and validate the target path
	targetPath, err := normalizeSftpPath(patch.Path, basePath)
	if err != nil {
		return fmt.Errorf("invalid target path: %w", err)
	}

	switch patch.Op {
	case "add":
		return executeSftpAdd(client, targetPath, patch)
	case "remove":
		return executeSftpRemove(client, targetPath)
	case "replace":
		return executeSftpReplace(client, targetPath, patch)
	case "move":
		if patch.From == nil {
			return errors.New("move operation requires 'from' field")
		}
		fromPath, fromErr := normalizeSftpPath(*patch.From, basePath)
		if fromErr != nil {
			return fmt.Errorf("invalid 'from' path: %w", fromErr)
		}
		return executeSftpMove(client, fromPath, targetPath)
	case "copy":
		if patch.From == nil {
			return errors.New("copy operation requires 'from' field")
		}
		fromPath, fromErr := normalizeSftpPath(*patch.From, basePath)
		if fromErr != nil {
			return fmt.Errorf("invalid 'from' path: %w", fromErr)
		}
		return executeSftpCopy(client, fromPath, targetPath)
	default:
		return fmt.Errorf("unsupported operation: %s", patch.Op)
	}
}

// normalizeSftpPath normalizes a patch path to an SFTP path and validates it
// stays within the base directory. Returns an error if path traversal is detected.
// Uses path.Join (not filepath.Join) to ensure forward slashes regardless of OS.
func normalizeSftpPath(patchPath, basePath string) (string, error) {
	// Use the security config to validate the input path
	securityConfig := sftpclient.DefaultSecurityConfig()
	if err := securityConfig.ValidatePath(patchPath); err != nil {
		return "", fmt.Errorf("path validation failed: %w", err)
	}

	// Remove leading slash from patch path
	patchPath = strings.TrimPrefix(patchPath, "/")

	// Determine the result path
	var resultPath string
	if basePath == "" || basePath == "/" {
		resultPath = "/" + patchPath
	} else {
		resultPath = path.Join(basePath, patchPath)
	}

	// Clean the path to resolve any . or .. components
	resultPath = path.Clean(resultPath)

	// Verify the result path is within the base directory
	// This prevents attacks like basePath="/data" + patchPath="/../etc/passwd"
	normalizedBase := path.Clean(basePath)
	if normalizedBase == "" || normalizedBase == "." {
		normalizedBase = "/"
	}

	// Ensure result path starts with base path (or is exactly base path)
	if !strings.HasPrefix(resultPath, normalizedBase) &&
		!strings.HasPrefix(resultPath+"/", normalizedBase+"/") &&
		resultPath != normalizedBase {
		return "", fmt.Errorf(
			"path traversal detected: result path %q is outside base directory %q",
			resultPath,
			normalizedBase,
		)
	}

	return resultPath, nil
}

// executeSftpAdd uploads a new file or creates a directory.
func executeSftpAdd(client *sftpclient.SftpClient, targetPath string, patch irminmodels.PatchOperation) error {
	// Get the file content from the patch value
	content, err := getPatchContent(patch)
	if err != nil {
		return fmt.Errorf("failed to get patch content: %w", err)
	}

	// Ensure parent directory exists (CreateDirectory already handles "already exists" case)
	dir := path.Dir(targetPath)
	if dir != "/" && dir != "." {
		// Create parent directories recursively
		if mkdirErr := createDirectoryRecursive(client, dir); mkdirErr != nil {
			return fmt.Errorf("failed to create parent directory %s: %w", dir, mkdirErr)
		}
	}

	// Upload the file
	return client.UploadFile(content, targetPath)
}

// executeSftpRemove deletes a file or directory.
func executeSftpRemove(client *sftpclient.SftpClient, targetPath string) error {
	// Try to get file info to determine if it's a file or directory
	info, err := client.GetFileInfo(targetPath)
	if err != nil {
		return fmt.Errorf("target not found: %w", err)
	}

	if info.IsDir {
		return client.RemoveDirectory(targetPath)
	}
	return client.DeleteFile(targetPath)
}

// executeSftpReplace overwrites an existing file.
func executeSftpReplace(client *sftpclient.SftpClient, targetPath string, patch irminmodels.PatchOperation) error {
	// Get the new content
	content, err := getPatchContent(patch)
	if err != nil {
		return fmt.Errorf("failed to get patch content: %w", err)
	}

	// Upload (overwrite) the file
	return client.UploadFile(content, targetPath)
}

// executeSftpMove renames/moves a file or directory.
func executeSftpMove(client *sftpclient.SftpClient, fromPath, toPath string) error {
	// Download the source file
	content, err := client.DownloadFile(fromPath)
	if err != nil {
		return fmt.Errorf("failed to download source file: %w", err)
	}

	// Upload to new location
	if err = client.UploadFile(content, toPath); err != nil {
		return fmt.Errorf("failed to upload to new location: %w", err)
	}

	// Delete the source file
	return client.DeleteFile(fromPath)
}

// executeSftpCopy copies a file.
func executeSftpCopy(client *sftpclient.SftpClient, fromPath, toPath string) error {
	// Download the source file
	content, err := client.DownloadFile(fromPath)
	if err != nil {
		return fmt.Errorf("failed to download source file: %w", err)
	}

	// Upload to new location
	return client.UploadFile(content, toPath)
}

// getPatchContent extracts the content bytes from a patch operation.
// It handles both binary content (base64 encoded with ContentType) and text content.
func getPatchContent(patch irminmodels.PatchOperation) ([]byte, error) {
	if patch.Value == nil {
		return nil, errors.New("patch value is required for add/replace operations")
	}

	// Check if this is binary content
	decodedBytes, isBinary, err := utils.DecodePatchValue(patch)
	if err != nil {
		return nil, fmt.Errorf("failed to decode binary content: %w", err)
	}
	if isBinary {
		return decodedBytes, nil
	}

	// Handle non-binary content
	switch v := (*patch.Value).(type) {
	case string:
		return []byte(v), nil
	case []byte:
		return v, nil
	default:
		// For other types (objects, arrays), serialize to JSON
		jsonBytes, jsonErr := json.Marshal(v)
		if jsonErr != nil {
			return nil, fmt.Errorf("failed to serialize patch value: %w", jsonErr)
		}
		return jsonBytes, nil
	}
}

// createDirectoryRecursive creates a directory and all its parent directories.
// It works like MkdirAll but for SFTP.
func createDirectoryRecursive(client *sftpclient.SftpClient, dirPath string) error {
	// Split the path into components
	parts := strings.Split(strings.Trim(dirPath, "/"), "/")
	if len(parts) == 0 {
		return nil
	}

	// Build up the path component by component
	currentPath := ""
	for _, part := range parts {
		if part == "" {
			continue
		}
		currentPath = currentPath + "/" + part

		// Try to create each directory in the path
		// CreateDirectory already returns nil if the directory exists
		if err := client.CreateDirectory(currentPath); err != nil {
			return err
		}
	}

	return nil
}
