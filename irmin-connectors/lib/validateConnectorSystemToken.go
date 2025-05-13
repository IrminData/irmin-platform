package lib

import (
	"irmin-connectors/db"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// ValidateConnectorSystemToken validates the provided token against the system token of the connector registration instance.
func ValidateConnectorSystemToken(
	db *db.Database,
	logger *slog.Logger,
	c fiber.Ctx,
	connectorName string,
) bool {
	// Get authentication bearer token from the request headers
	token := c.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registerations by connector name
	registrations, err := db.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		logger.Error("Error fetching connectors from the database",
			"error", err,
			"connector_name", connectorName)
		return false
	}
	if len(registrations) == 0 {
		logger.Warn("No connector registration found",
			"connector_name", connectorName)
		return false
	}

	// Validate the provided token against the registration instance
	var validToken = false
	for _, registrationInstance := range registrations {
		if token == registrationInstance.SystemToken {
			validToken = true
		}
	}
	if !validToken {
		logger.Warn("Invalid token provided",
			"connector_name", connectorName)
		return false
	}
	return true
}
