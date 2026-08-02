package services_test

import (
	"testing"

	"irmin-api/db"
	"irmin-api/services"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
)

func TestApplySecretMasking(t *testing.T) {
	// Arrange
	api := &services.APIServices{}

	connectorID := uint(1)

	connection := &db.Connection{
		ConnectorID: connectorID,
		Details: map[string]string{
			"public_field":  "public_value",
			"secret_field":  "secret_value",
			"unknown_field": "unknown_value", // Not in schema
		},
		Settings: map[string]string{
			"public_setting":  "public_setting_value",
			"unknown_setting": "unknown_setting_value", // Not in schema
		},
	}

	schemas := map[uint]map[string]irminmodels.DynamicField{
		connectorID: {
			"details.public_field":    {Secret: false},
			"details.secret_field":    {Secret: true},
			"settings.public_setting": {Secret: false},
		},
	}

	connections := []*db.Connection{connection}

	// Act
	services.ExportApplySecretMasking(api, connections, schemas)

	// Assert

	// Known public fields should remain visible
	assert.Equal(t, "public_value", connection.Details["public_field"])
	assert.Equal(t, "public_setting_value", connection.Settings["public_setting"])

	// Known secret fields should be masked
	assert.Equal(t, "SECRET", connection.Details["secret_field"])

	// Unknown fields should be masked (fail safe default)
	assert.Equal(t, "SECRET", connection.Details["unknown_field"])
	assert.Equal(t, "SECRET", connection.Settings["unknown_setting"])
}

func TestProcessSecretUpdates_PartialUpdate(t *testing.T) {
	// Arrange
	api := &services.APIServices{}
	current := map[string]string{
		"host":     "localhost",
		"port":     "5432",
		"password": "old_password",
	}

	// User updates only the port.
	// The function should merge updates into the current map rather than replacing it entirely.
	updates := map[string]any{
		"port": "5433",
	}

	// Act
	result := services.ExportProcessSecretUpdates(api, current, updates)

	// Assert
	// We expect "host" and "password" to be preserved
	assert.Equal(t, "5433", result["port"])
	assert.Equal(t, "localhost", result["host"])
	assert.Equal(t, "old_password", result["password"])
}

func TestProcessSecretUpdates_SecretHandling(t *testing.T) {
	// Arrange
	api := &services.APIServices{}
	current := map[string]string{
		"password": "actual_secret_value",
		"host":     "localhost",
	}

	// User sends update with SECRET placeholder for password, and new host
	updates := map[string]any{
		"password": "SECRET",
		"host":     "new_host",
	}

	// Act
	result := services.ExportProcessSecretUpdates(api, current, updates)

	// Assert
	assert.Equal(t, "actual_secret_value", result["password"])
	assert.Equal(t, "new_host", result["host"])
}

func TestProcessSecretUpdates_SecretHandling_NewField(t *testing.T) {
	// Arrange
	api := &services.APIServices{}
	current := map[string]string{
		"host": "localhost",
	}

	// User sends SECRET for a field that doesn't exist in current
	updates := map[string]any{
		"password": "SECRET",
		"host":     "new_host",
	}

	// Act
	result := services.ExportProcessSecretUpdates(api, current, updates)

	// Assert
	assert.Equal(t, "new_host", result["host"])
	_, ok := result["password"]
	assert.False(t, ok)
}
