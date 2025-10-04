package common

import (
	"irmin-connectors/lib"
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemToken validates the system token for connector endpoints.
// It automatically gets connector info and sets context locals.
func ValidateSystemToken(
	c fiber.Ctx,
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) error {
	// Get connector info
	info := getConnectorInfo()

	// Validate the system token
	tokenValid, registration := lib.ValidateConnectorSystemToken(app.DB, app.Env, app.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Set the request-specific data in the context
	c.Locals("connectorInfo", &info)
	c.Locals("registration", registration)

	return c.Next()
}

// ValidateOperationToken validates the operation token for connector data operations.
// It automatically gets connector info and sets context locals.
func ValidateOperationToken(
	c fiber.Ctx,
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) error {
	// Get connector info
	info := getConnectorInfo()

	// Validate the operation token
	tokenValid, registration, operation := lib.ValidateOperationToken(app.DB, app.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Set the request-specific data in the context
	c.Locals("connectorInfo", &info)
	c.Locals("registration", registration)
	c.Locals("operation", operation)

	return c.Next()
}

// CreateSystemTokenMiddleware creates a system token validation middleware for a specific connector.
func CreateSystemTokenMiddleware(
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		return ValidateSystemToken(c, app, getConnectorInfo)
	}
}

// CreateOperationTokenMiddleware creates an operation token validation middleware for a specific connector.
func CreateOperationTokenMiddleware(
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		return ValidateOperationToken(c, app, getConnectorInfo)
	}
}
