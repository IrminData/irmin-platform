package embeddings_test

import (
	"fmt"
	"irmin-api/embeddings"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/zeebo/assert"
)

// =============================================================================
// Search Input Validation Tests
// =============================================================================

// TestSearchSimilarEmptyVector tests that empty vector returns error.
func TestSearchSimilarEmptyVector(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	results, err := suite.embeddingsClient.SearchSimilar(
		t.Context(),
		[]float32{},
		"/tmp/test.parquet",
		5,
	)

	assert.Error(t, err)
	assert.Nil(t, results)
	assert.True(t, strings.Contains(err.Error(), "query vector cannot be empty"))
}

// TestSearchSimilarEmptyPath tests that empty path returns error.
func TestSearchSimilarEmptyPath(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	results, err := suite.embeddingsClient.SearchSimilar(
		t.Context(),
		[]float32{0.1, 0.2, 0.3},
		"",
		5,
	)

	assert.Error(t, err)
	assert.Nil(t, results)
	assert.True(t, strings.Contains(err.Error(), "parquet path cannot be empty"))
}

// TestSearchByTextEmptyQuery tests that empty query returns error.
func TestSearchByTextEmptyQuery(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	results, err := suite.embeddingsClient.SearchByText(
		t.Context(),
		"",
		"/tmp/test.parquet",
		5,
		embeddings.DefaultConfig(),
	)

	assert.Error(t, err)
	assert.Nil(t, results)
	assert.True(t, strings.Contains(err.Error(), "query text cannot be empty"))
}

// TestSearchSimilarFromBytesEmptyContent tests that empty content returns error.
func TestSearchSimilarFromBytesEmptyContent(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	results, err := suite.embeddingsClient.SearchSimilarFromBytes(
		t.Context(),
		[]float32{0.1, 0.2, 0.3},
		[]byte{},
		5,
	)

	assert.Error(t, err)
	assert.Nil(t, results)
	assert.True(t, strings.Contains(err.Error(), "parquet content cannot be empty"))
}

// =============================================================================
// Cosine Similarity Tests
// =============================================================================

// TestComputeCosineSimilarityIdentical tests similarity of identical vectors.
func TestComputeCosineSimilarityIdentical(t *testing.T) {
	vec := []float32{0.5, 0.5, 0.5, 0.5}

	similarity, err := embeddings.ComputeCosineSimilarity(vec, vec)

	assert.NoError(t, err)
	assert.True(t, similarity > 0.99) // Should be very close to 1.0
}

// TestComputeCosineSimilarityOrthogonal tests similarity of orthogonal vectors.
func TestComputeCosineSimilarityOrthogonal(t *testing.T) {
	vec1 := []float32{1, 0, 0}
	vec2 := []float32{0, 1, 0}

	similarity, err := embeddings.ComputeCosineSimilarity(vec1, vec2)

	assert.NoError(t, err)
	assert.True(t, similarity < 0.01) // Should be very close to 0
}

// TestComputeCosineSimilarityDifferentDimensions tests mismatched dimensions.
func TestComputeCosineSimilarityDifferentDimensions(t *testing.T) {
	vec1 := []float32{1, 0, 0}
	vec2 := []float32{0, 1}

	_, err := embeddings.ComputeCosineSimilarity(vec1, vec2)

	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "vectors must have the same dimension"))
}

// TestComputeCosineSimilarityZeroVector tests zero vector handling.
func TestComputeCosineSimilarityZeroVector(t *testing.T) {
	vec1 := []float32{1, 0, 0}
	vec2 := []float32{0, 0, 0}

	similarity, err := embeddings.ComputeCosineSimilarity(vec1, vec2)

	assert.NoError(t, err)
	assert.Equal(t, float64(0), similarity)
}

// =============================================================================
// Parquet Search Integration Tests
// =============================================================================

