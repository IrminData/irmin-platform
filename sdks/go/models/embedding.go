package irminmodels

// EmbeddingConfig holds the configuration for embedding generation.
type EmbeddingConfig struct {
	Model      string `json:"model"                validate:"omitempty,max=100" example:"text-embedding-3-small"` // OpenAI embedding model (e.g., "text-embedding-3-small", "text-embedding-3-large")
	Dimensions int    `json:"dimensions,omitempty" validate:"omitempty,min=0"   example:"1536"`                   // Embedding dimensions (e.g., 1536, 3072)
	ChunkSize  int    `json:"chunk_size,omitempty" validate:"omitempty,min=0"   example:"1000"`                   // Text chunk size for splitting large documents
	Overlap    int    `json:"overlap,omitempty"    validate:"omitempty,min=0"   example:"200"`                    // Overlap between consecutive chunks
}

// EmbeddingFile represents metadata about an embedding file stored in a repository.
type EmbeddingFile struct {
	Path        string   `json:"path"                 validate:"required"            example:"embeddings/documents.parquet"` // Path to the embedding file in the repository
	SourceFiles []string `json:"source_files"         validate:"required,min=1,dive" example:"data/documents/doc1.pdf"`      // List of source files that were vectorized
	Model       string   `json:"model"                validate:"required,max=100"    example:"text-embedding-3-small"`       // OpenAI model used to generate embeddings
	Dimensions  int      `json:"dimensions"           validate:"required,min=0"      example:"1536"`                         // Vector dimensions
	ChunkCount  int      `json:"chunk_count"          validate:"required,min=0"      example:"42"`                           // Total number of embedding chunks
	SizeBytes   int64    `json:"size_bytes"           validate:"required,min=0"      example:"524288"`                       // File size in bytes
	CreatedAt   string   `json:"created_at,omitempty" validate:"omitempty"           example:"2025-12-01T14:22:30Z"`         // Creation timestamp
	Ref         string   `json:"ref,omitempty"        validate:"omitempty,max=100"   example:"main"`                         // Repository reference (branch/tag/commit)
}

// EmbeddingSearchResult represents a single search result from vector similarity search.
type EmbeddingSearchResult struct {
	ID         string            `json:"id"          validate:"required"    example:"550e8400-e29b-41d4-a716-446655440000"`  // Unique ID for the embedding chunk
	Content    string            `json:"content"     validate:"required"    example:"Machine learning is a subset of AI..."` // The actual text content of the chunk
	SourceFile string            `json:"source_file" validate:"required"    example:"data/documents/doc1.pdf"`               // Original source file name
	ChunkIndex int               `json:"chunk_index" validate:"min=0"       example:"5"`                                     // Sequential chunk number within the source file
	Score      float64           `json:"score"       validate:"min=0,max=1" example:"0.92"`                                  // Cosine similarity score (0-1, higher is better)
	Distance   float64           `json:"distance"    validate:"min=0"       example:"0.08"`                                  // Cosine distance (0-2, lower is better)
	Metadata   map[string]string `json:"metadata"    validate:"omitempty"`                                                   // Custom metadata associated with the chunk
}

// EmbeddingSearchResponse represents the response from a vector similarity search.
type EmbeddingSearchResponse struct {
	Results []EmbeddingSearchResult `json:"results" validate:"required,dive"`                                        // List of search results
	Query   string                  `json:"query"   validate:"required"         example:"What is machine learning?"` // The original query text
	Model   string                  `json:"model"   validate:"required,max=100" example:"text-embedding-3-small"`    // Model used for the query embedding
	TopK    int                     `json:"top_k"   validate:"required,min=1"   example:"10"`                        // Number of results requested
}
