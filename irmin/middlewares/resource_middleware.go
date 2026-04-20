package middlewares

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
)

// resourceWorkspaceID extracts the workspace ID from a resource for ownership verification.
// Returns the workspace ID and true if the resource type is supported, or 0 and false otherwise.
func resourceWorkspaceID(resource any) (uint, bool) {
	switch r := resource.(type) {
	case *db.Workflow:
		return r.WorkspaceID, true
	case *db.Connection:
		return r.WorkspaceID, true
	case *db.StoredQuery:
		return r.WorkspaceID, true
	case *db.StoredScript:
		return r.WorkspaceID, true
	case *db.TagWithAssets:
		return r.Tag.WorkspaceID, true
	case *db.AIApplication:
		return r.WorkspaceID, true
	case *db.ConnectionSubscription:
		return r.WorkspaceID, true
	default:
		return 0, false
	}
}

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

	// Decode the resource ID. A malformed or non-SQID value (e.g., a
	// frontend-generated placeholder like `temp-connections-...` sent
	// before the real record exists) is a client-side shape problem,
	// not a server bug — map it to 404 (resource not found) instead
	// of 500. The previous behavior treated every decode failure as
	// an internal error, flooded Sentry with stack traces, and
	// surfaced a scary 500 to the console when the right answer is
	// "that resource doesn't exist".
	resourceID, err := api.SQIDManager.Decode(resourceIDType, resourceSqid)
	if err != nil {
		return api.handleServiceError(
			c,
			fmt.Sprintf("Invalid %s id %q: %v", resourceIDType, resourceSqid, err),
			fmt.Errorf("invalid %s id %q: %w",
				resourceIDType, resourceSqid, services.ErrNotFound,
			),
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
	wsID, supported := resourceWorkspaceID(any(resource))
	if !supported {
		return api.handleServiceError(
			c,
			"Unsupported resource type in resourceMiddleware",
			services.NewInternalErrorf("unsupported resource type: %s", resourceType),
			dict,
		)
	}

	if wsID != workspace.ID {
		return api.handleServiceError(
			c,
			fmt.Sprintf("%s does not belong to the workspace", resourceType),
			services.ErrAccessDenied,
			dict,
		)
	}

	c.Locals(resourceType, resource)

	return c.Next()
}
