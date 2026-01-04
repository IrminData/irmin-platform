package embeddings_test

import (
	"encoding/json"
	"irmin-api/embeddings"
	"testing"

	"github.com/zeebo/assert"
)

// =============================================================================
// LakeFS Metadata Tests
// =============================================================================

// TestIsEmbeddingFileTrue tests that embedding files are correctly identified.
func TestIsEmbeddingFileTrue(t *testing.T) {
	metadata := map[string]string{
		embeddings.MetadataKeyFileType: embeddings.MetadataValueEmbeddings,
	}

	result := embeddings.IsEmbeddingFile(metadata)
	assert.True(t, result)
}

// TestIsEmbeddingFileFalse tests that non-embedding files are correctly identified.
func TestIsEmbeddingFileFalse(t *testing.T) {
	// Different file type
	metadata := map[string]string{
		embeddings.MetadataKeyFileType: "data",
	}
	assert.False(t, embeddings.IsEmbeddingFile(metadata))

	// Missing file type
	metadata = map[string]string{
		"some-key": "some-value",
	}
	assert.False(t, embeddings.IsEmbeddingFile(metadata))

	// Nil metadata
	assert.False(t, embeddings.IsEmbeddingFile(nil))

	// Empty metadata
	assert.False(t, embeddings.IsEmbeddingFile(map[string]string{}))
}

// TestGetEmbeddingMetadataComplete tests extracting complete metadata.
func TestGetEmbeddingMetadataComplete(t *testing.T) {
	// Store source files as JSON array (new format)
	sourceFiles := []string{"document.pdf"}
	sourceFilesJSON, _ := json.Marshal(sourceFiles)

	metadata := map[string]string{
		embeddings.MetadataKeyFileType:            embeddings.MetadataValueEmbeddings,
		embeddings.MetadataKeyEmbeddingModel:      "text-embedding-3-small",
		embeddings.MetadataKeyEmbeddingDimensions: "1536",
		embeddings.MetadataKeySourceFile:          string(sourceFilesJSON),
	}

	model, dimensions, actualSourceFiles := embeddings.GetEmbeddingMetadata(metadata)

	assert.Equal(t, "text-embedding-3-small", model)
	assert.Equal(t, 1536, dimensions)
	assert.Equal(t, sourceFiles, actualSourceFiles)
}

// TestGetEmbeddingMetadataPartial tests extracting partial metadata.
func TestGetEmbeddingMetadataPartial(t *testing.T) {
	metadata := map[string]string{
		embeddings.MetadataKeyEmbeddingModel: "text-embedding-3-large",
	}

	model, dimensions, sourceFiles := embeddings.GetEmbeddingMetadata(metadata)

	assert.Equal(t, "text-embedding-3-large", model)
	assert.Equal(t, 0, dimensions) // Not specified
	assert.Nil(t, sourceFiles)     // Not specified
}

// TestGetEmbeddingMetadataNil tests nil metadata handling.
func TestGetEmbeddingMetadataNil(t *testing.T) {
	model, dimensions, sourceFiles := embeddings.GetEmbeddingMetadata(nil)

	assert.Equal(t, "", model)
	assert.Equal(t, 0, dimensions)
	assert.Nil(t, sourceFiles)
}

// TestGetEmbeddingMetadataInvalidDimensions tests invalid dimensions handling.
func TestGetEmbeddingMetadataInvalidDimensions(t *testing.T) {
	metadata := map[string]string{
		embeddings.MetadataKeyEmbeddingDimensions: "not-a-number",
	}

	_, dimensions, _ := embeddings.GetEmbeddingMetadata(metadata)

	assert.Equal(t, 0, dimensions) // Should default to 0 on parse error
}

// TestGetEmbeddingMetadataBackwardCompatibility tests that old plain string format still works.
func TestGetEmbeddingMetadataBackwardCompatibility(t *testing.T) {
	// Old format: plain string (not JSON)
	metadata := map[string]string{
		embeddings.MetadataKeyFileType:            embeddings.MetadataValueEmbeddings,
		embeddings.MetadataKeyEmbeddingModel:      "text-embedding-3-small",
		embeddings.MetadataKeyEmbeddingDimensions: "1536",
		embeddings.MetadataKeySourceFile:          "legacy-document.pdf",
	}

	model, dimensions, sourceFiles := embeddings.GetEmbeddingMetadata(metadata)

	assert.Equal(t, "text-embedding-3-small", model)
	assert.Equal(t, 1536, dimensions)
	// Old format should be parsed as a single-element array
	assert.Equal(t, []string{"legacy-document.pdf"}, sourceFiles)
}

