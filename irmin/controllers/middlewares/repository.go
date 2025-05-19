package middlewares

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryMiddleware parses the repository slug from the request URL and sets the repository in the context.
func (api *APIMiddlewares) RepositoryMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !localeOk || !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the repository slug from the request URL.
	repositorySlug := c.Params("repository")
	if repositorySlug == "" {
		api.Logger.Error("No repository selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the repository by its slug and workspace ID.
	repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
	if err != nil {
		api.Logger.Error("Error retrieving repository", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
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

	// Get the repository from the data engine.
	dataEngineRepository, err := dataEngine.GetRepository(c.Context(), workspace.Slug, repositorySlug)
	if err != nil {
		api.Logger.Error("Error retrieving repository from Data Engine", "error", err)
		dataEngineRepository = &engine.Repository{}
	}

	// Set the repository in the context for subsequent handlers.
	c.Locals("repository", repository)
	c.Locals("data_engine_repository", dataEngineRepository)

	return c.Next()
}
