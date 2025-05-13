package postgrescontrollers

import (
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemTokenMiddleware validates the system token.
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the system token
	info := config.GetConnectorInfo()
	tokenValid, registration := lib.ValidateConnectorSystemToken(cs.DB, cs.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Set the request-specific data in the context
	c.Locals("connectorInfo", info)
	c.Locals("registration", registration)

	return c.Next()
}

// ValidateOperationTokenMiddleware validates the operation token.
func (cs *Controllers) ValidateOperationTokenMiddleware(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, registration, operation := lib.ValidateOperationToken(cs.DB, cs.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Set the request-specific data in the context
	c.Locals("connectorInfo", info)
	c.Locals("registration", registration)
	c.Locals("operation", operation)

	return c.Next()
}
