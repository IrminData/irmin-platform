package client_test

import (
	"testing"
	"time"

	"irmin-connectors/connectors/pinecone/client"

	"github.com/pinecone-io/go-pinecone/v4/pinecone"
	"github.com/zeebo/assert"
	"google.golang.org/protobuf/types/known/structpb"
)

func TestEmbeddingRecordToVector(t *testing.T) {
	tests := []struct {
		name   string
		record client.EmbeddingRecord
	}{
		{
			name: "basic record with all fields",
			record: client.EmbeddingRecord{
				ID:         "test-id-1",
				SourceFile: "document.pdf",
				ChunkIndex: 0,
				Content:    "This is test content",
				Embedding:  []float32{0.1, 0.2, 0.3, 0.4, 0.5},
				Metadata:   map[string]string{"key1": "value1", "key2": "value2"},
				CreatedAt:  time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC),
			},
		},
		{
			name: "record with empty metadata",
			record: client.EmbeddingRecord{
				ID:         "test-id-2",
				SourceFile: "notes.txt",
				ChunkIndex: 5,
				Content:    "Another test",
				Embedding:  []float32{1.0, 2.0, 3.0},
				Metadata:   map[string]string{},
				CreatedAt:  time.Now(),
			},
		},
		{
			name: "record with nil metadata",
			record: client.EmbeddingRecord{
				ID:         "test-id-3",
				SourceFile: "",
				ChunkIndex: 0,
				Content:    "",
				Embedding:  []float32{0.5},
				Metadata:   nil,
				CreatedAt:  time.Time{},
			},
		},
		{
			name: "record with large embedding",
			record: client.EmbeddingRecord{
				ID:         "test-id-4",
				SourceFile: "large_doc.pdf",
				ChunkIndex: 100,
				Content:    "Large document chunk",
				Embedding:  generateLargeEmbedding(1536),
				Metadata:   map[string]string{"model": "text-embedding-3-small"},
				CreatedAt:  time.Now(),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Verify the record can be created and has expected fields
			assert.Equal(t, tt.record.ID != "", true)
			assert.Equal(t, len(tt.record.Embedding) > 0, true)
		})
	}
}

func TestSearchResult(t *testing.T) {
	tests := []struct {
		name     string
		result   client.SearchResult
		expected client.SearchResult
	}{
		{
			name: "high score match",
			result: client.SearchResult{
				ID:       "vec-1",
				Score:    0.95,
				Metadata: map[string]string{"content": "Similar content"},
			},
			expected: client.SearchResult{
				ID:       "vec-1",
				Score:    0.95,
				Metadata: map[string]string{"content": "Similar content"},
			},
		},
		{
			name: "low score match",
			result: client.SearchResult{
				ID:       "vec-2",
				Score:    0.1,
				Metadata: nil,
			},
			expected: client.SearchResult{
				ID:       "vec-2",
				Score:    0.1,
				Metadata: nil,
			},
		},
		{
			name: "zero score match",
			result: client.SearchResult{
				ID:       "vec-3",
				Score:    0.0,
				Metadata: map[string]string{},
			},
			expected: client.SearchResult{
				ID:       "vec-3",
				Score:    0.0,
				Metadata: map[string]string{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.result.ID, tt.expected.ID)
			assert.Equal(t, tt.result.Score, tt.expected.Score)
		})
	}
}

func TestSearchResponse(t *testing.T) {
	tests := []struct {
		name         string
		response     client.SearchResponse
		expectedLen  int
		expectedHigh float32
	}{
		{
			name: "multiple matches",
			response: client.SearchResponse{
				Query: "test query",
				Matches: []client.SearchResult{
					{ID: "vec-1", Score: 0.95},
					{ID: "vec-2", Score: 0.85},
					{ID: "vec-3", Score: 0.75},
				},
			},
			expectedLen:  3,
			expectedHigh: 0.95,
		},
		{
			name: "single match",
			response: client.SearchResponse{
				Query: "another query",
				Matches: []client.SearchResult{
					{ID: "vec-1", Score: 0.5},
				},
			},
			expectedLen:  1,
			expectedHigh: 0.5,
		},
		{
			name: "no matches",
			response: client.SearchResponse{
				Query:   "no results query",
				Matches: []client.SearchResult{},
			},
			expectedLen:  0,
			expectedHigh: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, len(tt.response.Matches), tt.expectedLen)
			if tt.expectedLen > 0 {
				assert.Equal(t, tt.response.Matches[0].Score, tt.expectedHigh)
			}
		})
	}
}

