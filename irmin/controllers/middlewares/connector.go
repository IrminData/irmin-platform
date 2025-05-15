package middlewares

import (
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectorMiddleware parses the connector SQID from the request URL and sets the connector in the context.
func (api *APIMiddlewares) ConnectorMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)

	// Parse the connector SQID from the request URL.
	connectorSQID := c.Params("connector")
	if connectorSQID == "" {
		log.Printf("No connector selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the connector SQID
	connectorID, err := utils.DecodeSqids("connectors", connectorSQID)
	if err != nil {
		log.Printf("Error decoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the connector from the database
	connector, err := api.DB.GetConnector(uint(connectorID))
	if err != nil {
		log.Printf("Error retrieving connector: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the connector in the context for subsequent handlers.
	c.Locals("connector", connector)

	return c.Next()
}
