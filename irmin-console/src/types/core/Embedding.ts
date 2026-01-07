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
