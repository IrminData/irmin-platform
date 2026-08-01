package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/embeddings"
	"irmin-api/engine"
	"irmin-api/utils"
	"os"
	"time"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/google/uuid"
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
	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
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
		ChunkSize:    config.ChunkSize,
		Overlap:      config.Overlap,
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
	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
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
		meta := embeddings.GetEmbeddingMetadata(objectMetadata.Metadata)
		if meta.Model != "" {
			model = meta.Model
		}
		if meta.Dimensions > 0 {
			dimensions = meta.Dimensions
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
	hasPriorityWeight := req.PriorityWeight != nil && *req.PriorityWeight > 0
	hasFilter := len(req.Filter) > 0

	switch {
	case hasPriorityWeight && hasFilter:
		// Combined: filter results by metadata, then apply priority weighting
		results, err = embeddingsClient.SearchWithFilterAndPriorityFromBytes(
			c, queryVector, parquetData, topK, req.Filter, *req.PriorityWeight,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error searching embeddings with filter and priority", "error", err)
			return nil, NewInternalErrorf("error searching embeddings with filter and priority: %w", err)
		}
	case hasPriorityWeight:
		// Priority-weighted search (boosts higher priority embeddings)
		results, err = embeddingsClient.SearchWithPriorityFromBytes(
			c, queryVector, parquetData, topK, *req.PriorityWeight,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error searching embeddings with priority", "error", err)
			return nil, NewInternalErrorf("error searching embeddings with priority: %w", err)
		}
	case hasFilter:
		// Search with filter - applies the filter in the SQL query, ensuring we get topK filtered results
		results, err = embeddingsClient.SearchWithFilterFromBytes(
			c, queryVector, parquetData, topK, req.Filter,
		)
		if err != nil {
			api.Logger.ErrorContext(c, "Error searching embeddings with filter", "error", err)
			return nil, NewInternalErrorf("error searching embeddings with filter: %w", err)
		}
	default:
		// Search without filter or priority weighting
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
			ID:          result.ID,
			Content:     result.Content,
			SourceFile:  result.SourceFile,
			ChunkIndex:  result.ChunkIndex,
			Score:       result.Score,
			Distance:    result.Distance,
			Metadata:    result.Metadata,
			ContentHash: result.ContentHash,
			Priority:    float64(result.Priority),
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
	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
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
		meta := embeddings.GetEmbeddingMetadata(obj.Metadata)

		// Parse chunk count from metadata
		chunkCount := 0
		if chunkCountStr, ok := obj.Metadata[embeddings.MetadataKeyChunkCount]; ok {
			_, _ = fmt.Sscanf(chunkCountStr, "%d", &chunkCount)
		}

		embeddingFile := irminmodels.EmbeddingFile{
			Path:        obj.Path,
			SourceFiles: meta.SourceFiles,
			Model:       meta.Model,
			Dimensions:  meta.Dimensions,
			ChunkCount:  chunkCount,
			SizeBytes:   obj.SizeBytes,
			Ref:         ref,
			ChunkSize:   meta.ChunkSize,
			Overlap:     meta.Overlap,
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
	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
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
	meta := embeddings.GetEmbeddingMetadata(objectMetadata.Metadata)

	// Parse chunk count from metadata
	chunkCount := 0
	if chunkCountStr, ok := objectMetadata.Metadata[embeddings.MetadataKeyChunkCount]; ok {
		_, _ = fmt.Sscanf(chunkCountStr, "%d", &chunkCount)
	}

	embeddingFile := &irminmodels.EmbeddingFile{
		Path:        embeddingPath,
		SourceFiles: meta.SourceFiles,
		Model:       meta.Model,
		Dimensions:  meta.Dimensions,
		ChunkCount:  chunkCount,
		SizeBytes:   objectMetadata.SizeBytes,
		Ref:         ref,
		ChunkSize:   meta.ChunkSize,
		Overlap:     meta.Overlap,
	}

	return embeddingFile, nil
}

// UpsertEmbeddings inserts or updates embeddings, skipping duplicates by content hash.
//
//nolint:gocognit,gocyclo,cyclop,funlen // Splitting would be unnecessary and make the code more complex.
func (api *APIServices) UpsertEmbeddings(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.UpsertEmbeddingsRequest,
) (*irminmodels.UpsertEmbeddingsResponse, error) {
	// Check permissions
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
		return nil, ErrAccessDenied
	}

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
		return nil, ErrAccessDenied
	}

	// Validate
	if req.OutputPath == "" {
		return nil, ErrInvalidRequest
	}
	if len(req.Embeddings) == 0 && len(req.SourcePaths) == 0 {
		return nil, ErrInvalidRequest
	}

	ref := repository.DefaultBranch
	if req.Ref != "" {
		ref = req.Ref
	}

	// Initialize clients
	embeddingsClient, err := embeddings.NewClient(c, api.Env, api.Logger, nil)
	if err != nil {
		return nil, NewInternalErrorf("error creating embeddings client: %w", err)
	}
	defer embeddingsClient.Close()

	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
	if err != nil {
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

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

	// Collect records to upsert
	var newRecords []embeddings.EmbeddingRecord

	// Process source paths if provided
	for _, sourcePath := range req.SourcePaths {
		content, getErr := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, sourcePath, ref)
		if getErr != nil {
			return nil, NewInternalErrorf("error retrieving object content for %s: %w", sourcePath, getErr)
		}

		result, embedErr := embeddingsClient.CreateEmbeddingsFromFile(c, content, sourcePath, config)
		if embedErr != nil {
			return nil, NewInternalErrorf("error creating embeddings from file %s: %w", sourcePath, embedErr)
		}

		// Apply request-level metadata and priority to all records
		for i := range result.Records {
			for k, v := range req.Metadata {
				result.Records[i].Metadata[k] = v
			}
			if req.Priority != nil {
				result.Records[i].Priority = float32(*req.Priority)
			}
		}

		newRecords = append(newRecords, result.Records...)
	}

	// Process pre-computed embeddings if provided
	for _, emb := range req.Embeddings {
		record := embeddings.EmbeddingRecord{
			Content:    emb.Text,
			SourceFile: emb.SourceFile,
			Metadata:   make(map[string]string),
			Priority:   1.0,
		}
		if emb.SourceChunk != nil {
			record.ChunkIndex = *emb.SourceChunk
		}
		// Apply request-level metadata defaults first
		for k, v := range req.Metadata {
			record.Metadata[k] = v
		}
		// Apply request-level priority default if set
		if req.Priority != nil {
			record.Priority = float32(*req.Priority)
		}
		// Then apply item-level values (overrides defaults)
		for k, v := range emb.Metadata {
			record.Metadata[k] = v
		}
		if emb.Priority != nil {
			record.Priority = float32(*emb.Priority)
		}
		newRecords = append(newRecords, record)
	}

	// Generate embeddings for records that don't have them
	var textsNeedingEmbeddings []string
	var indicesNeedingEmbeddings []int
	for i, record := range newRecords {
		if len(record.Embedding) == 0 {
			textsNeedingEmbeddings = append(textsNeedingEmbeddings, record.Content)
			indicesNeedingEmbeddings = append(indicesNeedingEmbeddings, i)
		}
	}

	if len(textsNeedingEmbeddings) > 0 {
		generatedEmbeddings, genErr := embeddingsClient.CreateEmbeddings(c, textsNeedingEmbeddings, config)
		if genErr != nil {
			return nil, NewInternalErrorf("error generating embeddings: %w", genErr)
		}
		for i, idx := range indicesNeedingEmbeddings {
			newRecords[idx].Embedding = generatedEmbeddings[i]
		}
	}

	// Download existing parquet if it exists
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)
	embeddingsWithLakeFS, err := embeddings.NewClient(c, api.Env, api.Logger, dataEngine.LakeFSClient)
	if err != nil {
		return nil, NewInternalErrorf("error creating embeddings client with LakeFS: %w", err)
	}
	defer embeddingsWithLakeFS.Close()

	existingData, downloadErr := embeddingsWithLakeFS.DownloadFromLakeFS(c, lakeFSRepositoryName, ref, req.OutputPath)

	var existingRecords []embeddings.EmbeddingRecord
	if downloadErr == nil && len(existingData) > 0 {
		// Save to temp file and load
		tmpFile, tmpErr := createTempParquetFile(existingData)
		if tmpErr != nil {
			api.Logger.WarnContext(c, "Failed to create temp file for existing embeddings, treating as new file",
				"error", tmpErr, "path", req.OutputPath)
		} else {
			var loadErr error
			existingRecords, loadErr = embeddingsClient.LoadEmbeddingsFromParquet(c, tmpFile)
			if loadErr != nil {
				api.Logger.WarnContext(c, "Failed to load existing embeddings, treating as new file",
					"error", loadErr, "path", req.OutputPath)
			}
			removeTempFile(tmpFile)
		}
	}

	// Validate config against existing file to prevent corruption
	if validationErr := api.validateExistingEmbeddingConfig(
		dataEngine, lakeFSRepositoryName, ref, req.OutputPath, config, len(existingRecords),
	); validationErr != nil {
		return nil, validationErr
	}

	// Build hash lookup
	existingHashes := make(map[string]*embeddings.EmbeddingRecord, len(existingRecords))
	for i := range existingRecords {
		hash := existingRecords[i].ContentHash
		if hash == "" {
			hash = embeddings.ComputeContentHash(existingRecords[i].Content)
			existingRecords[i].ContentHash = hash
		}
		existingHashes[hash] = &existingRecords[i]
	}

	// Process upsert
	result := &irminmodels.UpsertEmbeddingsResponse{Path: req.OutputPath}
	var finalRecords []embeddings.EmbeddingRecord
	now := time.Now()

	for _, newRecord := range newRecords {
		if newRecord.ContentHash == "" {
			newRecord.ContentHash = embeddings.ComputeContentHash(newRecord.Content)
		}

		if existing, found := existingHashes[newRecord.ContentHash]; found {
			// Check for changes
			metaChanged := !mapsEqualString(existing.Metadata, newRecord.Metadata)
			prioChanged := existing.Priority != newRecord.Priority

			if metaChanged || prioChanged {
				// Copy metadata map to avoid shared references
				existing.Metadata = copyStringMap(newRecord.Metadata)
				existing.Priority = newRecord.Priority
				existing.UpdatedAt = now
				result.Updated++
			} else {
				result.Skipped++
			}
		} else {
			// New record - generate ID if not provided
			if newRecord.ID == "" {
				newRecord.ID = uuid.New().String()
			}
			newRecord.CreatedAt = now
			newRecord.UpdatedAt = now
			result.Inserted++
			finalRecords = append(finalRecords, newRecord)
		}
	}

	// Add existing records
	finalRecords = append(finalRecords, existingRecords...)

	// Save back to LakeFS
	if len(finalRecords) > 0 {
		parquetData, saveErr := embeddingsClient.SaveEmbeddingsToParquetBytes(c, finalRecords)
		if saveErr != nil {
			return nil, NewInternalErrorf("error saving embeddings: %w", saveErr)
		}

		uploadConfig := embeddings.UploadConfig{
			RepositoryID: lakeFSRepositoryName,
			Branch:       ref,
			Path:         req.OutputPath,
			SourceFiles:  req.SourcePaths,
			Model:        config.Model,
			Dimensions:   config.Dimensions,
			ChunkCount:   len(finalRecords),
			ChunkSize:    config.ChunkSize,
			Overlap:      config.Overlap,
		}

		_, uploadErr := embeddingsWithLakeFS.UploadToLakeFS(c, uploadConfig, parquetData)
		if uploadErr != nil {
			return nil, NewInternalErrorf("error uploading embeddings: %w", uploadErr)
		}
	}

	api.Logger.InfoContext(c, "Upsert completed",
		"inserted", result.Inserted,
		"skipped", result.Skipped,
		"updated", result.Updated,
	)

	return result, nil
}

