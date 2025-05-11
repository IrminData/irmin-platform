package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// UserMiddleware parses the user SQID from the request URL and sets the user in the context.
func UserMiddleware(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the user sqid from the request URL.
	userSqid := c.Params("user")
	if userSqid == "" {
		log.Printf("No user selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Decode the user ID.
	userID, err := utils.DecodeSqids("users", userSqid)
	if err != nil {
		log.Printf("Error decoding user sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find the workspace user by their ID and the workspace ID.
	workspaceUser, err := db.GetWorkspaceUser(workspace.ID, uint(userID))
	if err != nil {
		log.Printf("Error retrieving user: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the workspace user in the context for subsequent handlers.
	c.Locals("workspace_user", workspaceUser)

	return c.Next()
}
