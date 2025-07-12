package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// InvalidateCacheMiddleware adds cache-busting headers to responses for data mutation operations.
// This ensures that cached responses are invalidated when data changes.
func (api *APIMiddlewares) InvalidateCacheMiddleware(cacheTag string) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Process the request first
		err := c.Next()

		// Only add cache invalidation headers for successful responses
		if err == nil && c.Response().StatusCode() >= 200 && c.Response().StatusCode() < 300 {
			c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Set("X-Cache-Invalidate", cacheTag)
		}

		return err
	}
}

// InvalidateWorkflowsCache is a convenience middleware for workflow-related operations.
func (api *APIMiddlewares) InvalidateWorkflowsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("workflows")
}

// InvalidateRepositoriesCache is a convenience middleware for repository-related operations.
func (api *APIMiddlewares) InvalidateRepositoriesCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("repositories")
}

// InvalidateConnectionsCache is a convenience middleware for connection-related operations.
func (api *APIMiddlewares) InvalidateConnectionsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("connections")
}

// InvalidateWorkspacesCache is a convenience middleware for workspace-related operations.
func (api *APIMiddlewares) InvalidateWorkspacesCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("workspaces")
}

// InvalidatePoliciesCache is a convenience middleware for policy-related operations.
func (api *APIMiddlewares) InvalidatePoliciesCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("policies")
}

// InvalidateUsersCache is a convenience middleware for user-related operations.
func (api *APIMiddlewares) InvalidateUsersCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("users")
}

// InvalidateInvitesCache is a convenience middleware for invite-related operations.
func (api *APIMiddlewares) InvalidateInvitesCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("invites")
}

// InvalidateQueriesCache is a convenience middleware for query-related operations.
func (api *APIMiddlewares) InvalidateQueriesCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("queries")
}

// InvalidateTagsCache is a convenience middleware for tag-related operations.
func (api *APIMiddlewares) InvalidateTagsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("tags")
}

// InvalidateConnectorsCache is a convenience middleware for connector-related operations.
func (api *APIMiddlewares) InvalidateConnectorsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("connectors")
}

// InvalidateCredentialsCache is a convenience middleware for credential-related operations.
func (api *APIMiddlewares) InvalidateCredentialsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("credentials")
}

// InvalidateWorkflowRunsCache is a convenience middleware for workflow run-related operations.
func (api *APIMiddlewares) InvalidateWorkflowRunsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("workflow-runs")
}

// InvalidateRepositoryBranchesCache is a convenience middleware for repository branch-related operations.
func (api *APIMiddlewares) InvalidateRepositoryBranchesCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("repository-branches")
}

// InvalidateRepositoryTagsCache is a convenience middleware for repository tag-related operations.
func (api *APIMiddlewares) InvalidateRepositoryTagsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("repository-tags")
}

// InvalidateRepositoryCommitsCache is a convenience middleware for repository commit-related operations.
func (api *APIMiddlewares) InvalidateRepositoryCommitsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("repository-commits")
}

// InvalidateRepositoryObjectsCache is a convenience middleware for repository object-related operations.
func (api *APIMiddlewares) InvalidateRepositoryObjectsCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("repository-objects")
}

// InvalidateEditorCache is a convenience middleware for editor-related operations.
func (api *APIMiddlewares) InvalidateEditorCache() fiber.Handler {
	return api.InvalidateCacheMiddleware("editor")
}