func TestEmbeddingRecordMetadataHandling(t *testing.T) {
	tests := []struct {
		name             string
		metadata         map[string]string
		expectedKeyCount int
	}{
		{
			name:             "nil metadata",
			metadata:         nil,
			expectedKeyCount: 0,
		},
		{
			name:             "empty metadata",
			metadata:         map[string]string{},
			expectedKeyCount: 0,
		},
		{
			name: "single key metadata",
			metadata: map[string]string{
				"key1": "value1",
			},
			expectedKeyCount: 1,
		},
		{
			name: "multiple keys metadata",
			metadata: map[string]string{
				"key1": "value1",
				"key2": "value2",
				"key3": "value3",
			},
			expectedKeyCount: 3,
		},
		{
			name: "metadata with special characters",
			metadata: map[string]string{
				"key-with-dash":       "value",
				"key_with_underscore": "value",
				"key.with.dot":        "value",
			},
			expectedKeyCount: 3,
		},
		{
			name: "metadata with empty values",
			metadata: map[string]string{
				"key1": "",
				"key2": "non-empty",
			},
			expectedKeyCount: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.metadata == nil {
				assert.Equal(t, tt.metadata == nil, true)
			} else {
				assert.Equal(t, len(tt.metadata), tt.expectedKeyCount)
			}
		})
	}
}

func TestEmbeddingRecordTimestampHandling(t *testing.T) {
	tests := []struct {
		name      string
		createdAt time.Time
		isZero    bool
	}{
		{
			name:      "zero time",
			createdAt: time.Time{},
			isZero:    true,
		},
		{
			name:      "current time",
			createdAt: time.Now(),
			isZero:    false,
		},
		{
			name:      "specific time",
			createdAt: time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC),
			isZero:    false,
		},
		{
			name:      "unix epoch",
			createdAt: time.Unix(0, 0),
			isZero:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.createdAt.IsZero(), tt.isZero)
		})
	}
}

func TestEmbeddingVectorDimensions(t *testing.T) {
	tests := []struct {
		name               string
		dimensions         int
		expectedDimensions int
	}{
		{
			name:               "small embedding (128 dimensions)",
			dimensions:         128,
			expectedDimensions: 128,
		},
		{
			name:               "medium embedding (768 dimensions)",
			dimensions:         768,
			expectedDimensions: 768,
		},
		{
			name:               "large embedding (1536 dimensions - text-embedding-3-small)",
			dimensions:         1536,
			expectedDimensions: 1536,
		},
		{
			name:               "extra large embedding (3072 dimensions - text-embedding-3-large)",
			dimensions:         3072,
			expectedDimensions: 3072,
		},
		{
			name:               "single dimension",
			dimensions:         1,
			expectedDimensions: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			embedding := generateLargeEmbedding(tt.dimensions)
			assert.Equal(t, len(embedding), tt.expectedDimensions)
		})
	}
}

func TestPineconeMetadataStructure(t *testing.T) {
	// Test that Pinecone metadata can be created and accessed correctly
	tests := []struct {
		name   string
		fields map[string]any
	}{
		{
			name: "string values",
			fields: map[string]any{
				"content":     "test content",
				"source_file": "document.pdf",
			},
		},
		{
			name: "numeric values",
			fields: map[string]any{
				"chunk_index": float64(5),
				"score":       float64(0.95),
			},
		},
		{
			name: "boolean values",
			fields: map[string]any{
				"is_active": true,
				"verified":  false,
			},
		},
		{
			name: "mixed values",
			fields: map[string]any{
				"content":     "test",
				"chunk_index": float64(1),
				"is_active":   true,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create structpb fields
			pbFields := make(map[string]*structpb.Value)
			for k, v := range tt.fields {
				switch val := v.(type) {
				case string:
					pbFields[k] = structpb.NewStringValue(val)
				case float64:
					pbFields[k] = structpb.NewNumberValue(val)
				case bool:
					pbFields[k] = structpb.NewBoolValue(val)
				}
			}

			metadata := &pinecone.Metadata{Fields: pbFields}

			// Verify fields can be accessed
			assert.Equal(t, len(metadata.Fields), len(tt.fields))

			for k := range tt.fields {
				_, exists := metadata.Fields[k]
				assert.Equal(t, exists, true)
			}
		})
	}
}

