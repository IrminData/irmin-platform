package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/embeddings"
	"irmin-api/engine"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// VectorizeObjects creates embeddings from one or more repository objects and stores them at the specified path.
//
//nolint:gocognit,funlen // Splitting would be unnecessary and make the code more complex.
func (api *APIServices) VectorizeObjects(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.VectorizeObjectsRequest,
) (*irminmodels.EmbeddingFile, error) {
	// Check permissions - user needs create permission for repository objects
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create embeddings",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Check repository update permission
	isAllowed, err = api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to modify repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if len(req.SourcePaths) == 0 {
		return nil, ErrInvalidRequest
	}
	if req.OutputPath == "" {
		return nil, ErrInvalidRequest
	}

	// Determine ref
	ref := repository.DefaultBranch
	if req.Ref != "" {
		ref = req.Ref
	}

	// Initialize embeddings client
	embeddingsClient, err := embeddings.NewClient(c, api.Env, api.Logger, nil)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating embeddings client", "error", err)
		return nil, NewInternalErrorf("error creating embeddings client: %w", err)
	}
	defer embeddingsClient.Close()

	// Initialize data engine client to fetch source files
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Apply default config if not provided
	config := embeddings.DefaultConfig()
	if req.Config != nil {
		if req.Config.Model != "" {
			config.Model = req.Config.Model
		}
		if req.Config.Dimensions > 0 {
			config.Dimensions = req.Config.Dimensions
		}
		if req.Config.ChunkSize > 0 {
			config.ChunkSize = req.Config.ChunkSize
		}
		if req.Config.Overlap > 0 {
			config.Overlap = req.Config.Overlap
		}
	}

	// Process all source files and collect embeddings
	var allRecords []embeddings.EmbeddingRecord
	for _, sourcePath := range req.SourcePaths {
		// Get the object content from the data engine
		content, getErr := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, sourcePath, ref)
		if getErr != nil {
			api.Logger.ErrorContext(c, "Error retrieving object content", "error", getErr, "path", sourcePath)
			return nil, NewInternalErrorf("error retrieving object content for %s: %w", sourcePath, getErr)
		}

		// Create embeddings from the file content
		result, embedErr := embeddingsClient.CreateEmbeddingsFromFile(c, content, sourcePath, config)
		if embedErr != nil {
			api.Logger.ErrorContext(c, "Error creating embeddings from file", "error", embedErr, "path", sourcePath)
			return nil, NewInternalErrorf("error creating embeddings from file %s: %w", sourcePath, embedErr)
		}

		allRecords = append(allRecords, result.Records...)
	}

	// Save embeddings to Parquet bytes
	parquetData, err := embeddingsClient.SaveEmbeddingsToParquetBytes(c, allRecords)
	if err != nil {
		api.Logger.ErrorContext(c, "Error saving embeddings to parquet", "error", err)
		return nil, NewInternalErrorf("error saving embeddings to parquet: %w", err)
	}

	// Upload the parquet file to LakeFS
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)
	uploadConfig := embeddings.UploadConfig{
		RepositoryID: lakeFSRepositoryName,
		Branch:       ref,
		Path:         req.OutputPath,
		SourceFiles:  req.SourcePaths,
		Model:        config.Model,
		Dimensions:   config.Dimensions,
		ChunkCount:   len(allRecords),
	}

	// Create embeddings client with LakeFS
	embeddingsWithLakeFS, err := embeddings.NewClient(c, api.Env, api.Logger, dataEngine.LakeFSClient)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating embeddings client with LakeFS", "error", err)
		return nil, NewInternalErrorf("error creating embeddings client with LakeFS: %w", err)
	}
	defer embeddingsWithLakeFS.Close()

	metadata, err := embeddingsWithLakeFS.UploadToLakeFS(c, uploadConfig, parquetData)
	if err != nil {
		api.Logger.ErrorContext(c, "Error uploading embeddings to LakeFS", "error", err)
		return nil, NewInternalErrorf("error uploading embeddings to LakeFS: %w", err)
	}

	// Create response
	embeddingFile := &irminmodels.EmbeddingFile{
		Path:        req.OutputPath,
		SourceFiles: req.SourcePaths,
		Model:       config.Model,
		Dimensions:  config.Dimensions,
		ChunkCount:  len(allRecords),
		SizeBytes:   metadata.SizeBytes,
		Ref:         ref,
	}

	api.Logger.InfoContext(c, "Embeddings created successfully",
		"output_path", req.OutputPath,
		"source_count", len(req.SourcePaths),
		"chunk_count", len(allRecords),
	)

	return embeddingFile, nil
}

