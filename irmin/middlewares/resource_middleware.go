package middlewares

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// resourceMiddleware is a generic middleware that verifies access to a resource.
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
	if !dictOk || !workspaceOk {
		return api.handleServiceError(
			c,
			fmt.Sprintf("Error getting locals in resourceMiddleware for %s", resourceType),
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the resource sqid from the request URL.
	resourceSqid := c.Params(resourceType)
	if resourceSqid == "" {
		return api.handleServiceError(
			c,
			fmt.Sprintf("No %s selected", resourceType),
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Decode the resource ID.
	resourceID, err := api.SQIDManager.Decode(resourceIDType, resourceSqid)
	if err != nil {
		return api.handleServiceError(
			c,
			fmt.Sprintf("Error decoding %s sqid", resourceIDType),
			services.NewInternalErrorf("error decoding sqid: %v", err),
			dict,
		)
	}

	// Get the resource by its ID.
	resource, err := getResource(uint(resourceID))
	if err != nil {
		return api.handleServiceError(
			c,
			fmt.Sprintf("Error retrieving %s", resourceType),
			err,
			dict,
		)
	}

	// Check if the resource belongs to the workspace.
	switch r := any(resource).(type) {
	case *db.Workflow:
		if r.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	case *db.Connection:
		if r.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	case *db.StoredQuery:
		if r.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	case *db.StoredScript:
		if r.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	case *db.TagWithAssets:
		if r.Tag.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	case *db.AIApplication:
		if r.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	case *db.ConnectionSubscription:
		if r.WorkspaceID != workspace.ID {
			return api.handleServiceError(
				c,
				fmt.Sprintf("%s does not belong to the workspace", resourceType),
				services.ErrAccessDenied,
				dict,
			)
		}
		c.Locals(resourceType, r)
	default:
		return api.handleServiceError(
			c,
			"Unsupported resource type in resourceMiddleware",
			services.NewInternalErrorf("unsupported resource type: %s", resourceType),
			dict,
		)
	}

	return c.Next()
}
