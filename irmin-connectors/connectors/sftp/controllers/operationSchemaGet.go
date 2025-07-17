package sftpcontrollers

import (
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

const (
	// DefaultConcurrentTransfers is the default number of concurrent transfers.
	DefaultConcurrentTransfers = 5
	// DefaultMaxFilesPerZip is the default maximum files per ZIP archive.
	DefaultMaxFilesPerZip = 1000
)

// OperationSchemaGet returns schema for SFTP file operations (directory structure).
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	// Get the operation from the context (validated by middleware)
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Get the operation type from URL parameter
	operationType := c.Params("operation")

	switch operationType {
	case "pull":
		return cs.getPullSchema(c, operation)
	case "push":
		return cs.getPushSchema(c, operation)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation type. Supported: pull, push",
		})
	}
}

// getPullSchema returns the schema for pull operations.
func (cs *Controllers) getPullSchema(c fiber.Ctx, _ *db.Operation) error {
	// TODO: Connect to SFTP server and get actual directory structure
	// For now, return a basic schema structure

	schema := fiber.Map{
		"operation":   "pull",
		"description": "Download files or directories from SFTP server",
		"parameters": fiber.Map{
			"path": fiber.Map{
				"type":        "string",
				"description": "Remote path to download (file or directory)",
				"required":    false,
				"default":     "/",
				"examples": []string{
					"/",                   // Root directory
					"/documents",          // Specific directory
					"/documents/file.txt", // Specific file
				},
			},
		},
		"response_format": "ZIP archive containing requested files",
		"supported_file_types": []string{
			"text", "binary", "image", "document", "archive",
		},
		"limitations": fiber.Map{
			"max_file_size":        "1GB",
			"max_total_size":       "5GB",
			"concurrent_transfers": DefaultConcurrentTransfers,
		},
	}

	return c.Status(fiber.StatusOK).JSON(schema)
}

// getPushSchema returns the schema for push operations.
func (cs *Controllers) getPushSchema(c fiber.Ctx, _ *db.Operation) error {
	// TODO: Connect to SFTP server and validate permissions
	// For now, return a basic schema structure

	schema := fiber.Map{
		"operation":   "push",
		"description": "Upload files or directories to SFTP server",
		"parameters": fiber.Map{
			"path": fiber.Map{
				"type":        "string",
				"description": "Remote directory path for upload",
				"required":    false,
				"default":     "/",
				"examples": []string{
					"/",            // Root directory
					"/uploads",     // Specific directory
					"/data/backup", // Nested directory
				},
			},
			"file": fiber.Map{
				"type":        "file",
				"description": "ZIP archive containing files to upload",
				"required":    true,
				"accept":      "application/zip",
			},
		},
		"input_format": "ZIP archive containing files and directories",
		"behavior": fiber.Map{
			"overwrite_existing":  "Controlled by configuration",
			"create_directories":  "Controlled by configuration",
			"preserve_structure":  true,
			"preserve_timestamps": "Controlled by configuration",
		},
		"supported_file_types": []string{
			"text", "binary", "image", "document", "archive",
		},
		"limitations": fiber.Map{
			"max_file_size":        "1GB",
			"max_total_size":       "5GB",
			"max_files_per_zip":    DefaultMaxFilesPerZip,
			"concurrent_transfers": DefaultConcurrentTransfers,
		},
	}

	return c.Status(fiber.StatusOK).JSON(schema)
}
