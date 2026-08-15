import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const conversations = pgTable(
  'conversations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    title: text('title').notNull(),
    titleStatus: text('title_status').notNull().default('pending'),
    metadata: jsonb('metadata').default({}),
    context: jsonb('context').default({}),

    // Agent association
    agentId: text('agent_id'),
    runtimeVersion: integer('runtime_version').notNull().default(1),
    modelProfileVersion: text('model_profile_version')
      .notNull()
      .default('legacy-direct-v1'),

    // Workspace and user association
    workspaceSlug: text('workspace_slug').notNull(),
    userId: text('user_id').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_conversations_workspace_slug').on(table.workspaceSlug),
    index('idx_conversations_user_id').on(table.userId),
    index('idx_conversations_agent_id').on(table.agentId),
    index('idx_conversations_workspace_user_created').on(
      table.workspaceSlug,
      table.userId,
      table.createdAt.desc()
    ),
  ]
);

export const modelRuns = pgTable(
  'model_runs',
  {
    runId: text('run_id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    conversationId: text('conversation_id').references(() => conversations.id, {
      onDelete: 'cascade',
    }),
    messageId: text('message_id'),
    workspaceSlug: text('workspace_slug').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    profileVersion: text('profile_version').notNull(),
    requestedModel: text('requested_model'),
    resolvedModel: text('resolved_model'),
    resolvedProvider: text('resolved_provider'),
    status: text('status').notNull(),
    fallbackIndex: integer('fallback_index').notNull().default(0),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),
    openRouterCost: numeric('openrouter_cost', {
      precision: 18,
      scale: 10,
    }),
    latencyMs: integer('latency_ms'),
    timeToFirstTokenMs: integer('time_to_first_token_ms'),
    errorCode: text('error_code'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('model_runs_conversation_created_idx').on(
      table.conversationId,
      table.createdAt.desc()
    ),
    index('model_runs_workspace_status_idx').on(
      table.workspaceSlug,
      table.status
    ),
  ]
);

export const messageFeedback = pgTable(
  'message_feedback',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    runId: text('run_id').references(() => modelRuns.runId, {
      onDelete: 'set null',
    }),
    messageId: text('message_id').notNull(),
    workspaceSlug: text('workspace_slug').notNull(),
    userId: text('user_id').notNull(),
    rating: integer('rating').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('message_feedback_user_message_unique').on(
      table.userId,
      table.conversationId,
      table.messageId
    ),
    index('message_feedback_conversation_idx').on(table.conversationId),
  ]
);

export const aiModels = pgTable('ai_models', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').notNull(),
  provider: text('provider').notNull(), // 'openai', 'groq', 'anthropic', etc.
  modelId: text('model_id').notNull().unique(), // actual model identifier
  description: text('description').notNull(), // model description

  // Pricing information (per 1M tokens)
  inputPricePerMillionTokens: real('input_price_per_million_tokens').default(0),
  outputPricePerMillionTokens: real('output_price_per_million_tokens').default(
    0
  ),

  // Metadata
  metadata: jsonb('metadata').default({}),

  // Status
  isActive: boolean('is_active').default(true),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analytics = pgTable(
  'analytics',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),

    // Event information
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data').default({}),

    // Optional references
    conversationId: text('conversation_id').references(() => conversations.id, {
      onDelete: 'cascade',
    }),
    aiModelId: integer('ai_model_id').references(() => aiModels.id, {
      onDelete: 'set null',
    }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_analytics_conversation_id').on(table.conversationId),
    index('idx_analytics_ai_model_id').on(table.aiModelId),
  ]
);

export const vectorCollections = pgTable(
  'vector_collections',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => ulid()),

    // Collection identification
    name: text('name').notNull().unique(),
    description: text('description'),

    // Collection metadata
    embeddingModel: text('embedding_model')
      .notNull()
      .default('text-embedding-3-small'),
    embeddingDimensions: integer('embedding_dimensions')
      .notNull()
      .default(1536),

    // Access control and organization
    workspaceSlug: text('workspace_slug'), // Nullable for system collections
    createdBy: text('created_by'), // Nullable for system collections
    isSystemCollection: boolean('is_system_collection').default(false), // Flag for system collections

    // Collection status and metadata
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata').default({}),

    // Statistics
    documentCount: integer('document_count').default(0),
    lastIndexedAt: timestamp('last_indexed_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_vector_collections_workspace_slug').on(table.workspaceSlug),
    index('idx_vector_collections_created_by').on(table.createdBy),
    index('idx_vector_collections_workspace_active').on(
      table.workspaceSlug,
      table.isActive,
      table.createdAt.desc()
    ),
  ]
);

// Export types
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ModelRun = typeof modelRuns.$inferSelect;
export type NewModelRun = typeof modelRuns.$inferInsert;

export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type NewMessageFeedback = typeof messageFeedback.$inferInsert;

export type AIModel = typeof aiModels.$inferSelect;
export type NewAIModel = typeof aiModels.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

export type VectorCollection = typeof vectorCollections.$inferSelect;
export type NewVectorCollection = typeof vectorCollections.$inferInsert;
