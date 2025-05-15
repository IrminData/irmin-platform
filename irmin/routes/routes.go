package routes

import (
	"irmin-api/controllers"
	"irmin-api/controllers/middlewares"
	"irmin-api/db"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// RegisterAPIRoutes registers all API routes for the application.
func RegisterAPIRoutes(
	app *fiber.App,
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
) {
	// Initialize controllers
	apiControllers := controllers.NewAPIControllers(
		db,
		logger,
		env,
		orchestrator,
	)

	// Initialize middlewares
	apiMiddlewares := middlewares.NewAPIMiddlewares(
		db,
		logger,
		env,
		orchestrator,
	)

	// Public routes
	app.Get("/", apiControllers.Index)
	app.Get("/health", apiControllers.Health)

	v1 := app.Group("/api/v1", apiMiddlewares.LocaleMiddleware, apiMiddlewares.AuthMiddleware)

	// System routes
	system := app.Group("/system")
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
	workspace.Get("/", apiControllers.WorkspacesShow)
	workspace.Patch("/", apiControllers.WorkspacesUpdate)
	workspace.Delete("/", apiControllers.WorkspacesDestroy)
	workspace.Post("/transfer-ownership", apiControllers.TransferWorkspaceOwnership)
	workspace.Post("/leave", apiControllers.LeaveWorkspace)

	// Log routes
	workspace.Get("/logs", apiControllers.LogsIndex)

	// Schema routes
	workspace.Get("/schema", apiControllers.WorkspaceSchemaIndex)

	// Query routes
	workspace.Post("/sql", apiControllers.ExecuteSQL)
	queries := workspace.Group("/queries")
	queries.Get("/", apiControllers.QueriesIndex)
	queries.Post("/", apiControllers.QueriesStore)
	query := queries.Group("/:query", apiMiddlewares.QueryMiddleware)
	query.Get("/", apiControllers.QueriesShow)
	query.Patch("/", apiControllers.QueriesUpdate)
	query.Delete("/", apiControllers.QueriesDestroy)
	query.Post("/execute", apiControllers.ExecuteQuery)
	query.Post("/transfer-ownership", apiControllers.TransferQueryOwnership)

	// User routes
	users := workspace.Group("/users")
	users.Get("/", apiControllers.UsersIndex)
	user := workspace.Group("/users/:user", apiMiddlewares.UserMiddleware)
	user.Get("/", apiControllers.UsersShow)
	user.Patch("/", apiControllers.UsersUpdate)
	user.Delete("/", apiControllers.UsersDestroy)

	// Invite routes
	workspace.Get("/invites", apiControllers.WorkspaceInvitesIndex)
	workspace.Post("/invites", apiControllers.SendInvite)
	v1.Get("/invites", apiControllers.IndexMyInvites)
	invite := v1.Group("/invites/:invite", apiMiddlewares.InviteMiddleware)
	invite.Get("/", apiControllers.InvitesShow)
	invite.Patch("/", apiControllers.InvitesUpdate)
	invite.Delete("/", apiControllers.InvitesDestroy)
	invite.Post("/resend", apiControllers.ResendInvite)
	invite.Post("/accept", apiControllers.AcceptInvite)
	invite.Post("/decline", apiControllers.DeclineInvite)

	// Connection routes
	connections := workspace.Group("/connections")
	connections.Get("/", apiControllers.ConnectionsIndex)
	connections.Post("/", apiControllers.ConnectionsStore)
	connection := connections.Group("/:connection", apiMiddlewares.ConnectionMiddleware)
	connection.Get("/", apiControllers.ConnectionsShow)
	connection.Patch("/", apiControllers.ConnectionsUpdate)
	connection.Delete("/", apiControllers.ConnectionsDestroy)
	connection.Post("/transfer-ownership", apiControllers.TransferConnectionOwnership)
	connection.Get("/schema", apiControllers.ConnectionSchema)

	// Editor routes
	editor := workspace.Group("/editor")
	editor.Get("/", apiControllers.EditorIndex)
	editor.Post("/", apiControllers.EditorItemStore)
	editor.Delete("/", apiControllers.EditorItemDestroy)
	editor.Post("/move", apiControllers.MoveEditorItem)
	editor.Post("/copy", apiControllers.CopyEditorItem)
	editor.Get("/content", apiControllers.EditorItemContent)
	editor.Post("/run", apiControllers.EditorItemExecute)

	// Workflow routes
	workflows := workspace.Group("/workflows")
	workflows.Get("/", apiControllers.WorkflowsIndex)
	workflows.Post("/", apiControllers.WorkflowsStore)
	workflow := workflows.Group("/:workflow", apiMiddlewares.WorkflowMiddleware)
	workflow.Get("/", apiControllers.WorkflowsShow)
	workflow.Patch("/", apiControllers.WorkflowsUpdate)
	workflow.Patch("/workflowable", apiControllers.WorkflowableUpdate)
	workflow.Patch("/schedule", apiControllers.ScheduleUpdate)
	workflow.Delete("/", apiControllers.WorkflowsDestroy)
	workflow.Post("/transfer-ownership", apiControllers.TransferWorkflowOwnership)
	workflow.Post("/pause", apiControllers.PauseWorkflow)
	workflow.Post("/start", apiControllers.StartWorkflow)

	// Workflow run routes
	workflow.Post("/runs", apiControllers.TriggerWorkflowRun)
	workflow.Get("/runs", apiControllers.WorkflowRunsIndex)
	workflow.Get("/runs/:run", apiControllers.WorkflowRunsShow)
	workflow.Delete("/runs/:run", apiControllers.WorkflowRunsDestroy)

	// Repositories routes
	repositories := workspace.Group("/repositories")
	repositories.Get("/", apiControllers.RepositoriesIndex)
	repositories.Post("/", apiControllers.RepositoriesStore)
	repository := repositories.Group("/:repository", apiMiddlewares.RepositoryMiddleware)
	repository.Get("/", apiControllers.RepositoriesShow)
	repository.Patch("/", apiControllers.RepositoriesUpdate)
	repository.Delete("/", apiControllers.RepositoriesDestroy)
	repository.Post("/transfer-ownership", apiControllers.TransferRepositoryOwnership)

	// Merge and compare routes
	repository.Get("/compare", apiControllers.CompareRefs)
	repository.Post("/merge", apiControllers.MergeRefs)

	// Object routes
	objects := repository.Group("/objects", apiMiddlewares.ObjectMiddleware)
	objects.Get("/", apiControllers.ObjectsIndex)
	objects.Post("/", apiControllers.UploadObject)
	objects.Delete("/", apiControllers.ObjectsDestroy)
	objects.Post("/move", apiControllers.MoveObject)
	objects.Post("/copy", apiControllers.CopyObject)
	objects.Get("/content", apiControllers.ObjectsContent)
	objects.Get("/download", apiControllers.ObjectsDownload)
	objects.Get("/history", apiControllers.ObjectsHistory)
	objects.Get("/schema", apiControllers.ObjectsSchema)

	// Branch routes
	branches := repository.Group("/branches")
	branches.Get("/", apiControllers.BranchesIndex)
	branches.Post("/", apiControllers.BranchesStore)
	branch := branches.Group("/:branch", apiMiddlewares.BranchMiddleware)
	branch.Get("/changes", apiControllers.GetUncommittedChanges)
	branch.Get("/", apiControllers.BranchesShow)
	branch.Patch("/", apiControllers.BranchesUpdate)
	branch.Delete("/", apiControllers.BranchesDestroy)

	// Tag routes
	tags := repository.Group("/tags")
	tags.Get("/", apiControllers.TagsIndex)
	tags.Post("/", apiControllers.TagsStore)
	tag := tags.Group("/:tag", apiMiddlewares.TagMiddleware)
	tag.Get("/", apiControllers.TagsShow)
	tag.Delete("/", apiControllers.TagsDestroy)

	// Commits routes
	commits := repository.Group("/commits")
	commits.Get("/", apiControllers.CommitsIndex)
	commits.Post("/", apiControllers.CommitsStore)
	commits.Post("/revert", apiControllers.RevertUncommittedChanges)
	commits.Get("/:hash", apiControllers.CommitsShow)
}
