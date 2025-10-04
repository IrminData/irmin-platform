package lib

import (
	"crypto/subtle"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// ValidateConnectorSystemToken validates the provided token against the system token of the connector registration instance.
func ValidateConnectorSystemToken(
	d *db.Database,
	env *utils.ConnectorsEnv,
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

	// Validate the provided auth token
	var validToken = false
	var validRegistration *db.ConnectorRegistration

	// If the universal API key is set, check if the request is using it with constant-time comparison
	if env.UniversalConnectorAPIKey != "" {
		if subtle.ConstantTimeCompare([]byte(token), []byte(env.UniversalConnectorAPIKey)) == 1 {
			// We can just use the first registration instance as the valid registration
			validRegistration = &registrations[0]
			// Short-circuit: return immediately if universal key matches
			return true, validRegistration
		}
		// If the token doesn't match the universal API key, procceed to validate the token against the registration instance
	}
	// If the universal API key is not set, proceed to validate the token against the registration instance as normal

	// Validate the provided auth token against the registration instance
	for _, registrationInstance := range registrations {
		// Use constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(token), []byte(registrationInstance.SystemToken)) == 1 {
			validToken = true
			validRegistration = &registrationInstance
		}
	}

	// Authentication failed: If the token is not valid after comparing to the registration instances and the universal API key, return false and nil.
	if !validToken {
		logger.Warn("Invalid connector system token provided",
			"connector_name", connectorName)
		return false, nil
	}

	// Authentication succeeded: If the token used matched the registration token or the universal API key, return true and the registration instance.
	return true, validRegistration
}
