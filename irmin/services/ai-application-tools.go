package services

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"
	"path"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// s3PathMinParts is the minimum number of parts required in an S3 path (repo-id/rest).
	s3PathMinParts = 2
	// s3PathSplitLimit is the limit for splitting S3 paths into components.
	s3PathSplitLimit = 2
	// unifiedPathSplitLimit is the limit for splitting unified paths into repo slug, ref, and path.
	unifiedPathSplitLimit = 3
	// unifiedPathMinParts is the minimum number of parts required in a unified path (repo-slug/ref).
	unifiedPathMinParts = 2
	// defaultRefFallback is used when both data source branch and repository default branch are empty.
	defaultRefFallback = "main"
	// workflowExecutionTimeout is the maximum time to wait for a workflow to complete before returning.
	// Set to 5 minutes to accommodate workflows that process data but still provide timely responses.
	workflowExecutionTimeout = 5 * 60 * 1000 // 5 minutes in milliseconds
	// workflowPollInterval is the interval between status checks when waiting for workflow completion.
	workflowPollInterval = 1000 // 1 second in milliseconds
	// millisecondsPerSecond is the conversion factor from milliseconds to seconds.
	millisecondsPerSecond = 1000
)

var (
	// ErrToolNotEnabled is returned when a tool is not enabled for the AI Application.
	ErrToolNotEnabled = errors.New("tool not enabled for this AI Application")
	// ErrPathNotInDataSources is returned when the requested path is not in the configured data sources.
	ErrPathNotInDataSources = errors.New("path not in configured data sources")
	// ErrPathTraversalDetected is returned when a path contains traversal sequences.
	ErrPathTraversalDetected = errors.New("path traversal detected")
	// ErrInvalidUnifiedPath is returned when a unified path cannot be parsed.
	ErrInvalidUnifiedPath = errors.New("invalid unified path format")
	// ErrNoEmbeddingFilesFound is returned when no embedding files are found in data sources.
	ErrNoEmbeddingFilesFound = errors.New("no embedding files found in data sources")
)

// ResolvedPath contains the resolved repository, path, and ref from a unified path.
type ResolvedPath struct {
	Repository *db.Repository
	Path       string
	Ref        string
	DataSource *db.AIApplicationDataSource
}

// AIAppToolExecutor executes tools within the scope of an AI Application's configured data sources.
type AIAppToolExecutor struct {
	aiApp       *db.AIApplication
	apiServices *APIServices
}

// NewAIAppToolExecutor creates a new AIAppToolExecutor.
func NewAIAppToolExecutor(aiApp *db.AIApplication, apiServices *APIServices) *AIAppToolExecutor {
	return &AIAppToolExecutor{
		aiApp:       aiApp,
		apiServices: apiServices,
	}
}

// GetAIApplication returns the AI Application.
func (e *AIAppToolExecutor) GetAIApplication() *db.AIApplication {
	return e.aiApp
}

// GetWorkspace returns the workspace associated with the AI Application.
func (e *AIAppToolExecutor) GetWorkspace() *db.Workspace {
	return &e.aiApp.Workspace
}

// GetToolConfig returns the tool configuration for the AI Application.
func (e *AIAppToolExecutor) GetToolConfig() db.AIApplicationToolConfig {
	return e.aiApp.ParseToolConfig()
}

// getEffectiveRef returns the effective ref (branch) for a data source.
// It uses the data source's configured branch, falls back to the repository's default branch,
// and uses "main" as a final fallback if both are empty.
func getEffectiveRef(ds *db.AIApplicationDataSource) string {
	if ds.Branch != "" {
		return ds.Branch
	}
	if ds.Repository.DefaultBranch != "" {
		return ds.Repository.DefaultBranch
	}
	return defaultRefFallback
}

// containsPathTraversal checks if a path contains ".." as a path component (directory traversal).
// This correctly allows filenames containing ".." as a substring (e.g., "file..backup.csv")
// while rejecting actual traversal sequences like "../", "/..", or just "..".
func containsPathTraversal(p string) bool {
	// Check each path component for ".."
	for _, component := range strings.Split(p, "/") {
		if component == ".." {
			return true
		}
	}
	return false
}

// cleanPath normalizes a path and checks for traversal attempts.
// It returns the cleaned path and an error if the path is invalid or contains traversal sequences.
func cleanPath(inputPath string) (string, error) {
	// Remove leading slash for consistent handling
	inputPath = strings.TrimPrefix(inputPath, "/")

	// Empty path is valid (represents root)
	if inputPath == "" {
		return "", nil
	}

	// Check for path traversal sequences (.. as a path component)
	// This correctly allows filenames like "file..backup.csv" while rejecting "data/../sensitive"
	if containsPathTraversal(inputPath) {
		return "", ErrPathTraversalDetected
	}

	// Use path.Clean to normalize the path (handles /./, ///, etc.)
	cleaned := path.Clean(inputPath)

	// After cleaning, verify no traversal occurred
	// path.Clean normalizes paths but preserves ".." components that escape the root
	if containsPathTraversal(cleaned) {
		return "", ErrPathTraversalDetected
	}

	// Remove any leading slash that Clean might have added
	cleaned = strings.TrimPrefix(cleaned, "/")

	return cleaned, nil
}

