package gc

import "irmin-api/db"

// orphanRuleType classifies how orphan detection is performed.
type orphanRuleType int

const (
	// orphanByParent detects children whose parent is soft-deleted or missing.
	// SQL: child.fk NOT IN (SELECT id FROM parent WHERE deleted_at IS NULL)
	orphanByParent orphanRuleType = iota

	// orphanByNoMembers detects workspaces with zero active members.
	// SQL: id NOT IN (SELECT workspace_id FROM workspace_users WHERE deleted_at IS NULL)
	orphanByNoMembers

	// orphanByUnreferenced detects records no longer referenced by any active row.
	// SQL: id NOT IN (SELECT fk FROM referencing_table WHERE deleted_at IS NULL AND fk IS NOT NULL)
	orphanByUnreferenced
)

// orphanRule defines a single orphan cleanup rule.
type orphanRule struct {
	// Name is used in logging and as the report map key.
	Name string

	// ChildModel is the GORM model pointer for the orphan table.
	ChildModel any

	// Type selects the detection strategy.
	Type orphanRuleType

	// HasSoftDelete is true when the child table has gorm.Model (deleted_at column).
	// true = soft-delete orphans, false = hard-delete (junction tables).
	HasSoftDelete bool

	// FKColumn is the child's foreign key column (orphanByParent only).
	FKColumn string

	// ParentTable is the SQL table name of the parent (orphanByParent only).
	ParentTable string

	// ParentHasSoftDelete is true when the parent table uses soft-delete (orphanByParent only).
	ParentHasSoftDelete bool

	// ReferencingTable is the table that holds the FK pointing to this model (orphanByUnreferenced only).
	ReferencingTable string

	// ReferencingColumn is the FK column in the referencing table (orphanByUnreferenced only).
	ReferencingColumn string
}

