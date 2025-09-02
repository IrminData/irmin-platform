package sftpcontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/connectors/sftp/config"
	"irmin-connectors/db"
	"irmin-connectors/schema"
	"log/slog"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

const (
	// DefaultConcurrentTransfers is the default number of concurrent transfers.
	DefaultConcurrentTransfers = 5
	// DefaultMaxFilesPerZip is the default maximum files per ZIP archive.
	DefaultMaxFilesPerZip = 1000
	// MaxSampleFiles is the maximum number of files to sample for schema generation.
	MaxSampleFiles = 10
	// MaxSampleSize is the maximum size of each file sample in bytes.
	MaxSampleSize = 1024 * 1024 // 1MB
)

// SFTPSchemaProvider implements the SchemaOperationProvider interface for SFTP file operations.
type SFTPSchemaProvider struct{}

// InitializeClient initializes an SFTP client for schema analysis.
func (p *SFTPSchemaProvider) InitializeClient(
	ctx fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	// Initialize SFTP client
	sftpClient, err := sftpclient.InitSftpClient(ctx, logger, operation)
	if err != nil {
		logger.ErrorContext(ctx, "failed to initialize SFTP client for schema analysis",
			"error", err)
		return nil, nil, func() {}, fmt.Errorf("failed to initialize SFTP client: %w", err)
	}

	// Connect to SFTP server
	if connectErr := sftpClient.Connect(); connectErr != nil {
		logger.ErrorContext(ctx, "failed to connect to SFTP server for schema analysis",
			"error", connectErr)
		// Clean up the client even if connection failed
		cleanup := func() {
			if closeErr := sftpClient.Close(); closeErr != nil {
				logger.WarnContext(ctx, "failed to close SFTP client after connection failure",
					"error", closeErr)
			}
		}
		return nil, nil, cleanup, fmt.Errorf("failed to connect to SFTP server: %w", connectErr)
	}

	// Extract remote path from operation settings
	remotePath := p.extractRemotePathFromSettings(operation.Settings)

	// Default to root if no path specified
	if remotePath == "" {
		remotePath = "/"
	}

	// Return client with cleanup function and remote path as "database name"
	cleanup := func() {
		if closeErr := sftpClient.Close(); closeErr != nil {
			logger.WarnContext(ctx, "failed to close SFTP client",
				"error", closeErr)
		}
	}

	return sftpClient, &remotePath, cleanup, nil
}

// extractRemotePathFromSettings extracts the remote path from operation settings.
func (p *SFTPSchemaProvider) extractRemotePathFromSettings(settings []byte) string {
	if settings == nil {
		return ""
	}

	var settingsMap map[string]any
	if unmarshalErr := json.Unmarshal(settings, &settingsMap); unmarshalErr != nil {
		return ""
	}

	pathValue, exists := settingsMap["remote_path"]
	if !exists {
		return ""
	}

	pathStr, ok := pathValue.(string)
	if !ok {
		return ""
	}

	return pathStr
}

// GetSchema returns schema information for SFTP file operations.
func (p *SFTPSchemaProvider) GetSchema(
	ctx fiber.Ctx,
	client any,
	operationType string,
	remotePath *string,
) (*irminmodels.ObjectSchema, error) {
	switch operationType {
	case "pull":
		return p.getPullSchema(ctx, client, remotePath)
	case "push":
		return p.getPushSchema(), nil
	default:
		return nil, errors.New("invalid operation type. Supported: pull, push")
	}
}