// validatePathAccess validates that the given repository slug, path, and branch are within the
// AI Application's configured data sources.
func (e *AIAppToolExecutor) validatePathAccess(repoSlug, inputPath, branch string) error {
	// Clean and validate the input path
	normalizedPath, err := cleanPath(inputPath)
	if err != nil {
		return err
	}

	for _, ds := range e.aiApp.DataSources {
		// Check repository matches
		if ds.Repository.Slug != repoSlug {
			continue
		}

		// Check branch matches (empty branch in data source means all branches allowed)
		if ds.Branch != "" && ds.Branch != branch {
			continue
		}

		// Clean the data source path for consistent comparison
		dsPath, dsErr := cleanPath(ds.Path)
		if dsErr != nil {
			// Invalid data source path configuration - skip this data source
			continue
		}

		// Check path is within the configured path (empty path means root access)
		if dsPath == "" || normalizedPath == dsPath || strings.HasPrefix(normalizedPath, dsPath+"/") {
			return nil
		}
	}

	return ErrPathNotInDataSources
}

// getRepositoryFromDataSources finds and returns the repository from the configured data sources.
func (e *AIAppToolExecutor) getRepositoryFromDataSources(repoSlug string) (*db.Repository, error) {
	for _, ds := range e.aiApp.DataSources {
		if ds.Repository.Slug == repoSlug {
			return &ds.Repository, nil
		}
	}
	return nil, fmt.Errorf("repository '%s' not found in data sources", repoSlug)
}

// ListDataSources returns the list of configured data sources.
func (e *AIAppToolExecutor) ListDataSources() []irminmodels.AIApplicationDataSource {
	var sources []irminmodels.AIApplicationDataSource
	for _, ds := range e.aiApp.DataSources {
		sources = append(sources, irminmodels.AIApplicationDataSource{
			Repository: ds.Repository.Slug,
			Branch:     ds.Branch,
			Path:       "/" + ds.Path,
		})
	}
	return sources
}

// ListDataSourcesUnified returns the list of configured data sources with unified paths.
// Unified paths have the format: /{repository-slug}/{ref}/{path}
func (e *AIAppToolExecutor) ListDataSourcesUnified() []irminmodels.AIAppDataSourceUnified {
	var sources []irminmodels.AIAppDataSourceUnified
	for i := range e.aiApp.DataSources {
		ds := &e.aiApp.DataSources[i]
		ref := getEffectiveRef(ds)
		// Build the unified path using the helper to ensure proper normalization
		sources = append(sources, irminmodels.AIAppDataSourceUnified{
			Path: BuildUnifiedPath(ds.Repository.Slug, ref, ds.Path),
		})
	}
	return sources
}

// ResolvePath parses a unified path (/{repo-slug}/{ref}/{path}) and resolves it to a repository, path, and ref.
// The unified path format is: /{repository-slug}/{ref}/{path-within-repo}
// Returns the resolved repository, the path within the repository, and the ref (branch) from the path.
// When multiple data sources match, selects the most specific one (longest matching path).
func (e *AIAppToolExecutor) ResolvePath(unifiedPath string) (*ResolvedPath, error) {
	// Clean and validate the path
	cleanedPath, err := cleanPath(unifiedPath)
	if err != nil {
		return nil, err
	}

	// Empty path means root - cannot resolve to a specific repository
	if cleanedPath == "" {
		return nil, ErrInvalidUnifiedPath
	}

	// Split the path into repository slug, ref, and the rest
	// Format: {repo-slug}/{ref}/{path-within-repo}
	parts := strings.SplitN(cleanedPath, "/", unifiedPathSplitLimit)
	if len(parts) < unifiedPathMinParts || parts[0] == "" || parts[1] == "" {
		return nil, ErrInvalidUnifiedPath
	}

	repoSlug := parts[0]
	ref := parts[1]
	pathWithinRepo := ""
	if len(parts) > unifiedPathMinParts {
		pathWithinRepo = parts[unifiedPathMinParts]
	}

	// Find the most specific data source that matches this repository, ref, and path
	var matchedDataSource *db.AIApplicationDataSource
	var matchedRepo *db.Repository
	matchedPathLen := -1

	for i := range e.aiApp.DataSources {
		ds := &e.aiApp.DataSources[i]
		if ds.Repository.Slug != repoSlug {
			continue
		}

		// Determine the effective ref for this data source (with fallback to "main")
		dsRef := getEffectiveRef(ds)

		// Check ref matches
		if dsRef != ref {
			continue
		}

		// Clean the data source path for comparison
		dsPath, dsErr := cleanPath(ds.Path)
		if dsErr != nil {
			continue
		}

		// Check if the path is within this data source's scope
		if dsPath == "" || pathWithinRepo == dsPath || strings.HasPrefix(pathWithinRepo, dsPath+"/") {
			// Select the most specific match (longest path)
			if len(dsPath) > matchedPathLen {
				matchedDataSource = ds
				matchedRepo = &ds.Repository
				matchedPathLen = len(dsPath)
			}
		}
	}

	if matchedDataSource == nil {
		return nil, ErrPathNotInDataSources
	}

	return &ResolvedPath{
		Repository: matchedRepo,
		Path:       pathWithinRepo,
		Ref:        ref,
		DataSource: matchedDataSource,
	}, nil
}

