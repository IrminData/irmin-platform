/**
 * Configuration options for embedding generation.
 */
export interface EmbeddingConfig {
  /** OpenAI embedding model (e.g., "text-embedding-3-small", "text-embedding-3-large") */
  model?: string;
  /** Embedding dimensions (e.g., 1536, 3072) */
  dimensions?: number;
  /** Text chunk size for splitting large documents */
  chunk_size?: number;
  /** Overlap between consecutive chunks */
  overlap?: number;
}

/**
 * Represents metadata about an embedding file stored in a repository.
 */
export interface EmbeddingFile {
  /** Path to the embedding file in the repository */
  path: string;
  /** List of source files that were vectorized */
  source_files: string[];
  /** OpenAI model used to generate embeddings */
  model: string;
  /** Vector dimensions */
  dimensions: number;
  /** Total number of embedding chunks */
  chunk_count: number;
  /** File size in bytes */
  size_bytes: number;
  /** Creation timestamp */
  created_at?: string;
  /** Repository reference (branch/tag/commit) */
  ref?: string;
}

/**
 * Represents a single search result from vector similarity search.
 */
export interface EmbeddingSearchResult {
  /** Unique ID for the embedding chunk */
  id: string;
  /** The actual text content of the chunk */
  content: string;
  /** SHA-256 hash of content for deduplication */
  content_hash?: string;
  /** Original source file name */
  source_file: string;
  /** Sequential chunk number within the source file */
  chunk_index: number;
  /** Cosine similarity score (0-1, higher is better) */
  score: number;
  /** Cosine distance (0-2, lower is better) */
  distance: number;
  /** Custom metadata associated with the chunk */
  metadata?: Record<string, string>;
  /** Priority for RAG retrieval (0.0-1.0, higher is favored) */
  priority?: number;
}

/**
 * Response from a vector similarity search.
 */
export interface EmbeddingSearchResponse {
  /** List of search results */
  results: EmbeddingSearchResult[];
  /** The original query text */
  query: string;
  /** Model used for the query embedding */
  model: string;
  /** Number of results requested */
  top_k: number;
}

/**
 * A single embedding item for upsert operations.
 */
export interface UpsertEmbeddingItem {
  /** Text content to embed */
  text: string;
  /** Optional source file path */
  source_file?: string;
  /** Optional chunk index within source file */
  source_chunk?: number;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Priority for RAG retrieval (0.0-1.0) */
  priority?: number;
}

/**
 * Request body for upserting embeddings.
 */
export interface UpsertEmbeddingsRequest {
  /** List of source file paths to vectorize (optional if embeddings provided) */
  source_paths?: string[];
  /** Pre-defined embedding items (optional if source_paths provided) */
  embeddings?: UpsertEmbeddingItem[];
  /** Output path for the embedding file */
  output_path: string;
  /** Repository reference (branch/tag/commit) */
  ref?: string;
  /** Optional embedding configuration */
  config?: EmbeddingConfig;
  /** Metadata to apply to all embeddings */
  metadata?: Record<string, string>;
  /** Default priority for all embeddings */
  priority?: number;
}

/**
 * Response from an upsert operation.
 */
export interface UpsertEmbeddingsResponse {
  /** Number of new embeddings inserted */
  inserted: number;
  /** Number of embeddings skipped (already exist) */
  skipped: number;
  /** Number of embeddings updated (metadata/priority changed) */
  updated: number;
  /** Path where embeddings were stored */
  path: string;
}

/**
 * Request to update embedding metadata.
 */
export interface UpdateEmbeddingMetadataRequest {
  /** Path to the embedding file */
  embedding_path: string;
  /** Repository reference (branch/tag/commit) */
  ref?: string;
  /** Map of embedding ID to new metadata */
  updates: Record<string, Record<string, string>>;
}

/**
 * Request to update embedding priority.
 */
export interface UpdateEmbeddingPriorityRequest {
  /** Path to the embedding file */
  embedding_path: string;
  /** Repository reference (branch/tag/commit) */
  ref?: string;
  /** Map of embedding ID to new priority */
  updates: Record<string, number>;
}