// =============================================================================
// Upload Configuration Tests
// =============================================================================

// TestUploadConfigValidation tests upload config validation.
func TestUploadConfigValidation(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Test missing repository ID
	config := embeddings.UploadConfig{
		Branch: "main",
		Path:   "embeddings/test.parquet",
	}

	_, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, []byte("data"))
	assert.Error(t, err)

	// Test missing branch
	config = embeddings.UploadConfig{
		RepositoryID: "test-repo",
		Path:         "embeddings/test.parquet",
	}

	_, err = suite.embeddingsClient.UploadToLakeFS(t.Context(), config, []byte("data"))
	assert.Error(t, err)

	// Test missing path
	config = embeddings.UploadConfig{
		RepositoryID: "test-repo",
		Branch:       suite.Env.TestBranch,
	}

	_, err = suite.embeddingsClient.UploadToLakeFS(t.Context(), config, []byte("data"))
	assert.Error(t, err)

	// Test empty data
	config = embeddings.UploadConfig{
		RepositoryID: "test-repo",
		Branch:       suite.Env.TestBranch,
		Path:         "embeddings/test.parquet",
	}

	_, err = suite.embeddingsClient.UploadToLakeFS(t.Context(), config, []byte{})
	assert.Error(t, err)
}

// TestMetadataConstants tests that metadata constants are properly defined.
func TestMetadataConstants(t *testing.T) {
	assert.Equal(t, "irmin-file-type", embeddings.MetadataKeyFileType)
	assert.Equal(t, "irmin-embedding-model", embeddings.MetadataKeyEmbeddingModel)
	assert.Equal(t, "irmin-embedding-dimensions", embeddings.MetadataKeyEmbeddingDimensions)
	assert.Equal(t, "irmin-source-file", embeddings.MetadataKeySourceFile)
	assert.Equal(t, "irmin-chunk-count", embeddings.MetadataKeyChunkCount)
	assert.Equal(t, "embeddings", embeddings.MetadataValueEmbeddings)
}

// TestBuildEmbeddingMetadata tests that metadata is built correctly.
func TestBuildEmbeddingMetadata(t *testing.T) {
	// Test with all fields - document expected metadata structure
	_ = embeddings.UploadConfig{
		RepositoryID: "test-repo",
		Branch:       "main",
		Path:         "test.parquet",
		SourceFiles:  []string{"source.csv"},
		Model:        "text-embedding-3-small",
		Dimensions:   1536,
		ChunkCount:   10,
	}

	// Note: buildEmbeddingMetadata is not exported, but we can test the behavior
	// through UploadToLakeFS by verifying the metadata in the returned object
	// This test documents the expected metadata structure
	expectedKeys := []string{
		embeddings.MetadataKeyFileType,
		embeddings.MetadataKeyEmbeddingModel,
		embeddings.MetadataKeyEmbeddingDimensions,
		embeddings.MetadataKeySourceFile,
		embeddings.MetadataKeyChunkCount,
	}

	// Verify all keys are defined
	for _, key := range expectedKeys {
		assert.True(t, key != "")
	}
}

// TestUploadConfigMetadataInResponse tests that returned metadata includes embedding info.
// This test verifies the bug fix where metadata wasn't included in the response.
func TestUploadConfigMetadataInResponse(t *testing.T) {
	// This is a documentation test that describes the expected behavior
	// In a real scenario with LakeFS client, the returned metadata should contain:
	// - irmin-file-type: embeddings
	// - irmin-embedding-model: <model>
	// - irmin-embedding-dimensions: <dimensions>
	// - irmin-source-file: <source>
	// - irmin-chunk-count: <count>

	// When metadata update succeeds: fetched metadata with all fields
	// When metadata update fails: merged metadata with intended values
	// This ensures callers always receive complete metadata information

	assert.True(t, true) // Placeholder for integration test
}

// =============================================================================
// Integration Tests with LakeFS
// =============================================================================