// ResolvePathOrFindInDataSources attempts to resolve a unified path or find a matching path across all data sources.
// If the path starts with a known repository slug, it resolves it directly.
// Otherwise, it searches all data sources for a matching path.
// When multiple data sources match, selects the most specific one (longest matching path).
func (e *AIAppToolExecutor) ResolvePathOrFindInDataSources(inputPath string) (*ResolvedPath, error) {
	// Clean and validate the path
	cleanedPath, err := cleanPath(inputPath)
	if err != nil {
		return nil, err
	}

	// Empty path - cannot resolve
	if cleanedPath == "" {
		return nil, ErrInvalidUnifiedPath
	}

	// First, try to resolve as a unified path (starts with repo slug/ref)
	parts := strings.SplitN(cleanedPath, "/", unifiedPathSplitLimit)
	if len(parts) >= unifiedPathMinParts && parts[0] != "" && parts[1] != "" {
		// Check if the first part is a known repository slug
		for i := range e.aiApp.DataSources {
			ds := &e.aiApp.DataSources[i]
			if ds.Repository.Slug == parts[0] {
				// Found a matching repository - resolve as unified path (which handles most-specific matching)
				return e.ResolvePath(inputPath)
			}
		}
	}

	// Path doesn't start with a repository slug - search all data sources
	// This is for backwards compatibility or when user provides just a path
	// Find the most specific match across all data sources
	var matchedDataSource *db.AIApplicationDataSource
	matchedPathLen := -1

	for i := range e.aiApp.DataSources {
		ds := &e.aiApp.DataSources[i]
		dsPath, dsErr := cleanPath(ds.Path)
		if dsErr != nil {
			continue
		}

		// Check if the path is within this data source's scope
		if dsPath == "" || cleanedPath == dsPath || strings.HasPrefix(cleanedPath, dsPath+"/") {
			// Select the most specific match (longest path)
			if len(dsPath) > matchedPathLen {
				matchedDataSource = ds
				matchedPathLen = len(dsPath)
			}
		}
	}

	if matchedDataSource == nil {
		return nil, ErrPathNotInDataSources
	}

	// Determine ref (with fallback to "main")
	ref := getEffectiveRef(matchedDataSource)

	return &ResolvedPath{
		Repository: &matchedDataSource.Repository,
		Path:       cleanedPath,
		Ref:        ref,
		DataSource: matchedDataSource,
	}, nil
}

// BuildUnifiedPath constructs a unified path from a repository slug, ref, and path within the repository.
// The unified path format is: /{repository-slug}/{ref}/{path-within-repo}
func BuildUnifiedPath(repoSlug, ref, pathWithinRepo string) string {
	if pathWithinRepo == "" {
		return "/" + repoSlug + "/" + ref
	}
	// Remove leading slash from path if present
	pathWithinRepo = strings.TrimPrefix(pathWithinRepo, "/")
	return "/" + repoSlug + "/" + ref + "/" + pathWithinRepo
}

// prefixObjectPaths recursively transforms all paths in a RepositoryObject to unified format.
// This ensures that all returned paths can be used directly with other API endpoints.
func prefixObjectPaths(object *db.RepositoryObject, repoSlug, ref string) {
	object.Path = BuildUnifiedPath(repoSlug, ref, object.Path)
	for i := range object.Children {
		prefixObjectPaths(&object.Children[i], repoSlug, ref)
	}
}

// validateSQLDataSourceAccess validates that a SQL query only accesses data within
// the AI Application's configured data sources.
// It checks both Irmin placeholders ($["repo;path@ref"]) and S3 paths (s3://...).
func (e *AIAppToolExecutor) validateSQLDataSourceAccess(sql string) error {
	// Validate Irmin placeholders
	if err := e.validatePlaceholderAccess(sql); err != nil {
		return err
	}

	// Validate S3 paths
	if err := e.validateS3PathAccess(sql); err != nil {
		return err
	}

	return nil
}

// validatePlaceholderAccess validates that all Irmin placeholders in the SQL query
// reference data within the configured data sources.
func (e *AIAppToolExecutor) validatePlaceholderAccess(sql string) error {
	// Parse placeholders without actually replacing them - we just need to validate
	_, parseErr := utils.ParseIrminQuery(sql, func(pl *utils.ParsedQueryPlaceholder) (string, error) {
		// Extract repository slug from the placeholder
		repoSlug := pl.Repository

		// Extract path from the placeholder (object field)
		path := pl.Object

		// Extract ref/branch from the placeholder
		ref := pl.Ref

		// If no ref specified, we need to find the default branch for the repository
		if ref == "" {
			repo, err := e.getRepositoryFromDataSources(repoSlug)
			if err != nil {
				return "", ErrPathNotInDataSources
			}
			ref = repo.DefaultBranch
		}

		// Validate that this path is within the configured data sources
		if err := e.validatePathAccess(repoSlug, path, ref); err != nil {
			return "", err
		}

		// Return empty string - we're just validating, not actually replacing
		return "", nil
	})

	// If no placeholders found, that's OK
	if parseErr != nil && errors.Is(parseErr, utils.ErrNoPlaceholders) {
		return nil
	}

	return parseErr
}

