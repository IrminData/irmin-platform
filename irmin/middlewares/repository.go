package middlewares

import (
	"context"
	"errors"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryMiddleware parses the repository slug from the request URL and sets the repository in the context.
func (api *APIMiddlewares) RepositoryMiddleware(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !localeOk || !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the repository slug from the request URL.
	repositorySlug := c.Params("repository")

	// Get the repository by its slug and workspace.
	// Use context.Background() instead of Fiber context to ensure timeouts work properly for LakeFS calls
	repository, err := api.Services.GetRepositoryBySlug(context.Background(), locale, user, workspace, repositorySlug)
	if err != nil {
		api.Logger.Error("Error retrieving repository", "error", err)
		if errors.Is(err, services.ErrInvalidRequest) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		if errors.Is(err, services.ErrAccessDenied) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the repository in the context for subsequent handlers.
	c.Locals("repository", repository)

	return c.Next()
}
