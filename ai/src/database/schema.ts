import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { ulid } from 'ulid';

export const conversations = pgTable('conversations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => ulid()),
  title: text('title').notNull(),
  metadata: jsonb('metadata').default({}),
  context: jsonb('context').default({}),

  // Agent association
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
});

export const vectorCollections = pgTable('vector_collections', {
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

export type AIModel = typeof aiModels.$inferSelect;
export type NewAIModel = typeof aiModels.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;

export type VectorCollection = typeof vectorCollections.$inferSelect;
export type NewVectorCollection = typeof vectorCollections.$inferInsert;