// validateS3PathAccess validates that all S3 paths in the SQL query
// reference data within the configured data sources.
func (e *AIAppToolExecutor) validateS3PathAccess(sql string) error {
	// Extract S3 paths from the query
	s3Paths, err := engine.ExtractS3Paths(sql)
	if err != nil {
		return fmt.Errorf("failed to extract S3 paths from SQL: %w", err)
	}

	// Validate each S3 path
	for _, s3Path := range s3Paths {
		if validateErr := e.validateSingleS3Path(s3Path); validateErr != nil {
			return validateErr
		}
	}

	return nil
}

// validateSingleS3Path validates a single S3 path against the configured data sources.
// S3 path format: {lakefs-repo-id}/{branch}/{object-path}
func (e *AIAppToolExecutor) validateSingleS3Path(s3Path string) error {
	// Parse S3 path: lakefs-repo-id/branch/object-path
	parts := strings.SplitN(s3Path, "/", s3PathSplitLimit)
	if len(parts) < s3PathMinParts {
		return ErrPathNotInDataSources
	}

	lakeFSRepoID := parts[0]
	keyPath := parts[1]

	// Parse key path: branch/object-path
	keyParts := strings.SplitN(keyPath, "/", s3PathSplitLimit)
	branch := keyParts[0]

	// Validate branch is non-empty
	if branch == "" {
		return ErrPathNotInDataSources
	}

	objectPath := ""
	if len(keyParts) > 1 {
		objectPath = keyParts[1]
	}

	// Look up repository by LakeFS repo ID
	repository, repoErr := e.apiServices.DB.GetRepositoryByLakeFSRepoID(lakeFSRepoID)
	if repoErr != nil || repository == nil || repository.ID == 0 {
		return ErrPathNotInDataSources
	}

	// Verify the repository belongs to the same workspace as the AI Application
	if repository.WorkspaceID != e.aiApp.WorkspaceID {
		return ErrPathNotInDataSources
	}

	// Validate path access using the repository slug
	return e.validatePathAccess(repository.Slug, objectPath, branch)
}

// ExecuteSQL executes a SQL query within the scope of the AI Application's data sources.
func (e *AIAppToolExecutor) ExecuteSQL(
	ctx context.Context,
	sql string,
	limitResponse bool,
) (any, error) {
	config := e.GetToolConfig()
	if !config.QueryEnabled {
		return nil, ErrToolNotEnabled
	}

	// Validate that the SQL query only accesses data within configured data sources
	if err := e.validateSQLDataSourceAccess(sql); err != nil {
		return nil, fmt.Errorf("SQL query access validation failed: %w", err)
	}

	// Execute SQL using the workspace context with the AI App owner as the user
	result, err := e.apiServices.ExecuteSQL(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		irmincore.ExecuteSQLRequest{SQL: sql},
		limitResponse,
	)
	if err != nil {
		return nil, fmt.Errorf("SQL execution failed: %w", err)
	}

	return result, nil
}

// GetRepositoryObjectSchema retrieves the schema for a repository object.
func (e *AIAppToolExecutor) GetRepositoryObjectSchema(
	ctx context.Context,
	repoSlug, path, branch string,
) (*irminmodels.ObjectSchema, error) {
	config := e.GetToolConfig()
	if !config.SchemaEnabled {
		return nil, ErrToolNotEnabled
	}

	// Get repository from data sources
	repo, err := e.getRepositoryFromDataSources(repoSlug)
	if err != nil {
		return nil, err
	}

	// Determine branch (use default if not specified)
	if branch == "" {
		branch = repo.DefaultBranch
	}

	// Validate path access (after default branch is resolved)
	if err = e.validatePathAccess(repoSlug, path, branch); err != nil {
		return nil, err
	}

	// Get the object first using the AI App owner as the user
	object, _, _, err := e.apiServices.GetRepositoryObject(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		repo,
		path,
		branch,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get repository object: %w", err)
	}

	// Get the schema using the AI App owner as the user
	schema, err := e.apiServices.GetRepositoryObjectSchema(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		repo,
		object,
		branch,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get object schema: %w", err)
	}

	return schema, nil
}

// ListRepositoryObjects lists objects in a repository path.
// Returns the raw db.RepositoryObject which can be formatted by the caller.
func (e *AIAppToolExecutor) ListRepositoryObjects(
	ctx context.Context,
	repoSlug, path, ref string,
) (*db.RepositoryObject, error) {
	config := e.GetToolConfig()
	if !config.ListObjectsEnabled {
		return nil, ErrToolNotEnabled
	}

	// Get repository from data sources
	repo, err := e.getRepositoryFromDataSources(repoSlug)
	if err != nil {
		return nil, err
	}

	// Determine ref (use default branch if not specified)
	if ref == "" {
		ref = repo.DefaultBranch
	}

	// Validate path access (after default branch is resolved)
	if err = e.validatePathAccess(repoSlug, path, ref); err != nil {
		return nil, err
	}

	// Get the object (which includes children for directories) using the AI App owner as the user
	object, _, _, err := e.apiServices.GetRepositoryObject(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		repo,
		path,
		ref,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list repository objects: %w", err)
	}

	return object, nil
}

