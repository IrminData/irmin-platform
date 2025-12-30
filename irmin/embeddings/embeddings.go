package embeddings

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

// Default configuration values.
const (
	DefaultModel      = "text-embedding-3-small"
	DefaultDimensions = 1536
	DefaultChunkSize  = 1000
	DefaultOverlap    = 200
)

// EmbeddingConfig holds the configuration for embedding generation.
type EmbeddingConfig struct {
	Model      string // OpenAI embedding model (e.g., "text-embedding-3-small", "text-embedding-3-large")
	Dimensions int    // Embedding dimensions (e.g., 1536, 3072)
	ChunkSize  int    // Text chunk size for splitting large documents
	Overlap    int    // Overlap between consecutive chunks
}

// DefaultConfig returns the default embedding configuration.
func DefaultConfig() EmbeddingConfig {
	return EmbeddingConfig{
		Model:      DefaultModel,
		Dimensions: DefaultDimensions,
		ChunkSize:  DefaultChunkSize,
		Overlap:    DefaultOverlap,
	}
}

// EmbeddingRecord represents a single embedding with its associated metadata.
type EmbeddingRecord struct {
	ID         string            `json:"id"`
	SourceFile string            `json:"source_file"`
	ChunkIndex int               `json:"chunk_index"`
	Content    string            `json:"content"`
	Embedding  []float32         `json:"embedding"`
	Metadata   map[string]string `json:"metadata"`
	CreatedAt  time.Time         `json:"created_at"`
}

// EmbeddingResult represents the result of an embedding operation.
type EmbeddingResult struct {
	Records     []EmbeddingRecord `json:"records"`
	TotalChunks int               `json:"total_chunks"`
	Model       string            `json:"model"`
	Dimensions  int               `json:"dimensions"`
}

// Client provides methods for creating and managing embeddings.
type Client struct {
	openaiClient openai.Client
	duckDBClient *duckdb.QueryClient
	lakeFSClient *lakefs.Client
	logger       *slog.Logger
	env          *utils.CoreAPIEnv
}

// NewClient creates a new embeddings client with the provided dependencies.
func NewClient(
	ctx context.Context,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
	lakeFSClient *lakefs.Client,
) (*Client, error) {
	if env == nil {
		return nil, errors.New("env cannot be nil")
	}
	if logger == nil {
		return nil, errors.New("logger cannot be nil")
	}
	if env.OpenAIAPIKey == "" {
		return nil, errors.New("OpenAI API key is required")
	}

	// Initialize OpenAI client
	openaiClient := openai.NewClient(
		option.WithAPIKey(env.OpenAIAPIKey),
	)

	// Initialize DuckDB client for vector operations
	duckDBClient, err := duckdb.NewQueryClient(ctx, env, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}

	return &Client{
		openaiClient: openaiClient,
		duckDBClient: duckDBClient,
		lakeFSClient: lakeFSClient,
		logger:       logger,
		env:          env,
	}, nil
}

// Close releases resources held by the client.
func (c *Client) Close() error {
	if c.duckDBClient != nil {
		return c.duckDBClient.Close()
	}
	return nil
}

// CreateEmbeddings generates embeddings for the provided texts using OpenAI API.
func (c *Client) CreateEmbeddings(
	ctx context.Context,
	texts []string,
	config EmbeddingConfig,
) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, errors.New("texts cannot be empty")
	}

	// Apply defaults if not specified
	if config.Model == "" {
		config.Model = DefaultModel
	}
	if config.Dimensions == 0 {
		config.Dimensions = DefaultDimensions
	}

	c.logger.InfoContext(ctx, "creating embeddings",
		"text_count", len(texts),
		"model", config.Model,
		"dimensions", config.Dimensions,
	)

	// Create embedding request
	response, err := c.openaiClient.Embeddings.New(ctx, openai.EmbeddingNewParams{
		Input:          openai.EmbeddingNewParamsInputUnion{OfArrayOfStrings: texts},
		Model:          config.Model,
		Dimensions:     openai.Int(int64(config.Dimensions)),
		EncodingFormat: openai.EmbeddingNewParamsEncodingFormatFloat,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create embeddings: %w", err)
	}

	// Extract embeddings from response
	embeddings := make([][]float32, len(response.Data))
	for _, data := range response.Data {
		// Convert float64 to float32
		embedding := make([]float32, len(data.Embedding))
		for j, v := range data.Embedding {
			embedding[j] = float32(v)
		}
		// Use data.Index to correctly map embeddings to input texts
		// The API may not return embeddings in the same order as inputs
		embeddings[data.Index] = embedding
	}

	c.logger.InfoContext(ctx, "embeddings created successfully",
		"embedding_count", len(embeddings),
		"usage_tokens", response.Usage.TotalTokens,
	)

	return embeddings, nil
}

