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

// RepositoryMiddleware parses the repository slug from the request URL and sets the repository in the context.
func (api *APIMiddlewares) RepositoryMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the repository slug from the request URL.
	repositorySlug := c.Params("repository")
	if repositorySlug == "" {
		log.Printf("No repository selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Get the repository by its slug and workspace ID.
	repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
	if err != nil {
		log.Printf("Error retrieving repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the repository from the data engine.
	dataEngineRepository, err := dataEngine.GetRepository(c.Context(), workspace.Slug, repositorySlug)
	if err != nil {
		log.Printf("Error retrieving repository from Data Engine: %v", err)
		dataEngineRepository = &engine.Repository{}
	}

	// Set the repository in the context for subsequent handlers.
	c.Locals("repository", repository)
	c.Locals("data_engine_repository", dataEngineRepository)

	return c.Next()
}
