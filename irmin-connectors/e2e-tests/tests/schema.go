package tests

import (
	"context"

	"irmin-connectors/e2e-tests/helpers"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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
		case irminmodels.ConnectorCapabilityPushPatch:
			// Patch operations typically use the same schema as push
			if !contains(types, "push") {
				types = append(types, "push")
			}
		case irminmodels.ConnectorCapabilityEventWebhook:
			// Event webhook doesn't have a schema endpoint
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
