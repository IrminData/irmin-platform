package lib

import (
	"irmin-connectors/db"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func ValidateOperationToken(
	d *db.Database,
	logger *slog.Logger,
	c fiber.Ctx,
	connectorName string,
) (bool, *db.ConnectorRegistration, *db.Operation) {
	// Get authentication bearer token from the request headers
	token := c.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registerations by connector name
	registrations, err := d.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		logger.Error("Error fetching connectors from the database",
			"error", err,
			"connector_name", connectorName)
		return false, nil, nil
	}
	if len(registrations) == 0 {
		logger.Warn("No connector registration found",
			"connector_name", connectorName)
		return false, nil, nil
	}
	registration := registrations[0]

	// Fetch operations for the connector registration
	operations, err := d.GetOperationsByConnectorRegistrationID(registration.ID)
	if err != nil {
		logger.Error("Error fetching operations from the database",
			"error", err,
			"registration_id", registration.ID)
		return false, nil, nil
	}

	// Validate the provided token against the active operations
	var validToken = false
	var matchedOperation db.Operation
	for _, operation := range operations {
		if token == operation.Token {
			validToken = true
			matchedOperation = operation
			break
		}
	}
	if !validToken {
		logger.Warn("Invalid token provided",
			"connector_name", connectorName)
		return false, &registration, nil
	}
	return true, &registration, &matchedOperation
}
