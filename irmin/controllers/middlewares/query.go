package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// QueryMiddleware parses the stored query SQID from the request URL and sets the stored query in the context.
func QueryMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the stored query sqid from the request URL.
	querySqid := c.Params("query")
	if querySqid == "" {
		log.Printf("No query selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the query ID.
	queryID, err := utils.DecodeSqids("queries", querySqid)
	if err != nil {
		log.Printf("Error decoding query sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the stored query by its ID.
	storedQuery, err := db.GetStoredQueryByID(uint(queryID))
	if err != nil {
		log.Printf("Error retrieving stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the stored query belongs to the workspace.
	if storedQuery.WorkspaceID != workspace.ID {
		log.Printf("Stored query does not belong to the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the stored query in the context for subsequent handlers.
	c.Locals("stored_query", storedQuery)

	return c.Next()
}
