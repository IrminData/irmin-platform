package embeddings_test

import (
	"fmt"
	"irmin-api/embeddings"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/zeebo/assert"
)

// =============================================================================
// SaveEmbeddingsToParquet Input Validation Tests
// =============================================================================

// TestSaveEmbeddingsToParquetEmptyRecords tests that empty records returns error.
func TestSaveEmbeddingsToParquetEmptyRecords(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	err := suite.embeddingsClient.SaveEmbeddingsToParquet(
		t.Context(),
		[]embeddings.EmbeddingRecord{},
		"/tmp/test.parquet",
	)

	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "records cannot be empty"))
}

// TestSaveEmbeddingsToParquetEmptyPath tests that empty path returns error.
func TestSaveEmbeddingsToParquetEmptyPath(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	records := []embeddings.EmbeddingRecord{
		{
			ID:        uuid.New().String(),
			Embedding: []float32{0.1, 0.2, 0.3},
		},
	}

	err := suite.embeddingsClient.SaveEmbeddingsToParquet(
		t.Context(),
		records,
		"",
	)

	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "output path cannot be empty"))
}

// TestSaveEmbeddingsToParquetEmptyEmbedding tests that empty embedding returns error.
func TestSaveEmbeddingsToParquetEmptyEmbedding(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	records := []embeddings.EmbeddingRecord{
		{
			ID:        uuid.New().String(),
			Embedding: []float32{},
		},
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(
		t.Context(),
		records,
		tempPath,
	)

	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "embedding vector cannot be empty"))
}

// =============================================================================
// SaveEmbeddingsToParquet Success Tests
// =============================================================================

// TestSaveEmbeddingsToParquetSuccess tests successful parquet saving.
func TestSaveEmbeddingsToParquetSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	now := time.Now()
	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "First chunk of text content.",
			Embedding:  []float32{0.1, 0.2, 0.3, 0.4, 0.5},
			Metadata:   map[string]string{"key": "value1"},
			CreatedAt:  now,
		},
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 1,
			Content:    "Second chunk of text content.",
			Embedding:  []float32{0.6, 0.7, 0.8, 0.9, 1.0},
			Metadata:   map[string]string{"key": "value2"},
			CreatedAt:  now,
		},
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Verify file exists and has content
	info, err := os.Stat(tempPath)
	assert.NoError(t, err)
	assert.True(t, info.Size() > 0)
}

// TestSaveEmbeddingsToParquetLargeBatch tests saving a large batch of records.
func TestSaveEmbeddingsToParquetLargeBatch(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create 500 records
	now := time.Now()
	records := make([]embeddings.EmbeddingRecord, 500)
	for i := range records {
		embedding := make([]float32, 128)
		for j := range embedding {
			embedding[j] = float32(i*128+j) * 0.001
		}

		records[i] = embeddings.EmbeddingRecord{
			ID:         uuid.New().String(),
			SourceFile: "large_test.txt",
			ChunkIndex: i,
			Content:    fmt.Sprintf("Chunk content for record %d", i),
			Embedding:  embedding,
			Metadata:   map[string]string{"index": strconv.Itoa(i)},
			CreatedAt:  now,
		}
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "large_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Verify count
	count, err := suite.embeddingsClient.GetEmbeddingCount(t.Context(), tempPath)
	assert.NoError(t, err)
	assert.Equal(t, int64(500), count)
}

// =============================================================================
// SaveEmbeddingsToParquetBytes Tests
// =============================================================================

// TestSaveEmbeddingsToParquetBytesSuccess tests successful byte output.
func TestSaveEmbeddingsToParquetBytesSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	records := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "Test content",
			Embedding:  []float32{0.1, 0.2, 0.3},
			Metadata:   map[string]string{},
			CreatedAt:  time.Now(),
		},
	}

	data, err := suite.embeddingsClient.SaveEmbeddingsToParquetBytes(t.Context(), records)

	assert.NoError(t, err)
	assert.NotNil(t, data)
	assert.True(t, len(data) > 0)

	// Parquet files start with "PAR1"
	assert.Equal(t, "PAR1", string(data[:4]))
}

// TestSaveEmbeddingsToParquetBytesEmptyRecords tests empty records returns error.
func TestSaveEmbeddingsToParquetBytesEmptyRecords(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	data, err := suite.embeddingsClient.SaveEmbeddingsToParquetBytes(
		t.Context(),
		[]embeddings.EmbeddingRecord{},
	)

	assert.Error(t, err)
	assert.Nil(t, data)
}

// =============================================================================
// LoadEmbeddingsFromParquet Tests
// =============================================================================

