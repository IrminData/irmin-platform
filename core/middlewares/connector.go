package middlewares

import (
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// ConnectorMiddleware parses the connector SQID from the request URL and sets the connector in the context.
func (api *APIMiddlewares) ConnectorMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return api.handleServiceError(
			c,
			"Error getting locals in ConnectorMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the connector SQID from the request URL.
	connectorSQID := c.Params("connector")
	if connectorSQID == "" {
		return api.handleServiceError(
			c,
			"No connector selected",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Decode the connector SQID
	connectorID, err := api.SQIDManager.Decode("connectors", connectorSQID)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error decoding SQID",
			services.NewInternalErrorf("error decoding sqid: %v", err),
			dict,
		)
	}

	// Get the connector from the database
	connector, err := api.Services.GetConnector(c, uint(connectorID))
	if err != nil {
		return api.handleServiceError(c, "Error retrieving connector", err, dict)
	}

	// Set the connector in the context for subsequent handlers.
	c.Locals("connector", connector)

	return c.Next()
}