// CreateEmbeddingsFromFile extracts text from a file and generates embeddings.
func (c *Client) CreateEmbeddingsFromFile(
	ctx context.Context,
	fileContent []byte,
	fileName string,
	config EmbeddingConfig,
) (*EmbeddingResult, error) {
	if len(fileContent) == 0 {
		return nil, errors.New("file content cannot be empty")
	}
	if fileName == "" {
		return nil, errors.New("file name cannot be empty")
	}

	// Apply defaults
	if config.Model == "" {
		config.Model = DefaultModel
	}
	if config.Dimensions == 0 {
		config.Dimensions = DefaultDimensions
	}
	if config.ChunkSize == 0 {
		config.ChunkSize = DefaultChunkSize
	}
	if config.Overlap == 0 {
		config.Overlap = DefaultOverlap
	}

	c.logger.InfoContext(ctx, "creating embeddings from file",
		"file_name", fileName,
		"file_size", len(fileContent),
		"model", config.Model,
	)

	// Extract text from file
	texts, err := ExtractTextFromFile(ctx, c.duckDBClient, fileContent, fileName)
	if err != nil {
		return nil, fmt.Errorf("failed to extract text from file: %w", err)
	}

	if len(texts) == 0 {
		return nil, errors.New("no text content extracted from file")
	}

	// Chunk the texts
	var allChunks []string
	for _, text := range texts {
		chunks := ChunkText(text, config.ChunkSize, config.Overlap)
		allChunks = append(allChunks, chunks...)
	}

	if len(allChunks) == 0 {
		return nil, errors.New("no chunks generated from text content")
	}

	c.logger.InfoContext(ctx, "text chunked",
		"original_texts", len(texts),
		"total_chunks", len(allChunks),
	)

	// Generate embeddings for all chunks
	embeddings, err := c.CreateEmbeddings(ctx, allChunks, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create embeddings for chunks: %w", err)
	}

	// Validate that we received embeddings for all chunks
	if len(embeddings) != len(allChunks) {
		return nil, fmt.Errorf(
			"embedding count mismatch: expected %d, got %d",
			len(allChunks), len(embeddings),
		)
	}

	// Create embedding records
	now := time.Now()
	records := make([]EmbeddingRecord, len(allChunks))
	for i, chunk := range allChunks {
		records[i] = EmbeddingRecord{
			ID:         uuid.New().String(),
			SourceFile: fileName,
			ChunkIndex: i,
			Content:    chunk,
			Embedding:  embeddings[i],
			Metadata:   make(map[string]string),
			CreatedAt:  now,
		}
	}

	return &EmbeddingResult{
		Records:     records,
		TotalChunks: len(records),
		Model:       config.Model,
		Dimensions:  config.Dimensions,
	}, nil
}

// CreateEmbeddingForQuery generates a single embedding for a query text.
func (c *Client) CreateEmbeddingForQuery(
	ctx context.Context,
	query string,
	config EmbeddingConfig,
) ([]float32, error) {
	if query == "" {
		return nil, errors.New("query cannot be empty")
	}

	embeddings, err := c.CreateEmbeddings(ctx, []string{query}, config)
	if err != nil {
		return nil, err
	}

	if len(embeddings) == 0 {
		return nil, errors.New("no embedding generated for query")
	}

	return embeddings[0], nil
}
