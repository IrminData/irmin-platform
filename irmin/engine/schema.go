package engine

import (
	"fmt"
	"irmin-api/utils"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func generateGroupObjectSchema(
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
			// Update the restrictions based on the child type.
			noGroups = false
			onlyStructured = false
			onlyBinary = false
			// Generate the schema for the child group object.
			childSchema, err = generateGroupObjectSchema(c, workspace, repository, ref, child)
		case irminmodels.ObjectTypeStructured:
			// Update the restrictions based on the child type.
			noStructured = false
			onlyGroups = false
			onlyBinary = false
			// Generate the schema for the child structured object.
			childSchema, err = generateStructuredObjectSchema(c, workspace, repository, ref, child)
		case irminmodels.ObjectTypeBinary:
			// Update the restrictions based on the child type.
			noBinary = false
			onlyGroups = false
			onlyBinary = false
			// Generate the schema for the child binary object.
			childSchema = generateBinaryObjectSchema(child)
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
	duckDBSchema, err := getDuckDBSchema(c, c.Env, workspace, repository, object.Path, ref)
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

func (c *Client) GenerateObjectSchema(workspace, repository, path, ref string) (*irminmodels.ObjectSchema, error) {
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
	var schema *irminmodels.ObjectSchema
	switch irminObject.Type {
	case irminmodels.ObjectTypeGroup:
		schema, err = generateGroupObjectSchema(c, workspace, repository, ref, *irminObject)
	case irminmodels.ObjectTypeStructured:
		schema, err = generateStructuredObjectSchema(c, workspace, repository, ref, *irminObject)
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
