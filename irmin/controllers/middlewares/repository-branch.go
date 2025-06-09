package middlewares

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryBranchMiddleware parses the branch name from the request URL and sets the branch in the context.
func (api *APIMiddlewares) RepositoryBranchMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the branch name from the request URL.
	branchName := c.Params("branch")
	if branchName == "" {
		api.Logger.Error("No branch selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the branch from the data engine.
	dataEngineBranch, err := dataEngine.GetBranch(c.Context(), workspace.Slug, repository.Slug, branchName)
	if err != nil {
		api.Logger.Error("Error retrieving branch from Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the branch in the context for subsequent handlers.
	c.Locals("branch", dataEngineBranch)

	return c.Next()
}