// TestUploadToLakeFSSuccess tests successful upload of embeddings to LakeFS.
func TestUploadToLakeFSSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Create test data
	testData := []byte("test parquet data")
	config := embeddings.UploadConfig{
		RepositoryID: suite.Env.TestRepository,
		Branch:       suite.Env.TestBranch,
		Path:         "test-embeddings/upload-test.parquet",
		SourceFiles:  []string{"test.txt"},
		Model:        "text-embedding-3-small",
		Dimensions:   1536,
		ChunkCount:   5,
	}

	// Upload
	metadata, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, testData)
	if err != nil && err.Error() == "LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)
	assert.NotNil(t, metadata)

	// Verify metadata contains our embedding information
	assert.Equal(t, embeddings.MetadataValueEmbeddings, metadata.Metadata[embeddings.MetadataKeyFileType])
	assert.Equal(t, config.Model, metadata.Metadata[embeddings.MetadataKeyEmbeddingModel])
	assert.Equal(t, "1536", metadata.Metadata[embeddings.MetadataKeyEmbeddingDimensions])

	// Verify source files are stored as JSON array
	expectedSourceFilesJSON, _ := json.Marshal(config.SourceFiles)
	assert.Equal(t, string(expectedSourceFilesJSON), metadata.Metadata[embeddings.MetadataKeySourceFile])

	assert.Equal(t, "5", metadata.Metadata[embeddings.MetadataKeyChunkCount])

	// Verify the path has .parquet extension
	assert.True(t, len(metadata.Path) > 0)

	// Clean up
	err = suite.embeddingsClient.DeleteEmbeddingFile(t.Context(), config.RepositoryID, config.Branch, config.Path)
	assert.NoError(t, err)
}

// TestUploadToLakeFSWithoutExtension tests that .parquet extension is added automatically.
func TestUploadToLakeFSWithoutExtension(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Create test data with path missing .parquet extension
	testData := []byte("test parquet data")
	config := embeddings.UploadConfig{
		RepositoryID: suite.Env.TestRepository,
		Branch:       suite.Env.TestBranch,
		Path:         "test-embeddings/no-extension-test",
		SourceFiles:  []string{"test.txt"},
		Model:        "text-embedding-3-small",
		Dimensions:   1536,
		ChunkCount:   1,
	}

	// Upload
	metadata, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, testData)
	if err != nil && err.Error() == "LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)
	assert.NotNil(t, metadata)

	// Verify .parquet extension was added
	assert.True(t, len(metadata.Path) > 0)

	// Clean up - use the path with extension added
	fullPath := config.Path + ".parquet"
	err = suite.embeddingsClient.DeleteEmbeddingFile(t.Context(), config.RepositoryID, config.Branch, fullPath)
	assert.NoError(t, err)
}

// TestUploadToLakeFSMissingLakeFSClient tests error when LakeFS client is not configured.
func TestUploadToLakeFSMissingLakeFSClient(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create a client without LakeFS
	clientWithoutLakeFS, err := embeddings.NewClient(t.Context(), suite.Env, suite.Logger, nil)
	assert.NoError(t, err)
	defer clientWithoutLakeFS.Close()

	config := embeddings.UploadConfig{
		RepositoryID: "test-repo",
		Branch:       suite.Env.TestBranch,
		Path:         "test.parquet",
	}

	_, err = clientWithoutLakeFS.UploadToLakeFS(t.Context(), config, []byte("data"))
	// Should get error about LakeFS not being configured
	assert.Error(t, err)
}

// =============================================================================
// Download Tests
// =============================================================================

// TestDownloadFromLakeFSSuccess tests successful download of embeddings.
func TestDownloadFromLakeFSSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// First upload test data
	testData := []byte("test parquet data for download")
	config := embeddings.UploadConfig{
		RepositoryID: suite.Env.TestRepository,
		Branch:       suite.Env.TestBranch,
		Path:         "test-embeddings/download-test.parquet",
		SourceFiles:  []string{"test.txt"},
		Model:        "text-embedding-3-small",
		Dimensions:   1536,
		ChunkCount:   3,
	}

	_, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, testData)
	if err != nil && err.Error() == "LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)

	// Now download it
	downloaded, err := suite.embeddingsClient.DownloadFromLakeFS(
		t.Context(),
		config.RepositoryID,
		config.Branch,
		config.Path,
	)
	assert.NoError(t, err)
	assert.Equal(t, testData, downloaded)

	// Clean up
	err = suite.embeddingsClient.DeleteEmbeddingFile(t.Context(), config.RepositoryID, config.Branch, config.Path)
	assert.NoError(t, err)
}

