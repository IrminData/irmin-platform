-- Performance indexes for frequently queried columns
-- Based on Supabase Postgres best practices

-- Foreign key indexes (CRITICAL - 10-100x faster JOINs and CASCADE operations)
CREATE INDEX IF NOT EXISTS idx_analytics_conversation_id ON analytics (conversation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_ai_model_id ON analytics (ai_model_id);

-- Frequently filtered columns on conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_slug ON conversations (workspace_slug);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations (agent_id);

-- Frequently filtered columns on vector_collections table
CREATE INDEX IF NOT EXISTS idx_vector_collections_workspace_slug ON vector_collections (workspace_slug);
CREATE INDEX IF NOT EXISTS idx_vector_collections_created_by ON vector_collections (created_by);

-- Composite index for common conversation list queries (workspace + user + time ordering)
CREATE INDEX IF NOT EXISTS idx_conversations_workspace_user_created ON conversations (workspace_slug, user_id, created_at DESC);

-- Composite index for workspace-scoped collection lookups
CREATE INDEX IF NOT EXISTS idx_vector_collections_workspace_active ON vector_collections (workspace_slug, is_active, created_at DESC);
