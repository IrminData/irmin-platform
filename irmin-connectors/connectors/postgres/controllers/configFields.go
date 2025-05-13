package postgrescontrollers

import (
	"context"
	"errors"
	postgresclient "irmin-connectors/connectors/postgres/client"
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
			"details[ssl_mode]",
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
				HelpText: "The hostname or IP address of the PostgreSQL server.",
			},
			"port": {
				Type:     "integer",
				Label:    "Port",
				Example:  "5432",
				Required: true,
				HelpText: "The port number on which PostgreSQL is listening.",
				Min:      1,
				Max:      utils.MaxPortNumber,
			},
			"user": {
				Type:     "text",
				Label:    "User",
				Example:  "postgres",
				Required: true,
				HelpText: "The user name for connecting to the PostgreSQL database.",
			},
			"password": {
				Type:     "password",
				Label:    "Password",
				Required: true,
				HelpText: "The password for the specified PostgreSQL user.",
			},
			"default_db": {
				Type:     "text",
				Label:    "Default Database",
				Example:  "postgres",
				Required: false,
				HelpText: "The default database to connect to (optional).",
			},
			"ssl_mode": {
				Type:     "select",
				Label:    "SSL Mode",
				Required: true,
				HelpText: "Enable or disable SSL mode for the connection.",
				Options: []models.SelectOption{
					{Key: "true", Value: "Enabled"},
					{Key: "false", Value: "Disabled"},
				},
			},
		}, nil
	case "settings":
		// Extract the connection details from the form
		host := fields["details[host]"]
		portStr := fields["details[port]"]
		user := fields["details[user]"]
		password := fields["details[password]"]
		defaultDB := fields["details[default_db]"]
		sslMode := fields["details[ssl_mode]"] == "true"

		// Quick validation
		if host == "" || portStr == "" || user == "" {
			return nil, errors.New("missing required connection details: host, port, user")
		}

		// Convert port from string
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return nil, errors.New("invalid port number")
		}

		// Create a client WITHOUT specifying a database (so we can fetch them)
		ctx := context.Background()
		pc, err := postgresclient.NewPostgresClient(host, port, user, password, defaultDB, sslMode)
		if err != nil {
			cs.Logger.Error("Error initialising Postgres client",
				"error", err)
			return nil, errors.New("failed to connect to the PostgreSQL server")
		}
		defer pc.Close()

		// Validate the credentials (ping the server)
		if err = pc.ValidateCredentials(ctx); err != nil {
			cs.Logger.Error("Error validating Postgres credentials",
				"error", err)
			return nil, errors.New("failed to validate PostgreSQL credentials")
		}

		// List all non-template databases
		dbs, err := pc.GetAvailableDatabases(ctx)
		if err != nil {
			cs.Logger.Error("Error fetching Postgres databases",
				"error", err)
			return nil, errors.New("failed to fetch PostgreSQL databases")
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