// UpdateEmbeddingMetadata updates metadata for specific embeddings.
//
//nolint:dupl // Similar structure to UpdateEmbeddingPriority is intentional for consistency.
func (api *APIServices) UpdateEmbeddingMetadata(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	embeddingPath string,
	ref string,
	updates map[string]map[string]string, // ID -> metadata
) error {
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return ErrAccessDenied
	}

	if ref == "" {
		ref = repository.DefaultBranch
	}

	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
	if err != nil {
		return NewInternalErrorf("error creating data engine client: %w", err)
	}

	embeddingsClient, err := embeddings.NewClient(c, api.Env, api.Logger, dataEngine.LakeFSClient)
	if err != nil {
		return NewInternalErrorf("error creating embeddings client: %w", err)
	}
	defer embeddingsClient.Close()

	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)

	// Download existing
	existingData, downloadErr := embeddingsClient.DownloadFromLakeFS(c, lakeFSRepositoryName, ref, embeddingPath)
	if downloadErr != nil {
		return NewInternalErrorf("error downloading embeddings: %w", downloadErr)
	}

	tmpFile, tmpErr := createTempParquetFile(existingData)
	if tmpErr != nil {
		return NewInternalErrorf("error creating temp file: %w", tmpErr)
	}
	defer removeTempFile(tmpFile)

	records, loadErr := embeddingsClient.LoadEmbeddingsFromParquet(c, tmpFile)
	if loadErr != nil {
		return NewInternalErrorf("error loading embeddings: %w", loadErr)
	}

	// Apply updates
	now := time.Now()
	modified := false
	for i := range records {
		if newMetadata, found := updates[records[i].ID]; found {
			// Copy metadata map to avoid shared references
			records[i].Metadata = copyStringMap(newMetadata)
			records[i].UpdatedAt = now
			modified = true
		}
	}

	if !modified {
		return nil
	}

	// Save back
	parquetData, saveErr := embeddingsClient.SaveEmbeddingsToParquetBytes(c, records)
	if saveErr != nil {
		return NewInternalErrorf("error saving embeddings: %w", saveErr)
	}

	// Fetch existing metadata to preserve Model, Dimensions, SourceFiles
	existingMeta, metaErr := dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepositoryName,
		ref,
		embeddingPath,
		true,
		false,
	)
	var existingEmbMeta embeddings.EmbeddingMeta
	if metaErr == nil && existingMeta != nil && existingMeta.Metadata != nil {
		existingEmbMeta = embeddings.GetEmbeddingMetadata(existingMeta.Metadata)
	}

	uploadConfig := embeddings.UploadConfig{
		RepositoryID: lakeFSRepositoryName,
		Branch:       ref,
		Path:         embeddingPath,
		SourceFiles:  existingEmbMeta.SourceFiles,
		Model:        existingEmbMeta.Model,
		Dimensions:   existingEmbMeta.Dimensions,
		ChunkCount:   len(records),
		ChunkSize:    existingEmbMeta.ChunkSize,
		Overlap:      existingEmbMeta.Overlap,
	}

	_, uploadErr := embeddingsClient.UploadToLakeFS(c, uploadConfig, parquetData)
	if uploadErr != nil {
		return NewInternalErrorf("error uploading embeddings: %w", uploadErr)
	}

	return nil
}

