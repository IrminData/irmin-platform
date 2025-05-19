package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// WorkflowMiddleware verifies that the user has access to the workflow they are trying to access.
func (api *APIMiddlewares) WorkflowMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(api, c, "workflow", "workflows", api.DB.GetWorkflowByID)
}
