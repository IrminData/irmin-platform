package client

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	pineconemodels "irmin-connectors/connectors/pinecone/models"
	"irmin-connectors/db"

	"github.com/pinecone-io/go-pinecone/v4/pinecone"
	"google.golang.org/protobuf/types/known/structpb"
)

const (
	// UpsertBatchSize is the maximum number of vectors to upsert in a single batch.
	UpsertBatchSize = 100
	// FetchBatchSize is the maximum number of vectors to fetch in a single batch.
	FetchBatchSize = 1000
	// DefaultTopK is the default number of results for search queries.
	DefaultTopK = 10
	// MaxTopK is the maximum allowed value for topK parameter (Pinecone API limit).
	MaxTopK = 10000
)

// PineconeClient wraps the Pinecone SDK client for connector operations.
type PineconeClient struct {
	client    *pinecone.Client
	index     *pinecone.IndexConnection
	namespace string
	logger    *slog.Logger
}

// EmbeddingRecord represents the Irmin embedding format.
type EmbeddingRecord struct {
	ID         string            `json:"id"`
	SourceFile string            `json:"source_file"`
	ChunkIndex int               `json:"chunk_index"`
	Content    string            `json:"content"`
	Embedding  []float32         `json:"embedding"`
	Metadata   map[string]string `json:"metadata"`
	CreatedAt  time.Time         `json:"created_at"`
}

