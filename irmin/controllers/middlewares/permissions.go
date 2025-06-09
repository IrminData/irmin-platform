package middlewares

import (
	"errors"
	"fmt"
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
		dict, workspace, user, err := api.permissionsMiddlewareGetLocalVariables(c)
		if err != nil {
			api.Logger.Error("Error getting local variables", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
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
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		if !allowed {
			api.Logger.Info("User does not have permission",
				"resource", resource,
				"action", action,
				"user_id", user.ID,
				"workspace_id", workspace.ID,
				"resource_id", resourceID)
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "insufficient_permissions")},
			})
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
				api.Logger.Warn("Error getting user SQID", "userSQID", userSQID)
				return nil
			}
			userID, decodeErr := api.SQIDManager.Decode("users", userSQID)
			if decodeErr != nil {
				api.Logger.Warn("Error decoding user SQID", "decodeErr", decodeErr)
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
			connection, connectionOk := c.Locals("connection").(*db.Connection)
			if connectionOk {
				return &connection.ID
			}
			api.Logger.Warn("Error getting connection", "connectionOk", connectionOk)
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
			storedQuery, storedQueryOk := c.Locals("stored_query").(*db.StoredQuery)
			if storedQueryOk {
				return &storedQuery.ID
			}
			api.Logger.Warn("Error getting stored query", "storedQueryOk", storedQueryOk)
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
			workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
			if workflowOk {
				return &workflow.ID
			}
			api.Logger.Warn("Error getting workflow", "workflowOk", workflowOk)
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
			api.Logger.Warn("Error getting workflow", "workflow", nil)
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
			api.Logger.Warn("Error getting repository", "repository", nil)
			return nil
		},
	)
}

// RepositoryBranchPermissionMiddleware creates a middleware for branch-level permissions.
func (api *APIMiddlewares) RepositoryBranchPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryBranch,
		action,
		func(c fiber.Ctx) *uint {
			repository, repositoryOk := c.Locals("repository").(*db.Repository)
			if repositoryOk {
				return &repository.ID
			}
			api.Logger.Warn("Error getting repository", "repositoryOk", repositoryOk)
			return nil
		},
	)
}

// RepositoryTagPermissionMiddleware creates a middleware for tag-level permissions.
func (api *APIMiddlewares) RepositoryTagPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryTag,
		action,
		func(c fiber.Ctx) *uint {
			repository, repositoryOk := c.Locals("repository").(*db.Repository)
			if repositoryOk {
				return &repository.ID
			}
			api.Logger.Warn("Error getting repository", "repositoryOk", repositoryOk)
			return nil
		},
	)
}

// RepositoryObjectPermissionMiddleware creates a middleware for object-level permissions.
func (api *APIMiddlewares) RepositoryObjectPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryObject,
		action,
		func(c fiber.Ctx) *uint {
			object, _ := c.Locals("object").(*db.RepositoryObject)
			if object != nil {
				return &object.ID
			}
			api.Logger.Warn("Error getting repository object", "object", nil)
			return nil
		},
	)
}

// RepositoryCommitPermissionMiddleware creates a middleware for commit-level permissions.
func (api *APIMiddlewares) RepositoryCommitPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceRepositoryCommit,
		action,
		func(c fiber.Ctx) *uint {
			repository, repositoryOk := c.Locals("repository").(*db.Repository)
			if repositoryOk {
				return &repository.ID
			}
			api.Logger.Warn("Error getting repository", "repositoryOk", repositoryOk)
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

// WorkspaceTagPermissionMiddleware creates a middleware for workspace tag-level permissions.
func (api *APIMiddlewares) WorkspaceTagPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceWorkspaceTag,
		action,
		func(c fiber.Ctx) *uint {
			tagWithAssets, tagWithAssetsOk := c.Locals("tag").(*db.TagWithAssets)
			if !tagWithAssetsOk {
				// For create operations, there's no tag in context yet, so return nil
				// This will check workspace-level permissions instead of specific tag permissions
				api.Logger.Warn("Error getting tag", "tagWithAssetsOk", tagWithAssetsOk)
				return nil
			}
			return &tagWithAssets.Tag.ID
		},
	)
}

