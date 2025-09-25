import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  metadata: jsonb('metadata').default({}),

  // Agent association (null for regular chat conversations)
  agentId: text('agent_id'),

  // Workspace and user association
  workspaceSlug: text('workspace_slug').notNull(),
  userId: text('user_id').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),

  // Message block structure
  messageType: text('message_type', {
    enum: [
      'text',
      'tool_call',
      'tool_result',
      'reasoning',
      'source',
      'file',
      'error',
      'system',
    ],
  }).default('text'),
  blockId: text('block_id'), // For grouping related blocks (e.g., tool call + result)
  parentBlockId: text('parent_block_id'), // For nested blocks
  blockOrder: integer('block_order').default(0), // For ordering within a response

  // AI model information
  aiModelId: text('ai_model_id'),
  modelProvider: text('model_provider'), // 'openai', 'groq', 'anthropic', etc.
  modelName: text('model_name'),

  // Agent information
  agentName: text('agent_name'), // Name of the agent that generated this message

  // Token usage and costs
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  costUSD: real('cost_dollars').default(0),

  // Performance metrics
  processingTimeMs: integer('processing_time_ms').default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export const analytics = pgTable('analytics', {
  id: text('id').primaryKey(),

  // Event information
  eventType: text('event_type', {
    enum: [
      'conversation_created',
      'conversation_updated',
      'conversation_deleted',
      'message_sent',
      'agent_used',
      'model_used',
      'error_occurred',
      'vector_operation',
    ],
  }).notNull(),
  eventData: jsonb('event_data').default({}),

  // Optional references
  conversationId: text('conversation_id').references(() => conversations.id, {
    onDelete: 'cascade',
  }),
  messageId: text('message_id').references(() => messages.id, {
    onDelete: 'cascade',
  }),
  aiModelId: integer('ai_model_id').references(() => aiModels.id, {
    onDelete: 'set null',
  }),

  // Metrics
  tokenCount: integer('token_count').default(0),
  costUSD: real('cost_dollars').default(0),
  processingTimeMs: integer('processing_time_ms').default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vectorCollections = pgTable('vector_collections', {
  id: text('id').primaryKey(),

  // Collection identification
  name: text('name').notNull().unique(),
  description: text('description'),

  // Vector store configuration
  vectorStoreUrl: text('vector_store_url').notNull(),
  vectorStoreApiKey: text('vector_store_api_key'),

  // Collection metadata
  embeddingModel: text('embedding_model')
    .notNull()
    .default('text-embedding-3-small'),
  embeddingDimensions: integer('embedding_dimensions').notNull().default(1536),

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
});

// Export types
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type AIModel = typeof aiModels.$inferSelect;
export type NewAIModel = typeof aiModels.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

export type VectorCollection = typeof vectorCollections.$inferSelect;
export type NewVectorCollection = typeof vectorCollections.$inferInsert;