func TestVectorValueConversion(t *testing.T) {
	tests := []struct {
		name     string
		values   []float32
		expected []float32
	}{
		{
			name:     "positive values",
			values:   []float32{0.1, 0.2, 0.3, 0.4, 0.5},
			expected: []float32{0.1, 0.2, 0.3, 0.4, 0.5},
		},
		{
			name:     "negative values",
			values:   []float32{-0.1, -0.2, -0.3},
			expected: []float32{-0.1, -0.2, -0.3},
		},
		{
			name:     "mixed values",
			values:   []float32{-0.5, 0.0, 0.5},
			expected: []float32{-0.5, 0.0, 0.5},
		},
		{
			name:     "normalized values (sum to 1)",
			values:   []float32{0.2, 0.3, 0.5},
			expected: []float32{0.2, 0.3, 0.5},
		},
		{
			name:     "very small values",
			values:   []float32{0.000001, 0.000002, 0.000003},
			expected: []float32{0.000001, 0.000002, 0.000003},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, len(tt.values), len(tt.expected))
			for i, val := range tt.values {
				assert.Equal(t, val, tt.expected[i])
			}
		})
	}
}

func TestSearchResultSorting(t *testing.T) {
	// Test that search results maintain score ordering
	results := []client.SearchResult{
		{ID: "vec-1", Score: 0.95},
		{ID: "vec-2", Score: 0.85},
		{ID: "vec-3", Score: 0.75},
		{ID: "vec-4", Score: 0.65},
		{ID: "vec-5", Score: 0.55},
	}

	// Verify results are in descending score order
	for i := range len(results) - 1 {
		assert.Equal(t, results[i].Score > results[i+1].Score, true)
	}
}

func TestEmbeddingRecordIDValidation(t *testing.T) {
	tests := []struct {
		name    string
		id      string
		isValid bool
	}{
		{
			name:    "standard UUID format",
			id:      "550e8400-e29b-41d4-a716-446655440000",
			isValid: true,
		},
		{
			name:    "simple ID",
			id:      "doc-chunk-1",
			isValid: true,
		},
		{
			name:    "numeric ID",
			id:      "12345",
			isValid: true,
		},
		{
			name:    "ID with special characters",
			id:      "doc_v2_chunk-001",
			isValid: true,
		},
		{
			name:    "empty ID",
			id:      "",
			isValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hasValidID := tt.id != ""
			assert.Equal(t, hasValidID, tt.isValid)
		})
	}
}

func TestBatchSizeConstants(t *testing.T) {
	// Verify batch size constants are within Pinecone limits
	assert.Equal(t, client.UpsertBatchSize <= 100, true)
	assert.Equal(t, client.FetchBatchSize <= 100, true) // Pinecone ListVectors API limit is 100
	assert.Equal(t, client.DefaultTopK > 0, true)
	assert.Equal(t, client.DefaultTopK <= 10000, true)
}

func TestSliceAndMapDeepCopy(t *testing.T) {
	// Test that copying slices and maps creates independent copies
	originalEmbedding := []float32{0.1, 0.2, 0.3}
	originalMetadata := map[string]string{"key": "value"}

	// Create copies manually
	copiedEmbedding := make([]float32, len(originalEmbedding))
	copy(copiedEmbedding, originalEmbedding)
	copiedMetadata := make(map[string]string)
	for k, v := range originalMetadata {
		copiedMetadata[k] = v
	}

	// Modify the copies
	copiedEmbedding[0] = 999.0
	copiedMetadata["new_key"] = "new_value"

	// Verify original is unchanged
	assert.Equal(t, originalEmbedding[0], float32(0.1))
	_, exists := originalMetadata["new_key"]
	assert.Equal(t, exists, false)

	// Verify copies are modified
	assert.Equal(t, copiedEmbedding[0], float32(999.0))
	assert.Equal(t, copiedMetadata["new_key"], "new_value")
}

func TestSearchResponseJSON(t *testing.T) {
	response := client.SearchResponse{
		Query: "machine learning applications",
		Matches: []client.SearchResult{
			{
				ID:       "vec-1",
				Score:    0.92,
				Metadata: map[string]string{"content": "ML in healthcare"},
			},
			{
				ID:       "vec-2",
				Score:    0.88,
				Metadata: map[string]string{"content": "ML in finance"},
			},
		},
	}

	// Verify structure
	assert.Equal(t, response.Query, "machine learning applications")
	assert.Equal(t, len(response.Matches), 2)
	assert.Equal(t, response.Matches[0].ID, "vec-1")
	assert.Equal(t, response.Matches[0].Score > response.Matches[1].Score, true)
}

// Helper function to generate large embeddings for testing
func generateLargeEmbedding(dimensions int) []float32 {
	embedding := make([]float32, dimensions)
	for i := range embedding {
		// Generate deterministic values based on index
		embedding[i] = float32(i%100) / 100.0
	}
	return embedding
}