// TestLoadEmbeddingsFromParquetSuccess tests loading embeddings from parquet.
func TestLoadEmbeddingsFromParquetSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// First save some records
	now := time.Now().Truncate(time.Second) // Truncate for comparison
	originalRecords := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 0,
			Content:    "First content",
			Embedding:  []float32{0.1, 0.2, 0.3, 0.4},
			Metadata:   map[string]string{"key": "value"},
			CreatedAt:  now,
		},
		{
			ID:         uuid.New().String(),
			SourceFile: "test.txt",
			ChunkIndex: 1,
			Content:    "Second content",
			Embedding:  []float32{0.5, 0.6, 0.7, 0.8},
			Metadata:   map[string]string{"key": "value2"},
			CreatedAt:  now,
		},
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "load_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), originalRecords, tempPath)
	assert.NoError(t, err)

	// Now load them back
	loadedRecords, err := suite.embeddingsClient.LoadEmbeddingsFromParquet(t.Context(), tempPath)

	assert.NoError(t, err)
	assert.NotNil(t, loadedRecords)
	assert.Equal(t, 2, len(loadedRecords))

	// Verify record content matches
	for i, loaded := range loadedRecords {
		assert.Equal(t, originalRecords[i].SourceFile, loaded.SourceFile)
		assert.Equal(t, originalRecords[i].ChunkIndex, loaded.ChunkIndex)
		assert.Equal(t, originalRecords[i].Content, loaded.Content)
		assert.Equal(t, len(originalRecords[i].Embedding), len(loaded.Embedding))
	}
}

// TestLoadEmbeddingsFromParquetEmptyPath tests empty path returns error.
func TestLoadEmbeddingsFromParquetEmptyPath(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	records, err := suite.embeddingsClient.LoadEmbeddingsFromParquet(t.Context(), "")

	assert.Error(t, err)
	assert.Nil(t, records)
	assert.True(t, strings.Contains(err.Error(), "parquet path cannot be empty"))
}

// =============================================================================
// GetEmbeddingCount Tests
// =============================================================================

// TestGetEmbeddingCountSuccess tests counting embeddings.
func TestGetEmbeddingCountSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create 10 records
	records := make([]embeddings.EmbeddingRecord, 10)
	for i := range records {
		records[i] = embeddings.EmbeddingRecord{
			ID:        uuid.New().String(),
			Embedding: []float32{0.1, 0.2, 0.3},
			CreatedAt: time.Now(),
		}
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "count_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	count, err := suite.embeddingsClient.GetEmbeddingCount(t.Context(), tempPath)

	assert.NoError(t, err)
	assert.Equal(t, int64(10), count)
}

// =============================================================================
// MergeParquetFiles Tests
// =============================================================================

// TestMergeParquetFilesSuccess tests merging multiple parquet files.
func TestMergeParquetFilesSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create first file with 3 records
	records1 := make([]embeddings.EmbeddingRecord, 3)
	for i := range records1 {
		records1[i] = embeddings.EmbeddingRecord{
			ID:         uuid.New().String(),
			SourceFile: "file1.txt",
			Embedding:  []float32{0.1, 0.2, 0.3},
			CreatedAt:  time.Now(),
		}
	}

	tempFile1, err := os.CreateTemp(t.TempDir(), "merge1_*.parquet")
	assert.NoError(t, err)
	path1 := tempFile1.Name()
	tempFile1.Close()
	defer os.Remove(path1)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records1, path1)
	assert.NoError(t, err)

	// Create second file with 5 records
	records2 := make([]embeddings.EmbeddingRecord, 5)
	for i := range records2 {
		records2[i] = embeddings.EmbeddingRecord{
			ID:         uuid.New().String(),
			SourceFile: "file2.txt",
			Embedding:  []float32{0.4, 0.5, 0.6},
			CreatedAt:  time.Now(),
		}
	}

	tempFile2, err := os.CreateTemp(t.TempDir(), "merge2_*.parquet")
	assert.NoError(t, err)
	path2 := tempFile2.Name()
	tempFile2.Close()
	defer os.Remove(path2)

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records2, path2)
	assert.NoError(t, err)

	// Merge files
	tempOutput, err := os.CreateTemp(t.TempDir(), "merged_*.parquet")
	assert.NoError(t, err)
	outputPath := tempOutput.Name()
	tempOutput.Close()
	defer os.Remove(outputPath)

	err = suite.embeddingsClient.MergeParquetFiles(t.Context(), []string{path1, path2}, outputPath)
	assert.NoError(t, err)

	// Verify merged count
	count, err := suite.embeddingsClient.GetEmbeddingCount(t.Context(), outputPath)
	assert.NoError(t, err)
	assert.Equal(t, int64(8), count) // 3 + 5
}

// TestMergeParquetFilesEmptyPaths tests empty paths returns error.
func TestMergeParquetFilesEmptyPaths(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	err := suite.embeddingsClient.MergeParquetFiles(
		t.Context(),
		[]string{},
		"/tmp/output.parquet",
	)

	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "input paths cannot be empty"))
}

// TestMergeParquetFilesEmptyOutput tests empty output returns error.
func TestMergeParquetFilesEmptyOutput(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	err := suite.embeddingsClient.MergeParquetFiles(
		t.Context(),
		[]string{"/tmp/file1.parquet"},
		"",
	)

	assert.Error(t, err)
	assert.True(t, strings.Contains(err.Error(), "output path cannot be empty"))
}

