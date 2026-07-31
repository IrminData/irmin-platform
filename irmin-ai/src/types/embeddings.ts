import { z } from 'zod';

// Collection Management Schemas
export const CreateCollectionRequestSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(100),
  description: z.string().optional(),
  vectorStoreUrl: z.string().optional(),
  embeddingModel: z.string().default('text-embedding-3-small'),
  embeddingDimensions: z.number().int().min(1).default(1536),
  workspaceSlug: z.string().optional(), // Optional for system collections
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateCollectionRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  vectorStoreUrl: z.string().optional(),
  embeddingModel: z.string().optional(),
  embeddingDimensions: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Document Indexing Schemas
export const IndexDocumentsRequestSchema = z.object({
  documents: z
    .array(
      z.object({
        pageContent: z.string().min(1, 'Page content cannot be empty'),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1, 'At least one document is required'),
});

// Embedding Creation Schemas
export const CreateEmbeddingRequestSchema = z.object({
  text: z.string().min(1, 'Text content is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CreateEmbeddingsRequestSchema = z.object({
  texts: z.array(z.string().min(1)).min(1, 'At least one text is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Search and Retrieval Schemas
export const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  k: z.number().min(1).max(100).default(5),
  filter: z.record(z.string(), z.unknown()).optional(),
  scoreThreshold: z.number().min(0).max(1).optional(),
});

export const RetrieveContextRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  maxDocuments: z.number().min(1).max(50).default(5),
  scoreThreshold: z.number().min(0).max(1).default(0.0),
  includeMetadata: z.boolean().default(false),
  maxTokens: z.number().min(1).max(10000).default(4000),
  useHyde: z.boolean().default(true), // Use HyDE by default for better retrieval quality
  reason: z.string().optional(), // Optional debugging context explaining why search is needed
});

// Type exports
export type CreateCollectionRequest = z.infer<
  typeof CreateCollectionRequestSchema
>;
export type UpdateCollectionRequest = z.infer<
  typeof UpdateCollectionRequestSchema
>;
export type IndexDocumentsRequest = z.infer<typeof IndexDocumentsRequestSchema>;
export type CreateEmbeddingRequest = z.infer<
  typeof CreateEmbeddingRequestSchema
>;
export type CreateEmbeddingsRequest = z.infer<
  typeof CreateEmbeddingsRequestSchema
>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type RetrieveContextRequest = z.infer<
  typeof RetrieveContextRequestSchema
>;
