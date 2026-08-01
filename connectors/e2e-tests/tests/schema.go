package tests

import (
	"context"

	"irmin-connectors/e2e-tests/helpers"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// TestSchema tests the schema retrieval for all supported operation types.
func TestSchema(
	ctx context.Context,
	client *helpers.ConnectorClient,
	capabilities []irminmodels.ConnectorCapability,
) error {
	// Test schema for each capability that supports it
	operationTypes := capabilitiesToOperationTypes(capabilities)

	if len(operationTypes) == 0 {
		return &helpers.TestError{Message: "No operation types to test schema for"}
	}

	for _, opType := range operationTypes {
		schema, schemaErr := client.GetSchema(ctx, opType, "")
		if schemaErr != nil {
			return schemaErr
		}

		if validateErr := helpers.AssertValidObjectSchema(schema); validateErr != nil {
			return validateErr
		}
	}

	return nil
}

// capabilitiesToOperationTypes converts connector capabilities to operation type strings.
func capabilitiesToOperationTypes(capabilities []irminmodels.ConnectorCapability) []string {
	types := make([]string, 0)

	for _, cap := range capabilities {
		switch cap {
		case irminmodels.ConnectorCapabilityPull:
			types = append(types, "pull")
		case irminmodels.ConnectorCapabilityPush:
			types = append(types, "push")
		case irminmodels.ConnectorCapabilityApplyPatch:
			// Patch operations typically use the same schema as push
			if !contains(types, "push") {
				types = append(types, "push")
			}
		case irminmodels.ConnectorCapabilityPatchEvent:
			// Patch event doesn't have a schema endpoint
			continue
		}
	}

	return types
}

// contains checks if a slice contains a string.
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// TestSchemaWithPath tests schema retrieval for a specific path.
func TestSchemaWithPath(
	ctx context.Context,
	client *helpers.ConnectorClient,
	method string,
	path string,
) error {
	schema, err := client.GetSchema(ctx, method, path)
	if err != nil {
		return err
	}

	if validateErr := helpers.AssertValidObjectSchema(schema); validateErr != nil {
		return validateErr
	}

	return nil
}

// TestSchemaForPull tests pull schema retrieval with optional path.
func TestSchemaForPull(ctx context.Context, client *helpers.ConnectorClient, path string) error {
	return TestSchemaWithPath(ctx, client, "pull", path)
}

// TestSchemaForPush tests push schema retrieval with optional path.
func TestSchemaForPush(ctx context.Context, client *helpers.ConnectorClient, path string) error {
	return TestSchemaWithPath(ctx, client, "push", path)
}

// TestSchemaEmptyPath tests schema retrieval with an empty path (root).
func TestSchemaEmptyPath(
	ctx context.Context,
	client *helpers.ConnectorClient,
	capabilities []irminmodels.ConnectorCapability,
) error {
	operationTypes := capabilitiesToOperationTypes(capabilities)
	if len(operationTypes) == 0 {
		return &helpers.TestError{Message: "No operation types to test schema for"}
	}

	// Test schema for first available operation type with empty path
	schema, err := client.GetSchema(ctx, operationTypes[0], "")
	if err != nil {
		return err
	}

	return helpers.AssertValidObjectSchema(schema)
}

// TestSchemaSpecificPath tests schema retrieval with a specific path.
func TestSchemaSpecificPath(
	ctx context.Context,
	client *helpers.ConnectorClient,
	capabilities []irminmodels.ConnectorCapability,
	specificPath string,
) error {
	if specificPath == "" {
		return &helpers.TestError{Message: "Specific path cannot be empty for this test"}
	}

	operationTypes := capabilitiesToOperationTypes(capabilities)
	if len(operationTypes) == 0 {
		return &helpers.TestError{Message: "No operation types to test schema for"}
	}

	// Test schema for first available operation type with specific path
	schema, err := client.GetSchema(ctx, operationTypes[0], specificPath)
	if err != nil {
		return err
	}

	return helpers.AssertValidObjectSchema(schema)
}
