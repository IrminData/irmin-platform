package sftpcontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	sftpclient "irmin-connectors/connectors/sftp/client"
	"irmin-connectors/connectors/sftp/config"
	"irmin-connectors/db"
	"log/slog"
	"path"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"

	"github.com/gofiber/fiber/v3"
)

const (
	// MaxSampleFiles is the maximum number of files to sample for schema generation.
	MaxSampleFiles = 10
	// MaxSampleSize is the maximum size of each file sample in bytes.
	MaxSampleSize = 1024 * 1024 // 1MB
	// MaxChildrenPerDirectory is the maximum number of children to include in a directory schema.
	MaxChildrenPerDirectory = 100
	// MaxSchemaDepth is the maximum depth to recurse when building directory schemas.
	MaxSchemaDepth = 1
)

// SFTPSchemaProvider implements the SchemaOperationProvider interface for SFTP file operations.
type SFTPSchemaProvider struct {
	APIBaseURL string
	APIToken   string
	Logger     *slog.Logger
}

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

	// Create API client for schema generation
	apiClient := irmincore.NewClient(p.APIBaseURL, p.APIToken, "en")

	// Build directory schema showing all files and folders (with depth limit)
	dirSchema, err := p.buildDirectorySchema(ctx, sftpClient, analysisPath, apiClient, 0)
	if err != nil {
		// Log error but return basic schema as fallback
		p.Logger.WarnContext(ctx, "failed to build directory schema, using basic schema",
			"path", analysisPath,
			"error", err)
		return p.getBasicPullSchema(), nil
	}

	return dirSchema, nil
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
	fileDesc := "Files to upload to SFTP server"
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
	}

	return &irminmodels.ObjectSchema{
		Type:   irminmodels.ObjectTypeBinary,
		Name:   "sftp-push-operation",
		Path:   "/sftp/push",
		Schema: &schema,
	}
}

// buildDirectorySchema builds a group schema showing the directory structure.
// Recurses up to MaxSchemaDepth levels deep, limiting children to MaxChildrenPerDirectory.
func (p *SFTPSchemaProvider) buildDirectorySchema(
	ctx context.Context,
	sftpClient *sftpclient.SftpClient,
	dirPath string,
	apiClient *irmincore.Client,
	currentDepth int,
) (*irminmodels.ObjectSchema, error) {
	// Get info for the path itself
	pathInfo, err := sftpClient.GetFileInfo(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get info for path %s: %w", dirPath, err)
	}

	// If it's a single file, return its schema
	if !pathInfo.IsDir {
		return p.buildFileSchema(ctx, sftpClient, pathInfo, apiClient, currentDepth), nil
	}

	// It's a directory - list its contents
	fileInfos, err := sftpClient.ListDirectory(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to list directory %s: %w", dirPath, err)
	}

	// Limit number of children
	childCount := len(fileInfos)
	if childCount > MaxChildrenPerDirectory {
		p.Logger.WarnContext(ctx, "directory has too many children, truncating",
			"path", dirPath,
			"total_count", childCount,
			"max_count", MaxChildrenPerDirectory)
		fileInfos = fileInfos[:MaxChildrenPerDirectory]
	}

	p.Logger.InfoContext(ctx, "building directory schema",
		"path", dirPath,
		"depth", currentDepth,
		"item_count", len(fileInfos),
		"total_items", childCount)

	// Build schemas for each child
	var children []irminmodels.ObjectSchema
	for _, fileInfo := range fileInfos {
		childSchema := p.buildFileSchema(ctx, sftpClient, &fileInfo, apiClient, currentDepth)
		children = append(children, *childSchema)
	}

	// Create group schema
	desc := fmt.Sprintf("SFTP directory: %s", dirPath)
	if childCount > MaxChildrenPerDirectory {
		desc = fmt.Sprintf("SFTP directory: %s (showing %d of %d items)", dirPath, MaxChildrenPerDirectory, childCount)
	}

	return &irminmodels.ObjectSchema{
		Type:        irminmodels.ObjectTypeGroup,
		Name:        path.Base(dirPath),
		Path:        dirPath,
		Description: &desc,
		Children:    children,
	}, nil
}

