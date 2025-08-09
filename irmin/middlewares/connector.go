package middlewares

import (
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectorMiddleware parses the connector SQID from the request URL and sets the connector in the context.
func (api *APIMiddlewares) ConnectorMiddleware(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the connector SQID from the request URL.
	connectorSQID := c.Params("connector")
	if connectorSQID == "" {
		api.Logger.Error("No connector selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Decode the connector SQID
	connectorID, err := api.SQIDManager.Decode("connectors", connectorSQID)
	if err != nil {
		api.Logger.Error("Error decoding SQID", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the connector from the database
	connector, err := api.DB.GetConnector(uint(connectorID))
	if err != nil {
		api.Logger.Error("Error retrieving connector", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the connector in the context for subsequent handlers.
	c.Locals("connector", connector)

	return c.Next()
}
