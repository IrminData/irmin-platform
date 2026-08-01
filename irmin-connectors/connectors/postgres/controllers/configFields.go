package postgrescontrollers

import (
	"errors"
	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	postgresconfig "irmin-connectors/connectors/postgres/config"
	"irmin-connectors/utils"
	"maps"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields godoc
// @Summary Get PostgreSQL connector configuration fields
// @Description Get dynamic configuration fields for the PostgreSQL connector based on the configuration key (details or settings). For settings, dynamically fetches available databases from the PostgreSQL server.
// @Tags postgres
// @Security SystemTokenAuth
// @Accept json
// @Accept multipart/form-data
// @Produce json
// @Param key path string true "Configuration key" Enums(details, settings)
// @Param details[host] formData string false "PostgreSQL server hostname (required for settings key to fetch databases)"
// @Param details[port] formData integer false "PostgreSQL server port (required for settings key to fetch databases)"
// @Param details[username] formData string false "Username (required for settings key to fetch databases)"
// @Param details[password] formData string false "Password (required for settings key to fetch databases)"
// @Param details[default_db] formData string false "Default database (required for settings key to fetch databases)"
// @Param details[ssl_mode] formData boolean false "SSL mode enabled (required for settings key to fetch databases)"
// @Param details[channel_binding] formData string false "Channel binding mode for SCRAM authentication (disable, prefer, require)"
// @Success 200 {object} map[string]irminmodels.DynamicField "Configuration fields retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration key or missing connection details"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/configuration/{key}/fields [post]
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	return cs.HandleConfigFields(c, cs)
}

// GetDynamicFields implements the ConfigFieldProvider interface.
func (cs *Controllers) GetDynamicFields(
	c fiber.Ctx,
	key string,
	fields map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	switch key {
	case "details":
		return cs.getDetailsFields(), nil
	case "settings":
		return cs.getSettingsFields(c, fields)
	default:
		return nil, fiber.NewError(fiber.StatusBadRequest, "invalid configuration key")
	}
}

// getDetailsFields returns the connection details configuration fields.
func (cs *Controllers) getDetailsFields() map[string]irminmodels.DynamicField {
	return postgresconfig.GetDetailsFieldDefinitions()
}

// getSettingsFields returns the connection settings configuration fields.
func (cs *Controllers) getSettingsFields(
	c fiber.Ctx,
	fields map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	// Start with base settings field definitions from config
	settingsFields := make(map[string]irminmodels.DynamicField)
	maps.Copy(settingsFields, postgresconfig.GetSettingsFieldDefinitions())

	// Convert form fields to map[string]any for utility function usage
	details := make(map[string]any)

	// Populate details map
	if host := fields["details[host]"]; host != "" {
		details["host"] = host
	}
	if port := fields["details[port]"]; port != "" {
		details["port"] = port
	}
	if username := fields["details[username]"]; username != "" {
		details["username"] = username
	}
	if password := fields["details[password]"]; password != "" {
		details["password"] = password
	}
	if defaultDB := fields["details[default_db]"]; defaultDB != "" {
		details["default_db"] = defaultDB
	}
	if sslMode := fields["details[ssl_mode]"]; sslMode != "" {
		details["ssl_mode"] = sslMode
	}
	if channelBinding := fields["details[channel_binding]"]; channelBinding != "" {
		details["channel_binding"] = channelBinding
	}

	// Extract values using utility functions with defaults
	host := utils.GetStringFromMap(details, "host", "")
	port := utils.GetIntFromMap(details, "port", postgresconfig.DefaultPostgreSQLPort)
	user := utils.GetStringFromMap(details, "username", "")
	password := utils.GetStringFromMap(details, "password", "")
	defaultDB := utils.GetStringFromMap(details, "default_db", "")
	sslModeStr := utils.GetStringFromMap(details, "ssl_mode", "false")
	sslMode := sslModeStr == "true"
	channelBinding := utils.GetStringFromMap(details, "channel_binding", "")

	// Validate channel_binding to prevent DSN injection
	switch channelBinding {
	case "", "disable", "prefer", "require":
		// Valid values
	default:
		channelBinding = "" // Invalid value, reset to default
	}

	// Quick validation
	if host == "" || port <= 0 || user == "" {
		return nil, errors.New("missing required connection details: host, port, user")
	}

	// Create a client WITHOUT specifying a database (so we can fetch them)
	pc, err := postgresclient.NewPostgresClient(c, host, port, user, password, defaultDB, sslMode, channelBinding)
	if err != nil {
		cs.Logger.Error("Error initialising Postgres client",
			"error", err)
		return nil, errors.New("failed to connect to the PostgreSQL server")
	}
	defer pc.Close()

	// Validate the credentials (ping the server)
	if err = pc.ValidateCredentials(c); err != nil {
		cs.Logger.Error("Error validating Postgres credentials",
			"error", err)
		return nil, errors.New("failed to validate PostgreSQL credentials")
	}

	// List all non-template databases
	dbs, err := pc.GetAvailableDatabases(c)
	if err != nil {
		cs.Logger.Error("Error fetching Postgres databases",
			"error", err)
		return nil, errors.New("failed to fetch PostgreSQL databases")
	}

	if len(dbs) == 0 {
		return nil, errors.New("no databases available")
	}

	// Build a list of select options using the common helper
	dbOptions := common.CreateSelectOptions(dbs)

	// Override the database field with dynamic options
	settingsFields["database"] = irminmodels.DynamicField{
		Type:     "select",
		Label:    "Database Name",
		Example:  "my_database",
		Required: true,
		HelpText: "The name of the database you want to connect to.",
		Options:  dbOptions,
	}

	return settingsFields, nil
}