// SearchEmbeddings performs vector similarity search on an embedding file.
//
//nolint:gocognit,funlen // Splitting would be unnecessary and make the code more complex.
func (api *APIServices) SearchEmbeddings(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.SearchEmbeddingsRequest,
) (*irminmodels.EmbeddingSearchResponse, error) {
	// Check permissions - user needs read permission
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to read embeddings",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if req.Query == "" {
		return nil, ErrInvalidRequest
	}
	if req.EmbeddingPath == "" {
		return nil, ErrInvalidRequest
	}

	// Determine ref
	ref := repository.DefaultBranch
	if req.Ref != "" {
		ref = req.Ref
	}

	// Set default top_k if not provided
	topK := req.TopK
	if topK <= 0 {
		topK = 10
	}

	// Initialize data engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Download the embedding file from LakeFS
	embeddingsClient, err := embeddings.NewClient(c, api.Env, api.Logger, dataEngine.LakeFSClient)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating embeddings client", "error", err)
		return nil, NewInternalErrorf("error creating embeddings client: %w", err)
	}
	defer embeddingsClient.Close()

	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)
	parquetData, err := embeddingsClient.DownloadFromLakeFS(c, lakeFSRepositoryName, ref, req.EmbeddingPath)
	if err != nil {
		api.Logger.ErrorContext(c, "Error downloading embedding file", "error", err, "path", req.EmbeddingPath)
		return nil, NewInternalErrorf("error downloading embedding file: %w", err)
	}

	// Get metadata to determine the model used
	objectMetadata, err := dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepositoryName,
		ref,
		req.EmbeddingPath,
		true,
		false,
	)
	if err != nil {
		api.Logger.WarnContext(c, "Error getting object metadata", "error", err)
	}

	model := embeddings.DefaultModel
	dimensions := embeddings.DefaultDimensions
	if objectMetadata != nil && objectMetadata.Metadata != nil {
		extractedModel, extractedDimensions, _ := embeddings.GetEmbeddingMetadata(objectMetadata.Metadata)
		if extractedModel != "" {
			model = extractedModel
		}
		if extractedDimensions > 0 {
			dimensions = extractedDimensions
		}
	}

	// Create embedding config for the query
	config := embeddings.EmbeddingConfig{
		Model:      model,
		Dimensions: dimensions,
	}

	// Create query embedding once before searching
	queryVector, err := embeddingsClient.CreateEmbeddingForQuery(c, req.Query, config)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating query embedding", "error", err)
		return nil, NewInternalErrorf("error creating query embedding: %w", err)
	}

	// Perform search
	var results []embeddings.SearchResult
	if len(req.Filter) > 0 {
		// Search with filter - this applies the filter in the SQL query, ensuring we get topK filtered results
		results, err = embeddingsClient.SearchWithFilterFromBytes(c, queryVector, parquetData, topK, req.Filter)
		if err != nil {
			api.Logger.ErrorContext(c, "Error searching embeddings with filter", "error", err)
			return nil, NewInternalErrorf("error searching embeddings with filter: %w", err)
		}
	} else {
		// Search without filter
		results, err = embeddingsClient.SearchSimilarFromBytes(c, queryVector, parquetData, topK)
		if err != nil {
			api.Logger.ErrorContext(c, "Error searching embeddings", "error", err)
			return nil, NewInternalErrorf("error searching embeddings: %w", err)
		}
	}

	// Convert to API response format
	searchResults := make([]irminmodels.EmbeddingSearchResult, len(results))
	for i, result := range results {
		searchResults[i] = irminmodels.EmbeddingSearchResult{
			ID:         result.ID,
			Content:    result.Content,
			SourceFile: result.SourceFile,
			ChunkIndex: result.ChunkIndex,
			Score:      result.Score,
			Distance:   result.Distance,
			Metadata:   result.Metadata,
		}
	}

	response := &irminmodels.EmbeddingSearchResponse{
		Results: searchResults,
		Query:   req.Query,
		Model:   model,
		TopK:    topK,
	}

	api.Logger.InfoContext(c, "Embedding search completed",
		"query", req.Query,
		"results_count", len(searchResults),
	)

	return response, nil
}

