package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryObjectMiddleware parses the query parameters and sets the object in the context.
func (api *APIMiddlewares) RepositoryObjectMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
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

	// Get the object from the service
	repositoryObjectDB, detailsFromPath, ref, err := api.Services.GetRepositoryObject(
		c,
		locale,
		user,
		workspace,
		repository,
		params["path"],
		params["ref"],
	)
	if err != nil {
		api.Logger.Error("Error getting repository object", "error", err)
	}

	// Set the object in the context for subsequent handlers.
	c.Locals("object", repositoryObjectDB)
	c.Locals("object_path", detailsFromPath.FullPath)
	c.Locals("object_ref", ref)

	return c.Next()
}
