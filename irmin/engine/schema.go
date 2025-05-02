package engine

import (
	"fmt"
	"irmin-api/utils"
	"slices"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func generateGroupObjectSchema(c *Client, workspace, repository, ref string, object irminModels.Object) (*irminModels.ObjectSchema, error) {
	schema := &irminModels.ObjectSchema{
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
		// Check if the child's content type is already in the allowed content types.
		if child.ContentType != "" {
			if !slices.Contains(allowedContentTypes, child.ContentType) {
				// Add the content type to the allowed content types if it's not already present.
				allowedContentTypes = append(allowedContentTypes, child.ContentType)
			}
		}
		// Generate the schema for the child object based on its type.
		var childSchema *irminModels.ObjectSchema
		var err error
		switch child.Type {
		case irminModels.ObjectTypeGroup:
			// Update the restrictions based on the child type.
			noGroups = false
			onlyStructured = false
			onlyBinary = false
			// Generate the schema for the child group object.
			childSchema, err = generateGroupObjectSchema(c, workspace, repository, ref, child)
		case irminModels.ObjectTypeStructured:
			// Update the restrictions based on the child type.
			noStructured = false
			onlyGroups = false
			onlyBinary = false
			// Generate the schema for the child structured object.
			childSchema, err = generateStructuredObjectSchema(c, workspace, repository, ref, child)
		case irminModels.ObjectTypeBinary:
			// Update the restrictions based on the child type.
			noBinary = false
			onlyGroups = false
			onlyBinary = false
			// Generate the schema for the child binary object.
			childSchema, err = generateBinaryObjectSchema(child)
		default:
			return nil, fmt.Errorf("unsupported object type: %s", child.Type)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to generate object schema: %w", err)
		}
		// Add the child schema to the group schema.
		schema.Children = append(schema.Children, *childSchema)
	}

	// Set the restrictions of the group schema based on the collected information.
	schema.Restrictions = &irminModels.GroupSchemaRestrictions{
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

func generateStructuredObjectSchema(c *Client, workspace, repository, ref string, object irminModels.Object) (*irminModels.ObjectSchema, error) {
	size := int(object.SizeBytes)
	schema := &irminModels.ObjectSchema{
		Name:        object.Name,
		Path:        object.Path,
		Type:        object.Type,
		Size:        &size,
		ContentType: &object.ContentType,
	}

	// Query the object using DuckDB to get the data types.
	duckDBSchema, err := getDuckDBSchema(c, workspace, repository, object.Path, ref)
	if err != nil {
		return nil, fmt.Errorf("failed to get DuckDB schema: %w", err)
	}

	// Create a JSON schema for the structured object.
	jsonSchema := buildJSONSchema(duckDBSchema)
	schema.Schema = &jsonSchema

	return schema, nil
}

func generateBinaryObjectSchema(object irminModels.Object) (*irminModels.ObjectSchema, error) {
	size := int(object.SizeBytes)
	schema := &irminModels.ObjectSchema{
		Name:        object.Name,
		Path:        object.Path,
		Type:        object.Type,
		Size:        &size,
		ContentType: &object.ContentType,
	}

	return schema, nil
}

func (c *Client) GenerateObjectSchema(workspace, repository, path, ref string) (*irminModels.ObjectSchema, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

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
	var schema *irminModels.ObjectSchema
	switch irminObject.Type {
	case irminModels.ObjectTypeGroup:
		schema, err = generateGroupObjectSchema(c, workspace, repository, ref, *irminObject)
	case irminModels.ObjectTypeStructured:
		schema, err = generateStructuredObjectSchema(c, workspace, repository, ref, *irminObject)
	case irminModels.ObjectTypeBinary:
		schema, err = generateBinaryObjectSchema(*irminObject)
	default:
		return nil, fmt.Errorf("unsupported object type: %s", irminObject.Type)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to generate object schema: %w", err)
	}

	return schema, nil
}