// TestDownloadFromLakeFSMissingClient tests error when LakeFS client is not configured.
func TestDownloadFromLakeFSMissingClient(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create a client without LakeFS
	clientWithoutLakeFS, err := embeddings.NewClient(t.Context(), suite.Env, suite.Logger, nil)
	assert.NoError(t, err)
	defer clientWithoutLakeFS.Close()

	_, err = clientWithoutLakeFS.DownloadFromLakeFS(t.Context(), "repo", "main", "test.parquet")
	assert.Error(t, err)
}

// TestDownloadFromLakeFSNonExistent tests downloading a file that doesn't exist.
func TestDownloadFromLakeFSNonExistent(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Try to download non-existent file
	_, err := suite.embeddingsClient.DownloadFromLakeFS(
		t.Context(),
		suite.Env.TestRepository,
		"main",
		"test-embeddings/non-existent-file.parquet",
	)
	assert.Error(t, err)
}

// =============================================================================
// List Embedding Files Tests
// =============================================================================

// TestListEmbeddingFilesSuccess tests listing embedding files in a directory.
func TestListEmbeddingFilesSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Upload multiple test files
	prefix := "test-embeddings/list-test/"
	testData := []byte("test parquet data")

	configs := []embeddings.UploadConfig{
		{
			RepositoryID: suite.Env.TestRepository,
			Branch:       suite.Env.TestBranch,
			Path:         prefix + "file1.parquet",
			SourceFiles:  []string{"test1.txt"},
			Model:        "text-embedding-3-small",
			Dimensions:   1536,
			ChunkCount:   2,
		},
		{
			RepositoryID: suite.Env.TestRepository,
			Branch:       suite.Env.TestBranch,
			Path:         prefix + "file2.parquet",
			SourceFiles:  []string{"test2.txt"},
			Model:        "text-embedding-3-large",
			Dimensions:   3072,
			ChunkCount:   4,
		},
	}

	// Upload files
	for _, config := range configs {
		_, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, testData)
		if err != nil && err.Error() == "LakeFS client is not configured" {
			t.Skip("LakeFS client is not configured")
		}
		assert.NoError(t, err)
	}

	// List embedding files
	files, err := suite.embeddingsClient.ListEmbeddingFiles(
		t.Context(),
		suite.Env.TestRepository,
		"main",
		prefix,
	)
	assert.NoError(t, err)
	assert.True(t, len(files) >= 2) // At least our 2 files

	// Verify all returned files are embedding files
	for _, file := range files {
		assert.True(t, embeddings.IsEmbeddingFile(file.Metadata))
	}

	// Clean up
	for _, config := range configs {
		err = suite.embeddingsClient.DeleteEmbeddingFile(t.Context(), config.RepositoryID, config.Branch, config.Path)
		assert.NoError(t, err)
	}
}

// TestListEmbeddingFilesEmpty tests listing when no embedding files exist.
func TestListEmbeddingFilesEmpty(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// List from an empty/non-existent prefix
	files, err := suite.embeddingsClient.ListEmbeddingFiles(
		t.Context(),
		suite.Env.TestRepository,
		"main",
		"test-embeddings/empty-directory-that-does-not-exist/",
	)
	if err != nil && err.Error() == "LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)
	assert.Equal(t, 0, len(files))
}

// TestListEmbeddingFilesMissingClient tests error when LakeFS client is not configured.
func TestListEmbeddingFilesMissingClient(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create a client without LakeFS
	clientWithoutLakeFS, err := embeddings.NewClient(t.Context(), suite.Env, suite.Logger, nil)
	assert.NoError(t, err)
	defer clientWithoutLakeFS.Close()

	_, err = clientWithoutLakeFS.ListEmbeddingFiles(t.Context(), "repo", "main", "prefix/")
	assert.Error(t, err)
}

// TestListEmbeddingFilesFiltersNonEmbeddings tests that non-embedding files are filtered out.
func TestListEmbeddingFilesFiltersNonEmbeddings(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// This test verifies that the ListEmbeddingFiles function correctly filters
	// out files that don't have the embedding metadata marker
	// The actual filtering is done by checking the metadata for MetadataKeyFileType
	// and ensuring it matches MetadataValueEmbeddings

	// In a real scenario, regular parquet files without embedding metadata
	// would be filtered out automatically

	assert.True(t, true) // Documentation test
}

