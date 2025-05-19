package middlewares

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ObjectMiddleware parses the query parameters and sets the object in the context.
func (api *APIMiddlewares) ObjectMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the query parameters.
	params, err := utils.ParseQueryParams(c, nil, []string{"ref", "path"})
	if err != nil {
		api.Logger.Error("Error parsing query parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
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
	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the object from the data engine.
	repositoryObject, err := dataEngine.GetPath(workspace.Slug, repository.Slug, path, ref)
	if err != nil {
		api.Logger.Error("Error getting object from data engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{})
	}

	// Set the object in the context for subsequent handlers.
	c.Locals("object", repositoryObject)
	c.Locals("object_ref", ref)

	return c.Next()
}