// TestSearchWithLegacyParquet tests that SearchSimilar and LoadEmbeddingsFromParquet
// work with parquet files that lack content_hash and priority columns (pre-existing files).
func TestSearchWithLegacyParquet(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	if suite.DuckDBClient == nil {
		t.Skip("DuckDB client not available")
	}

	// Create legacy parquet (old schema: no content_hash, no priority)
	tempFile, err := os.CreateTemp(t.TempDir(), "legacy_search_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	// Build 128-dim embedding arrays for DuckDB
	emb1 := generateTestEmbedding(128, 0.1)
	emb2 := generateTestEmbedding(128, 0.15)
	emb1Parts := make([]string, len(emb1))
	emb2Parts := make([]string, len(emb2))
	for i := range emb1 {
		emb1Parts[i] = fmt.Sprintf("%.9g", emb1[i])
		emb2Parts[i] = fmt.Sprintf("%.9g", emb2[i])
	}
	emb1Str := "[" + strings.Join(emb1Parts, ", ") + "]"
	emb2Str := "[" + strings.Join(emb2Parts, ", ") + "]"

	// Use DuckDB to create parquet with legacy schema (no content_hash, no priority, no updated_at)
	escapedPath := strings.ReplaceAll(tempPath, "\\", "\\\\")
	escapedPath = strings.ReplaceAll(escapedPath, "'", "''")
	createSQL := fmt.Sprintf(`
		CREATE OR REPLACE TABLE legacy_embeddings (
			id VARCHAR,
			source_file VARCHAR,
			chunk_index INTEGER,
			content TEXT,
			embedding FLOAT[128],
			metadata JSON,
			created_at TIMESTAMP
		);
		INSERT INTO legacy_embeddings VALUES
			('legacy-1', 'test.txt', 0, 'Legacy content one', %s::FLOAT[128], '{}', now()),
			('legacy-2', 'test.txt', 1, 'Legacy content two', %s::FLOAT[128], '{}', now());
		COPY legacy_embeddings TO '%s' (FORMAT PARQUET, COMPRESSION ZSTD);
		DROP TABLE legacy_embeddings;
	`, emb1Str, emb2Str, escapedPath)

	_, err = suite.DuckDBClient.ExecuteNonQuery(t.Context(), createSQL)
	assert.NoError(t, err)

	// SearchSimilar must work (retry with minimal schema when column not found)
	queryVector := generateTestEmbedding(128, 0.1)
	results, err := suite.embeddingsClient.SearchSimilar(t.Context(), queryVector, tempPath, 2)
	assert.NoError(t, err)
	assert.NotNil(t, results)
	assert.True(t, len(results) >= 1)
	assert.Equal(t, "", results[0].ContentHash)
	assert.Equal(t, float32(1.0), results[0].Priority)

	// LoadEmbeddingsFromParquet must work
	records, err := suite.embeddingsClient.LoadEmbeddingsFromParquet(t.Context(), tempPath)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(records))
	assert.Equal(t, "", records[0].ContentHash)
	assert.Equal(t, float32(1.0), records[0].Priority)
}

// TestSearchWithParquetIntegration tests search on an actual parquet file.
func TestSearchWithParquetIntegration(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create test embedding records
	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "The quick brown fox jumps over the lazy dog.",
			Embedding:  generateTestEmbedding(128, 0.1),
			Metadata:   map[string]string{"category": "animals"},
			CreatedAt:  time.Now(),
		},
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 1,
			Content:    "Machine learning is transforming the technology industry.",
			Embedding:  generateTestEmbedding(128, 0.5),
			Metadata:   map[string]string{"category": "technology"},
			CreatedAt:  time.Now(),
		},
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 2,
			Content:    "Cats and dogs are popular household pets.",
			Embedding:  generateTestEmbedding(128, 0.15),
			Metadata:   map[string]string{"category": "animals"},
			CreatedAt:  time.Now(),
		},
	}

	// Create temp parquet file
	tempFile, err := os.CreateTemp(t.TempDir(), "search_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	// Save embeddings
	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Search for similar to first record (animals)
	queryVector := generateTestEmbedding(128, 0.1)
	results, err := suite.embeddingsClient.SearchSimilar(t.Context(), queryVector, tempPath, 3)

	assert.NoError(t, err)
	assert.NotNil(t, results)
	assert.True(t, len(results) <= 3)

	// First result should be the most similar (same embedding)
	if len(results) > 0 {
		assert.True(t, results[0].Score > 0.9) // High similarity
	}
}

