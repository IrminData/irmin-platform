package mysqlcontrollers

import (
	"fmt"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	mysqlconfig "irmin-connectors/connectors/mysql/config"
	"irmin-connectors/utils"

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

	// Extract values using utility functions with defaults
	host := utils.GetStringFromMap(details, "host", "")
	port := utils.GetIntFromMap(details, "port", mysqlconfig.DefaultMySQLPort)
	user := utils.GetStringFromMap(details, "user", "")

	// Validate connection details
	if host == "" || port <= 0 || user == "" {
		errors = append(errors, "Missing required connection details: host, port, or user.")
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

	// Extract values using utility functions with defaults
	host := utils.GetStringFromMap(details, "host", "")
	port := utils.GetIntFromMap(details, "port", mysqlconfig.DefaultMySQLPort)
	user := utils.GetStringFromMap(details, "user", "")
	password := utils.GetStringFromMap(details, "password", "")
	defaultDB := utils.GetStringFromMap(details, "default_db", "")
	database := utils.GetStringFromMap(settings, "database", "")

	mc, err := mysqlclient.NewMySQLClient(host, port, user, password, defaultDB)
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
	if database != "" {
		var dbErrors []string
		connectionSettingsValid, dbErrors = cs.validateDatabaseConnection(ctx, mc, database)
		errors = append(errors, dbErrors...)
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
