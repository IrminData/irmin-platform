package routes

import (
	"irmin-api/controllers"
	"irmin-api/controllers/middlewares"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// RegisterAPIRoutes registers all API routes for the application.
//
//nolint:funlen // This is a long function, but it's not complex. We just have a lot of routes.
func RegisterAPIRoutes(
	app *fiber.App,
	d *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *utils.SQIDManager,
	localeManager *locales.LocaleManager,
	permissionService *lib.PermissionService,
) {
	// Initialize controllers
	apiControllers := controllers.NewAPIControllers(
		d,
		logger,
		env,
		orchestrator,
		sqidManager,
		localeManager,
		permissionService,
	)

	// Initialize middlewares
	apiMiddlewares := middlewares.NewAPIMiddlewares(
		d,
		logger,
		env,
		orchestrator,
		sqidManager,
		localeManager,
		permissionService,
	)

	// Public routes
	app.Get("/", apiControllers.Index)
	app.Get("/health", apiControllers.Health)

	v1 := app.Group("/api/v1", apiMiddlewares.LocaleMiddleware, apiMiddlewares.AuthMiddleware)

	// System routes
	system := v1.Group("/system")
	system.Post("/webhook", apiControllers.SystemWebhook)

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
	v1.Delete("/credentials/:credential", apiControllers.CredentialsDestroy)

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
	policy.Patch("/", apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionUpdate), apiControllers.PoliciesUpdate)
	policy.Delete("/", apiMiddlewares.PolicyPermissionMiddleware(db.PolicyActionDelete), apiControllers.PoliciesDestroy)

	// Log routes
	workspace.Get("/logs", apiMiddlewares.AuditLogPermissionMiddleware(), apiControllers.LogsIndex)

	// Schema routes
	workspace.Get(
		"/schema",
		apiMiddlewares.DocumentationPermissionMiddleware(db.PolicyActionRead),
		apiControllers.WorkspaceSchemaIndex,
	)

	// Query routes
	workspace.Post("/sql", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionCreate), apiControllers.ExecuteSQL)
	queries := workspace.Group("/queries")
	queries.Get("/", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead), apiControllers.QueriesIndex)
	queries.Post("/", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionCreate), apiControllers.QueriesStore)
	query := queries.Group("/:stored_query", apiMiddlewares.QueryMiddleware)
	query.Get("/", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead), apiControllers.QueriesShow)
	query.Patch("/", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionUpdate), apiControllers.QueriesUpdate)
	query.Delete("/", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionDelete), apiControllers.QueriesDestroy)
	query.Post("/execute", apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionRead), apiControllers.ExecuteQuery)
	query.Post(
		"/transfer-ownership",
		apiMiddlewares.QueryPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.TransferQueryOwnership,
	)

	// User routes
	users := workspace.Group("/users")
	users.Get("/", apiMiddlewares.UserPermissionMiddleware(db.PolicyActionRead), apiControllers.UsersIndex)
	user := workspace.Group("/users/:user", apiMiddlewares.UserMiddleware)
	user.Get("/", apiMiddlewares.UserPermissionMiddleware(db.PolicyActionRead), apiControllers.UsersShow)
	user.Patch("/", apiMiddlewares.UserPermissionMiddleware(db.PolicyActionUpdate), apiControllers.UsersUpdate)
	user.Delete("/", apiMiddlewares.UserPermissionMiddleware(db.PolicyActionDelete), apiControllers.UsersDestroy)

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
	invite.Patch("/", apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionUpdate), apiControllers.InvitesUpdate)
	invite.Delete("/", apiMiddlewares.InvitePermissionMiddleware(db.PolicyActionDelete), apiControllers.InvitesDestroy)
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

	// Editor routes
	editor := workspace.Group("/editor")
	editor.Get("/", apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionRead), apiControllers.EditorIndex)
	editor.Post(
		"/",
		apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.EditorItemStore,
	)
	editor.Delete(
		"/",
		apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionDelete),
		apiControllers.EditorItemDestroy,
	)
	editor.Post(
		"/move",
		apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.MoveEditorItem,
	)
	editor.Post(
		"/copy",
		apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.CopyEditorItem,
	)
	editor.Get(
		"/content",
		apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionRead),
		apiControllers.EditorItemContent,
	)
	editor.Post(
		"/run",
		apiMiddlewares.EditorScriptPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.EditorItemExecute,
	)

	// Workflow routes
	workflows := workspace.Group("/workflows")
	workflows.Get("/", apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionRead), apiControllers.WorkflowsIndex)
	workflows.Post(
		"/",
		apiMiddlewares.WorkflowPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.WorkflowsStore,
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
		apiMiddlewares.CommitPermissionMiddleware(db.PolicyActionRead),
		apiControllers.CompareRefs,
	)
	repository.Post(
		"/merge",
		apiMiddlewares.CommitPermissionMiddleware(db.PolicyActionCreate),
		apiControllers.MergeRefs,
	)

	// Object routes
	objects := repository.Group("/objects", apiMiddlewares.ObjectMiddleware)
	objects.Get("/", apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionRead), apiControllers.ObjectsIndex)
	objects.Post("/", apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionCreate), apiControllers.UploadObject)
	objects.Delete("/", apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionDelete), apiControllers.ObjectsDestroy)
	objects.Post("/move", apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionUpdate), apiControllers.MoveObject)
	objects.Post("/copy", apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionCreate), apiControllers.CopyObject)
	objects.Get(
		"/content",
		apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ObjectsContent,
	)
	objects.Get(
		"/content/structured",
		apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ObjectsStructuredContent,
	)
	objects.Get(
		"/download",
		apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ObjectsDownload,
	)
	objects.Get(
		"/history",
		apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionRead),
		apiControllers.ObjectsHistory,
	)
	objects.Get("/schema", apiMiddlewares.ObjectPermissionMiddleware(db.PolicyActionRead), apiControllers.ObjectsSchema)

	// Branch routes
	branches := repository.Group("/branches")
	branches.Get("/", apiMiddlewares.BranchPermissionMiddleware(db.PolicyActionRead), apiControllers.BranchesIndex)
	branches.Post("/", apiMiddlewares.BranchPermissionMiddleware(db.PolicyActionCreate), apiControllers.BranchesStore)
	branch := branches.Group("/:branch", apiMiddlewares.BranchMiddleware)
	branch.Get(
		"/changes",
		apiMiddlewares.BranchPermissionMiddleware(db.PolicyActionRead),
		apiControllers.GetUncommittedChanges,
	)
	branch.Get("/", apiMiddlewares.BranchPermissionMiddleware(db.PolicyActionRead), apiControllers.BranchesShow)
	branch.Patch("/", apiMiddlewares.BranchPermissionMiddleware(db.PolicyActionUpdate), apiControllers.BranchesUpdate)
	branch.Delete("/", apiMiddlewares.BranchPermissionMiddleware(db.PolicyActionDelete), apiControllers.BranchesDestroy)

	// Tag routes
	tags := repository.Group("/tags")
	tags.Get("/", apiMiddlewares.TagPermissionMiddleware(db.PolicyActionRead), apiControllers.TagsIndex)
	tags.Post("/", apiMiddlewares.TagPermissionMiddleware(db.PolicyActionCreate), apiControllers.TagsStore)
	tag := tags.Group("/:tag", apiMiddlewares.TagMiddleware)
	tag.Get("/", apiMiddlewares.TagPermissionMiddleware(db.PolicyActionRead), apiControllers.TagsShow)
	tag.Delete("/", apiMiddlewares.TagPermissionMiddleware(db.PolicyActionDelete), apiControllers.TagsDestroy)

	// Commits routes
	commits := repository.Group("/commits")
	commits.Get("/", apiMiddlewares.CommitPermissionMiddleware(db.PolicyActionRead), apiControllers.CommitsIndex)
	commits.Post("/", apiMiddlewares.CommitPermissionMiddleware(db.PolicyActionCreate), apiControllers.CommitsStore)
	commits.Post(
		"/revert",
		apiMiddlewares.CommitPermissionMiddleware(db.PolicyActionUpdate),
		apiControllers.RevertUncommittedChanges,
	)
	commits.Get("/:hash", apiMiddlewares.CommitPermissionMiddleware(db.PolicyActionRead), apiControllers.CommitsShow)
}