// TestSearchWithFilterIntegration tests filtered search.
func TestSearchWithFilterIntegration(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create test records with different categories
	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "Content about animals",
			Embedding:  generateTestEmbedding(128, 0.1),
			Metadata:   map[string]string{"category": "animals"},
			CreatedAt:  time.Now(),
		},
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 1,
			Content:    "Content about technology",
			Embedding:  generateTestEmbedding(128, 0.2),
			Metadata:   map[string]string{"category": "technology"},
			CreatedAt:  time.Now(),
		},
	}

	// Create temp parquet file
	tempFile, err := os.CreateTemp(t.TempDir(), "filter_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	// Save embeddings
	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Search with category filter
	queryVector := generateTestEmbedding(128, 0.1)
	filter := map[string]string{"category": "animals"}
	results, err := suite.embeddingsClient.SearchWithFilter(t.Context(), queryVector, tempPath, 5, filter)

	assert.NoError(t, err)
	assert.NotNil(t, results)
	// Results should only include animals category
	for _, result := range results {
		assert.Equal(t, "animals", result.Metadata["category"])
	}
}

// TestSearchWithFilterInvalidKey tests that invalid metadata keys are rejected.
func TestSearchWithFilterInvalidKey(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create a minimal parquet file
	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "Test content",
			Embedding:  generateTestEmbedding(128, 0.1),
			Metadata:   map[string]string{"valid_key": "value"},
			CreatedAt:  time.Now(),
		},
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "invalid_key_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	queryVector := generateTestEmbedding(128, 0.1)

	// Test SQL injection attempt
	filter := map[string]string{"category') OR ('1'='1": "value"}
	_, err = suite.embeddingsClient.SearchWithFilter(t.Context(), queryVector, tempPath, 5, filter)
	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "invalid metadata key"))

	// Test other invalid characters
	invalidKeys := []string{
		"key with spaces",
		"key;DROP TABLE",
		"key'or'1'='1",
		"../path",
		"key$dollar",
		"key@at",
		"key!exclaim",
	}

	for _, invalidKey := range invalidKeys {
		filterInvalid := map[string]string{invalidKey: "value"}
		_, errInvalid := suite.embeddingsClient.SearchWithFilter(t.Context(), queryVector, tempPath, 5, filterInvalid)
		assert.Error(t, errInvalid)
		assert.True(t, strings.Contains(errInvalid.Error(), "invalid metadata key"))
	}

	// Test valid keys
	validKeys := []string{
		"category",
		"item_id",
		"user-name",
		"value123",
		"CamelCase",
		"UPPERCASE",
		"_underscore",
		"dash-separated",
	}

	for _, validKey := range validKeys {
		filterValid := map[string]string{validKey: "value"}
		_, errValid := suite.embeddingsClient.SearchWithFilter(t.Context(), queryVector, tempPath, 5, filterValid)
		assert.NoError(t, errValid) // Should not error on valid keys
	}
}

