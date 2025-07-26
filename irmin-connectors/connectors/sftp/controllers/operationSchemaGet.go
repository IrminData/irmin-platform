package sftpcontrollers

import (
	"errors"
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"
	"irmin-connectors/db"
	"log/slog"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

const (
	// DefaultConcurrentTransfers is the default number of concurrent transfers.
	DefaultConcurrentTransfers = 5
	// DefaultMaxFilesPerZip is the default maximum files per ZIP archive.
	DefaultMaxFilesPerZip = 1000
)

// SFTPSchemaProvider implements the SchemaOperationProvider interface for SFTP file operations.
type SFTPSchemaProvider struct{}

// InitializeClient for SFTP doesn't need a persistent client, so it returns nil.
func (p *SFTPSchemaProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	// SFTP doesn't need a traditional client initialization for schema operations
	return nil, nil, func() {}, nil
}

// GetSchema returns schema information for SFTP file operations.
func (p *SFTPSchemaProvider) GetSchema(
	_ fiber.Ctx,
	_ any,
	operationType string,
	_ *string,
) (*irminmodels.ObjectSchema, error) {
	switch operationType {
	case "pull":
		return p.getPullSchema(), nil
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

// getPullSchema returns the schema for pull operations.
func (p *SFTPSchemaProvider) getPullSchema() *irminmodels.ObjectSchema {
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
		Path:   "/pull",
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
		Path:   "/push",
		Schema: &schema,
	}
}

// OperationSchemaGet returns schema for SFTP file operations (directory structure).
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &SFTPSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}