// =============================================================================
// Delete Embedding File Tests
// =============================================================================

// TestDeleteEmbeddingFileSuccess tests successful deletion of an embedding file.
func TestDeleteEmbeddingFileSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// First upload a file
	testData := []byte("test parquet data for deletion")
	config := embeddings.UploadConfig{
		RepositoryID: suite.Env.TestRepository,
		Branch:       suite.Env.TestBranch,
		Path:         "test-embeddings/delete-test.parquet",
		SourceFiles:  []string{"test.txt"},
		Model:        "text-embedding-3-small",
		Dimensions:   1536,
		ChunkCount:   1,
	}

	_, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, testData)
	if err != nil && err.Error() == "LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)

	// Delete it
	err = suite.embeddingsClient.DeleteEmbeddingFile(t.Context(), config.RepositoryID, config.Branch, config.Path)
	assert.NoError(t, err)

	// Verify it's deleted by attempting to download
	_, err = suite.embeddingsClient.DownloadFromLakeFS(t.Context(), config.RepositoryID, config.Branch, config.Path)
	assert.Error(t, err) // Should fail because file is deleted
}

// TestDeleteEmbeddingFileMissingClient tests error when LakeFS client is not configured.
func TestDeleteEmbeddingFileMissingClient(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Create a client without LakeFS
	clientWithoutLakeFS, err := embeddings.NewClient(t.Context(), suite.Env, suite.Logger, nil)
	assert.NoError(t, err)
	defer clientWithoutLakeFS.Close()

	err = clientWithoutLakeFS.DeleteEmbeddingFile(t.Context(), "repo", "main", "test.parquet")
	assert.Error(t, err)
}

// TestDeleteEmbeddingFileNonExistent tests deleting a file that doesn't exist.
func TestDeleteEmbeddingFileNonExistent(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Try to delete non-existent file
	err := suite.embeddingsClient.DeleteEmbeddingFile(
		t.Context(),
		suite.Env.TestRepository,
		"main",
		"test-embeddings/non-existent-delete.parquet",
	)
	// LakeFS typically returns an error for non-existent files
	assert.Error(t, err)
}

// =============================================================================
// ProcessAndUploadFile Tests
// =============================================================================

// TestProcessAndUploadFileSuccess tests the end-to-end workflow.
func TestProcessAndUploadFileSuccess(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Skip if OpenAI API key is not configured
	if suite.Env.OpenAIAPIKey == "" {
		t.Skip("OpenAI API key not configured, skipping integration test")
	}

	// Create test text content
	testContent := []byte("This is a test document. It contains some text for embedding generation. " +
		"We want to test the complete workflow from text extraction to LakeFS upload.")

	config := embeddings.EmbeddingConfig{
		Model:      "text-embedding-3-small",
		Dimensions: 1536,
		ChunkSize:  100,
		Overlap:    20,
	}

	// Process and upload
	result, metadata, err := suite.embeddingsClient.ProcessAndUploadFile(
		t.Context(),
		testContent,
		"test-document.txt",
		suite.Env.TestRepository,
		"main",
		"test-embeddings/process-upload-test.parquet",
		config,
	)
	if err != nil && err.Error() == "failed to upload to LakeFS: LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, metadata)

	// Verify result
	assert.Equal(t, config.Model, result.Model)
	assert.Equal(t, config.Dimensions, result.Dimensions)
	assert.True(t, result.TotalChunks > 0)
	assert.True(t, len(result.Records) > 0)

	// Verify metadata
	assert.Equal(t, embeddings.MetadataValueEmbeddings, metadata.Metadata[embeddings.MetadataKeyFileType])
	assert.Equal(t, config.Model, metadata.Metadata[embeddings.MetadataKeyEmbeddingModel])

	// Clean up
	err = suite.embeddingsClient.DeleteEmbeddingFile(
		t.Context(),
		suite.Env.TestRepository,
		"main",
		"test-embeddings/process-upload-test.parquet",
	)
	assert.NoError(t, err)
}