// UpdateEmbeddingPriority updates priority for specific embeddings.
//
//nolint:dupl // Similar structure to UpdateEmbeddingMetadata is intentional for consistency.
func (api *APIServices) UpdateEmbeddingPriority(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	embeddingPath string,
	ref string,
	updates map[string]float64, // ID -> priority
) error {
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return ErrAccessDenied
	}

	if ref == "" {
		ref = repository.DefaultBranch
	}

	dataEngine, err := engine.NewClient(c, api.Logger, api.Env, api.DB)
	if err != nil {
		return NewInternalErrorf("error creating data engine client: %w", err)
	}

	embeddingsClient, err := embeddings.NewClient(c, api.Env, api.Logger, dataEngine.LakeFSClient)
	if err != nil {
		return NewInternalErrorf("error creating embeddings client: %w", err)
	}
	defer embeddingsClient.Close()

	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)

	// Download existing
	existingData, downloadErr := embeddingsClient.DownloadFromLakeFS(c, lakeFSRepositoryName, ref, embeddingPath)
	if downloadErr != nil {
		return NewInternalErrorf("error downloading embeddings: %w", downloadErr)
	}

	tmpFile, tmpErr := createTempParquetFile(existingData)
	if tmpErr != nil {
		return NewInternalErrorf("error creating temp file: %w", tmpErr)
	}
	defer removeTempFile(tmpFile)

	records, loadErr := embeddingsClient.LoadEmbeddingsFromParquet(c, tmpFile)
	if loadErr != nil {
		return NewInternalErrorf("error loading embeddings: %w", loadErr)
	}

	// Apply updates
	now := time.Now()
	modified := false
	for i := range records {
		if newPriority, found := updates[records[i].ID]; found {
			records[i].Priority = float32(newPriority)
			records[i].UpdatedAt = now
			modified = true
		}
	}

	if !modified {
		return nil
	}

	// Save back
	parquetData, saveErr := embeddingsClient.SaveEmbeddingsToParquetBytes(c, records)
	if saveErr != nil {
		return NewInternalErrorf("error saving embeddings: %w", saveErr)
	}

	// Fetch existing metadata to preserve Model, Dimensions, SourceFiles
	existingMeta, metaErr := dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepositoryName,
		ref,
		embeddingPath,
		true,
		false,
	)
	var existingEmbMeta embeddings.EmbeddingMeta
	if metaErr == nil && existingMeta != nil && existingMeta.Metadata != nil {
		existingEmbMeta = embeddings.GetEmbeddingMetadata(existingMeta.Metadata)
	}

	uploadConfig := embeddings.UploadConfig{
		RepositoryID: lakeFSRepositoryName,
		Branch:       ref,
		Path:         embeddingPath,
		SourceFiles:  existingEmbMeta.SourceFiles,
		Model:        existingEmbMeta.Model,
		Dimensions:   existingEmbMeta.Dimensions,
		ChunkCount:   len(records),
		ChunkSize:    existingEmbMeta.ChunkSize,
		Overlap:      existingEmbMeta.Overlap,
	}

	_, uploadErr := embeddingsClient.UploadToLakeFS(c, uploadConfig, parquetData)
	if uploadErr != nil {
		return NewInternalErrorf("error uploading embeddings: %w", uploadErr)
	}

	return nil
}

