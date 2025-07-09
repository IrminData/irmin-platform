package mysqlcontrollers

import (
	"context"
	"errors"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields handles the configuration fields endpoint.
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	// Retrieve the required route variables
	fieldsKey := c.Params("key")

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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get dynamic fields based on the key
	dynamicFields, err := cs.getDynamicFields(fieldsKey, fields)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Encode the resulting fields as JSON
	return c.Status(fiber.StatusOK).JSON(dynamicFields)
}

// getDynamicFields returns the appropriate dynamic fields based on the key.
func (cs *Controllers) getDynamicFields(key string, fields map[string]string) (map[string]models.DynamicField, error) {
	switch key {
	case "details":
		return map[string]models.DynamicField{
			"host": {
				Type:     "text",
				Label:    "Host",
				Example:  "localhost",
				Required: true,
				HelpText: "The hostname or IP address of the MySQL server.",
			},
			"port": {
				Type:     "integer",
				Label:    "Port",
				Example:  "3306",
				Required: true,
				HelpText: "The port number on which MySQL is listening.",
				Min:      1,
				Max:      utils.MaxPortNumber,
			},
			"user": {
				Type:     "text",
				Label:    "User",
				Example:  "root",
				Required: true,
				HelpText: "The user name for connecting to the MySQL database.",
			},
			"password": {
				Type:     "password",
				Label:    "Password",
				Required: true,
				HelpText: "The password for the specified MySQL user.",
			},
			"default_db": {
				Type:     "text",
				Label:    "Default Database",
				Example:  "mysql",
				Required: false,
				HelpText: "The default database to connect to (optional).",
			},
		}, nil
	case "settings":
		// Extract the connection details from the form
		host := fields["details[host]"]
		portStr := fields["details[port]"]
		user := fields["details[user]"]
		password := fields["details[password]"]
		defaultDB := fields["details[default_db]"]

		// Quick validation
		if host == "" || portStr == "" || user == "" {
			return nil, errors.New("missing required connection details: host, port, user")
		}

		// Convert port from string
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, errors.New("invalid port number")
		}

		// Use "mysql" as default if defaultDB is empty (since it's optional)
		if defaultDB == "" {
			defaultDB = "mysql"
		}

		// Create a client WITHOUT specifying a database (so we can fetch them)
		ctx := context.Background()
		mc, err := mysqlclient.NewMySQLClient(host, port, user, password, defaultDB)
		if err != nil {
			cs.Logger.Error("Error initialising MySQL client",
				"error", err)
			return nil, errors.New("failed to connect to the MySQL server")
		}
		defer mc.Close()

		// Validate the credentials (ping the server)
		if err = mc.ValidateCredentials(ctx); err != nil {
			cs.Logger.Error("Error validating MySQL credentials",
				"error", err)
			return nil, errors.New("failed to validate MySQL credentials")
		}

		// List all available databases
		dbs, err := mc.GetAvailableDatabases(ctx)
		if err != nil {
			cs.Logger.Error("Error fetching MySQL databases",
				"error", err)
			return nil, errors.New("failed to fetch MySQL databases")
		}

		if len(dbs) == 0 {
			return nil, errors.New("no databases available")
		}

		// Build a list of select options
		dbOptions := make([]models.SelectOption, 0, len(dbs))
		for _, dbName := range dbs {
			dbOptions = append(dbOptions, models.SelectOption{
				Key:   dbName,
				Value: dbName,
			})
		}

		return map[string]models.DynamicField{
			"database": {
				Type:     "select",
				Label:    "Database Name",
				Example:  "my_database",
				Required: true,
				HelpText: "The name of the database you want to connect to.",
				Options:  dbOptions,
			},
		}, nil
	default:
		return nil, errors.New("invalid configuration key")
	}
}
