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

// ObjectMiddleware parses the query parameters and sets the object in the context.
func (api *APIMiddlewares) ObjectMiddleware(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the query parameters.
	params, err := utils.ParseQueryParams(c, nil, []string{"ref", "path"})
	if err != nil {
		log.Printf("Error parsing query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	ref := repository.DefaultBranch
	if params["ref"] != "" {
		ref = params["ref"]
	}
	path := "/"
	if params["path"] != "" {
		path = params["path"]
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the object from the data engine.
	repositoryObject, err := dataEngine.GetPath(workspace.Slug, repository.Slug, path, ref)
	if err != nil {
		log.Printf("Error getting object from data engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{})
	}

	// Set the object in the context for subsequent handlers.
	c.Locals("object", repositoryObject)
	c.Locals("object_ref", ref)

	return c.Next()
}