// Helper functions

func createTempParquetFile(data []byte) (string, error) {
	tmpFile, err := os.CreateTemp("", "embed_*.parquet")
	if err != nil {
		return "", err
	}
	if _, writeErr := tmpFile.Write(data); writeErr != nil {
		_ = tmpFile.Close()
		return "", writeErr
	}
	_ = tmpFile.Close()
	return tmpFile.Name(), nil
}

// removeTempFile removes a temporary file. Errors are intentionally ignored
// since this is only used in deferred cleanup where failure is non-critical.
func removeTempFile(path string) {
	_ = os.Remove(path)
}

func mapsEqualString(a, b map[string]string) bool {
	if len(a) != len(b) {
		return false
	}
	for k, v := range a {
		if bv, ok := b[k]; !ok || bv != v {
			return false
		}
	}
	return true
}

// validateExistingEmbeddingConfig checks that the requested config matches an existing embedding file's
// model and dimensions to prevent corruption from mismatched settings.
func (api *APIServices) validateExistingEmbeddingConfig(
	dataEngine *engine.Client,
	lakeFSRepositoryName, ref, outputPath string,
	config embeddings.EmbeddingConfig,
	existingRecordCount int,
) error {
	if existingRecordCount == 0 {
		return nil
	}

	existingObjMeta, metaErr := dataEngine.LakeFSClient.GetObjectMetadata(
		lakeFSRepositoryName, ref, outputPath, true, false,
	)
	if metaErr != nil {
		// Cannot fetch metadata — skip validation rather than blocking the upsert
		return nil //nolint:nilerr // intentionally ignoring metadata fetch errors
	}
	if existingObjMeta == nil {
		return nil
	}

	existingMeta := embeddings.GetEmbeddingMetadata(existingObjMeta.Metadata)
	if existingMeta.Model != "" && existingMeta.Model != config.Model {
		return fmt.Errorf(
			"model mismatch: existing file uses %s, request uses %s: %w",
			existingMeta.Model, config.Model, ErrEmbeddingConfigMismatch,
		)
	}
	if existingMeta.Dimensions > 0 && existingMeta.Dimensions != config.Dimensions {
		return fmt.Errorf(
			"dimensions mismatch: existing file uses %d, request uses %d: %w",
			existingMeta.Dimensions, config.Dimensions, ErrEmbeddingConfigMismatch,
		)
	}

	return nil
}

// copyStringMap creates a deep copy of a string map to avoid shared references.
func copyStringMap(src map[string]string) map[string]string {
	if src == nil {
		return nil
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}
