package middlewares

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// resourceMiddleware is a generic middleware that verifies access to a resource.
//
//nolint:funlen // This is a generic middleware, with different resource types, so it's expected to be long.
func resourceMiddleware[T any](
	api *APIMiddlewares,
	c fiber.Ctx,
	resourceType string,
	resourceIDType string,
	getResource func(uint) (*T, error),
) error {
	// Get the dictionary and workspace from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		api.Logger.Error("Error getting locals in resourceMiddleware",
			"resourceType", resourceType,
			"dictOk", dictOk,
			"workspaceOk", workspaceOk,
			"userOk", userOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the resource sqid from the request URL.
	resourceSqid := c.Params(resourceType)
	if resourceSqid == "" {
		api.Logger.Error("No " + resourceType + " selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Decode the resource ID.
	resourceID, err := api.SQIDManager.Decode(resourceIDType, resourceSqid)
	if err != nil {
		api.Logger.Error("Error decoding "+resourceIDType+" sqid", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the resource by its ID.
	resource, err := getResource(uint(resourceID))
	if err != nil {
		api.Logger.Error("Error retrieving "+resourceType, "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Check if the resource belongs to the workspace.
	switch r := any(resource).(type) {
	case *db.Workflow:
		if r.WorkspaceID != workspace.ID {
			api.Logger.Error(resourceType + " does not belong to the workspace")
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "access_denied")},
			})
		}
		c.Locals(resourceType, r)
	case *db.Connection:
		if r.WorkspaceID != workspace.ID {
			api.Logger.Error(resourceType + " does not belong to the workspace")
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "access_denied")},
			})
		}
		c.Locals(resourceType, r)
	case *db.StoredQuery:
		if r.WorkspaceID != workspace.ID {
			api.Logger.Error(resourceType + " does not belong to the workspace")
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "access_denied")},
			})
		}
		c.Locals(resourceType, r)
	case *db.TagWithAssets:
		if r.Tag.WorkspaceID != workspace.ID {
			api.Logger.Error(resourceType + " does not belong to the workspace")
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "access_denied")},
			})
		}
		c.Locals(resourceType, r)
	case *db.AssistantConversation:
		if r.WorkspaceID != workspace.ID {
			api.Logger.Error(resourceType + " does not belong to the workspace")
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "access_denied")},
			})
		}
		if r.UserID != user.ID {
			api.Logger.Error(resourceType + " does not belong to the user")
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "access_denied")},
			})
		}
		c.Locals(resourceType, r)
	default:
		api.Logger.Error("Unsupported resource type")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return c.Next()
}
