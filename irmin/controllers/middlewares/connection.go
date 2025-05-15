package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectionMiddleware verifies that the user has access to the connection they are trying to access.
func (api *APIMiddlewares) ConnectionMiddleware(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the connection sqid from the request URL.
	connectionSqid := c.Params("connection")
	if connectionSqid == "" {
		log.Printf("No connection selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the connection ID.
	connectionID, err := utils.DecodeSqids("connections", connectionSqid)
	if err != nil {
		log.Printf("Error decoding connection sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the connection by its ID.
	connection, err := api.DB.GetConnectionByID(uint(connectionID))
	if err != nil {
		log.Printf("Error fetching connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the connection belongs to the workspace.
	if connection.WorkspaceID != workspace.ID {
		log.Printf("Connection does not belong to the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the connection in the context for subsequent handlers.
	c.Locals("connection", connection)

	return c.Next()
}