// SearchResult represents a single search match from Pinecone.
type SearchResult struct {
	ID       string            `json:"id"`
	Score    float32           `json:"score"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// SearchResponse represents the response from a search query.
type SearchResponse struct {
	Query   string         `json:"query"`
	Matches []SearchResult `json:"matches"`
}

// InitPineconeClient initializes a Pinecone client from operation configuration.
func InitPineconeClient(_ any, logger *slog.Logger, operation *db.Operation) (*PineconeClient, *string, error) {
	ctx := context.Background()

	// Parse connection details (contains api_key)
	var detailsMap map[string]any
	if err := json.Unmarshal(operation.Details, &detailsMap); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal details", "error", err)
		return nil, nil, fmt.Errorf("failed to unmarshal operation details: %w", err)
	}

	connectionDetails, detailsErr := pineconemodels.NewConnectionDetailsFromMap(detailsMap)
	if detailsErr != nil {
		logger.ErrorContext(ctx, "failed to parse connection details", "error", detailsErr)
		return nil, nil, fmt.Errorf("invalid connection details: %w", detailsErr)
	}

	// Parse connection settings (contains host, namespace)
	var settingsMap map[string]any
	if settingsUnmarshalErr := json.Unmarshal(operation.Settings, &settingsMap); settingsUnmarshalErr != nil {
		logger.ErrorContext(ctx, "failed to unmarshal settings", "error", settingsUnmarshalErr)
		return nil, nil, fmt.Errorf("failed to unmarshal operation settings: %w", settingsUnmarshalErr)
	}

	connectionSettings, settingsErr := pineconemodels.NewConnectionSettingsFromMap(settingsMap)
	if settingsErr != nil {
		logger.ErrorContext(ctx, "failed to parse connection settings", "error", settingsErr)
		return nil, nil, fmt.Errorf("invalid connection settings: %w", settingsErr)
	}

	// Initialize Pinecone client
	pc, err := pinecone.NewClient(pinecone.NewClientParams{
		ApiKey: connectionDetails.APIKey,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create Pinecone client: %w", err)
	}

	// Connect to the index
	idx, err := pc.Index(pinecone.NewIndexConnParams{
		Host:      connectionSettings.Host,
		Namespace: connectionSettings.Namespace,
	})
	if err != nil {
		// Bug fix: Close the Pinecone client if index connection fails
		// Note: Pinecone SDK client doesn't have an explicit Close method,
		// but we should not leak resources if there were any.
		return nil, nil, fmt.Errorf("failed to connect to Pinecone index: %w", err)
	}

	// Get index stats for logging
	stats, err := idx.DescribeIndexStats(ctx)
	if err != nil {
		logger.WarnContext(ctx, "failed to get index stats", "error", err)
	} else {
		logger.InfoContext(ctx, "connected to Pinecone index",
			"total_vectors", stats.TotalVectorCount,
			"dimension", stats.Dimension,
			"namespace", connectionSettings.Namespace,
		)
	}

	// Bug fix: Allocate namespace on heap to avoid returning pointer to local variable
	namespace := new(string)
	*namespace = connectionSettings.Namespace

	client := &PineconeClient{
		client:    pc,
		index:     idx,
		namespace: *namespace,
		logger:    logger,
	}

	return client, namespace, nil
}

// Close releases resources held by the client.
func (c *PineconeClient) Close() error {
	// Pinecone client doesn't require explicit close
	return nil
}

// Upsert inserts or updates vectors in the Pinecone index.
func (c *PineconeClient) Upsert(ctx context.Context, records []EmbeddingRecord) error {
	if len(records) == 0 {
		return nil
	}

	// Convert records to Pinecone vectors
	vectors := make([]*pinecone.Vector, len(records))
	for i := range records {
		metadata := c.buildMetadata(records[i])
		// Make a defensive copy of the embedding slice.
		// Allocate the slice pointer explicitly on the heap to ensure
		// each vector has an independent copy that won't be affected
		// by loop variable reuse.
		embeddingPtr := new([]float32)
		*embeddingPtr = make([]float32, len(records[i].Embedding))
		copy(*embeddingPtr, records[i].Embedding)
		vectors[i] = &pinecone.Vector{
			Id:       records[i].ID,
			Values:   embeddingPtr,
			Metadata: metadata,
		}
	}

	// Upsert in batches
	for i := 0; i < len(vectors); i += UpsertBatchSize {
		end := i + UpsertBatchSize
		if end > len(vectors) {
			end = len(vectors)
		}
		batch := vectors[i:end]

		upsertedCount, err := c.index.UpsertVectors(ctx, batch)
		if err != nil {
			return fmt.Errorf("failed to upsert batch %d: %w", i/UpsertBatchSize, err)
		}

		c.logger.InfoContext(ctx, "upserted vectors",
			"batch", i/UpsertBatchSize+1,
			"count", upsertedCount,
		)
	}

	return nil
}

// buildMetadata converts an EmbeddingRecord to Pinecone metadata.
func (c *PineconeClient) buildMetadata(record EmbeddingRecord) *pinecone.Metadata {
	fields := make(map[string]*structpb.Value)

	// Add custom metadata first (so standard fields can overwrite if needed)
	for k, v := range record.Metadata {
		// Skip reserved standard field names to prevent conflicts
		if !isStandardMetadataKey(k) {
			fields[k] = structpb.NewStringValue(v)
		}
	}

	// Add standard fields (these take precedence over custom metadata)
	if record.Content != "" {
		fields["content"] = structpb.NewStringValue(record.Content)
	}
	if record.SourceFile != "" {
		fields["source_file"] = structpb.NewStringValue(record.SourceFile)
	}
	fields["chunk_index"] = structpb.NewNumberValue(float64(record.ChunkIndex))
	if !record.CreatedAt.IsZero() {
		fields["created_at"] = structpb.NewStringValue(record.CreatedAt.Format(time.RFC3339))
	}

	return &pinecone.Metadata{Fields: fields}
}

// Search performs a similarity search using a query vector.
func (c *PineconeClient) Search(ctx context.Context, queryVector []float32, topK int) (*SearchResponse, error) {
	if topK <= 0 {
		topK = DefaultTopK
	}
	if topK > MaxTopK {
		topK = MaxTopK
	}

	topKUint32 := uint32(topK) //nolint:gosec // bounds checked above
	resp, err := c.index.QueryByVectorValues(ctx, &pinecone.QueryByVectorValuesRequest{
		Vector:          queryVector,
		TopK:            topKUint32,
		IncludeMetadata: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query Pinecone: %w", err)
	}

	matches := make([]SearchResult, 0, len(resp.Matches))
	for _, match := range resp.Matches {
		result := SearchResult{
			ID:    match.Vector.Id,
			Score: match.Score,
		}
		if match.Vector.Metadata != nil {
			result.Metadata = c.extractMetadataStrings(match.Vector.Metadata)
		}
		matches = append(matches, result)
	}

	// Serialize query vector as JSON for traceability
	queryJSON, err := json.Marshal(queryVector)
	if err != nil {
		c.logger.WarnContext(ctx, "failed to marshal query vector for traceability",
			"error", err)
		// Continue with empty query field rather than failing the entire search
		queryJSON = []byte("[]")
	}

	return &SearchResponse{
		Query:   string(queryJSON),
		Matches: matches,
	}, nil
}

// FetchAll fetches all vectors from the index/namespace.
func (c *PineconeClient) FetchAll(ctx context.Context) ([]EmbeddingRecord, error) {
	var allRecords []EmbeddingRecord

	// List all vector IDs first
	var paginationToken *string
	limit := uint32(FetchBatchSize)
	for {
		listResp, err := c.index.ListVectors(ctx, &pinecone.ListVectorsRequest{
			Limit:           &limit,
			PaginationToken: paginationToken,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to list vectors: %w", err)
		}

		if len(listResp.VectorIds) == 0 {
			break
		}

		// Convert []*string to []string for FetchVectors, filtering out nil IDs
		vectorIDs := c.filterValidVectorIDs(listResp.VectorIds)

		// Fetch vectors if we have valid IDs
		if len(vectorIDs) > 0 {
			records, fetchErr := c.fetchVectorBatch(ctx, vectorIDs)
			if fetchErr != nil {
				return nil, fetchErr
			}
			allRecords = append(allRecords, records...)

			c.logger.InfoContext(ctx, "fetched vectors batch",
				"count", len(vectorIDs),
				"total", len(allRecords),
			)
		}

		// Check for more pages and update token
		if listResp.NextPaginationToken == nil || *listResp.NextPaginationToken == "" {
			break
		}
		paginationToken = listResp.NextPaginationToken
	}

	return allRecords, nil
}

// filterValidVectorIDs filters out nil and empty vector IDs.
func (c *PineconeClient) filterValidVectorIDs(ids []*string) []string {
	vectorIDs := make([]string, 0, len(ids))
	for _, id := range ids {
		if id != nil && *id != "" {
			vectorIDs = append(vectorIDs, *id)
		}
	}
	return vectorIDs
}

// fetchVectorBatch fetches a batch of vectors by their IDs.
func (c *PineconeClient) fetchVectorBatch(ctx context.Context, vectorIDs []string) ([]EmbeddingRecord, error) {
	fetchResp, err := c.index.FetchVectors(ctx, vectorIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch vectors: %w", err)
	}

	records := make([]EmbeddingRecord, 0, len(fetchResp.Vectors))
	for _, vec := range fetchResp.Vectors {
		record := c.vectorToRecord(vec)
		records = append(records, record)
	}

	return records, nil
}

// vectorToRecord converts a Pinecone vector to an EmbeddingRecord.
func (c *PineconeClient) vectorToRecord(vec *pinecone.Vector) EmbeddingRecord {
	record := EmbeddingRecord{
		ID:       vec.Id,
		Metadata: make(map[string]string),
	}

	// Extract values
	if vec.Values != nil {
		record.Embedding = *vec.Values
	}

	// Extract metadata fields
	c.extractMetadataFields(vec.Metadata, &record)

	// Set default created_at if not present
	if record.CreatedAt.IsZero() {
		record.CreatedAt = time.Now()
	}

	return record
}

// extractMetadataFields extracts metadata from Pinecone metadata into the record.
func (c *PineconeClient) extractMetadataFields(metadata *pinecone.Metadata, record *EmbeddingRecord) {
	if metadata == nil || metadata.Fields == nil {
		return
	}

	fields := metadata.Fields
	c.extractStandardFields(fields, record)
	c.extractCustomMetadata(fields, record)
}

// extractStandardFields extracts the standard embedding fields from metadata.
func (c *PineconeClient) extractStandardFields(fields map[string]*structpb.Value, record *EmbeddingRecord) {
	if content, ok := fields["content"]; ok {
		record.Content = content.GetStringValue()
	}
	if sourceFile, ok := fields["source_file"]; ok {
		record.SourceFile = sourceFile.GetStringValue()
	}
	if chunkIndex, ok := fields["chunk_index"]; ok {
		record.ChunkIndex = int(chunkIndex.GetNumberValue())
	}
	if createdAt, ok := fields["created_at"]; ok {
		if t, err := time.Parse(time.RFC3339, createdAt.GetStringValue()); err == nil {
			record.CreatedAt = t
		}
	}
}

// extractCustomMetadata extracts non-standard metadata fields.
func (c *PineconeClient) extractCustomMetadata(fields map[string]*structpb.Value, record *EmbeddingRecord) {
	for k, v := range fields {
		if isStandardMetadataKey(k) {
			continue
		}
		record.Metadata[k] = valueToString(v)
	}
}

// isStandardMetadataKey returns true if the key is a standard metadata field.
func isStandardMetadataKey(key string) bool {
	switch key {
	case "content", "source_file", "chunk_index", "created_at":
		return true
	default:
		return false
	}
}

// valueToString converts a structpb.Value to a string.
func valueToString(v *structpb.Value) string {
	if v == nil {
		return ""
	}
	switch kind := v.GetKind().(type) {
	case *structpb.Value_StringValue:
		return kind.StringValue
	case *structpb.Value_NumberValue:
		return strconv.FormatFloat(kind.NumberValue, 'f', -1, 64)
	case *structpb.Value_BoolValue:
		return strconv.FormatBool(kind.BoolValue)
	default:
		return fmt.Sprintf("%v", v.AsInterface())
	}
}

// extractMetadataStrings converts Pinecone metadata to string map.
func (c *PineconeClient) extractMetadataStrings(metadata *pinecone.Metadata) map[string]string {
	result := make(map[string]string)
	if metadata == nil || metadata.Fields == nil {
		return result
	}

	for k, v := range metadata.Fields {
		result[k] = valueToString(v)
	}
	return result
}

// ValidateConnection tests the connection to Pinecone.
func ValidateConnection(apiKey, host, namespace string) error {
	ctx := context.Background()

	pc, err := pinecone.NewClient(pinecone.NewClientParams{
		ApiKey: apiKey,
	})
	if err != nil {
		return fmt.Errorf("failed to create Pinecone client: %w", err)
	}

	idx, err := pc.Index(pinecone.NewIndexConnParams{
		Host:      host,
		Namespace: namespace,
	})
	if err != nil {
		return fmt.Errorf("failed to connect to index: %w", err)
	}

	// Test connection by getting stats
	_, err = idx.DescribeIndexStats(ctx)
	if err != nil {
		return fmt.Errorf("failed to get index stats: %w", err)
	}

	return nil
}
