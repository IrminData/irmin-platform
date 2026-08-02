package postgrescontrollers

import (
	"fmt"
	postgresclient "irmin-connectors/connectors/postgres/client"
	postgresconfig "irmin-connectors/connectors/postgres/config"
	postgresmodels "irmin-connectors/connectors/postgres/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate godoc
// @Summary Validate PostgreSQL connector configuration
// @Description Validate PostgreSQL connection details and settings by testing the actual connection to the PostgreSQL server and specified database
// @Tags postgres
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[host] formData string true "PostgreSQL server hostname or IP address"
// @Param details[port] formData integer false "PostgreSQL server port (default: 5432)"
// @Param details[username] formData string true "Username for PostgreSQL authentication"
// @Param details[password] formData string true "Password for PostgreSQL authentication"
// @Param details[default_db] formData string false "Default database for initial connection"
// @Param details[ssl_mode] formData boolean false "Enable SSL mode for secure connections"
// @Param details[channel_binding] formData string false "Channel binding mode for SCRAM authentication (disable, prefer, require)"
// @Param settings[database] formData string false "Target database name to validate connection (optional for details-only validation)"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Configuration validation result"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
// For validation, only required details fields are strictly required upfront.
// Settings fields are optional - TestConnection will validate them if provided.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	// Only require the mandatory details fields for validation
	// This allows validating connection credentials before selecting a database
	requiredDetails := postgresconfig.GetRequiredDetailsFields()

	// All other fields (optional details + optional settings + required settings) are optional for validation
	// Note: GetOptionalFields() already includes optional settings, so only add required settings
	optionalFields := postgresconfig.GetOptionalFields()
	optionalFields = append(optionalFields, postgresconfig.GetRequiredSettingsFields()...)

	return requiredDetails, optionalFields
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
		connectionDetails.ChannelBinding,
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
