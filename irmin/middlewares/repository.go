package middlewares

import (
	"context"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// RepositoryMiddleware parses the repository slug from the request URL and sets the repository in the context.
func (api *APIMiddlewares) RepositoryMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !localeOk || !dictOk || !userOk || !workspaceOk {
		return api.handleServiceError(
			c,
			"Error getting locals in RepositoryMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the repository slug from the request URL.
	repositorySlug := c.Params("repository")

	// Get the repository by its slug and workspace.
	// Use context.Background() instead of Fiber context to ensure timeouts work properly for LakeFS calls
	repository, err := api.Services.GetRepositoryBySlug(context.Background(), locale, user, workspace, repositorySlug)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving repository", err, dict)
	}

	// Set the repository in the context for subsequent handlers.
	c.Locals("repository", repository)

	return c.Next()
}