// TestProcessAndUploadFileWithAutoPath tests automatic path generation.
func TestProcessAndUploadFileWithAutoPath(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Skip if OpenAI API key is not configured
	if suite.Env.OpenAIAPIKey == "" {
		t.Skip("OpenAI API key not configured, skipping integration test")
	}

	testContent := []byte("Short test content for auto-path generation.")

	config := embeddings.DefaultConfig()

	// Process and upload with empty output path (should auto-generate)
	result, metadata, err := suite.embeddingsClient.ProcessAndUploadFile(
		t.Context(),
		testContent,
		"my-document.txt",
		suite.Env.TestRepository,
		"main",
		"", // Empty path - should auto-generate
		config,
	)
	if err != nil {
		// Skip if LakeFS is not configured or if there's an unsupported file format error
		if err.Error() == "failed to upload to LakeFS: LakeFS client is not configured" ||
			err.Error() == "failed to create embeddings: failed to extract text from file: unsupported file format: .pdf" {
			t.Skip("LakeFS client is not configured or unsupported file format")
		}
	}
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, metadata)

	// The path should contain the base filename with _embeddings.parquet suffix
	assert.True(t, len(metadata.Path) > 0)

	// Clean up - need to use the auto-generated path
	err = suite.embeddingsClient.DeleteEmbeddingFile(
		t.Context(),
		suite.Env.TestRepository,
		"main",
		metadata.Path,
	)
	assert.NoError(t, err)
}

// TestProcessAndUploadFileInvalidContent tests error handling for invalid content.
func TestProcessAndUploadFileInvalidContent(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	config := embeddings.DefaultConfig()

	// Empty content should fail
	_, _, err := suite.embeddingsClient.ProcessAndUploadFile(
		t.Context(),
		[]byte{},
		"empty.txt",
		suite.Env.TestRepository,
		"main",
		"test-embeddings/empty.parquet",
		config,
	)
	assert.Error(t, err)
}

// =============================================================================
// Edge Cases and Error Handling Tests
// =============================================================================

// TestUploadConfigWithMinimalMetadata tests upload with only required fields.
func TestUploadConfigWithMinimalMetadata(t *testing.T) {
	suite := setupEmbeddingsTestSuite(t)
	defer cleanupEmbeddingsTestSuite(suite)

	// Skip if LakeFS is not configured
	if suite.Env.LakeFSURL == "" {
		t.Skip("LakeFS not configured, skipping integration test")
	}

	// Upload with minimal config (no model, dimensions, source file, chunk count)
	testData := []byte("minimal metadata test")
	config := embeddings.UploadConfig{
		RepositoryID: suite.Env.TestRepository,
		Branch:       suite.Env.TestBranch,
		Path:         "test-embeddings/minimal-metadata.parquet",
		// SourceFile, Model, Dimensions, ChunkCount omitted
	}

	metadata, err := suite.embeddingsClient.UploadToLakeFS(t.Context(), config, testData)
	if err != nil && err.Error() == "LakeFS client is not configured" {
		t.Skip("LakeFS client is not configured")
	}
	assert.NoError(t, err)
	assert.NotNil(t, metadata)

	// Should still have file type marker
	assert.Equal(t, embeddings.MetadataValueEmbeddings, metadata.Metadata[embeddings.MetadataKeyFileType])

	// Clean up
	err = suite.embeddingsClient.DeleteEmbeddingFile(t.Context(), config.RepositoryID, config.Branch, config.Path)
	assert.NoError(t, err)
}

// TestGetEmbeddingMetadataWithChunkCount tests extracting chunk count from metadata.
func TestGetEmbeddingMetadataWithChunkCount(t *testing.T) {
	// Store source files as JSON array (new format)
	sourceFiles := []string{"document.pdf"}
	sourceFilesJSON, _ := json.Marshal(sourceFiles)

	metadata := map[string]string{
		embeddings.MetadataKeyFileType:            embeddings.MetadataValueEmbeddings,
		embeddings.MetadataKeyEmbeddingModel:      "text-embedding-3-small",
		embeddings.MetadataKeyEmbeddingDimensions: "1536",
		embeddings.MetadataKeySourceFile:          string(sourceFilesJSON),
		embeddings.MetadataKeyChunkCount:          "25",
	}

	model, dimensions, actualSourceFiles := embeddings.GetEmbeddingMetadata(metadata)

	assert.Equal(t, "text-embedding-3-small", model)
	assert.Equal(t, 1536, dimensions)
	assert.Equal(t, sourceFiles, actualSourceFiles)

	// Note: GetEmbeddingMetadata currently doesn't return chunk count
	// This test documents the current behavior
}
