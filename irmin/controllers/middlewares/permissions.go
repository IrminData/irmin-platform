package middlewares

import (
	"errors"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// Here we will have the middlewares that verify whether the user has the permission to perform
// certain actions, based on the workspace policies.

// PermissionCheck is a function type that checks if a user has permission to perform an action.
type PermissionCheck func(c fiber.Ctx, user *db.User, workspace *db.Workspace, resourceID *uint) (bool, error)

// permissionsMiddlewareGetLocalVariables extracts common local variables needed for permission checks.
func (api *APIMiddlewares) permissionsMiddlewareGetLocalVariables(
	c fiber.Ctx,
) (locales.Dictionary, *db.Workspace, *db.User, error) {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		return nil, nil, nil, errors.New("local variables not found")
	}
	return dict, workspace, user, nil
}

// createPermissionMiddleware creates a middleware function that checks permissions for a specific resource and action.
func (api *APIMiddlewares) createPermissionMiddleware(
	resource db.PolicyResource,
	action db.PolicyAction,
	getResourceID func(c fiber.Ctx) *uint,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Get the local variables
		_, workspace, user, err := api.permissionsMiddlewareGetLocalVariables(c)
		if err != nil {
			api.Logger.Error("Error getting local variables", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
		}

		// Get resource ID if needed
		var resourceID *uint
		if getResourceID != nil {
			resourceID = getResourceID(c)
		}

		// Check if the user has the permission using the optimized version
		allowed, err := api.permissionService.IsAllowed(user, workspace, resource, resourceID, action)
		if err != nil {
			api.Logger.Error("Error checking permission", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
		}
		if !allowed {
			api.Logger.Info("User does not have permission",
				"resource", resource,
				"action", action,
				"user_id", user.ID,
				"workspace_id", workspace.ID,
				"resource_id", resourceID)
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{})
		}

		return c.Next()
	}
}

// WorkspacePermissionMiddleware creates a middleware for workspace-level permissions.
func (api *APIMiddlewares) WorkspacePermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceWorkspace,
		action,
		func(c fiber.Ctx) *uint {
			workspace, _ := c.Locals("workspace").(*db.Workspace)
			if workspace != nil {
				return &workspace.ID
			}
			return nil
		},
	)
}

// PolicyPermissionMiddleware creates a middleware for policy-level permissions.
func (api *APIMiddlewares) PolicyPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourcePolicy,
		action,
		nil,
	)
}

// UserPermissionMiddleware creates a middleware for user-level permissions.
func (api *APIMiddlewares) UserPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceUser,
		action,
		func(c fiber.Ctx) *uint {
			userSQID := c.Params("user")
			if userSQID == "" {
				return nil
			}
			userID, err := api.SQIDManager.Decode("users", userSQID)
			if err != nil {
				return nil
			}
			userIDInt := uint(userID)
			return &userIDInt
		},
	)
}

// InvitePermissionMiddleware creates a middleware for invite-level permissions.
func (api *APIMiddlewares) InvitePermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceInvite,
		action,
		nil,
	)
}

// ConnectionPermissionMiddleware creates a middleware for connection-level permissions.
func (api *APIMiddlewares) ConnectionPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceConnection,
		action,
		func(c fiber.Ctx) *uint {
			connection, _ := c.Locals("connection").(*db.Connection)
			if connection != nil {
				return &connection.ID
			}
			return nil
		},
	)
}

// DocumentationPermissionMiddleware creates a middleware for documentation-level permissions.
func (api *APIMiddlewares) DocumentationPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceDocumentation,
		action,
		nil,
	)
}

// QueryPermissionMiddleware creates a middleware for query-level permissions.
func (api *APIMiddlewares) QueryPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceQuery,
		action,
		func(c fiber.Ctx) *uint {
			storedQuery, _ := c.Locals("stored_query").(*db.StoredQuery)
			if storedQuery != nil {
				return &storedQuery.ID
			}
			return nil
		},
	)
}

// WorkflowPermissionMiddleware creates a middleware for workflow-level permissions.
func (api *APIMiddlewares) WorkflowPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceWorkflow,
		action,
		func(c fiber.Ctx) *uint {
			workflow, _ := c.Locals("workflow").(*db.Workflow)
			if workflow != nil {
				return &workflow.ID
			}
			return nil
		},
	)
}

// WorkflowRunPermissionMiddleware creates a middleware for workflow run-level permissions.
func (api *APIMiddlewares) WorkflowRunPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceWorkflowRun,
		action,
		func(c fiber.Ctx) *uint {
			workflow, _ := c.Locals("workflow").(*db.Workflow)
			if workflow != nil {
				return &workflow.ID
			}
			return nil
		},
	)
}

// EditorScriptPermissionMiddleware creates a middleware for editor script-level permissions.
func (api *APIMiddlewares) EditorScriptPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceEditorScript,
		action,
		nil,
	)
}

// RepositoryPermissionMiddleware creates a middleware for repository-level permissions.
func (api *APIMiddlewares) RepositoryPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepository,
		action,
		func(c fiber.Ctx) *uint {
			repository, _ := c.Locals("repository").(*db.Repository)
			if repository != nil {
				return &repository.ID
			}
			return nil
		},
	)
}

// BranchPermissionMiddleware creates a middleware for branch-level permissions.
func (api *APIMiddlewares) BranchPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryBranch,
		action,
		func(c fiber.Ctx) *uint {
			repository, _ := c.Locals("repository").(*db.Repository)
			if repository != nil {
				return &repository.ID
			}
			return nil
		},
	)
}

// TagPermissionMiddleware creates a middleware for tag-level permissions.
func (api *APIMiddlewares) TagPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryTag,
		action,
		func(c fiber.Ctx) *uint {
			repository, _ := c.Locals("repository").(*db.Repository)
			if repository != nil {
				return &repository.ID
			}
			return nil
		},
	)
}

// ObjectPermissionMiddleware creates a middleware for object-level permissions.
func (api *APIMiddlewares) ObjectPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryObject,
		action,
		func(c fiber.Ctx) *uint {
			object, _ := c.Locals("object").(*db.RepositoryObject)
			if object != nil {
				return &object.ID
			}
			return nil
		},
	)
}

// CommitPermissionMiddleware creates a middleware for commit-level permissions.
func (api *APIMiddlewares) CommitPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryCommit,
		action,
		func(c fiber.Ctx) *uint {
			repository, _ := c.Locals("repository").(*db.Repository)
			if repository != nil {
				return &repository.ID
			}
			return nil
		},
	)
}

// AuditLogPermissionMiddleware creates a middleware for audit log permissions.
func (api *APIMiddlewares) AuditLogPermissionMiddleware() fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceAuditLog,
		db.PolicyActionRead,
		nil,
	)
}
