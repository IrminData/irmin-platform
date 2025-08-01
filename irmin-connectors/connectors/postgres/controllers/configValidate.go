package postgrescontrollers

import (
	"fmt"
	postgresclient "irmin-connectors/connectors/postgres/client"
	postgresconfig "irmin-connectors/connectors/postgres/config"
	postgresmodels "irmin-connectors/connectors/postgres/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate handles the configuration validation endpoint.
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return postgresconfig.GetRequiredFields(), postgresconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string

	// Use the model for validation
	_, err := postgresmodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, err.Error())
	}

	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
func (cs *Controllers) TestConnection(
	ctx fiber.Ctx,
	details map[string]any,
	settings map[string]any,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Parse connection details using model
	connectionDetails, err := postgresmodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Invalid connection details: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Create PostgreSQL client using model fields
	pc, err := postgresclient.NewPostgresClient(
		ctx,
		connectionDetails.Host,
		connectionDetails.Port,
		connectionDetails.Username,
		connectionDetails.Password,
		connectionDetails.DefaultDB,
		connectionDetails.SSLMode,
	)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to connect to PostgreSQL server: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}
	defer pc.Close()

	if err = pc.ValidateCredentials(ctx); err != nil {
		errors = append(errors, fmt.Sprintf("Invalid server credentials or unable to connect: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	canConnect = true
	connectionDetailsValid = true

	// Validate database connection if specified
	connectionSettings, settingsErr := postgresmodels.NewConnectionSettingsFromMap(settings)
	if settingsErr == nil {
		var dbErrors []string
		connectionSettingsValid, dbErrors = cs.validateDatabaseConnection(ctx, pc, connectionSettings.Database)
		errors = append(errors, dbErrors...)
	} else {
		// Connection settings are invalid (e.g., missing required database field)
		errors = append(errors, fmt.Sprintf("Invalid connection settings: %v", settingsErr))
		connectionSettingsValid = false
	}

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}

// validateDatabaseConnection is a helper method for testing database-specific connections.
func (cs *Controllers) validateDatabaseConnection(
	ctx fiber.Ctx,
	pc *postgresclient.PostgresClient,
	database string,
) (bool, []string) {
	var errors []string

	dbClient, err := pc.WithDatabase(ctx, database)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Error connecting to database '%s': %v", database, err))
		return false, errors
	}
	defer dbClient.Close()

	if err = dbClient.ValidateCredentials(ctx); err != nil {
		errors = append(errors, fmt.Sprintf("Unable to validate credentials for database '%s': %v", database, err))
		return false, errors
	}
	return true, errors
}