// buildFileSchema builds a schema for a single file or directory.
// Recurses into subdirectories if currentDepth < MaxSchemaDepth.
func (p *SFTPSchemaProvider) buildFileSchema(
	ctx context.Context,
	sftpClient *sftpclient.SftpClient,
	fileInfo *sftpclient.FileInfo,
	apiClient *irmincore.Client,
	currentDepth int,
) *irminmodels.ObjectSchema {
	// For directories, recurse if we haven't reached max depth
	if fileInfo.IsDir {
		if currentDepth < MaxSchemaDepth {
			// Recurse into subdirectory
			dirSchema, err := p.buildDirectorySchema(ctx, sftpClient, fileInfo.Path, apiClient, currentDepth+1)
			if err != nil {
				// If recursion fails, return basic directory schema
				p.Logger.WarnContext(ctx, "failed to recurse into subdirectory, returning basic schema",
					"path", fileInfo.Path,
					"depth", currentDepth,
					"error", err)
				desc := "Directory"
				return &irminmodels.ObjectSchema{
					Type:        irminmodels.ObjectTypeGroup,
					Name:        fileInfo.Name,
					Path:        fileInfo.Path,
					Description: &desc,
				}
			}
			return dirSchema
		}

		// At max depth, return directory without children
		desc := "Directory"
		return &irminmodels.ObjectSchema{
			Type:        irminmodels.ObjectTypeGroup,
			Name:        fileInfo.Name,
			Path:        fileInfo.Path,
			Description: &desc,
		}
	}

	// For files, try to generate schema for structured formats
	ext := path.Ext(strings.ToLower(fileInfo.Name))

	// Try structured file analysis
	structuredSchema := p.tryGenerateStructuredSchema(ctx, sftpClient, fileInfo, ext, apiClient)
	if structuredSchema != nil {
		return structuredSchema
	}

	// For binary files or failed structured analysis, return binary schema
	return p.createBinarySchema(fileInfo, ext)
}

// tryGenerateStructuredSchema attempts to generate a schema for structured file formats.
func (p *SFTPSchemaProvider) tryGenerateStructuredSchema(
	ctx context.Context,
	sftpClient *sftpclient.SftpClient,
	fileInfo *sftpclient.FileInfo,
	ext string,
	apiClient *irmincore.Client,
) *irminmodels.ObjectSchema {
	// Check if it's a structured format
	if !irminutils.IsStructuredDataFormat(ext, "") {
		return nil
	}

	// Skip files that are too large
	if fileInfo.Size > MaxSampleSize {
		return nil
	}

	// Download the file
	fileData, downloadErr := sftpClient.DownloadFile(fileInfo.Path)
	if downloadErr != nil || len(fileData) == 0 {
		return nil
	}

	// Generate schema using the API endpoint
	fileSchema, _, schemaErr := apiClient.GenerateFileSchema(ctx, fileInfo.Name, bytes.NewReader(fileData))
	if schemaErr != nil || fileSchema == nil {
		return nil
	}

	p.Logger.DebugContext(ctx, "generated schema for structured file",
		"file", fileInfo.Name,
		"size", fileInfo.Size)

	return fileSchema
}

// createBinarySchema creates a binary schema for a file.
func (p *SFTPSchemaProvider) createBinarySchema(
	fileInfo *sftpclient.FileInfo,
	ext string,
) *irminmodels.ObjectSchema {
	contentType := p.getContentTypeFromExtension(ext)
	desc := fmt.Sprintf("File: %s", fileInfo.Name)
	size := int(fileInfo.Size)

	return &irminmodels.ObjectSchema{
		Type:        irminmodels.ObjectTypeBinary,
		Name:        fileInfo.Name,
		Path:        fileInfo.Path,
		Description: &desc,
		ContentType: &contentType,
		Size:        &size,
	}
}

// getContentTypeFromExtension returns a content type based on file extension.
func (p *SFTPSchemaProvider) getContentTypeFromExtension(ext string) string {
	contentTypes := map[string]string{
		".json":    "application/json",
		".csv":     "text/csv",
		".xml":     "application/xml",
		".txt":     "text/plain",
		".parquet": "application/vnd.apache.parquet",
		".avro":    "application/vnd.apache.avro",
		".orc":     "application/vnd.apache.orc",
		".xlsx":    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".xls":     "application/vnd.ms-excel",
		".yaml":    "application/x-yaml",
		".yml":     "application/x-yaml",
		".pdf":     "application/pdf",
		".zip":     "application/zip",
		".tar":     "application/x-tar",
		".gz":      "application/gzip",
	}

	if contentType, exists := contentTypes[ext]; exists {
		return contentType
	}
	return "application/octet-stream"
}

// OperationSchemaGet godoc
// @Summary Get SFTP operation schema
// @Description Get the schema and directory structure for SFTP file operations based on the operation type (pull or push). Use the path query parameter to navigate to specific files or directories on the SFTP server.
// @Tags sftp
// @Security OperationTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull, push)
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path query string false "Path to file or directory to get schema for (e.g., /data/customers.csv or /reports/)"
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation type or token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &SFTPSchemaProvider{
		APIBaseURL: cs.App.Env.APIBaseURL,
		APIToken:   cs.App.Env.APIToken,
		Logger:     cs.Logger,
	}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}
