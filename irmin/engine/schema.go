package engine

import (
	"context"
	"fmt"
	"irmin-api/utils"
	"path/filepath"
	"slices"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func generateGroupObjectSchema(
	ctx context.Context,
	c *Client,
	workspace, repository, ref string,
	object irminmodels.Object,
) (*irminmodels.ObjectSchema, error) {
	schema := &irminmodels.ObjectSchema{
		Name: object.Name,
		Path: object.Path,
		Type: object.Type,
	}

	// Define variables to track which restrictions match.
	noStructured := true
	noBinary := true
	noGroups := true
	onlyStructured := true
	onlyBinary := true
	onlyGroups := true
	var allowedContentTypes []string

	// Generate the schema for each child object.
	for _, child := range object.Children {
		// Skip system paths
		if IsSystemPath(child.Name) {
			continue
		}

		// Check if the child's content type is already in the allowed content types.
		if child.ContentType != "" {
			if !slices.Contains(allowedContentTypes, child.ContentType) {
				// Add the content type to the allowed content types if it's not already present.
				allowedContentTypes = append(allowedContentTypes, child.ContentType)
			}
		}
		// Generate the schema for the child object based on its type.
		var childSchema *irminmodels.ObjectSchema
		var err error
		switch child.Type {
		case irminmodels.ObjectTypeGroup:
			// Generate the schema for the child group object.
			childSchema, err = generateGroupObjectSchema(ctx, c, workspace, repository, ref, child)
			if err != nil {
				return nil, fmt.Errorf("failed to generate group schema: %w", err)
			}
			// Update the restrictions based on the child type.
			noGroups = false
			onlyStructured = false
			onlyBinary = false
		case irminmodels.ObjectTypeStructured:
			// Generate the schema for the child structured object.
			childSchema, err = generateStructuredObjectSchema(ctx, c, workspace, repository, ref, child)
			if err != nil {
				c.Logger.WarnContext(ctx, "failed to generate structured schema, treating as binary", "error", err)
				childSchema = generateBinaryObjectSchema(child)
			} else {
				// Update the restrictions based on the child type.
				noStructured = false
				onlyGroups = false
				onlyBinary = false
			}
		case irminmodels.ObjectTypeBinary:
			// Generate the schema for the child binary object.
			childSchema = generateBinaryObjectSchema(child)
			// Update the restrictions based on the child type.
			noBinary = false
			onlyGroups = false
			onlyBinary = false
		default:
			return nil, fmt.Errorf("unsupported object type: %s", child.Type)
		}
		// Add the child schema to the group schema.
		schema.Children = append(schema.Children, *childSchema)
	}

	// Set the restrictions of the group schema based on the collected information.
	schema.Restrictions = &irminmodels.GroupSchemaRestrictions{
		NoStructured:        &noStructured,
		NoBinary:            &noBinary,
		NoGroups:            &noGroups,
		OnlyStructured:      &onlyStructured,
		OnlyBinary:          &onlyBinary,
		OnlyGroups:          &onlyGroups,
		AllowedContentTypes: &allowedContentTypes,
	}

	return schema, nil
}

func generateStructuredObjectSchema(
	ctx context.Context,
	c *Client,
	workspace, repository, ref string,
	object irminmodels.Object,
) (*irminmodels.ObjectSchema, error) {
	size := int(object.SizeBytes)
	schema := &irminmodels.ObjectSchema{
		Name:        object.Name,
		Path:        object.Path,
		Type:        object.Type,
		Size:        &size,
		ContentType: &object.ContentType,
	}

	// Query the object using DuckDB to get the data types.
	duckDBSchema, err := getDuckDBSchema(ctx, c, c.Env, workspace, repository, object.Path, ref)
	if err != nil {
		return nil, fmt.Errorf("failed to get DuckDB schema: %w", err)
	}

	// Create a JSON schema for the structured object.
	jsonSchema := buildJSONSchema(duckDBSchema)
	schema.Schema = &jsonSchema

	return schema, nil
}

func generateBinaryObjectSchema(object irminmodels.Object) *irminmodels.ObjectSchema {
	size := int(object.SizeBytes)
	schema := &irminmodels.ObjectSchema{
		Name:        object.Name,
		Path:        object.Path,
		Type:        object.Type,
		Size:        &size,
		ContentType: &object.ContentType,
	}

	return schema
}

func (c *Client) GenerateObjectSchema(
	ctx context.Context,
	workspace, repository, path, ref string,
) (*irminmodels.ObjectSchema, error) {
	// Check if the requested path is a system path
	if IsSystemPath(path) {
		return nil, fmt.Errorf("access to system path %s is not allowed", path)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// If the ref is not provided, use the default branch.
	if ref == "" {
		repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get repository: %w", err)
		}
		ref = repository.DefaultBranch
	}

	// Fetch the object metadata from the repository.
	irminObject, err := getObject(path, lakeFSRepositoryName, ref, *c.LakeFSClient)
	if err != nil {
		return nil, fmt.Errorf("failed to get object: %w", err)
	}

	// Generate the object schema based on the object type.
	var schema *irminmodels.ObjectSchema
	switch irminObject.Type {
	case irminmodels.ObjectTypeGroup:
		schema, err = generateGroupObjectSchema(ctx, c, workspace, repository, ref, *irminObject)
		if err != nil {
			return nil, fmt.Errorf("failed to generate group schema: %w", err)
		}
	case irminmodels.ObjectTypeStructured:
		// Try to generate structured schema, but fall back to binary if we can't handle the content type
		schema, err = generateStructuredObjectSchema(ctx, c, workspace, repository, ref, *irminObject)
		if err != nil {
			// If we get an error, treat it as binary
			c.Logger.WarnContext(ctx, "failed to generate structured schema, treating as binary", "error", err)
			schema = generateBinaryObjectSchema(*irminObject)
		}
	case irminmodels.ObjectTypeBinary:
		schema = generateBinaryObjectSchema(*irminObject)
	default:
		return nil, fmt.Errorf("unsupported object type: %s", irminObject.Type)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to generate object schema: %w", err)
	}

	return schema, nil
}

// GenerateSchemaFromFile generates a schema for an uploaded file.
// It saves the file temporarily, uses DuckDB to introspect it, and returns the schema.
func (c *Client) GenerateSchemaFromFile(
	ctx context.Context,
	filename string,
	fileData []byte,
) (*irminmodels.ObjectSchema, error) {
	// Determine the object type and content type based on file extension
	objectType := determineObjectTypeFromFilename(filename)
	contentType := getContentTypeFromFilename(filename)

	size := len(fileData)
	schema := &irminmodels.ObjectSchema{
		Name:        filename,
		Path:        filename,
		Type:        objectType,
		Size:        &size,
		ContentType: &contentType,
	}

	// For structured files, generate the schema using DuckDB
	if objectType == irminmodels.ObjectTypeStructured {
		duckDBSchema, err := getDuckDBSchemaFromLocalFile(ctx, c, c.Env, filename, fileData)
		if err != nil {
			c.Logger.WarnContext(ctx, "failed to generate structured schema, treating as binary", "error", err)
			// Fall back to binary schema
			schema.Type = irminmodels.ObjectTypeBinary
			return schema, nil
		}

		// Create a JSON schema for the structured object
		jsonSchema := buildJSONSchema(duckDBSchema)
		schema.Schema = &jsonSchema
	}

	return schema, nil
}

// determineObjectTypeFromFilename determines the object type based on file extension.
func determineObjectTypeFromFilename(filename string) irminmodels.ObjectType {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	//nolint:goconst // This does not need to be a constant
	case ".csv", ".json", ".jsonl", ".ndjson", ".parquet", ".xlsx", ".xls", ".avro", ".orc":
		return irminmodels.ObjectTypeStructured
	default:
		return irminmodels.ObjectTypeBinary
	}
}

// getContentTypeFromFilename returns the MIME type based on file extension.
func getContentTypeFromFilename(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return "text/csv"
	case ".json":
		return "application/json"
	case ".jsonl", ".ndjson":
		return "application/x-ndjson"
	case ".parquet":
		return "application/vnd.apache.parquet"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".xls":
		return "application/vnd.ms-excel"
	case ".avro":
		return "application/avro"
	case ".orc":
		return "application/orc"
	case ".pdf":
		return "application/pdf"
	case ".txt":
		return "text/plain"
	case ".xml":
		return "application/xml"
	case ".zip":
		return "application/zip"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	default:
		return "application/octet-stream"
	}
}

// getDuckDBReadFunction returns the appropriate DuckDB read function for a file.
func getDuckDBReadFunction(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".csv":
		return "read_csv"
	case ".json", ".jsonl", ".ndjson":
		return "read_json"
	case ".parquet":
		return "read_parquet"
	case ".xlsx", ".xls":
		return "st_read"
	case ".avro":
		return "read_avro"
	case ".orc":
		return "read_orc"
	default:
		// Default to read_csv for unknown extensions
		return "read_csv"
	}
}
