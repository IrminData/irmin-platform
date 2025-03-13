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
	v1.Patch("/connectors/:connector", controllers.ConnectorsUpdate)
	v1.Delete("/connectors/:connector", controllers.ConnectorsDestroy)
	v1.Get("/connectors/:connector", controllers.ConnectorsShow)

	// Credentials routes
	v1.Get("/credentials", controllers.CredentialsIndex)
	v1.Post("/credentials", controllers.CredentialsStore)
	v1.Delete("/credentials/:credential", controllers.CredentialsDestroy)

	// Workspaces routes
	v1.Get("/workspaces", controllers.WorkspacesIndex)
	v1.Post("/workspaces", controllers.WorkspacesStore)

	// Workspace routes
	workspace := v1.Group("/workspaces/:workspace")
	workspace.Get("/", controllers.WorkspacesShow)
	workspace.Patch("/", controllers.WorkspacesUpdate)
	workspace.Delete("/", controllers.WorkspacesDestroy)
	workspace.Post("/transfer-ownership", controllers.TransferWorkspaceOwnership)
	workspace.Post("/leave", controllers.LeaveWorkspace)

	// Workflows routes
	workflows := workspace.Group("/workflows")
	workflows.Get("/", controllers.WorkflowsIndex)
	workflows.Get("/actions", controllers.ActionWorkflowsIndex)
	workflows.Post("/actions", controllers.ActionWorkflowsStore)
	workflows.Get("/imports", controllers.ImportWorkflowsIndex)
	workflows.Post("/imports", controllers.ImportWorkflowsStore)
	workflows.Get("/exports", controllers.ExportWorkflowsIndex)
	workflows.Post("/exports", controllers.ExportWorkflowsStore)
	workflows.Get("/pipelines", controllers.PipelineWorkflowsIndex)
	workflows.Post("/pipelines", controllers.PipelineWorkflowsStore)
	workflows.Get("/:workflow", controllers.WorkflowsShow)
	workflows.Patch("/:workflow", controllers.WorkflowsUpdate)
	workflows.Delete("/:workflow", controllers.WorkflowsDestroy)
	workflows.Post("/:workflow/transfer-ownership", controllers.TransferWorkflowOwnership)
	workflows.Post("/:workflow/execute", controllers.ExecuteWorkflow)
	workflows.Get("/:workflow/runs", controllers.WorkflowRunsIndex)

	// Repositories routes
	repositories := workspace.Group("/repositories")
	repositories.Get("/", controllers.RepositoriesIndex)
	repositories.Post("/", controllers.RepositoriesStore)

	// Repository routes
	repository := repositories.Group("/:repository")
	repository.Get("/", controllers.RepositoriesShow)
	repository.Patch("/", controllers.RepositoriesUpdate)
	repository.Delete("/", controllers.RepositoriesDestroy)
	repository.Post("/transfer-ownership", controllers.TransferRepositoryOwnership)
	repository.Get("/download", controllers.DownloadRepository)
	repository.Get("/compare", controllers.CompareRefs)
	repository.Post("/merge", controllers.MergeRefs)

	// Objects routes
	objects := repository.Group("/objects")
	objects.Get("/", controllers.ObjectsIndex)
	objects.Get("/:path", controllers.ObjectsShow)
	objects.Post("/:path", controllers.ObjectsStore)
	objects.Patch("/:path", controllers.ObjectsUpdate)
	objects.Delete("/:path", controllers.ObjectsDestroy)
	objects.Get("/content/:path", controllers.ObjectsContent)
	objects.Get("/history/:path", controllers.ObjectsHistory)
	objects.Get("/schema/:path", controllers.ObjectsSchema)

	// Branches routes
	branches := repository.Group("/branches")
	branches.Get("/", controllers.BranchesIndex)
	branches.Post("/", controllers.BranchesStore)
	branches.Get("/:branch", controllers.BranchesShow)
	branches.Patch("/:branch", controllers.BranchesUpdate)
	branches.Delete("/:branch", controllers.BranchesDestroy)

	// Tags routes
	tags := repository.Group("/tags")
	tags.Get("/", controllers.TagsIndex)
	tags.Post("/", controllers.TagsStore)
	tags.Get("/:tag/", controllers.TagsShow)
	tags.Delete("/:tag/", controllers.TagsDestroy)

	// Commits routes
	commits := repository.Group("/commits")
	commits.Get("/", controllers.CommitsIndex)
	commits.Post("/", controllers.CommitsStore)
	commits.Post("/revert", controllers.RevertUncommittedChanges)
	commits.Get("/last-commit", controllers.ShowLastCommit)
	commits.Get("/:commit", controllers.CommitsShow)

	// Queries routes
	queries := workspace.Group("/queries")
	queries.Get("/", controllers.QueriesIndex)
	queries.Get("/:query", controllers.QueriesShow)
	queries.Post("/", controllers.QueriesStore)
	queries.Patch("/:query", controllers.QueriesUpdate)
	queries.Delete("/:query", controllers.QueriesDestroy)
	queries.Post("/:query/execute", controllers.ExecuteQuery)
	queries.Post("/execute", controllers.ExecuteAdhocQuery)
	queries.Get("/:query/results", controllers.QueryResultsShow)
	queries.Delete("/:query/results", controllers.QueryResultsDestroy)

	// Users routes
	users := workspace.Group("/users")
	users.Get("/", controllers.UsersIndex)
	users.Get("/:user", controllers.UsersShow)
	users.Patch("/:user", controllers.UsersUpdate)
	users.Delete("/:user", controllers.UsersDestroy)

	// Invites routes
	invites := workspace.Group("/invites")
	invites.Get("/", controllers.InvitesIndex)
	invites.Post("/", controllers.InvitesStore)
	invites.Patch("/:invite", controllers.InvitesUpdate)
	invites.Delete("/:invite", controllers.InvitesDestroy)
	invites.Post("/:invite/resend", controllers.ResendInvite)

	// Connections routes
	connections := workspace.Group("/connections")
	connections.Post("/", controllers.ConnectionsStore)
	connections.Get("/", controllers.ConnectionsIndex)
	connections.Get("/details", controllers.ConnectionDetails)
	connections.Get("/test-connection", controllers.TestConnection)
	connections.Get("/settings", controllers.ConnectionSettings)
	connections.Patch("/:connection", controllers.ConnectionsUpdate)
	connections.Delete("/:connection", controllers.ConnectionsDestroy)
	connections.Post("/:connection/transfer-ownership", controllers.TransferConnectionOwnership)

	// Editor items routes
	editorItems := workspace.Group("/editor-items")
	editorItems.Get("/", controllers.EditorItemsIndex)
	editorItems.Post("/", controllers.EditorItemStore)
	editorItems.Get("/content", controllers.EditorItemContent)
}