// ListEmbeddingFiles lists embedding files in a repository path.
func (api *APIServices) ListEmbeddingFiles(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	prefix string,
	ref string,
) ([]irminmodels.EmbeddingFile, error) {
	// Check permissions
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Determine ref
	if ref == "" {
		ref = repository.DefaultBranch
	}

	// Initialize data engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	embeddingsClient, err := embeddings.NewClient(c, api.Env, api.Logger, dataEngine.LakeFSClient)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating embeddings client", "error", err)
		return nil, NewInternalErrorf("error creating embeddings client: %w", err)
	}
	defer embeddingsClient.Close()

	// List embedding files
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)
	embeddingObjects, err := embeddingsClient.ListEmbeddingFiles(c, lakeFSRepositoryName, ref, prefix)
	if err != nil {
		api.Logger.ErrorContext(c, "Error listing embedding files", "error", err)
		return nil, NewInternalErrorf("error listing embedding files: %w", err)
	}

	// Convert to API response format
	embeddingFiles := make([]irminmodels.EmbeddingFile, 0, len(embeddingObjects))
	for _, obj := range embeddingObjects {
		model, dimensions, sourceFiles := embeddings.GetEmbeddingMetadata(obj.Metadata)

		// Parse chunk count from metadata
		chunkCount := 0
		if chunkCountStr, ok := obj.Metadata[embeddings.MetadataKeyChunkCount]; ok {
			_, _ = fmt.Sscanf(chunkCountStr, "%d", &chunkCount)
		}

		embeddingFile := irminmodels.EmbeddingFile{
			Path:        obj.Path,
			SourceFiles: sourceFiles,
			Model:       model,
			Dimensions:  dimensions,
			ChunkCount:  chunkCount,
			SizeBytes:   obj.SizeBytes,
			Ref:         ref,
		}
		embeddingFiles = append(embeddingFiles, embeddingFile)
	}

	return embeddingFiles, nil
}

// GetEmbeddingFileInfo gets metadata about an embedding file.
func (api *APIServices) GetEmbeddingFileInfo(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	embeddingPath string,
	ref string,
) (*irminmodels.EmbeddingFile, error) {
	// Check permissions
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Validate required fields
	if embeddingPath == "" {
		return nil, ErrInvalidRequest
	}

	// Determine ref
	if ref == "" {
		ref = repository.DefaultBranch
	}

	// Initialize data engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Get object metadata
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)
	objectMetadata, err := dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepositoryName,
		ref,
		embeddingPath,
		true,
		false,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting object metadata", "error", err)
		return nil, NewInternalErrorf("error getting object metadata: %w", err)
	}

	// Check if it's an embedding file
	if !embeddings.IsEmbeddingFile(objectMetadata.Metadata) {
		return nil, ErrNotFound
	}

	// Extract embedding metadata
	model, dimensions, sourceFiles := embeddings.GetEmbeddingMetadata(objectMetadata.Metadata)

	// Parse chunk count from metadata
	chunkCount := 0
	if chunkCountStr, ok := objectMetadata.Metadata[embeddings.MetadataKeyChunkCount]; ok {
		_, _ = fmt.Sscanf(chunkCountStr, "%d", &chunkCount)
	}

	embeddingFile := &irminmodels.EmbeddingFile{
		Path:        embeddingPath,
		SourceFiles: sourceFiles,
		Model:       model,
		Dimensions:  dimensions,
		ChunkCount:  chunkCount,
		SizeBytes:   objectMetadata.SizeBytes,
		Ref:         ref,
	}

	return embeddingFile, nil
}
