package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

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
		return api.handleServiceError(
			c,
			"Error getting locals in RepositoryObjectMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the query parameters.
	params, err := utils.ParseQueryParams(c, nil, []string{"ref", "path"})
	if err != nil {
		return api.handleServiceError(
			c,
			"Error parsing query parameters",
			services.NewInternalErrorf("error parsing query parameters: %v", err),
			dict,
		)
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
