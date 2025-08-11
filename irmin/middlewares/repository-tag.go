package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryTagMiddleware parses the tag name from the request URL and sets the tag in the context.
func (api *APIMiddlewares) RepositoryTagMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	user, userOk := c.Locals("user").(*db.User)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the tag name from the request URL.
	tagName := c.Params("repository-tag")

	// Get the tag from the service
	tag, err := api.Services.GetRepositoryTag(c, locale, user, workspace, repository, tagName)
	if err != nil {
		api.Logger.Error("Error retrieving tag from Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the tag in the context for subsequent handlers.
	c.Locals("repository-tag", tag)

	return c.Next()
}
