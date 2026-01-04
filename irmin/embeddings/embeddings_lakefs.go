package embeddings

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/lakefs"
	"path/filepath"
	"strconv"
	"strings"
)

// LakeFS metadata keys for embedding files.
const (
	MetadataKeyFileType            = "irmin-file-type"
	MetadataKeyEmbeddingModel      = "irmin-embedding-model"
	MetadataKeyEmbeddingDimensions = "irmin-embedding-dimensions"
	MetadataKeySourceFile          = "irmin-source-file"
	MetadataKeyChunkCount          = "irmin-chunk-count"
	MetadataValueEmbeddings        = "embeddings"
)

// UploadConfig holds configuration for uploading embeddings to LakeFS.
type UploadConfig struct {
	RepositoryID string
	Branch       string
	Path         string
	SourceFiles  []string // Changed from SourceFile (singular) to SourceFiles (plural)
	Model        string
	Dimensions   int
	ChunkCount   int
}

// UploadToLakeFS uploads embedding data to LakeFS with appropriate metadata.
func (c *Client) UploadToLakeFS(
	ctx context.Context,
	config UploadConfig,
	data []byte,
) (*lakefs.ObjectMetadata, error) {
	if c.lakeFSClient == nil {
		return nil, errors.New("LakeFS client is not configured")
	}
	if config.RepositoryID == "" {
		return nil, errors.New("repository ID is required")
	}
	if config.Branch == "" {
		return nil, errors.New("branch is required")
	}
	if config.Path == "" {
		return nil, errors.New("path is required")
	}
	if len(data) == 0 {
		return nil, errors.New("data cannot be empty")
	}

	// Ensure path has .parquet extension
	if !strings.HasSuffix(strings.ToLower(config.Path), ".parquet") {
		config.Path += ".parquet"
	}

	c.logger.InfoContext(ctx, "uploading embeddings to LakeFS",
		"repository", config.RepositoryID,
		"branch", config.Branch,
		"path", config.Path,
		"size", len(data),
	)

	// Upload the file
	reader := bytes.NewReader(data)
	metadata, err := c.lakeFSClient.UploadObject(
		config.RepositoryID,
		config.Branch,
		config.Path,
		reader,
		false, // force
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upload object: %w", err)
	}

	// Set embedding metadata
	embeddingMetadata, buildMetaErr := buildEmbeddingMetadata(config)
	if buildMetaErr != nil {
		return nil, fmt.Errorf("failed to build embedding metadata: %w", buildMetaErr)
	}
	metaErr := c.lakeFSClient.RewriteObjectMetadata(
		config.RepositoryID,
		config.Branch,
		config.Path,
		lakefs.UpdateMetadataRequest{Set: embeddingMetadata},
	)
	if metaErr != nil {
		c.logger.WarnContext(ctx, "failed to set embedding metadata",
			"error", metaErr,
			"path", config.Path,
		)
		// Merge the intended metadata into the response so callers know what was attempted
		if metadata.Metadata == nil {
			metadata.Metadata = make(map[string]string)
		}
		for key, value := range embeddingMetadata {
			metadata.Metadata[key] = value
		}
		c.logger.InfoContext(ctx, "embeddings uploaded to LakeFS successfully",
			"path", config.Path,
			"checksum", metadata.Checksum,
		)
		return metadata, nil
	}

	// Metadata was set successfully - fetch the updated metadata to return accurate data
	updatedMetadata, fetchErr := c.lakeFSClient.GetObjectMetadata(
		config.RepositoryID,
		config.Branch,
		config.Path,
		true,  // userMetadata
		false, // presign
	)
	if fetchErr != nil {
		c.logger.WarnContext(ctx, "failed to fetch updated metadata",
			"error", fetchErr,
			"path", config.Path,
		)
		// Fallback: merge the metadata we set into the original response
		if metadata.Metadata == nil {
			metadata.Metadata = make(map[string]string)
		}
		for key, value := range embeddingMetadata {
			metadata.Metadata[key] = value
		}
	} else {
		// Use the freshly fetched metadata which includes our updates
		metadata = updatedMetadata
	}

	c.logger.InfoContext(ctx, "embeddings uploaded to LakeFS successfully",
		"path", config.Path,
		"checksum", metadata.Checksum,
	)

	return metadata, nil
}

// buildEmbeddingMetadata creates the metadata map for an embedding file.
func buildEmbeddingMetadata(config UploadConfig) (map[string]string, error) {
	metadata := map[string]string{
		MetadataKeyFileType: MetadataValueEmbeddings,
	}

	if config.Model != "" {
		metadata[MetadataKeyEmbeddingModel] = config.Model
	}
	if config.Dimensions > 0 {
		metadata[MetadataKeyEmbeddingDimensions] = strconv.Itoa(config.Dimensions)
	}
	if len(config.SourceFiles) > 0 {
		// Store source files as JSON array
		sourceFilesJSON, err := json.Marshal(config.SourceFiles)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal source files: %w", err)
		}
		metadata[MetadataKeySourceFile] = string(sourceFilesJSON)
	}
	if config.ChunkCount > 0 {
		metadata[MetadataKeyChunkCount] = strconv.Itoa(config.ChunkCount)
	}

	return metadata, nil
}

// IsEmbeddingFile checks if the given LakeFS object metadata indicates an embedding file.
func IsEmbeddingFile(metadata map[string]string) bool {
	if metadata == nil {
		return false
	}
	return metadata[MetadataKeyFileType] == MetadataValueEmbeddings
}

