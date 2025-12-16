package middlewares

import (
	"context"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// RepositoryBranchMiddleware parses the branch name from the request URL and sets the branch in the context.
func (api *APIMiddlewares) RepositoryBranchMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	user, userOk := c.Locals("user").(*db.User)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk || !userOk {
		return api.handleServiceError(
			c,
			"Error getting locals in RepositoryBranchMiddleware",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the branch name from the request URL.
	branchName := c.Params("branch")
	if branchName == "" {
		return api.handleServiceError(
			c,
			"No branch selected",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Get the branch
	// Use context.Background() instead of Fiber context to ensure timeouts work properly for LakeFS calls
	branch, err := api.Services.GetRepositoryBranch(
		context.Background(),
		locale,
		user,
		workspace,
		repository,
		branchName,
	)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving branch", err, dict)
	}

	// Set the branch in the context for subsequent handlers.
	c.Locals("branch", branch)

	return c.Next()
}
