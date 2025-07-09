package mysqlcontrollers

import (
	"context"
	"fmt"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate handles the configuration validation endpoint.
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	// Prepare a context for database ops, plus a slice to store errors.
	ctx := c.Context()
	var errors []string

	// Default states
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Get connection settings and details from the request
	fields, err := utils.ParseFormFields(
		c,
		nil,
		[]string{
			"details[host]",
			"details[port]",
			"details[user]",
			"details[password]",
			"details[default_db]",
			"settings[database]",
		},
	)
	if err != nil {
		errors = append(errors, err.Error())
	}

	host := fields["details[host]"]
	portStr := fields["details[port]"]
	user := fields["details[user]"]
	password := fields["details[password]"]
	defaultDB := fields["details[default_db]"]
	database := fields["settings[database]"]

	// Validate connection details
	errors = append(errors, validateConnectionDetails(host, portStr, user)...)

	// If no blocking errors so far, try to connect to the server
	if len(errors) == 0 {
		var port int
		port, err = strconv.Atoi(portStr)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Invalid port number: %v", err))
		} else {
			var connErrors []string
			canConnect, connectionDetailsValid, connectionSettingsValid, connErrors = validateServerConnection(
				ctx, host, port, user, password, defaultDB, database,
			)
			errors = append(errors, connErrors...)
		}
	}

	// Final "ok" means no errors were accumulated
	ok := (len(errors) == 0) && canConnect && connectionDetailsValid && connectionSettingsValid

	// Build and send the final response
	response := models.ValidationResponse{
		Ok:                      ok,
		CanConnect:              canConnect,
		ConnectionDetailsValid:  connectionDetailsValid,
		ConnectionSettingsValid: connectionSettingsValid,
		Errors:                  errors,
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

func validateConnectionDetails(host, portStr, user string) []string {
	var errors []string
	if host == "" || portStr == "" || user == "" {
		errors = append(errors, "Missing required connection details: host, port, or user.")
	}
	return errors
}

func validateDatabaseConnection(
	ctx context.Context,
	mc *mysqlclient.MySQLClient,
	database string,
) (bool, []string) {
	var errors []string
	if database == "" {
		return false, errors
	}

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

func validateServerConnection(
	ctx context.Context,
	host string,
	port int,
	user string,
	password string,
	defaultDB string,
	database string,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

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
	var dbErrors []string
	connectionSettingsValid, dbErrors = validateDatabaseConnection(ctx, mc, database)
	errors = append(errors, dbErrors...)

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}