// TestCreateVectorIndexSQLInjection tests that CreateVectorIndex properly escapes index names
// to prevent SQL injection attacks.
func TestCreateVectorIndexSQLInjection(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create test embeddings
	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "test content",
			Embedding:  []float32{0.1, 0.2, 0.3},
			Metadata:   map[string]string{"key": "value"},
			CreatedAt:  time.Now(),
		},
	}

	// Save to temp parquet file
	tempFile, err := os.CreateTemp(t.TempDir(), "test-*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Test SQL injection attempts in index name
	maliciousIndexNames := []string{
		// Semicolon injection
		"test_idx; DROP TABLE users--",
		// Quote escape attempt
		`test_idx" OR "1"="1`,
		// Comment injection
		"test_idx--",
		// Multi-statement injection
		"test_idx; DELETE FROM embeddings WHERE 1=1--",
		// Backtick injection
		"test_idx`; DROP TABLE test--",
	}

	for _, maliciousName := range maliciousIndexNames {
		// This should not execute the injected SQL - it should treat it as a literal identifier
		// The function should either succeed (treating it as a valid quoted identifier)
		// or fail safely without executing the injection
		errIndex := suite.embeddingsClient.CreateVectorIndex(t.Context(), tempPath, maliciousName)

		// We don't assert NoError here because some characters may be invalid
		// The key is that it should NOT execute the injected SQL
		// If it errors, that's OK - it just means the identifier is rejected
		if errIndex != nil {
			// Error is acceptable - just ensure it's not a "table not found" or similar
			// which would indicate the DROP/DELETE executed
			assert.True(t, !strings.Contains(strings.ToLower(errIndex.Error()), "users"))
			assert.True(t, !strings.Contains(strings.ToLower(errIndex.Error()), "does not exist"))
		}
	}
}

// TestComputeCosineSimilarityAccuracy tests that cosine similarity computation
// using math.Sqrt is accurate and matches expected values.
func TestComputeCosineSimilarityAccuracy(t *testing.T) {
	testCases := []struct {
		name      string
		vec1      []float32
		vec2      []float32
		expected  float64
		tolerance float64
	}{
		{
			name:      "identical vectors",
			vec1:      []float32{1.0, 0.0, 0.0},
			vec2:      []float32{1.0, 0.0, 0.0},
			expected:  1.0,
			tolerance: 1e-9,
		},
		{
			name:      "orthogonal vectors",
			vec1:      []float32{1.0, 0.0},
			vec2:      []float32{0.0, 1.0},
			expected:  0.0,
			tolerance: 1e-9,
		},
		{
			name:      "opposite vectors",
			vec1:      []float32{1.0, 0.0},
			vec2:      []float32{-1.0, 0.0},
			expected:  -1.0,
			tolerance: 1e-9,
		},
		{
			name:      "45 degree vectors",
			vec1:      []float32{1.0, 0.0},
			vec2:      []float32{1.0, 1.0},
			expected:  0.7071067811865475, // 1/sqrt(2)
			tolerance: 1e-9,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			similarity, err := embeddings.ComputeCosineSimilarity(tc.vec1, tc.vec2)
			assert.NoError(t, err)

			// Check that the result is within tolerance
			diff := similarity - tc.expected
			if diff < 0 {
				diff = -diff
			}
			assert.True(t, diff < tc.tolerance)
		})
	}
}

// TestCreateVectorIndexSuffixHandling tests that the _idx suffix is properly
// added before identifier escaping to produce valid SQL.
func TestCreateVectorIndexSuffixHandling(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create test embeddings
	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "test content",
			Embedding:  []float32{0.1, 0.2, 0.3},
			Metadata:   map[string]string{},
			CreatedAt:  time.Now(),
		},
	}

	// Save to temp parquet file
	tempFile, err := os.CreateTemp(t.TempDir(), "test-*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Test with various index names that require escaping
	testCases := []struct {
		name      string
		indexName string
	}{
		{
			name:      "simple name",
			indexName: "test_index",
		},
		{
			name:      "name with spaces",
			indexName: "test index",
		},
		{
			name:      "name with special chars",
			indexName: "test-index-123",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// This should succeed - the _idx suffix should be added before escaping
			// producing valid SQL like: CREATE INDEX "test_index_idx" ON "test_index" ...
			errIndex := suite.embeddingsClient.CreateVectorIndex(t.Context(), tempPath, tc.indexName)

			// The function should succeed (or fail for reasons other than syntax errors)
			if errIndex != nil {
				// If it errors, it should NOT be a syntax error related to the _idx suffix
				assert.True(t, !strings.Contains(strings.ToLower(errIndex.Error()), "syntax error"))
				assert.True(t, !strings.Contains(strings.ToLower(errIndex.Error()), "_idx"))
			}
		})
	}
}