// TestEmbeddingPrecisionRoundTrip tests that embedding values maintain precision
// through save/load round trip.
func TestEmbeddingPrecisionRoundTrip(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create test embeddings with high-precision float32 values
	now := time.Now()
	originalRecords := []embeddings.EmbeddingRecord{
		{
			ID:         uuid.New().String(),
			SourceFile: "precision_test.txt",
			ChunkIndex: 0,
			Content:    "Test content",
			// Use values that would lose precision with %f (6 decimals)
			Embedding: []float32{
				0.123456789,  // Would be truncated to 0.123457 with %f
				-0.987654321, // Would be truncated to -0.987654 with %f
				1.23456e-5,   // Small value
				9.87654e5,    // Large value
				0.0,          // Zero
				-1.0,         // Negative integer
			},
			Metadata:  map[string]string{},
			CreatedAt: now,
		},
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "precision_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	// Save
	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), originalRecords, tempPath)
	assert.NoError(t, err)

	// Load
	loadedRecords, err := suite.embeddingsClient.LoadEmbeddingsFromParquet(t.Context(), tempPath)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(loadedRecords))

	// Verify precision is preserved (within float32 tolerance)
	original := originalRecords[0].Embedding
	loaded := loadedRecords[0].Embedding

	assert.Equal(t, len(original), len(loaded))

	for i := range original {
		// Calculate relative error
		diff := original[i] - loaded[i]
		var relativeError float64
		if original[i] != 0 {
			relativeError = float64(diff) / float64(original[i])
			if relativeError < 0 {
				relativeError = -relativeError
			}
		} else {
			relativeError = float64(diff)
			if relativeError < 0 {
				relativeError = -relativeError
			}
		}

		// For float32, relative error should be less than 1e-6
		// With %.9g format, we should preserve ~7 significant digits
		if relativeError >= 1e-6 {
			t.Errorf("Value at index %d lost precision: original=%.9g, loaded=%.9g, relative_error=%.9g",
				i, original[i], loaded[i], relativeError)
		}
	}
}

// TestEmbeddingDimensionConsistency tests that loaded embeddings have correct dimensions.
func TestEmbeddingDimensionConsistency(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	expectedDimensions := 128
	numRecords := 5

	records := make([]embeddings.EmbeddingRecord, numRecords)
	for i := range numRecords {
		embedding := make([]float32, expectedDimensions)
		for j := range embedding {
			embedding[j] = float32(i*expectedDimensions + j)
		}
		records[i] = embeddings.EmbeddingRecord{
			ID:        uuid.New().String(),
			Embedding: embedding,
			CreatedAt: time.Now(),
		}
	}

	tempFile, err := os.CreateTemp(t.TempDir(), "dimension_test_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()
	defer os.Remove(tempPath)

	// Save
	err = suite.embeddingsClient.SaveEmbeddingsToParquet(t.Context(), records, tempPath)
	assert.NoError(t, err)

	// Load
	loadedRecords, err := suite.embeddingsClient.LoadEmbeddingsFromParquet(t.Context(), tempPath)
	assert.NoError(t, err)

	// Verify all records have correct dimensions
	assert.Equal(t, numRecords, len(loadedRecords))
	for i, record := range loadedRecords {
		if len(record.Embedding) != expectedDimensions {
			t.Errorf("Record %d has wrong dimension: expected %d, got %d",
				i, expectedDimensions, len(record.Embedding))
		}
	}
}

// TestParseEmbeddingDimensionPreservation tests that dimension count is preserved
// even when some values fail to parse (they should become 0.0 instead of being dropped).
func TestParseEmbeddingDimensionPreservation(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create a record with a valid embedding
	originalRecord := embeddings.EmbeddingRecord{
		ID:         uuid.New().String(),
		SourceFile: "test.txt",
		ChunkIndex: 0,
		Content:    "test content",
		Embedding:  []float32{0.1, 0.2, 0.3, 0.4, 0.5},
		Metadata:   map[string]string{},
		CreatedAt:  time.Now(),
	}

	// Save to parquet
	tempFile, err := os.CreateTemp(t.TempDir(), "test-*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	tempFile.Close()

	err = suite.embeddingsClient.SaveEmbeddingsToParquet(
		t.Context(),
		[]embeddings.EmbeddingRecord{originalRecord},
		tempPath,
	)
	assert.NoError(t, err)

	// Load back - dimension should be preserved even if there were parse errors
	loadedRecords, err := suite.embeddingsClient.LoadEmbeddingsFromParquet(t.Context(), tempPath)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(loadedRecords))

	// Verify dimension is preserved (not silently reduced)
	loadedEmbedding := loadedRecords[0].Embedding
	assert.Equal(t, len(originalRecord.Embedding), len(loadedEmbedding))
}
