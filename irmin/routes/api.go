package routes

import (
	"irmin-api/controllers"

	"github.com/gofiber/fiber/v3"
)

func RegisterAPIRoutes(app *fiber.App) {
	app.Get("/", controllers.Index)
	app.Get("/health", controllers.Health)

	v1 := app.Group("/api/v1", controllers.APIMiddleware)

	// Profile routes
	v1.Get("/profile", controllers.ProfileShow)
	v1.Patch("/profile", controllers.ProfileUpdate)

	// Roles
	v1.Get("/roles", controllers.RolesIndex)

	// Connector routes
	v1.Get("/connectors", controllers.ConnectorsIndex)
	v1.Post("/connectors", controllers.ConnectorsStore)
	connector := v1.Group("/connectors/:connector", controllers.ConnectorMiddleware)
	connector.Get("/", controllers.ConnectorsShow)
	connector.Patch("/", controllers.ConnectorsUpdate)
	connector.Delete("/", controllers.ConnectorsDestroy)
	connector.Post("/fields/:type", controllers.ShowConnectorConfigurationFields)
	connector.Post("/validate", controllers.ValidateConnectorConfiguration)

	// Credentials routes
	v1.Get("/credentials", controllers.CredentialsIndex)
	v1.Post("/credentials", controllers.CredentialsStore)
	v1.Delete("/credentials/:credential", controllers.CredentialsDestroy)

	// Workspace routes
	v1.Get("/workspaces", controllers.WorkspacesIndex)
	v1.Post("/workspaces", controllers.WorkspacesStore)
	workspace := v1.Group("/workspaces/:workspace", controllers.WorkspaceMiddleware)
	workspace.Get("/", controllers.WorkspacesShow)
	workspace.Patch("/", controllers.WorkspacesUpdate)
	workspace.Delete("/", controllers.WorkspacesDestroy)
	workspace.Post("/transfer-ownership", controllers.TransferWorkspaceOwnership)
	workspace.Post("/leave", controllers.LeaveWorkspace)

	// Query routes
	workspace.Post("/sql", controllers.ExecuteSQL)
	queries := workspace.Group("/queries")
	queries.Get("/", controllers.QueriesIndex)
	queries.Post("/", controllers.QueriesStore)
	query := queries.Group("/:query", controllers.QueryMiddleware)
	query.Get("/", controllers.QueriesShow)
	query.Patch("/", controllers.QueriesUpdate)
	query.Delete("/", controllers.QueriesDestroy)
	query.Post("/execute", controllers.ExecuteQuery)
	query.Post("/transfer-ownership", controllers.TransferQueryOwnership)

	// User routes
	users := workspace.Group("/users")
	users.Get("/", controllers.UsersIndex)
	user := workspace.Group("/users/:user", controllers.UserMiddleware)
	user.Get("/", controllers.UsersShow)
	user.Patch("/", controllers.UsersUpdate)
	user.Delete("/", controllers.UsersDestroy)

	// Invite routes
	workspace.Get("/invites", controllers.WorkspaceInvitesIndex)
	workspace.Post("/invites", controllers.SendInvite)
	v1.Get("/invites", controllers.IndexMyInvites)
	invite := v1.Group("/invites/:invite", controllers.InviteMiddleware)
	invite.Get("/", controllers.InvitesShow)
	invite.Patch("/", controllers.InvitesUpdate)
	invite.Delete("/", controllers.InvitesDestroy)
	invite.Post("/resend", controllers.ResendInvite)
	invite.Post("/accept", controllers.AcceptInvite)
	invite.Post("/decline", controllers.DeclineInvite)

	// Connection routes
	connections := workspace.Group("/connections")
	connections.Get("/", controllers.ConnectionsIndex)
	connections.Post("/", controllers.ConnectionsStore)
	connection := connections.Group("/:connection", controllers.ConnectionMiddleware)
	connection.Get("/", controllers.ConnectionsShow)
	connection.Patch("/", controllers.ConnectionsUpdate)
	connection.Delete("/", controllers.ConnectionsDestroy)
	connection.Post("/transfer-ownership", controllers.TransferConnectionOwnership)

	// Editor routes
	editor := workspace.Group("/editor")
	editor.Get("/", controllers.EditorIndex)
	editor.Post("/", controllers.EditorItemStore)
	editor.Delete("/", controllers.EditorItemDestroy)
	editor.Post("/move", controllers.MoveEditorItem)
	editor.Post("/copy", controllers.CopyEditorItem)
	editor.Get("/content", controllers.EditorItemContent)

	// Workflow routes
	workflows := workspace.Group("/workflows")
	workflows.Get("/", controllers.WorkflowsIndex)
	workflows.Post("/", controllers.WorkflowsStore)
	workflow := workflows.Group("/:workflow", controllers.WorkflowMiddleware)
	workflow.Get("/", controllers.WorkflowsShow)
	workflow.Patch("/", controllers.WorkflowsUpdate)
	workflow.Patch("/workflowable", controllers.WorkflowableUpdate)
	workflow.Patch("/schedule", controllers.ScheduleUpdate)
	workflow.Delete("/", controllers.WorkflowsDestroy)
	workflow.Post("/transfer-ownership", controllers.TransferWorkflowOwnership)

	// Workflow run routes
	workflow.Post("/runs", controllers.TriggerWorkflowRun)
	workflow.Get("/runs", controllers.WorkflowRunsIndex)
	workflow.Get("/runs/:run", controllers.WorkflowRunsShow)
	workflow.Delete("/runs/:run", controllers.WorkflowRunsDestroy)

	// Repositories routes
	repositories := workspace.Group("/repositories")
	repositories.Get("/", controllers.RepositoriesIndex)
	repositories.Post("/", controllers.RepositoriesStore)
	repository := repositories.Group("/:repository", controllers.RepositoryMiddleware)
	repository.Get("/", controllers.RepositoriesShow)
	repository.Patch("/", controllers.RepositoriesUpdate)
	repository.Delete("/", controllers.RepositoriesDestroy)
	repository.Post("/transfer-ownership", controllers.TransferRepositoryOwnership)
	repository.Get("/download", controllers.DownloadRepository)

	// Merge and compare routes
	repository.Get("/compare", controllers.CompareRefs)
	repository.Post("/merge", controllers.MergeRefs)

	// Object routes
	objects := repository.Group("/objects", controllers.ObjectMiddleware)
	objects.Get("/", controllers.ObjectsIndex)
	objects.Post("/", controllers.UploadObject)
	objects.Delete("/", controllers.ObjectsDestroy)
	objects.Post("/move", controllers.MoveObject)
	objects.Post("/copy", controllers.CopyObject)
	objects.Get("/content", controllers.ObjectsContent)
	objects.Get("/history", controllers.ObjectsHistory)
	objects.Get("/schema", controllers.ObjectsSchema)

	// Branch routes
	branches := repository.Group("/branches")
	branches.Get("/", controllers.BranchesIndex)
	branches.Post("/", controllers.BranchesStore)
	branch := branches.Group("/:branch", controllers.BranchMiddleware)
	branch.Get("/", controllers.BranchesShow)
	branch.Patch("/", controllers.BranchesUpdate)
	branch.Delete("/", controllers.BranchesDestroy)

	// Tag routes
	tags := repository.Group("/tags")
	tags.Get("/", controllers.TagsIndex)
	tags.Post("/", controllers.TagsStore)
	tag := tags.Group("/:tag", controllers.TagMiddleware)
	tag.Get("/", controllers.TagsShow)
	tag.Delete("/", controllers.TagsDestroy)

	// Commits routes
	commits := repository.Group("/commits")
	commits.Get("/", controllers.CommitsIndex)
	commits.Post("/", controllers.CommitsStore)
	commits.Post("/revert", controllers.RevertUncommittedChanges)
	commits.Get("/last-commit", controllers.ShowLastCommit)
	commits.Get("/:hash", controllers.CommitsShow)
}
