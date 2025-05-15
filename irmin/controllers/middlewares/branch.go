package middlewares

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// BranchMiddleware parses the branch name from the request URL and sets the branch in the context.
func (api *APIMiddlewares) BranchMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the branch name from the request URL.
	branchName := c.Params("branch")
	if branchName == "" {
		log.Printf("No branch selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the branch from the data engine.
	dataEngineBranch, err := dataEngine.GetBranch(c.Context(), workspace.Slug, repository.Slug, branchName)
	if err != nil {
		log.Printf("Error retrieving branch from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the branch in the context for subsequent handlers.
	c.Locals("branch", dataEngineBranch)

	return c.Next()
}