// TestParseMetadataJSONWithSpecialCharacters tests that metadata parsing
// correctly handles commas, colons, and other special characters in values.
func TestParseMetadataJSONWithSpecialCharacters(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	testCases := []struct {
		name     string
		records  []embeddings.EmbeddingRecord
		expected map[string]string
	}{
		{
			name: "metadata with commas in values",
			records: []embeddings.EmbeddingRecord{
				{
					ID:         uuid.New().String(),
					SourceFile: "test.txt",
					ChunkIndex: 0,
					Content:    "test content",
					Embedding:  []float32{0.1, 0.2, 0.3},
					Metadata: map[string]string{
						"description": "item1, item2, item3",
						"tags":        "red, green, blue",
					},
					CreatedAt: time.Now(),
				},
			},
			expected: map[string]string{
				"description": "item1, item2, item3",
				"tags":        "red, green, blue",
			},
		},
		{
			name: "metadata with colons in values",
			records: []embeddings.EmbeddingRecord{
				{
					ID:         uuid.New().String(),
					SourceFile: "test.txt",
					ChunkIndex: 0,
					Content:    "test content",
					Embedding:  []float32{0.1, 0.2, 0.3},
					Metadata: map[string]string{
						"time":     "10:30:00",
						"url":      "https://example.com:8080/path",
						"duration": "1:23:45",
					},
					CreatedAt: time.Now(),
				},
			},
			expected: map[string]string{
				"time":     "10:30:00",
				"url":      "https://example.com:8080/path",
				"duration": "1:23:45",
			},
		},
		{
			name: "metadata with mixed special characters",
			records: []embeddings.EmbeddingRecord{
				{
					ID:         uuid.New().String(),
					SourceFile: "test.txt",
					ChunkIndex: 0,
					Content:    "test content",
					Embedding:  []float32{0.1, 0.2, 0.3},
					Metadata: map[string]string{
						"title":       "Item: A, B, and C",
						"description": "Values: x=1, y=2:30, z=3",
						"location":    "City, State: 12345",
					},
					CreatedAt: time.Now(),
				},
			},
			expected: map[string]string{
				"title":       "Item: A, B, and C",
				"description": "Values: x=1, y=2:30, z=3",
				"location":    "City, State: 12345",
			},
		},
		{
			name: "metadata with quotes and escapes",
			records: []embeddings.EmbeddingRecord{
				{
					ID:         uuid.New().String(),
					SourceFile: "test.txt",
					ChunkIndex: 0,
					Content:    "test content",
					Embedding:  []float32{0.1, 0.2, 0.3},
					Metadata: map[string]string{
						"quote":   `She said "hello"`,
						"newline": "line1\nline2",
					},
					CreatedAt: time.Now(),
				},
			},
			expected: map[string]string{
				"quote":   `She said "hello"`,
				"newline": "line1\nline2",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Save embeddings to parquet file
			tempFile, err := os.CreateTemp(t.TempDir(), "test-*.parquet")
			assert.NoError(t, err)
			tempPath := tempFile.Name()
			tempFile.Close()

			err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), tc.records, tempPath)
			assert.NoError(t, err)

			// Search with a query vector (results don't matter, we just need to trigger metadata parsing)
			queryVector := []float32{0.1, 0.2, 0.3}
			results, err := suite.embeddingsClient.SearchSimilar(
				t.Context(),
				queryVector,
				tempPath,
				1,
			)
			assert.NoError(t, err)
			assert.True(t, len(results) > 0)

			// Verify metadata was correctly parsed (not corrupted by naive string splitting)
			result := results[0]
			for key, expectedValue := range tc.expected {
				actualValue, exists := result.Metadata[key]
				assert.True(t, exists)
				assert.Equal(t, expectedValue, actualValue)
			}
		})
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

// generateTestEmbedding generates a test embedding vector with a specific pattern.
func generateTestEmbedding(_ int, seed float32) []float32 {
	const testDimensions = 128
	embedding := make([]float32, testDimensions)
	for i := range embedding {
		// Create a deterministic pattern based on seed
		embedding[i] = seed + float32(i)*0.001
	}
	return embedding
}