// orphanRules returns all orphan cleanup rules in processing order.
// Parents are processed before children so cascading orphans are caught in a single pass.
//
//nolint:funlen // data-driven rule list; splitting would reduce readability
func orphanRules() []orphanRule {
	return []orphanRule{
		// =============================================================
		// Phase 1: Workspaces with no active members
		// =============================================================
		{
			Name:          "workspaces (no members)",
			ChildModel:    &db.Workspace{},
			Type:          orphanByNoMembers,
			HasSoftDelete: true,
		},

		// =============================================================
		// Phase 2: Workspace-level children
		// =============================================================
		{
			Name: "workspace_users", ChildModel: &db.WorkspaceUser{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "repositories", ChildModel: &db.Repository{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "connections", ChildModel: &db.Connection{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "workflows", ChildModel: &db.Workflow{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "stored_queries", ChildModel: &db.StoredQuery{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "stored_scripts", ChildModel: &db.StoredScript{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "tags", ChildModel: &db.Tag{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "policies", ChildModel: &db.Policy{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "invites", ChildModel: &db.Invite{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_applications", ChildModel: &db.AIApplication{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "connection_subscriptions", ChildModel: &db.ConnectionSubscription{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_id", ParentTable: "workspaces", ParentHasSoftDelete: true,
		},
		{
			Name: "api_tokens", ChildModel: &db.APIToken{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "user_id", ParentTable: "users", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 3: Workspace-user children
		// =============================================================
		{
			Name: "workspace_user_roles", ChildModel: &db.WorkspaceUserRole{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workspace_user_id", ParentTable: "workspace_users", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 4: Connection children
		// =============================================================
		{
			Name: "connection_schema_caches", ChildModel: &db.ConnectionSchemaCache{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "connection_id", ParentTable: "connections", ParentHasSoftDelete: true,
		},
		{
			Name: "connection_subscriptions (by connection)", ChildModel: &db.ConnectionSubscription{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "connection_id", ParentTable: "connections", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 5: Repository children
		// =============================================================
		{
			Name: "repository_schema_caches", ChildModel: &db.RepositorySchemaCache{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},
		{
			Name: "repository_objects", ChildModel: &db.RepositoryObject{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},
		{
			Name: "import_workflowables (by repository)", ChildModel: &db.ImportWorkflowable{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},
		{
			Name: "export_workflowables (by repository)", ChildModel: &db.ExportWorkflowable{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},
		{
			Name: "action_workflowable_inputs (by repository)", ChildModel: &db.ActionWorkflowableInput{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 6: Workflow children
		// =============================================================
		{
			Name: "workflow_runs", ChildModel: &db.WorkflowRun{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "workflow_id", ParentTable: "workflows", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 6b: Stored query children
		// =============================================================
		{
			Name: "log_events (by stored_query)", ChildModel: &db.LogEvent{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "stored_query_id", ParentTable: "stored_queries", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 7: Cross-parent orphans
		// =============================================================
		{
			Name: "import_workflowables (by connection)", ChildModel: &db.ImportWorkflowable{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "connection_id", ParentTable: "connections", ParentHasSoftDelete: true,
		},
		{
			Name: "export_workflowables (by connection)", ChildModel: &db.ExportWorkflowable{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "connection_id", ParentTable: "connections", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_data_sources", ChildModel: &db.AIApplicationDataSource{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "ai_application_id", ParentTable: "ai_applications", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_custom_tools", ChildModel: &db.AIApplicationCustomTool{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "ai_application_id", ParentTable: "ai_applications", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_tool_logs", ChildModel: &db.AIApplicationToolLog{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "ai_application_id", ParentTable: "ai_applications", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_pending_writes", ChildModel: &db.AIApplicationPendingWrite{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "ai_application_id", ParentTable: "ai_applications", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_data_sources (by repository)", ChildModel: &db.AIApplicationDataSource{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_pending_writes (by repository)", ChildModel: &db.AIApplicationPendingWrite{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 8: Unreferenced workflowables
		// =============================================================
		{
			Name: "schedules (unreferenced)", ChildModel: &db.Schedule{},
			Type: orphanByUnreferenced, HasSoftDelete: true,
			ReferencingTable: "workflows", ReferencingColumn: "schedule_id",
		},
		{
			Name: "import_workflowables (unreferenced)", ChildModel: &db.ImportWorkflowable{},
			Type: orphanByUnreferenced, HasSoftDelete: true,
			ReferencingTable: "workflows", ReferencingColumn: "import_id",
		},
		{
			Name: "export_workflowables (unreferenced)", ChildModel: &db.ExportWorkflowable{},
			Type: orphanByUnreferenced, HasSoftDelete: true,
			ReferencingTable: "workflows", ReferencingColumn: "export_id",
		},
		{
			Name: "action_workflowables (unreferenced)", ChildModel: &db.ActionWorkflowable{},
			Type: orphanByUnreferenced, HasSoftDelete: true,
			ReferencingTable: "workflows", ReferencingColumn: "action_id",
		},
		{
			Name: "pipeline_workflowables (unreferenced)", ChildModel: &db.PipelineWorkflowable{},
			Type: orphanByUnreferenced, HasSoftDelete: true,
			ReferencingTable: "workflows", ReferencingColumn: "pipeline_id",
		},

		// =============================================================
		// Phase 9: Children of workflowables
		// =============================================================
		{
			Name: "workflow_triggers (by schedule)", ChildModel: &db.WorkflowTrigger{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "schedule_id", ParentTable: "schedules", ParentHasSoftDelete: true,
		},
		{
			Name: "pipeline_stages", ChildModel: &db.PipelineStage{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "pipeline_id", ParentTable: "pipeline_workflowables", ParentHasSoftDelete: true,
		},
		{
			Name: "action_workflowable_inputs (by action)", ChildModel: &db.ActionWorkflowableInput{},
			Type: orphanByParent, HasSoftDelete: true,
			FKColumn: "action_workflowable_id", ParentTable: "action_workflowables", ParentHasSoftDelete: true,
		},

		// =============================================================
		// Phase 10: Junction tables (hard-delete, both FK sides)
		// =============================================================
		{
			Name: "query_tags (by query)", ChildModel: &db.QueryTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "stored_query_id", ParentTable: "stored_queries", ParentHasSoftDelete: true,
		},
		{
			Name: "query_tags (by tag)", ChildModel: &db.QueryTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
		{
			Name: "script_tags (by script)", ChildModel: &db.ScriptTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "stored_script_id", ParentTable: "stored_scripts", ParentHasSoftDelete: true,
		},
		{
			Name: "script_tags (by tag)", ChildModel: &db.ScriptTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
		{
			Name: "repository_tags (by repository)", ChildModel: &db.RepositoryTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "repository_id", ParentTable: "repositories", ParentHasSoftDelete: true,
		},
		{
			Name: "repository_tags (by tag)", ChildModel: &db.RepositoryTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
		{
			Name: "workflow_tags (by workflow)", ChildModel: &db.WorkflowTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "workflow_id", ParentTable: "workflows", ParentHasSoftDelete: true,
		},
		{
			Name: "workflow_tags (by tag)", ChildModel: &db.WorkflowTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
		{
			Name: "connection_tags (by connection)", ChildModel: &db.ConnectionTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "connection_id", ParentTable: "connections", ParentHasSoftDelete: true,
		},
		{
			Name: "connection_tags (by tag)", ChildModel: &db.ConnectionTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
		{
			Name: "repository_object_tags (by object)", ChildModel: &db.RepositoryObjectTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "repository_object_id", ParentTable: "repository_objects", ParentHasSoftDelete: true,
		},
		{
			Name: "repository_object_tags (by tag)", ChildModel: &db.RepositoryObjectTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_tags (by app)", ChildModel: &db.AIApplicationTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "ai_application_id", ParentTable: "ai_applications", ParentHasSoftDelete: true,
		},
		{
			Name: "ai_application_tags (by tag)", ChildModel: &db.AIApplicationTag{},
			Type: orphanByParent, HasSoftDelete: false,
			FKColumn: "tag_id", ParentTable: "tags", ParentHasSoftDelete: true,
		},
	}
}
