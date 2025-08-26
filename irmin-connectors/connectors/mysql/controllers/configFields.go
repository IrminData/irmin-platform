package mysqlcontrollers

import (
	"errors"
	"irmin-connectors/connectors/common"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	mysqlconfig "irmin-connectors/connectors/mysql/config"
	"irmin-connectors/utils"
	"maps"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields godoc
// @Summary Get MySQL connector configuration fields
// @Description Get dynamic configuration fields for the MySQL connector based on the configuration key (details or settings). For settings, dynamically fetches available databases from the MySQL server.
// @Tags mysql
// @Security SystemTokenAuth
// @Accept json
// @Accept multipart/form-data
// @Produce json
// @Param key path string true "Configuration key" Enums(details, settings)
// @Param details[host] formData string false "MySQL server hostname (required for settings key to fetch databases)"
// @Param details[port] formData integer false "MySQL server port (required for settings key to fetch databases)"
// @Param details[user] formData string false "Username (required for settings key to fetch databases)"
// @Param details[password] formData string false "Password (required for settings key to fetch databases)"
// @Param details[default_db] formData string false "Default database (required for settings key to fetch databases)"
// @Success 200 {object} map[string]irminmodels.DynamicField "Configuration fields retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration key or missing connection details"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/configuration/{key}/fields [post]
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
	return mysqlconfig.GetDetailsFieldDefinitions()
}

// getSettingsFields returns the connection settings configuration fields.
func (cs *Controllers) getSettingsFields(
	c fiber.Ctx,
	fields map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	// Start with base settings field definitions from config
	settingsFields := make(map[string]irminmodels.DynamicField)
	maps.Copy(settingsFields, mysqlconfig.GetSettingsFieldDefinitions())

	// Convert form fields to map[string]any for utility function usage
	details := make(map[string]any)

	// Populate details map
	if host := fields["details[host]"]; host != "" {
		details["host"] = host
	}
	if port := fields["details[port]"]; port != "" {
		details["port"] = port
	}
	if user := fields["details[user]"]; user != "" {
		details["user"] = user
	}
	if password := fields["details[password]"]; password != "" {
		details["password"] = password
	}
	if defaultDB := fields["details[default_db]"]; defaultDB != "" {
		details["default_db"] = defaultDB
	}

	// Extract values using utility functions with defaults
	host := utils.GetStringFromMap(details, "host", "")
	port := utils.GetIntFromMap(details, "port", mysqlconfig.DefaultMySQLPort)
	user := utils.GetStringFromMap(details, "user", "")
	password := utils.GetStringFromMap(details, "password", "")
	defaultDB := utils.GetStringFromMap(details, "default_db", "")

	// Quick validation
	if host == "" || port <= 0 || user == "" {
		return nil, errors.New("missing required connection details: host, port, user")
	}

	// Use "mysql" as default if defaultDB is empty (since it's optional)
	if defaultDB == "" {
		defaultDB = "mysql"
	}

	// Create a client WITHOUT specifying a database (so we can fetch them)
	mc, err := mysqlclient.NewMySQLClient(c, host, port, user, password, defaultDB)
	if err != nil {
		cs.Logger.Error("Error initialising MySQL client",
			"error", err)
		return nil, errors.New("failed to connect to the MySQL server")
	}
	defer mc.Close()

	// Validate the credentials (ping the server)
	if err = mc.ValidateCredentials(c); err != nil {
		cs.Logger.Error("Error validating MySQL credentials",
			"error", err)
		return nil, errors.New("failed to validate MySQL credentials")
	}

	// List all available databases
	dbs, err := mc.GetAvailableDatabases(c)
	if err != nil {
		cs.Logger.Error("Error fetching MySQL databases",
			"error", err)
		return nil, errors.New("failed to fetch MySQL databases")
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