// GetEmbeddingMetadata extracts embedding-specific metadata from LakeFS object metadata.
func GetEmbeddingMetadata(metadata map[string]string) (string, int, []string) {
	if metadata == nil {
		return "", 0, nil
	}

	model := metadata[MetadataKeyEmbeddingModel]
	sourceFileStr := metadata[MetadataKeySourceFile]
	dimensions := 0

	if dimStr, ok := metadata[MetadataKeyEmbeddingDimensions]; ok {
		_, _ = fmt.Sscanf(dimStr, "%d", &dimensions)
		// If parsing fails, dimensions remains 0 (the default)
		// This is acceptable since 0 is a valid signal for "unknown dimensions"
	}

	// Parse source files - try JSON first (new format), fallback to single string (old format)
	var sourceFiles []string
	if sourceFileStr != "" {
		// Try to parse as JSON array
		if err := json.Unmarshal([]byte(sourceFileStr), &sourceFiles); err != nil {
			// Fallback to old format - single file or comma-separated
			sourceFiles = []string{sourceFileStr}
		}
	}

	return model, dimensions, sourceFiles
}

// DownloadFromLakeFS downloads an embedding file from LakeFS.
func (c *Client) DownloadFromLakeFS(
	ctx context.Context,
	repositoryID string,
	ref string,
	path string,
) ([]byte, error) {
	if c.lakeFSClient == nil {
		return nil, errors.New("LakeFS client is not configured")
	}

	c.logger.InfoContext(ctx, "downloading embeddings from LakeFS",
		"repository", repositoryID,
		"ref", ref,
		"path", path,
	)

	// Get object content
	content, err := c.lakeFSClient.GetFullObjectContent(repositoryID, ref, path)
	if err != nil {
		return nil, fmt.Errorf("failed to download object: %w", err)
	}

	c.logger.InfoContext(ctx, "embeddings downloaded from LakeFS",
		"size", len(content),
	)

	return content, nil
}

// ListEmbeddingFiles lists all embedding files in a LakeFS repository path.
func (c *Client) ListEmbeddingFiles(
	ctx context.Context,
	repositoryID string,
	ref string,
	prefix string,
) ([]lakefs.ObjectMetadata, error) {
	if c.lakeFSClient == nil {
		return nil, errors.New("LakeFS client is not configured")
	}

	c.logger.InfoContext(ctx, "listing embedding files",
		"repository", repositoryID,
		"ref", ref,
		"prefix", prefix,
	)

	// List all objects with the prefix
	objects, err := c.lakeFSClient.ListAllObjects(
		repositoryID,
		ref,
		prefix,
		"",    // after
		"",    // delimiter
		true,  // userMetadata
		false, // presign
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list objects: %w", err)
	}

	// Filter for embedding files
	var embeddingFiles []lakefs.ObjectMetadata
	for _, obj := range objects {
		// Check if it's a parquet file
		if !strings.HasSuffix(strings.ToLower(obj.Path), ".parquet") {
			continue
		}

		// Check metadata for embedding marker
		if IsEmbeddingFile(obj.Metadata) {
			embeddingFiles = append(embeddingFiles, obj)
		}
	}

	c.logger.InfoContext(ctx, "embedding files listed",
		"total_objects", len(objects),
		"embedding_files", len(embeddingFiles),
	)

	return embeddingFiles, nil
}

// ProcessAndUploadFile is a convenience method that extracts text, creates embeddings,
// saves to Parquet, and uploads to LakeFS in one operation.
func (c *Client) ProcessAndUploadFile(
	ctx context.Context,
	fileContent []byte,
	fileName string,
	repositoryID string,
	branch string,
	outputPath string,
	config EmbeddingConfig,
) (*EmbeddingResult, *lakefs.ObjectMetadata, error) {
	// Create embeddings from file
	result, err := c.CreateEmbeddingsFromFile(ctx, fileContent, fileName, config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create embeddings: %w", err)
	}

	// Save to Parquet bytes
	parquetData, err := c.SaveEmbeddingsToParquetBytes(ctx, result.Records)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to save embeddings to parquet: %w", err)
	}

	// Generate output path if not provided
	if outputPath == "" {
		baseName := strings.TrimSuffix(fileName, filepath.Ext(fileName))
		outputPath = baseName + "_embeddings.parquet"
	}

	// Upload to LakeFS
	uploadConfig := UploadConfig{
		RepositoryID: repositoryID,
		Branch:       branch,
		Path:         outputPath,
		SourceFiles:  []string{fileName},
		Model:        result.Model,
		Dimensions:   result.Dimensions,
		ChunkCount:   result.TotalChunks,
	}

	metadata, err := c.UploadToLakeFS(ctx, uploadConfig, parquetData)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to upload to LakeFS: %w", err)
	}

	return result, metadata, nil
}

// DeleteEmbeddingFile deletes an embedding file from LakeFS.
func (c *Client) DeleteEmbeddingFile(
	ctx context.Context,
	repositoryID string,
	branch string,
	path string,
) error {
	if c.lakeFSClient == nil {
		return errors.New("LakeFS client is not configured")
	}

	c.logger.InfoContext(ctx, "deleting embedding file from LakeFS",
		"repository", repositoryID,
		"branch", branch,
		"path", path,
	)

	if err := c.lakeFSClient.DeleteObject(repositoryID, branch, path, false); err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	c.logger.InfoContext(ctx, "embedding file deleted successfully",
		"path", path,
	)

	return nil
}