// GetRepositoryObjectContent retrieves the content of a repository object.
func (e *AIAppToolExecutor) GetRepositoryObjectContent(
	ctx context.Context,
	repoSlug, path, branch string,
	limitResponse bool,
) ([]byte, error) {
	config := e.GetToolConfig()
	if !config.GetContentEnabled {
		return nil, ErrToolNotEnabled
	}

	// Get repository from data sources
	repo, err := e.getRepositoryFromDataSources(repoSlug)
	if err != nil {
		return nil, err
	}

	// Determine branch (use default if not specified)
	if branch == "" {
		branch = repo.DefaultBranch
	}

	// Validate path access (after default branch is resolved)
	if err = e.validatePathAccess(repoSlug, path, branch); err != nil {
		return nil, err
	}

	// Get the object first using the AI App owner as the user
	object, _, _, err := e.apiServices.GetRepositoryObject(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		repo,
		path,
		branch,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get repository object: %w", err)
	}

	// Get the content using the AI App owner as the user
	content, err := e.apiServices.GetRepositoryObjectContent(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		repo,
		object,
		limitResponse,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get object content: %w", err)
	}

	return content, nil
}

// SearchEmbeddings performs vector similarity search on repository-based embeddings.
func (e *AIAppToolExecutor) SearchEmbeddings(
	ctx context.Context,
	repoSlug, embeddingPath, query, ref string,
	topK int,
	filter map[string]string,
) (*irminmodels.EmbeddingSearchResponse, error) {
	config := e.GetToolConfig()
	if !config.VectorSearchEnabled {
		return nil, ErrToolNotEnabled
	}

	// Get repository from data sources
	repo, err := e.getRepositoryFromDataSources(repoSlug)
	if err != nil {
		return nil, err
	}

	// Determine ref (use default branch if not specified)
	if ref == "" {
		ref = repo.DefaultBranch
	}

	// Validate path access for the embedding file (after default branch is resolved)
	if err = e.validatePathAccess(repoSlug, embeddingPath, ref); err != nil {
		return nil, err
	}

	// Use existing SearchEmbeddings service with the AI App owner as the user
	result, err := e.apiServices.SearchEmbeddings(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		repo,
		irmincore.SearchEmbeddingsRequest{
			EmbeddingPath: embeddingPath,
			Query:         query,
			Ref:           ref,
			TopK:          topK,
			Filter:        filter,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("embedding search failed: %w", err)
	}

	return result, nil
}

// GetDocumentation retrieves documentation for the AI Application.
// Returns the system prompt (SQL syntax guide, tool descriptions, etc.) and any custom documentation.
func (e *AIAppToolExecutor) GetDocumentation() (string, error) {
	config := e.GetToolConfig()
	if !config.DocsEnabled {
		return "", ErrToolNotEnabled
	}

	// Generate the system prompt which contains comprehensive documentation
	systemPrompt := e.apiServices.GenerateAIApplicationSystemPrompt(e.aiApp)

	// If there's custom documentation, append it
	if e.aiApp.Documentation != "" {
		return systemPrompt + "\n\n---\n\n## Custom Documentation\n\n" + e.aiApp.Documentation, nil
	}

	return systemPrompt, nil
}

// === Simplified API Methods using Unified Paths ===

// GetSchemaByPath retrieves the schema for an object using a unified path.
// The path format is: /{repository-slug}/{ref}/{path-within-repo}
func (e *AIAppToolExecutor) GetSchemaByPath(
	ctx context.Context,
	unifiedPath string,
) (*irminmodels.ObjectSchema, error) {
	resolved, err := e.ResolvePath(unifiedPath)
	if err != nil {
		return nil, err
	}

	return e.GetRepositoryObjectSchema(ctx, resolved.Repository.Slug, resolved.Path, resolved.Ref)
}

// ListObjectsByPath lists objects using a unified path.
// If path is empty, lists objects from all data sources.
// The path format is: /{repository-slug}/{ref}/{path-within-repo}
// All returned object paths are in unified format for direct use with other API endpoints.
func (e *AIAppToolExecutor) ListObjectsByPath(
	ctx context.Context,
	unifiedPath string,
) (*db.RepositoryObject, error) {
	if unifiedPath == "" || unifiedPath == "/" {
		// List from all data sources - return a virtual root with all data sources as children
		return e.listAllDataSourceRoots(ctx)
	}

	resolved, err := e.ResolvePath(unifiedPath)
	if err != nil {
		return nil, err
	}

	object, err := e.ListRepositoryObjects(ctx, resolved.Repository.Slug, resolved.Path, resolved.Ref)
	if err != nil {
		return nil, err
	}

	// Transform all paths to unified format
	if object != nil {
		prefixObjectPaths(object, resolved.Repository.Slug, resolved.Ref)
	}

	return object, nil
}

// listAllDataSourceRoots creates a virtual root object with all data source roots as children.
func (e *AIAppToolExecutor) listAllDataSourceRoots(ctx context.Context) (*db.RepositoryObject, error) {
	config := e.GetToolConfig()
	if !config.ListObjectsEnabled {
		return nil, ErrToolNotEnabled
	}

	// Create a virtual root object
	root := &db.RepositoryObject{
		Name:     "",
		Path:     "/",
		Type:     "folder",
		Children: []db.RepositoryObject{},
	}

	// Add each data source as a child
	for i := range e.aiApp.DataSources {
		ds := &e.aiApp.DataSources[i]
		ref := getEffectiveRef(ds)

		// Get the object for this data source
		object, _, _, err := e.apiServices.GetRepositoryObject(
			ctx,
			"en",
			&e.aiApp.Owner,
			&e.aiApp.Workspace,
			&ds.Repository,
			ds.Path,
			ref,
		)
		if err != nil {
			// Skip this data source if we can't access it
			continue
		}

		// Build the unified base path for this data source (matches ListDataSourcesUnified)
		basePath := BuildUnifiedPath(ds.Repository.Slug, ref, ds.Path)

		// Determine the display name for this data source
		displayName := ds.Repository.Slug
		if ds.Path != "" && object != nil {
			displayName = object.Name
		}

		// Create a child representing this data source
		child := db.RepositoryObject{
			Name: displayName,
			Path: basePath,
			Type: "folder",
		}

		// If the data source has a specific path, include its children
		if object != nil {
			if object.Type == "folder" && len(object.Children) > 0 {
				// Convert children paths to unified format recursively
				for i := range object.Children {
					prefixedChild := object.Children[i]
					prefixObjectPaths(&prefixedChild, ds.Repository.Slug, ref)
					child.Children = append(child.Children, prefixedChild)
				}
			} else if object.Type != "folder" {
				// Single file as data source
				child = *object
				prefixObjectPaths(&child, ds.Repository.Slug, ref)
			}
		}

		root.Children = append(root.Children, child)
	}

	return root, nil
}

// GetContentByPath retrieves the content of an object using a unified path.
// The path format is: /{repository-slug}/{ref}/{path-within-repo}
func (e *AIAppToolExecutor) GetContentByPath(
	ctx context.Context,
	unifiedPath string,
	limitResponse bool,
) ([]byte, error) {
	resolved, err := e.ResolvePath(unifiedPath)
	if err != nil {
		return nil, err
	}

	return e.GetRepositoryObjectContent(ctx, resolved.Repository.Slug, resolved.Path, resolved.Ref, limitResponse)
}

// SearchEmbeddingsByPath performs vector similarity search, optionally filtered by a unified path.
// If pathFilter is empty, searches across all embedding files in all data sources.
// If pathFilter is provided, searches only in the specified embedding file.
func (e *AIAppToolExecutor) SearchEmbeddingsByPath(
	ctx context.Context,
	query string,
	topK int,
	pathFilter string,
	metadataFilter map[string]string,
) (*irminmodels.EmbeddingSearchResponse, error) {
	config := e.GetToolConfig()
	if !config.VectorSearchEnabled {
		return nil, ErrToolNotEnabled
	}

	if topK <= 0 {
		topK = 10
	}

	// If a path filter is provided, search only that specific embedding file
	if pathFilter != "" {
		resolved, err := e.ResolvePath(pathFilter)
		if err != nil {
			return nil, err
		}
		return e.SearchEmbeddings(
			ctx,
			resolved.Repository.Slug,
			resolved.Path,
			query,
			resolved.Ref,
			topK,
			metadataFilter,
		)
	}

	// No path filter - search across all embedding files in all data sources
	return e.searchAllEmbeddings(ctx, query, topK, metadataFilter)
}

// searchAllEmbeddings searches across all embedding files in all data sources and merges results.
func (e *AIAppToolExecutor) searchAllEmbeddings(
	ctx context.Context,
	query string,
	topK int,
	metadataFilter map[string]string,
) (*irminmodels.EmbeddingSearchResponse, error) {
	var allResults []irminmodels.EmbeddingSearchResult
	var model string

	// Search each data source for embedding files
	for i := range e.aiApp.DataSources {
		ds := &e.aiApp.DataSources[i]
		results, dsModel := e.searchDataSourceEmbeddings(ctx, ds, query, topK, metadataFilter)
		allResults = append(allResults, results...)
		if model == "" && dsModel != "" {
			model = dsModel
		}
	}

	// Sort results by score (descending) and take top K
	sortEmbeddingResultsByScore(allResults)
	if len(allResults) > topK {
		allResults = allResults[:topK]
	}

	return &irminmodels.EmbeddingSearchResponse{
		Results: allResults,
		Query:   query,
		Model:   model,
		TopK:    topK,
	}, nil
}

// searchDataSourceEmbeddings searches all embedding files in a single data source.
// Returns the results with unified paths and the model name.
func (e *AIAppToolExecutor) searchDataSourceEmbeddings(
	ctx context.Context,
	ds *db.AIApplicationDataSource,
	query string,
	topK int,
	metadataFilter map[string]string,
) ([]irminmodels.EmbeddingSearchResult, string) {
	ref := getEffectiveRef(ds)

	// List embedding files in this data source
	embeddingFiles, err := e.apiServices.ListEmbeddingFiles(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		&ds.Repository,
		ds.Path,
		ref,
	)
	if err != nil {
		return nil, ""
	}

	var results []irminmodels.EmbeddingSearchResult
	var model string

	// Search each embedding file
	for _, ef := range embeddingFiles {
		fileResults, fileModel := e.searchSingleEmbeddingFile(ctx, ds, ef.Path, ref, query, topK, metadataFilter)
		results = append(results, fileResults...)
		if model == "" && fileModel != "" {
			model = fileModel
		}
	}

	return results, model
}

// searchSingleEmbeddingFile searches a single embedding file and returns results with unified paths.
func (e *AIAppToolExecutor) searchSingleEmbeddingFile(
	ctx context.Context,
	ds *db.AIApplicationDataSource,
	embeddingPath, ref, query string,
	topK int,
	metadataFilter map[string]string,
) ([]irminmodels.EmbeddingSearchResult, string) {
	result, err := e.apiServices.SearchEmbeddings(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		&ds.Repository,
		irmincore.SearchEmbeddingsRequest{
			EmbeddingPath: embeddingPath,
			Query:         query,
			Ref:           ref,
			TopK:          topK,
			Filter:        metadataFilter,
		},
	)
	if err != nil {
		return nil, ""
	}

	// Prefix source files with repository slug and ref for unified path
	results := make([]irminmodels.EmbeddingSearchResult, len(result.Results))
	for i, r := range result.Results {
		results[i] = r
		if r.SourceFile != "" {
			results[i].SourceFile = BuildUnifiedPath(ds.Repository.Slug, ref, r.SourceFile)
		}
	}

	return results, result.Model
}

// sortEmbeddingResultsByScore sorts embedding results by score in descending order.
func sortEmbeddingResultsByScore(results []irminmodels.EmbeddingSearchResult) {
	// Simple bubble sort - results are typically small
	for i := range results {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
}

// === Custom Tool Execution Methods ===

var (
	// ErrCustomToolNotFound is returned when a custom tool is not found.
	ErrCustomToolNotFound = errors.New("custom tool not found")
	// ErrCustomToolDisabled is returned when a custom tool is disabled.
	ErrCustomToolDisabled = errors.New("custom tool is disabled")
	// ErrQueryRequired is returned when a query parameter is required but not provided.
	ErrQueryRequired = errors.New("query is required")
)

// CustomToolResult represents the result of executing a custom tool.
type CustomToolResult struct {
	ToolName string `json:"tool_name"`
	ToolType string `json:"tool_type"`
	Data     any    `json:"data"`
}

// GetCustomTool retrieves a custom tool by name.
func (e *AIAppToolExecutor) GetCustomTool(name string) (*db.AIApplicationCustomTool, error) {
	for i := range e.aiApp.CustomTools {
		if e.aiApp.CustomTools[i].Name == name {
			return &e.aiApp.CustomTools[i], nil
		}
	}
	return nil, ErrCustomToolNotFound
}

// GetEnabledCustomTools returns all enabled custom tools.
func (e *AIAppToolExecutor) GetEnabledCustomTools() []db.AIApplicationCustomTool {
	var tools []db.AIApplicationCustomTool
	for _, tool := range e.aiApp.CustomTools {
		if tool.Enabled {
			tools = append(tools, tool)
		}
	}
	return tools
}

// ExecuteCustomTool executes a custom tool by name.
func (e *AIAppToolExecutor) ExecuteCustomTool(
	ctx context.Context,
	toolName string,
	query string, // Used for embedding_search type
) (*CustomToolResult, error) {
	tool, err := e.GetCustomTool(toolName)
	if err != nil {
		return nil, err
	}

	if !tool.Enabled {
		return nil, ErrCustomToolDisabled
	}

	var data any
	switch tool.Type {
	case db.CustomToolTypeStoredQuery:
		data, err = e.executeStoredQueryTool(ctx, tool)
	case db.CustomToolTypeWorkflow:
		data, err = e.executeWorkflowTool(ctx, tool)
	case db.CustomToolTypeEmbeddingSearch:
		data, err = e.executeEmbeddingSearchTool(ctx, tool, query)
	default:
		return nil, fmt.Errorf("unknown custom tool type: %s", tool.Type)
	}

	if err != nil {
		return nil, err
	}

	return &CustomToolResult{
		ToolName: tool.Name,
		ToolType: string(tool.Type),
		Data:     data,
	}, nil
}

// executeStoredQueryTool executes a stored query custom tool.
func (e *AIAppToolExecutor) executeStoredQueryTool(
	ctx context.Context,
	tool *db.AIApplicationCustomTool,
) (any, error) {
	if tool.StoredQueryID == nil {
		return nil, fmt.Errorf("stored query ID not configured for tool %s", tool.Name)
	}

	// Get the stored query
	query, err := e.apiServices.DB.GetStoredQueryByID(*tool.StoredQueryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stored query: %w", err)
	}

	// Verify the stored query belongs to the same workspace
	if query.WorkspaceID != e.aiApp.WorkspaceID {
		return nil, errors.New("stored query does not belong to this workspace")
	}

	// Validate that the query only accesses data within configured data sources
	if validateErr := e.validateSQLDataSourceAccess(query.SQL); validateErr != nil {
		return nil, fmt.Errorf("stored query access validation failed: %w", validateErr)
	}

	// Execute the SQL query
	result, err := e.apiServices.ExecuteSQL(
		ctx,
		"en",
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		irmincore.ExecuteSQLRequest{SQL: query.SQL},
		true, // limit response
	)
	if err != nil {
		return nil, fmt.Errorf("stored query execution failed: %w", err)
	}

	return result, nil
}

// executeWorkflowTool executes a workflow custom tool.
// It creates a workflow run and waits for completion with a timeout.
// If the workflow completes within the timeout, returns logs and status.
// If timeout is reached, returns the workflow run ID for manual polling.
func (e *AIAppToolExecutor) executeWorkflowTool(
	ctx context.Context,
	tool *db.AIApplicationCustomTool,
) (any, error) {
	if tool.WorkflowID == nil {
		return nil, fmt.Errorf("workflow ID not configured for tool %s", tool.Name)
	}

	// Get the workflow by ID
	workflow, err := e.apiServices.DB.GetWorkflowByID(*tool.WorkflowID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workflow: %w", err)
	}

	// Verify the workflow belongs to the same workspace
	if workflow.WorkspaceID != e.aiApp.WorkspaceID {
		return nil, errors.New("workflow does not belong to this workspace")
	}

	// Create a workflow run (no inputs as per plan)
	workflowRun, err := e.apiServices.CreateWorkflowRun(
		ctx,
		&e.aiApp.Owner,
		&e.aiApp.Workspace,
		workflow,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create workflow run: %w", err)
	}

	// Encode workflow run ID
	workflowRunSqid, encodeErr := e.apiServices.SQIDManager.Encode("workflow_runs", uint64(workflowRun.ID))
	if encodeErr != nil {
		return nil, fmt.Errorf("failed to encode workflow run ID: %w", encodeErr)
	}

	// Wait for workflow completion with timeout
	return e.waitForWorkflowCompletion(ctx, workflowRun.ID, workflowRunSqid)
}

// waitForWorkflowCompletion polls the workflow run status and waits for completion.
// Returns the workflow run details including logs if completed within the timeout,
// otherwise returns the workflow run ID for manual status checking.
func (e *AIAppToolExecutor) waitForWorkflowCompletion(
	ctx context.Context,
	workflowRunID uint,
	workflowRunSqid string,
) (map[string]any, error) {
	timeout := time.Duration(workflowExecutionTimeout) * time.Millisecond
	pollInterval := time.Duration(workflowPollInterval) * time.Millisecond
	deadline := time.Now().Add(timeout)

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-ticker.C:
			// Check if we've exceeded the timeout
			if time.Now().After(deadline) {
				return map[string]any{
					"workflow_run_id": workflowRunSqid,
					"status":          "timeout",
					"message": fmt.Sprintf(
						"Workflow execution exceeded timeout of %d seconds. Use the workflow run ID to check status later.",
						workflowExecutionTimeout/millisecondsPerSecond,
					),
				}, nil
			}

			// Fetch the latest workflow run status
			workflowRun, err := e.apiServices.DB.GetWorkflowRunByID(workflowRunID)
			if err != nil {
				return nil, fmt.Errorf("failed to get workflow run status: %w", err)
			}

			// Check if workflow is in a terminal state
			switch workflowRun.Status {
			case irminmodels.WorkflowStatusComplete:
				return map[string]any{
					"workflow_run_id": workflowRunSqid,
					"status":          string(workflowRun.Status),
					"logs":            workflowRun.Logs,
					"message":         "Workflow completed successfully",
					"started_at":      workflowRun.StartedAt,
					"finished_at":     workflowRun.FinishedAt,
				}, nil
			case irminmodels.WorkflowStatusError:
				return map[string]any{
					"workflow_run_id": workflowRunSqid,
					"status":          string(workflowRun.Status),
					"logs":            workflowRun.Logs,
					"message":         "Workflow execution failed",
					"started_at":      workflowRun.StartedAt,
					"finished_at":     workflowRun.FinishedAt,
				}, nil
			case irminmodels.WorkflowStatusCancelled:
				return map[string]any{
					"workflow_run_id": workflowRunSqid,
					"status":          string(workflowRun.Status),
					"logs":            workflowRun.Logs,
					"message":         "Workflow was cancelled",
					"started_at":      workflowRun.StartedAt,
					"finished_at":     workflowRun.FinishedAt,
				}, nil
			case irminmodels.WorkflowStatusPending,
				irminmodels.WorkflowStatusInitiating,
				irminmodels.WorkflowStatusRunning:
				// Continue polling for non-terminal states
				continue
			case irminmodels.WorkflowStatusEmpty,
				irminmodels.WorkflowStatusPaused:
				// These states should never occur for workflow runs:
				// - Empty is not a valid run state
				// - Paused is only for workflow definitions, not runs
				// If we encounter them, treat as an error
				return nil, fmt.Errorf("unexpected workflow run status: %s", workflowRun.Status)
			default:
				// Handle any future unknown statuses
				return nil, fmt.Errorf("unknown workflow run status: %s", workflowRun.Status)
			}
		}
	}
}

// executeEmbeddingSearchTool executes an embedding search custom tool.
func (e *AIAppToolExecutor) executeEmbeddingSearchTool(
	ctx context.Context,
	tool *db.AIApplicationCustomTool,
	query string,
) (any, error) {
	if tool.EmbeddingPath == "" {
		return nil, fmt.Errorf("embedding path not configured for tool %s", tool.Name)
	}

	if query == "" {
		return nil, ErrQueryRequired
	}

	// Resolve the embedding path
	resolved, err := e.ResolvePath(tool.EmbeddingPath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve embedding path: %w", err)
	}

	topK := tool.EmbeddingTopK
	if topK <= 0 {
		topK = 10
	}

	// Execute the embedding search
	result, err := e.SearchEmbeddings(
		ctx,
		resolved.Repository.Slug,
		resolved.Path,
		query,
		resolved.Ref,
		topK,
		tool.EmbeddingFilter,
	)
	if err != nil {
		return nil, fmt.Errorf("embedding search failed: %w", err)
	}

	return result, nil
}