// GetSupportedOperationTypes returns the list of supported operation types for SFTP.
func (p *SFTPSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// getPullSchema returns the schema for pull operations based on actual files.
func (p *SFTPSchemaProvider) getPullSchema(
	ctx context.Context,
	client any,
	remotePath *string,
) (*irminmodels.ObjectSchema, error) {
	// If no client provided, return basic schema
	if client == nil {
		return p.getBasicPullSchema(), nil
	}

	sftpClient, ok := client.(*sftpclient.SftpClient)
	if !ok {
		return p.getBasicPullSchema(), nil
	}

	// Use provided remote path or default to root
	analysisPath := "/"
	if remotePath != nil && *remotePath != "" {
		analysisPath = *remotePath
	}

	// Analyze files in the specified path
	fileSchemas, err := p.analyzeFilesInPath(ctx, sftpClient, analysisPath)
	if err != nil {
		// Log error but return basic schema as fallback
		slog.Default().WarnContext(ctx, "failed to analyze files for enhanced schema, using basic schema",
			"path", analysisPath,
			"error", err)
		return p.getBasicPullSchema(), nil
	}

	// If we found file schemas, create an enhanced pull schema
	if len(fileSchemas) > 0 {
		return p.createEnhancedPullSchema(fileSchemas, analysisPath), nil
	}

	// Fallback to basic schema
	return p.getBasicPullSchema(), nil
}

// getBasicPullSchema returns a basic pull schema (fallback).
func (p *SFTPSchemaProvider) getBasicPullSchema() *irminmodels.ObjectSchema {
	// String constants for descriptions
	pathDesc := "Remote path to download (file or directory)"
	schemaDesc := "Download files or directories from SFTP server"

	// Create a JSON schema that describes the pull operation parameters
	pathParam := irminmodels.JSONSchema{
		Type:        "string",
		Description: &pathDesc,
		Default:     "/",
	}

	schema := irminmodels.JSONSchema{
		Type:        "object",
		Description: &schemaDesc,
		Properties: map[string]irminmodels.JSONSchema{
			"path": pathParam,
		},
		AdditionalProperties: map[string]any{
			"response_format": "ZIP archive containing requested files",
			"supported_file_types": []string{
				"text", "binary", "image", "document", "archive",
			},
			"limitations": map[string]any{
				"max_file_size":        "1GB",
				"max_total_size":       "5GB",
				"concurrent_transfers": DefaultConcurrentTransfers,
			},
		},
	}

	return &irminmodels.ObjectSchema{
		Type:   irminmodels.ObjectTypeBinary,
		Name:   "sftp-pull-operation",
		Path:   "/sftp/pull",
		Schema: &schema,
	}
}

// getPushSchema returns the schema for push operations.
func (p *SFTPSchemaProvider) getPushSchema() *irminmodels.ObjectSchema {
	// String constants for descriptions
	pathDesc := "Remote directory path for upload"
	fileFormat := "binary"
	fileDesc := "ZIP archive containing files to upload"
	schemaDesc := "Upload files or directories to SFTP server"

	// Create a JSON schema that describes the push operation parameters
	pathParam := irminmodels.JSONSchema{
		Type:        "string",
		Description: &pathDesc,
		Default:     "/",
	}

	fileParam := irminmodels.JSONSchema{
		Type:        "string",
		Format:      &fileFormat,
		Description: &fileDesc,
	}

	schema := irminmodels.JSONSchema{
		Type:        "object",
		Description: &schemaDesc,
		Properties: map[string]irminmodels.JSONSchema{
			"path": pathParam,
			"file": fileParam,
		},
		Required: []string{"file"},
		AdditionalProperties: map[string]any{
			"input_format": "ZIP archive containing files and directories",
			"behavior": map[string]any{
				"overwrite_existing":  "Controlled by configuration",
				"create_directories":  "Controlled by configuration",
				"preserve_structure":  true,
				"preserve_timestamps": "Controlled by configuration",
			},
			"supported_file_types": []string{
				"text", "binary", "image", "document", "archive",
			},
			"limitations": map[string]any{
				"max_file_size":        "1GB",
				"max_total_size":       "5GB",
				"max_files_per_zip":    DefaultMaxFilesPerZip,
				"concurrent_transfers": DefaultConcurrentTransfers,
			},
		},
	}

	return &irminmodels.ObjectSchema{
		Type:   irminmodels.ObjectTypeBinary,
		Name:   "sftp-push-operation",
		Path:   "/sftp/push",
		Schema: &schema,
	}
}

// analyzeFilesInPath analyzes files in the specified SFTP path and returns their schemas.
func (p *SFTPSchemaProvider) analyzeFilesInPath(
	ctx context.Context,
	sftpClient *sftpclient.SftpClient,
	path string,
) ([]*irminmodels.ObjectSchema, error) {
	// Create schema generator
	generator, err := schema.NewGenerator(ctx, slog.Default())
	if err != nil {
		return nil, fmt.Errorf("failed to create schema generator: %w", err)
	}
	defer generator.Close()

	// List files in the directory
	files, err := p.listFiles(sftpClient, path)
	if err != nil {
		return nil, fmt.Errorf("failed to list files in path %s: %w", path, err)
	}

	// Sample and analyze files
	var fileSchemas []*irminmodels.ObjectSchema
	sampleCount := 0

	for _, fileInfo := range files {
		// Skip directories and limit sample size
		if fileInfo.IsDir || sampleCount >= MaxSampleFiles {
			continue
		}

		// Skip files that are too large
		if fileInfo.Size > MaxSampleSize {
			continue
		}

		// Download and analyze file
		fileData, downloadErr := sftpClient.DownloadFile(fileInfo.Path)
		if downloadErr != nil {
			continue // Skip files that can't be downloaded
		}

		// Skip empty files
		if len(fileData) == 0 {
			continue
		}

		// Generate schema for the file
		fileSchema, schemaErr := generator.GenerateObjectSchema(fileData, fileInfo.Name)
		if schemaErr != nil {
			continue // Skip files that can't be analyzed
		}

		fileSchemas = append(fileSchemas, fileSchema)
		sampleCount++
	}

	return fileSchemas, nil
}

// listFiles lists files in the given SFTP path.
func (p *SFTPSchemaProvider) listFiles(
	sftpClient *sftpclient.SftpClient,
	path string,
) ([]*sftpclient.FileInfo, error) {
	// Get file info for the path
	fileInfo, err := sftpClient.GetFileInfo(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get file info for path %s: %w", path, err)
	}

	// If it's a file, return it directly
	if !fileInfo.IsDir {
		return []*sftpclient.FileInfo{fileInfo}, nil
	}

	// If it's a directory, list its contents
	fileInfos, err := sftpClient.ListDirectory(path)
	if err != nil {
		return nil, fmt.Errorf("failed to list directory %s: %w", path, err)
	}

	// Convert []FileInfo to []*FileInfo
	var result []*sftpclient.FileInfo
	for i := range fileInfos {
		result = append(result, &fileInfos[i])
	}

	return result, nil
}

// createEnhancedPullSchema creates an enhanced pull schema based on analyzed files.
func (p *SFTPSchemaProvider) createEnhancedPullSchema(
	fileSchemas []*irminmodels.ObjectSchema,
	path string,
) *irminmodels.ObjectSchema {
	// String constants for descriptions
	pathDesc := fmt.Sprintf("Remote path to download (analyzed %d files in %s)", len(fileSchemas), path)
	schemaDesc := "Download files or directories from SFTP server with analysis-based schema"

	// Create a JSON schema that describes the pull operation parameters
	pathParam := irminmodels.JSONSchema{
		Type:        "string",
		Description: &pathDesc,
		Default:     path,
	}

	// Collect file type information from analyzed schemas
	fileTypes := make(map[string]bool)
	var sampleSchemas []map[string]any

	for _, fileSchema := range fileSchemas {
		if fileSchema.ContentType != nil && *fileSchema.ContentType != "" {
			parts := strings.Split(*fileSchema.ContentType, "/")
			if len(parts) > 0 && parts[0] != "" {
				fileTypes[parts[0]] = true
			}
		}

		// Add sample schema information
		if fileSchema.Schema != nil {
			sampleSchemas = append(sampleSchemas, map[string]any{
				"name":         fileSchema.Name,
				"type":         string(fileSchema.Type),
				"content_type": fileSchema.ContentType,
				"size":         fileSchema.Size,
			})
		}
	}

	// Convert file types to slice
	var detectedTypes []string
	for fileType := range fileTypes {
		detectedTypes = append(detectedTypes, fileType)
	}

	schema := irminmodels.JSONSchema{
		Type:        "object",
		Description: &schemaDesc,
		Properties: map[string]irminmodels.JSONSchema{
			"path": pathParam,
		},
		AdditionalProperties: map[string]any{
			"response_format":     "ZIP archive containing requested files",
			"detected_file_types": detectedTypes,
			"sample_files":        sampleSchemas,
			"analysis_info": map[string]any{
				"files_analyzed": len(fileSchemas),
				"analysis_path":  path,
			},
			"limitations": map[string]any{
				"max_file_size":        "1GB",
				"max_total_size":       "5GB",
				"concurrent_transfers": DefaultConcurrentTransfers,
			},
		},
	}

	return &irminmodels.ObjectSchema{
		Type:   irminmodels.ObjectTypeBinary,
		Name:   "sftp-pull-operation-analyzed",
		Path:   "/sftp/pull",
		Schema: &schema,
	}
}

// OperationSchemaGet godoc
// @Summary Get SFTP operation schema
// @Description Get the schema and directory structure for SFTP file operations based on the operation type (pull or push)
// @Tags sftp
// @Security OperationTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull, push)
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation type or token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &SFTPSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}
