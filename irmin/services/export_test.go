package services

import (
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// This file exports internal functions for testing purposes.
// These exports are only available during testing (file ends with _test.go).

// ExportApplySecretMasking exports applySecretMasking method for testing.
var ExportApplySecretMasking = func(
	api *APIServices,
	connections []*db.Connection,
	schemas map[uint]map[string]irminmodels.DynamicField,
) {
	api.applySecretMasking(connections, schemas)
}

// ExportProcessSecretUpdates exports processSecretUpdates method for testing.
var ExportProcessSecretUpdates = func(
	api *APIServices,
	current map[string]string,
	updates map[string]any,
) map[string]string {
	return api.processSecretUpdates(current, updates)
}
