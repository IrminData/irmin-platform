package middlewares

import (
	"context"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

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
		return api.handleServiceError(
			c,
			"Error getting locals in RepositoryTagMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the tag name from the request URL.
	tagName := c.Params("repository-tag")

	// Get the tag from the service
	// Use context.Background() instead of Fiber context to ensure timeouts work properly for LakeFS calls
	tag, err := api.Services.GetRepositoryTag(context.Background(), locale, user, workspace, repository, tagName)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving tag from Data Engine", err, dict)
	}

	// Set the tag in the context for subsequent handlers.
	c.Locals("repository-tag", tag)

	return c.Next()
}
