package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// WorkspaceMiddleware verifies that the user has access to the workspace they are trying to access.
func WorkspaceMiddleware(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Check if the user is a member of the workspace.
	isMember, err := db.IsUserInWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error checking user membership: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	if !isMember {
		log.Printf("User not a member of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Set the workspace in the context for subsequent handlers.
	c.Locals("workspace", workspace)

	return c.Next()
}
