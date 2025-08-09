package middlewares

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// RepositoryObjectMiddleware parses the query parameters and sets the object in the context.
func (api *APIMiddlewares) RepositoryObjectMiddleware(c fiber.Ctx) error {
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
	path := ""
	if params["path"] != "" {
		path = params["path"]
	}

	// Get the requested object.
	repositoryObjectDB, err := lib.GetObject(
		c,
		locale,
		api.DB,
		api.Logger,
		api.Env,
		workspace,
		repository,
		path,
		ref,
		false,
	)
	if err != nil {
		api.Logger.Warn("Failed to get repository object", "error", err)
	}

	// Parse object details from the path
	detailsFromPath := irminutils.ParseObjectDetailsFromPath(path)

	// Set the object in the context for subsequent handlers.
	c.Locals("object", repositoryObjectDB)
	c.Locals("object_path", detailsFromPath.FullPath)
	c.Locals("object_ref", ref)

	return c.Next()
}