// getEntityResourceInfo maps entity type and ID to policy resource and decoded ID.
func (api *APIMiddlewares) getEntityResourceInfo(
	entityType, entityIDStr string,
) (db.PolicyResource, *uint, error) {
	switch entityType {
	case "repositories":
		repoID, err := api.SQIDManager.Decode("repositories", entityIDStr)
		if err != nil {
			return "", nil, fmt.Errorf("invalid repository ID: %w", err)
		}
		repoIDUint := uint(repoID)
		return db.PolicyResourceRepository, &repoIDUint, nil

	case "workflows":
		workflowID, err := api.SQIDManager.Decode("workflows", entityIDStr)
		if err != nil {
			return "", nil, fmt.Errorf("invalid workflow ID: %w", err)
		}
		workflowIDUint := uint(workflowID)
		return db.PolicyResourceWorkflow, &workflowIDUint, nil

	case "connections":
		connectionID, err := api.SQIDManager.Decode("connections", entityIDStr)
		if err != nil {
			return "", nil, fmt.Errorf("invalid connection ID: %w", err)
		}
		connectionIDUint := uint(connectionID)
		return db.PolicyResourceConnection, &connectionIDUint, nil

	case "queries":
		queryID, err := api.SQIDManager.Decode("queries", entityIDStr)
		if err != nil {
			return "", nil, fmt.Errorf("invalid query ID: %w", err)
		}
		queryIDUint := uint(queryID)
		return db.PolicyResourceQuery, &queryIDUint, nil

	case "users":
		userID, err := api.SQIDManager.Decode("users", entityIDStr)
		if err != nil {
			return "", nil, fmt.Errorf("invalid user ID: %w", err)
		}
		userIDUint := uint(userID)
		return db.PolicyResourceUser, &userIDUint, nil

	case "tags":
		tagID, err := api.SQIDManager.Decode("tags", entityIDStr)
		if err != nil {
			return "", nil, fmt.Errorf("invalid tag ID: %w", err)
		}
		tagIDUint := uint(tagID)
		return db.PolicyResourceWorkspaceTag, &tagIDUint, nil

	default:
		return "", nil, fmt.Errorf("unsupported entity type: %s", entityType)
	}
}

// WorkspaceTagEntityPermissionMiddleware creates a middleware for workspace tag entity-level permissions.
func (api *APIMiddlewares) WorkspaceTagEntityPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Get the local variables
		dict, workspace, user, err := api.permissionsMiddlewareGetLocalVariables(c)
		if err != nil {
			api.Logger.Error("Error getting local variables", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}

		// Get entity type and ID from URL parameters
		entityType := c.Params("entity_type")
		entityIDStr := c.Params("entity_id")

		if entityType == "" || entityIDStr == "" {
			api.Logger.Warn("Invalid parameters for workspace tag entity permission",
				"entityType", entityType,
				"entityIDStr", entityIDStr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}

		// Get resource info from entity type and ID
		resource, resourceID, err := api.getEntityResourceInfo(entityType, entityIDStr)
		if err != nil {
			api.Logger.Warn("Error getting entity resource info",
				"entityType", entityType,
				"entityIDStr", entityIDStr,
				"error", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{err.Error()},
			})
		}

		// Check if the user has the permission using the optimized version
		allowed, err := api.permissionService.IsAllowed(user, workspace, resource, resourceID, action)
		if err != nil {
			api.Logger.Error("Error checking permission", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		if !allowed {
			api.Logger.Info("User does not have permission",
				"resource", resource,
				"action", action,
				"user_id", user.ID,
				"workspace_id", workspace.ID,
				"resource_id", resourceID,
				"entity_type", entityType,
				"entity_id", entityIDStr)
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "insufficient_permissions")},
			})
		}

		return c.Next()
	}
}
