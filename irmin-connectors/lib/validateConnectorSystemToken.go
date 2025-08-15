package lib

import (
	"crypto/subtle"
	"irmin-connectors/db"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// ValidateConnectorSystemToken validates the provided token against the system token of the connector registration instance.
func ValidateConnectorSystemToken(
	d *db.Database,
	logger *slog.Logger,
	c fiber.Ctx,
	connectorName string,
) (bool, *db.ConnectorRegistration) {
	// Get authentication bearer token from the request headers
	token := c.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registerations by connector name
	registrations, err := d.GetConnectorRegistrationsByConnectorName(connectorName)
	if err != nil {
		logger.Error("Error fetching connectors from the database",
			"error", err,
			"connector_name", connectorName)
		return false, nil
	}
	if len(registrations) == 0 {
		logger.Warn("No connector registration found",
			"connector_name", connectorName)
		return false, nil
	}

	// Validate the provided token against the registration instance
	var validToken = false
	var validRegistration *db.ConnectorRegistration
	for _, registrationInstance := range registrations {
		// Use constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(token), []byte(registrationInstance.SystemToken)) == 1 {
			validToken = true
			validRegistration = &registrationInstance
		}
	}
	if !validToken {
		logger.Warn("Invalid connector system token provided",
			"connector_name", connectorName)
		return false, nil
	}
	return true, validRegistration
}
