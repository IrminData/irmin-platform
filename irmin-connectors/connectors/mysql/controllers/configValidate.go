package mysqlcontrollers

import (
	"fmt"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	mysqlconfig "irmin-connectors/connectors/mysql/config"
	mysqlmodels "irmin-connectors/connectors/mysql/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate handles the configuration validation endpoint.
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return mysqlconfig.GetRequiredFields(), mysqlconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string

	// Use the model for validation
	_, err := mysqlmodels.NewConnectionDetailsFromMap(details)
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
	connectionDetails, err := mysqlmodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Invalid connection details: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Create MySQL client using model fields
	mc, err := mysqlclient.NewMySQLClient(
		connectionDetails.Host,
		connectionDetails.Port,
		connectionDetails.Username,
		connectionDetails.Password,
		connectionDetails.DefaultDB,
	)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to connect to MySQL server: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}
	defer mc.Close()

	if err = mc.ValidateCredentials(ctx); err != nil {
		errors = append(errors, fmt.Sprintf("Invalid server credentials or unable to connect: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	canConnect = true
	connectionDetailsValid = true

	// Validate database connection if specified
	connectionSettings, settingsErr := mysqlmodels.NewConnectionSettingsFromMap(settings)
	if settingsErr == nil {
		var dbErrors []string
		connectionSettingsValid, dbErrors = cs.validateDatabaseConnection(ctx, mc, connectionSettings.Database)
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
	mc *mysqlclient.MySQLClient,
	database string,
) (bool, []string) {
	var errors []string

	dbClient, err := mc.WithDatabase(database)
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
