package db

import (
	"fmt"
)

// CreateSearchIndexes creates indexes to optimize search performance.
func (d *Database) CreateSearchIndexes() error {
	indexes := []string{
		// Full-text search indexes for better performance
		"CREATE INDEX IF NOT EXISTS idx_workflows_search ON workflows USING gin(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(documentation, '')))",
		"CREATE INDEX IF NOT EXISTS idx_repositories_search ON repositories USING gin(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(documentation, '')))",
		"CREATE INDEX IF NOT EXISTS idx_connections_search ON connections USING gin(to_tsvector('english', name || ' ' || description))",
		"CREATE INDEX IF NOT EXISTS idx_stored_queries_search ON stored_queries USING gin(to_tsvector('english', name || ' ' || description || ' ' || COALESCE(sql, '')))",
		"CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email || ' ' || COALESCE(company, '')))",
		"CREATE INDEX IF NOT EXISTS idx_repository_objects_search ON repository_objects USING gin(to_tsvector('english', name || ' ' || path || ' ' || COALESCE(content_type, '')))",
		"CREATE INDEX IF NOT EXISTS idx_invites_search ON invites USING gin(to_tsvector('english', email || ' ' || COALESCE(clerk_id, '')))",

		// Additional indexes for better search performance
		"CREATE INDEX IF NOT EXISTS idx_invites_email_lower ON invites (LOWER(email))",
		"CREATE INDEX IF NOT EXISTS idx_invites_clerk_id_lower ON invites (LOWER(clerk_id))",
		"CREATE INDEX IF NOT EXISTS idx_workflows_name_lower ON workflows (LOWER(name))",
		"CREATE INDEX IF NOT EXISTS idx_repositories_name_lower ON repositories (LOWER(name))",
		"CREATE INDEX IF NOT EXISTS idx_connections_name_lower ON connections (LOWER(name))",
		"CREATE INDEX IF NOT EXISTS idx_stored_queries_name_lower ON stored_queries (LOWER(name))",
		"CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))",
		"CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users (LOWER(first_name), LOWER(last_name))",

		// Composite indexes for common filter combinations
		"CREATE INDEX IF NOT EXISTS idx_workflows_workspace_created ON workflows (workspace_id, created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_repositories_workspace_created ON repositories (workspace_id, created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_connections_workspace_created ON connections (workspace_id, created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_stored_queries_workspace_created ON stored_queries (workspace_id, created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_repository_objects_repo_created ON repository_objects (repository_id, created_at DESC)",
		"CREATE INDEX IF NOT EXISTS idx_invites_workspace_created ON invites (workspace_id, created_at DESC)",

		// Owner indexes for filtering
		"CREATE INDEX IF NOT EXISTS idx_workflows_owner ON workflows (owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories (owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_connections_owner ON connections (owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_stored_queries_owner ON stored_queries (owner_id)",

		// Tag junction table indexes
		"CREATE INDEX IF NOT EXISTS idx_workflow_tags_workflow ON workflow_tags (workflow_id)",
		"CREATE INDEX IF NOT EXISTS idx_workflow_tags_tag ON workflow_tags (tag_id)",
		"CREATE INDEX IF NOT EXISTS idx_repository_tags_repository ON repository_tags (repository_id)",
		"CREATE INDEX IF NOT EXISTS idx_repository_tags_tag ON repository_tags (tag_id)",
		"CREATE INDEX IF NOT EXISTS idx_connection_tags_connection ON connection_tags (connection_id)",
		"CREATE INDEX IF NOT EXISTS idx_connection_tags_tag ON connection_tags (tag_id)",
		"CREATE INDEX IF NOT EXISTS idx_query_tags_query ON query_tags (stored_query_id)",
		"CREATE INDEX IF NOT EXISTS idx_query_tags_tag ON query_tags (tag_id)",
		"CREATE INDEX IF NOT EXISTS idx_repository_object_tags_object ON repository_object_tags (repository_object_id)",
		"CREATE INDEX IF NOT EXISTS idx_repository_object_tags_tag ON repository_object_tags (tag_id)",

		// Workspace user indexes
		"CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace ON workspace_users (workspace_id)",
		"CREATE INDEX IF NOT EXISTS idx_workspace_users_user ON workspace_users (user_id)",

		// Repository object indexes
		"CREATE INDEX IF NOT EXISTS idx_repository_objects_repository ON repository_objects (repository_id)",
		"CREATE INDEX IF NOT EXISTS idx_repository_objects_parent ON repository_objects (parent_id)",
	}

	for _, indexSQL := range indexes {
		if err := d.Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

// DropSearchIndexes drops the search indexes (useful for testing or cleanup).
func (d *Database) DropSearchIndexes() error {
	indexes := []string{
		"DROP INDEX IF EXISTS idx_workflows_search",
		"DROP INDEX IF EXISTS idx_repositories_search",
		"DROP INDEX IF EXISTS idx_connections_search",
		"DROP INDEX IF EXISTS idx_stored_queries_search",
		"DROP INDEX IF EXISTS idx_users_search",
		"DROP INDEX IF EXISTS idx_repository_objects_search",
		"DROP INDEX IF EXISTS idx_invites_search",
		"DROP INDEX IF EXISTS idx_invites_email_lower",
		"DROP INDEX IF EXISTS idx_invites_clerk_id_lower",
		"DROP INDEX IF EXISTS idx_workflows_name_lower",
		"DROP INDEX IF EXISTS idx_repositories_name_lower",
		"DROP INDEX IF EXISTS idx_connections_name_lower",
		"DROP INDEX IF EXISTS idx_stored_queries_name_lower",
		"DROP INDEX IF EXISTS idx_users_email_lower",
		"DROP INDEX IF EXISTS idx_users_name_lower",
		"DROP INDEX IF EXISTS idx_workflows_workspace_created",
		"DROP INDEX IF EXISTS idx_repositories_workspace_created",
		"DROP INDEX IF EXISTS idx_connections_workspace_created",
		"DROP INDEX IF EXISTS idx_stored_queries_workspace_created",
		"DROP INDEX IF EXISTS idx_repository_objects_repo_created",
		"DROP INDEX IF EXISTS idx_invites_workspace_created",
		"DROP INDEX IF EXISTS idx_workflows_owner",
		"DROP INDEX IF EXISTS idx_repositories_owner",
		"DROP INDEX IF EXISTS idx_connections_owner",
		"DROP INDEX IF EXISTS idx_stored_queries_owner",
		"DROP INDEX IF EXISTS idx_workflow_tags_workflow",
		"DROP INDEX IF EXISTS idx_workflow_tags_tag",
		"DROP INDEX IF EXISTS idx_repository_tags_repository",
		"DROP INDEX IF EXISTS idx_repository_tags_tag",
		"DROP INDEX IF EXISTS idx_connection_tags_connection",
		"DROP INDEX IF EXISTS idx_connection_tags_tag",
		"DROP INDEX IF EXISTS idx_query_tags_query",
		"DROP INDEX IF EXISTS idx_query_tags_tag",
		"DROP INDEX IF EXISTS idx_repository_object_tags_object",
		"DROP INDEX IF EXISTS idx_repository_object_tags_tag",
		"DROP INDEX IF EXISTS idx_workspace_users_workspace",
		"DROP INDEX IF EXISTS idx_workspace_users_user",
		"DROP INDEX IF EXISTS idx_repository_objects_repository",
		"DROP INDEX IF EXISTS idx_repository_objects_parent",
	}

	for _, indexSQL := range indexes {
		if err := d.Exec(indexSQL).Error; err != nil {
			return fmt.Errorf("failed to drop index: %w", err)
		}
	}

	return nil
}
