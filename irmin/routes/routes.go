package routes

import (
	"irmin-api/controllers"
	"irmin-api/db"
	"irmin-api/middlewares"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
)

// RegisterAPIRoutes registers all API routes for the application.
//
//nolint:funlen // This is a long function, but it's not complex. We just have a lot of routes.
func RegisterAPIRoutes(
	app *fiber.App,
	apiServices *services.APIServices,
) {
	// Initialize controllers
	apiControllers := controllers.NewAPIControllers(
		apiServices,
	)

	// Initialize middlewares
	apiMiddlewares := middlewares.NewAPIMiddlewares(
		apiServices,
	)

	// Simple index route
	app.Get("/", func(c fiber.Ctx) error {
		return c.SendString("Irmin API")
	})

	// Health check routes
	app.Get(healthcheck.LivenessEndpoint, healthcheck.New(healthcheck.Config{}))
	app.Get(healthcheck.ReadinessEndpoint, healthcheck.New(healthcheck.Config{}))
	app.Get(healthcheck.StartupEndpoint, healthcheck.New(healthcheck.Config{}))

	// Public system routes (no auth required)
	app.Get("/api/v1/system/sandbox-health", apiControllers.SystemSandboxHealth)

	// Swagger documentation endpoints
	app.Get("/swagger/swagger.json", apiControllers.SwaggerJSON)
	app.Get("/swagger", apiControllers.SwaggerUI)

	// Secure API routes
	v1 := app.Group("/api/v1", apiMiddlewares.LocaleMiddleware, apiMiddlewares.AuthMiddleware)

	// System routes (authenticated)
	system := v1.Group("/system")
	system.Post("/webhook", apiControllers.SystemWebhook)
	system.Post("/schema-from-file", apiControllers.GenerateFileSchema)

	// Profile routes
	v1.Get("/profile", apiControllers.ProfileShow)
	v1.Patch("/profile", apiControllers.ProfileUpdate)

	// Roles
	v1.Get("/roles", apiControllers.RolesIndex)

	// Connector routes
	v1.Get("/connectors", apiControllers.ConnectorsIndex)
	v1.Post("/connectors", apiControllers.ConnectorsStore)
	connector := v1.Group("/connectors/:connector", apiMiddlewares.ConnectorMiddleware)
	connector.Get("/", apiControllers.ConnectorsShow)
	connector.Patch("/", apiControllers.ConnectorsUpdate)
	connector.Delete("/", apiControllers.ConnectorsDestroy)
	connector.Post("/fields/:type", apiControllers.ShowConnectorConfigurationFields)
	connector.Post("/validate", apiControllers.ValidateConnectorConfiguration)

	// Credentials routes
	v1.Get("/credentials", apiControllers.CredentialsIndex)
	v1.Post("/credentials", apiControllers.CredentialsStore)
	v1.Delete(
		"/credentials/:credential",
		apiControllers.CredentialsDestroy,
	)

	// Workspace routes
	v1.Get("/workspaces", apiControllers.WorkspacesIndex)
	v1.Post("/workspaces", apiControllers.WorkspacesStore)
	workspace := v1.Group("/workspaces/:workspace", apiMiddlewares.WorkspaceMiddleware)
	workspace.Get("/", apiMiddlewares.WorkspacePermissionMiddleware(db.PolicyActionRead), apiControllers.WorkspacesShow)
	workspace.Patch(
		"/",
		apiMiddlewares.WorkspacePermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.WorkspacesUpdate,
	)
	workspace.Delete(
		"/",
		apiMiddlewares.WorkspacePermissionMiddleware(db.PolicyActionDelete),
		apiControllers.WorkspacesDestroy,
	)
	workspace.Post(
		"/transfer-ownership",
		apiMiddlewares.WorkspacePermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferWorkspaceOwnership,
	)
	workspace.Post(
		"/leave",
		apiMiddlewares.WorkspacePermissionMiddleware(db.PolicyActionRead),
		apiControllers.LeaveWorkspace,
	)

	// Policy routes
	workspace.Get(
		"/policies",
		apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionRead),
		apiControllers.PoliciesIndex,
	)
	workspace.Get(
		"/policies/role-summary",
		apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionRead),
		apiControllers.PoliciesRoleSummary,
	)
	workspace.Get(
		"/policies/my",
		apiControllers.PoliciesMySummary,
	)
	workspace.Post(
		"/policies",
		apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.PoliciesStore,
	)
	workspace.Get(
		"/policies/can",
		apiControllers.CheckPermission,
	)
	workspace.Get(
		"/policies/resource-options",
		apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionRead),
		apiControllers.PoliciesResourceOptions,
	)
	policy := workspace.Group("/policies/:policy", apiMiddlewares.PolicyMiddleware)
	policy.Get("/", apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionRead), apiControllers.PoliciesShow)
	policy.Patch(
		"/",
		apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.PoliciesUpdate,
	)
	policy.Delete(
		"/",
		apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.PoliciesDestroy,
	)

	// Log routes
	workspace.Get("/logs", apiMiddlewares.AuditLogPermissionMiddleware(), apiControllers.LogsIndex)

	// Search routes
	workspace.Get(
		"/search",
		apiMiddlewares.WorkspacePermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkspaceSearch,
	)

	// Schema routes
	workspace.Get(
		"/schema",
		apiMiddlewares.DocumentationPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkspaceSchemaIndex,
	)

	// Workspace tag routes
	workspace.Get(
		"/tags",
		apiMiddlewares.WorkspaceTagPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkspaceTagsIndex,
	)
	workspace.Post(
		"/tags",
		apiMiddlewares.WorkspaceTagPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.WorkspaceTagsStore,
	)
	workspaceTag := workspace.Group("/tags/:tag_id", apiMiddlewares.WorkspaceTagMiddleware)
	workspaceTag.Get(
		"/",
		apiMiddlewares.WorkspaceTagPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkspaceTagsShow,
	)
	workspaceTag.Patch(
		"/",
		apiMiddlewares.WorkspaceTagPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.WorkspaceTagsUpdate,
	)
	workspaceTag.Delete(
		"/",
		apiMiddlewares.WorkspaceTagPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.WorkspaceTagsDestroy,
	)
	workspaceTag.Post(
		"/entities/:entity_type/:entity_id",
		apiMiddlewares.WorkspaceTagEntityPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.WorkspaceAddTagToEntity,
	)
	workspaceTag.Delete(
		"/entities/:entity_type/:entity_id",
		apiMiddlewares.WorkspaceTagEntityPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.WorkspaceRemoveTagFromEntity,
	)

	// Query routes
	workspace.Post("/sql", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionCreate), apiControllers.ExecuteSQL)
	queries := workspace.Group("/queries")
	queries.Get(
		"/",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead),
		apiControllers.QueriesIndex,
	)
	queries.Get(
		"/templates",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead),
		apiControllers.QueryTemplatesIndex,
	)
	queries.Post(
		"/",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.QueriesStore,
	)
	query := queries.Group("/:stored_query", apiMiddlewares.QueryMiddleware)
	query.Get("/", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead), apiControllers.QueriesShow)
	query.Patch(
		"/",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.QueriesUpdate,
	)
	query.Delete(
		"/",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.QueriesDestroy,
	)
	query.Post("/execute", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead), apiControllers.ExecuteQuery)
	query.Post(
		"/transfer-ownership",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferQueryOwnership,
	)

	// Script routes
	scripts := workspace.Group("/scripts")
	scripts.Get(
		"/",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ScriptsIndex,
	)
	scripts.Get(
		"/templates",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ScriptTemplatesIndex,
	)
	scripts.Post(
		"/",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.ScriptsStore,
	)
	script := scripts.Group("/:script", apiMiddlewares.ScriptMiddleware)
	script.Get("/", apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionRead), apiControllers.ScriptsShow)
	script.Patch(
		"/",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.ScriptsUpdate,
	)
	script.Delete(
		"/",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.ScriptsDestroy,
	)
	script.Post(
		"/execute",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.ExecuteScript,
	)
	script.Post(
		"/transfer-ownership",
		apiMiddlewares.ScriptPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferScriptOwnership,
	)

	// User routes
	users := workspace.Group("/users")
	users.Get("/", apiMiddlewares.UserPermissionMiddleware(db.PolicyActionRead), apiControllers.UsersIndex)
	user := workspace.Group("/users/:user", apiMiddlewares.UserMiddleware)
	user.Get("/", apiMiddlewares.UserPermissionMiddleware(db.PolicyActionRead), apiControllers.UsersShow)
	user.Patch(
		"/",
		apiMiddlewares.UserPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.UsersUpdate,
	)
	user.Delete(
		"/",
		apiMiddlewares.UserPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.UsersDestroy,
	)

	// Invite routes
	workspace.Get(
		"/invites",
		apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkspaceInvitesIndex,
	)
	workspace.Post(
		"/invites",
		apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionCreate),
		apiControllers.SendInvite,
	)
	v1.Get("/invites", apiControllers.IndexMyInvites)
	invite := v1.Group("/invites/:invite", apiMiddlewares.InviteMiddleware)
	invite.Get("/", apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionRead), apiControllers.InvitesShow)
	invite.Patch(
		"/",
		apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.InvitesUpdate,
	)
	invite.Delete(
		"/",
		apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionDelete),
		apiControllers.InvitesDestroy,
	)
	invite.Post(
		"/resend",
		apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.ResendInvite,
	)
	invite.Post("/accept", apiControllers.AcceptInvite)
	invite.Post("/decline", apiControllers.DeclineInvite)

	// Connection routes
	connections := workspace.Group("/connections")
	connections.Get(
		"/",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ConnectionsIndex,
	)
	connections.Post(
		"/",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.ConnectionsStore,
	)
	connection := connections.Group("/:connection", apiMiddlewares.ConnectionMiddleware)
	connection.Get(
		"/",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ConnectionsShow,
	)
	connection.Patch(
		"/",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.ConnectionsUpdate,
	)
	connection.Patch(
		"/configuration",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.ConnectionsUpdateConfiguration,
	)
	connection.Delete(
		"/",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.ConnectionsDestroy,
	)
	connection.Post(
		"/transfer-ownership",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferConnectionOwnership,
	)
	connection.Get(
		"/schema",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ConnectionSchema,
	)
	connection.Post(
		"/test",
		apiMiddlewares.ConnectionPermissionMiddleware(db.PolicyActionRead),
		apiControllers.TestConnection,
	)

	// Workflow routes
	workflows := workspace.Group("/workflows")
	workflows.Get("/",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkflowsIndex)
	workflows.Post(
		"/",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.WorkflowsStore,
	)
	workflows.Get(
		"/runs",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionRead),
		apiControllers.AllWorkflowRunsIndex,
	)
	workflow := workflows.Group("/:workflow", apiMiddlewares.WorkflowMiddleware)
	workflow.Get("/", apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionRead), apiControllers.WorkflowsShow)
	workflow.Patch(
		"/",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.WorkflowsUpdate,
	)
	workflow.Patch(
		"/workflowable",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.WorkflowableUpdate,
	)
	workflow.Patch(
		"/schedule",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.ScheduleUpdate,
	)
	workflow.Delete(
		"/",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.WorkflowsDestroy,
	)
	workflow.Post(
		"/transfer-ownership",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferWorkflowOwnership,
	)
	workflow.Post(
		"/pause",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.PauseWorkflow,
	)
	workflow.Post(
		"/start",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.StartWorkflow,
	)

	// Workflow run routes
	workflow.Post(
		"/runs",
		apiMiddlewares.WorkflowRunPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.TriggerWorkflowRun,
	)
	workflow.Get(
		"/runs",
		apiMiddlewares.WorkflowRunPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkflowRunsIndex,
	)
	workflow.Get(
		"/runs/:run",
		apiMiddlewares.WorkflowRunPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkflowRunsShow,
	)
	workflow.Delete(
		"/runs/:run",
		apiMiddlewares.WorkflowRunPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.WorkflowRunsDestroy,
	)

	// Repositories routes
	repositories := workspace.Group("/repositories")
	repositories.Get(
		"/",
		apiMiddlewares.RepositoryPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoriesIndex,
	)
	repositories.Post(
		"/",
		apiMiddlewares.RepositoryPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoriesStore,
	)
	repository := repositories.Group("/:repository", apiMiddlewares.RepositoryMiddleware)
	repository.Get(
		"/",
		apiMiddlewares.RepositoryPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoriesShow,
	)
	repository.Patch(
		"/",
		apiMiddlewares.RepositoryPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.RepositoriesUpdate,
	)
	repository.Delete(
		"/",
		apiMiddlewares.RepositoryPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.RepositoriesDestroy,
	)
	repository.Post(
		"/transfer-ownership",
		apiMiddlewares.RepositoryPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferRepositoryOwnership,
	)

	// Merge and compare routes
	repository.Get(
		"/compare",
		apiMiddlewares.RepositoryCommitPermissionMiddleware(db.PolicyActionRead),
		apiControllers.CompareRefs,
	)
	repository.Post(
		"/merge",
		apiMiddlewares.RepositoryCommitPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.MergeRefs,
	)

	// Object routes
	objects := repository.Group("/objects", apiMiddlewares.RepositoryObjectMiddleware)
	objects.Get(
		"/",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsIndex,
	)
	objects.Post(
		"/",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoryUploadObject,
	)
	objects.Post(
		"/upload-from-url",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoryUploadObjectFromURL,
	)
	objects.Delete(
		"/",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.RepositoryObjectsDestroy,
	)
	objects.Post(
		"/move",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.RepositoryMoveObject,
	)
	objects.Post(
		"/copy",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoryCopyObject,
	)
	objects.Get(
		"/content",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsContent,
	)
	objects.Get(
		"/content/structured",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsStructuredContent,
	)
	objects.Get(
		"/download",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsDownload,
	)
	objects.Get(
		"/history",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsHistory,
	)
	objects.Get(
		"/schema",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsSchema,
	)
	objects.Post(
		"/validate",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryObjectsValidate,
	)

	// Branch routes
	branches := repository.Group("/branches")
	branches.Get(
		"/",
		apiMiddlewares.RepositoryBranchPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryBranchesIndex,
	)
	branches.Post(
		"/",
		apiMiddlewares.RepositoryBranchPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoryBranchesStore,
	)
	branch := branches.Group("/:branch", apiMiddlewares.RepositoryBranchMiddleware)
	branch.Get(
		"/changes",
		apiMiddlewares.RepositoryBranchPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryGetUncommittedChanges,
	)
	branch.Get(
		"/",
		apiMiddlewares.RepositoryBranchPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryBranchesShow,
	)
	branch.Patch(
		"/",
		apiMiddlewares.RepositoryBranchPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.RepositoryBranchesUpdate,
	)
	branch.Delete(
		"/",
		apiMiddlewares.RepositoryBranchPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.RepositoryBranchesDestroy,
	)

	// Tag routes
	tags := repository.Group("/tags")
	tags.Get(
		"/",
		apiMiddlewares.RepositoryTagPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryTagsIndex,
	)
	tags.Post(
		"/",
		apiMiddlewares.RepositoryTagPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoryTagsStore,
	)
	tag := tags.Group("/:repository-tag", apiMiddlewares.RepositoryTagMiddleware)
	tag.Get(
		"/",
		apiMiddlewares.RepositoryTagPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryTagsShow,
	)
	tag.Delete(
		"/",
		apiMiddlewares.RepositoryTagPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.RepositoryTagsDestroy,
	)

	// Commits routes
	commits := repository.Group("/commits")
	commits.Get(
		"/",
		apiMiddlewares.RepositoryCommitPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryCommitsIndex,
	)
	commits.Post(
		"/",
		apiMiddlewares.RepositoryCommitPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.RepositoryCommitsStore,
	)
	commits.Post(
		"/revert",
		apiMiddlewares.RepositoryCommitPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.RepositoryRevertUncommittedChanges,
	)
	commits.Get(
		"/:hash",
		apiMiddlewares.RepositoryCommitPermissionMiddleware(db.PolicyActionRead),
		apiControllers.RepositoryCommitsShow,
	)

	// Embedding routes
	embeddings := repository.Group("/embeddings")
	embeddings.Post(
		"/vectorize",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.VectorizeObjects,
	)
	embeddings.Post(
		"/search",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.SearchEmbeddings,
	)
	embeddings.Get(
		"/",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ListEmbeddings,
	)
	embeddings.Get(
		"/info",
		apiMiddlewares.RepositoryObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.GetEmbeddingInfo,
	)
}
