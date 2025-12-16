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
			return api.handleServiceError(
				c,
				"Error getting local variables in permission middleware",
				fmt.Errorf("internal: %w", err),
				dict,
			)
		}

		// Get resource ID if needed
		var resourceID *uint
		if getResourceID != nil {
			resourceID = getResourceID(c)
		}

		// Check if the user has the permission using the optimized version
		allowed, err := api.permissionService.IsAllowed(user, workspace, resource, resourceID, action)
		if err != nil {
			return api.handleServiceError(
				c,
				"Error checking permission",
				fmt.Errorf("internal: %w", err),
				dict,
			)
		}
		if !allowed {
			api.Logger.Info("User does not have permission",
				"resource", resource,
				"action", action,
				"user_id", user.ID,
				"workspace_id", workspace.ID,
				"resource_id", resourceID)
			return api.handleServiceError(
				c,
				"User does not have permission",
				errors.New("insufficient_permissions"),
				dict,
			)
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
				// No user parameter in URL, this is expected for index routes
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
			// Don't log warning for index routes where no specific connection is expected
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
			// Don't log warning for index routes where no specific query is expected
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
			// Don't log warning for index routes where no specific workflow is expected
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
			// Don't log warning for index routes where no specific workflow is expected
			return nil
		},
	)
}

// ScriptPermissionMiddleware creates a middleware for script-level permissions.
func (api *APIMiddlewares) ScriptPermissionMiddleware(action db.PolicyAction) fiber.Handler {
	return api.createPermissionMiddleware(
		db.PolicyResourceScript,
		action,
		func(c fiber.Ctx) *uint {
			script, scriptOk := c.Locals("script").(*db.StoredScript)
			if scriptOk && script != nil {
				return &script.ID
			}
			// Don't log warning for index routes where no specific script is expected
			return nil
		},
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
			// Don't log warning for index routes where no specific repository is expected
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
			// Don't log warning for index routes where no specific repository is expected
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
			// Don't log warning for index routes where no specific repository is expected
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
			// Don't log warning for index and create routes where no specific object is expected
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
			// Don't log warning for index routes where no specific repository is expected
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
			tagWithAssets, tagWithAssetsOk := c.Locals("tag_id").(*db.TagWithAssets)
			if !tagWithAssetsOk {
				// For create operations, there's no tag in context yet, so return nil
				// This will check workspace-level permissions instead of specific tag permissions
				return nil
			}
			return &tagWithAssets.Tag.ID
		},
	)
}

// decodeEntityID decodes an entity ID from a SQID string.
func (api *APIMiddlewares) decodeEntityID(
	sqidType, entityIDStr, entityName string,
) (*uint, error) {
	id, err := api.SQIDManager.Decode(sqidType, entityIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid %s ID: %w", entityName, err)
	}
	idUint := uint(id)
	return &idUint, nil
}

// getEntityResourceInfo maps entity type and ID to policy resource and decoded ID.
func (api *APIMiddlewares) getEntityResourceInfo(
	entityType, entityIDStr string,
) (db.PolicyResource, *uint, error) {
	switch entityType {
	case "repositories":
		repoID, err := api.decodeEntityID("repositories", entityIDStr, "repository")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceRepository, repoID, nil

	case "workflows":
		workflowID, err := api.decodeEntityID("workflows", entityIDStr, "workflow")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceWorkflow, workflowID, nil

	case "connections":
		connectionID, err := api.decodeEntityID("connections", entityIDStr, "connection")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceConnection, connectionID, nil

	case "queries":
		queryID, err := api.decodeEntityID("queries", entityIDStr, "query")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceQuery, queryID, nil

	case "scripts":
		scriptID, err := api.decodeEntityID("scripts", entityIDStr, "script")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceScript, scriptID, nil

	case "users":
		userID, err := api.decodeEntityID("users", entityIDStr, "user")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceUser, userID, nil

	case "tags":
		tagID, err := api.decodeEntityID("tags", entityIDStr, "tag")
		if err != nil {
			return "", nil, err
		}
		return db.PolicyResourceWorkspaceTag, tagID, nil

	case "repository_objects":
		objectID, err := api.decodeEntityID("repository_objects", entityIDStr, "repository object")
		if err != nil {
			return "", nil, err
		}
		var object db.RepositoryObject
		if err = api.DB.First(&object, *objectID).Error; err != nil {
			return "", nil, fmt.Errorf("repository object not found: %w", err)
		}
		return db.PolicyResourceRepositoryObject, objectID, nil

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
			// Return generic error message to avoid exposing internal details
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}

		// Check if the user has the permission using the optimized version
		allowed, err := api.permissionService.IsAllowed(user, workspace, resource, resourceID, action)
		if err != nil {
			// For security reasons, always return 403 for any error during permission checking
			// to avoid leaking information about internal failures
			api.Logger.Error("Error checking permission", "error", err)
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "insufficient_permissions")},
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
