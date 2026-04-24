package engine

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"maps"
	"os"
	"path"
	"strings"
	"time"

	"irmin-api/bucket"
	connectorsclient "irmin-api/connectors-client"
	"irmin-api/db"
	"irmin-api/duckdb"
	enginevalidation "irmin-api/engine/validation"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// InMemoryMultiplier is the factor applied to MaxInMemorySizeMB to determine
// the maximum allowed in-memory size for bulk data operations (pull, export).
const InMemoryMultiplier = 10

// validateConnectionCapability validates that the connection has the required capability.
func (c *Client) validateConnectionCapability(
	conn *db.Connection,
	requiredCapability irminmodels.ConnectorCapability,
) error {
	for _, capability := range conn.Connector.Capabilities {
		if capability == string(requiredCapability) {
			return nil
		}
	}

	switch requiredCapability {
	case irminmodels.ConnectorCapabilityPull:
		return ErrConnectorMissingPullCapability
	case irminmodels.ConnectorCapabilityPush:
		return ErrConnectorMissingPushCapability
	case irminmodels.ConnectorCapabilityApplyPatch:
		return ErrConnectorMissingPatchCapability
	case irminmodels.ConnectorCapabilityPatchEvent:
		return ErrConnectorMissingWebhookCapability
	default:
		return fmt.Errorf("connector does not support %s operations", requiredCapability)
	}
}

// InitializeConnectorOperation sets up a connector operation and returns an operation client.
// It returns an error if initialization fails.
// If tx is provided, it will be used instead of creating a new transaction.
//
// Note: the legacy system-token cancel-on-cleanup has been removed. Async
// pull now manages its own job-level cancellation via the SDK's
// CancelOperationJob wrapper (see connectorsclient.OperationPull /
// OperationPullStream). Non-pull operations (push/patch/schema) are
// synchronous on the connector side; no explicit cancel call is needed.
func (c *Client) InitializeConnectorOperation(
	ctx context.Context,
	connection *db.Connection,
	tx ...*gorm.DB,
) (*connectorsclient.Client, error) {
	// Note: No locking needed here - workflow execution is already locked,
	// and each workflow run creates its own independent connector operation
	// Also no transaction needed - connector initialization is just HTTP calls

	// Process the connector initialization directly (no transaction needed)
	return c.initializeConnectorOperationInternal(ctx, connection)
}

// initializeConnectorOperationInternal contains the core connector initialization logic, separated for clarity.
func (c *Client) initializeConnectorOperationInternal(
	ctx context.Context,
	connection *db.Connection,
) (*connectorsclient.Client, error) {
	// Create base connector client (don't store on shared struct to avoid race conditions).
	systemClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		connection.Connector.SystemToken,
		c.Locale).
		WithConnectionID(connection.ID).
		WithLogger(c.Logger)

	// Initialize a new operation.
	op, err := systemClient.InitOperation(ctx, connection.Details, connection.Settings)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize operation: %w", err)
	}

	// Create operation-specific client (always in English for schema retrieval/actions).
	opClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		op.Token,
		"en",
	).
		WithConnectionID(connection.ID).
		WithLogger(c.Logger)
	return opClient, nil
}

// DataMovementSchema retrieves the schema for a specific method from the connector.
// It returns the schema and an error if any occurred.
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) DataMovementSchema(
	ctx context.Context,
	connection *db.Connection,
	method, path string,
	tx ...*gorm.DB,
) (*irminmodels.ObjectSchema, error) {
	opClient, err := c.InitializeConnectorOperation(ctx, connection, tx...)
	if err != nil {
		return nil, err
	}

	// If empty method, use "pull"
	if method == "" {
		method = string(irminmodels.ConnectorCapabilityPull)
	}

	// Legacy support, convert "read" to "pull" and "write" to "push"
	if method == "read" {
		method = string(irminmodels.ConnectorCapabilityPull)
	}
	if method == "write" {
		method = string(irminmodels.ConnectorCapabilityPush)
	}

	// Validate capability if the method corresponds to a known capability
	switch method {
	case string(irminmodels.ConnectorCapabilityPull):
		if validateCapabilityErr := c.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPull); validateCapabilityErr != nil {
			return nil, validateCapabilityErr
		}
	case string(irminmodels.ConnectorCapabilityPush):
		if validateCapabilityErr := c.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPush); validateCapabilityErr != nil {
			return nil, validateCapabilityErr
		}
	case string(irminmodels.ConnectorCapabilityApplyPatch):
		if validateCapabilityErr := c.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityApplyPatch); validateCapabilityErr != nil {
			return nil, validateCapabilityErr
		}
	default:
		return nil, fmt.Errorf("invalid method: %s", method)
	}

	// Retrieve method schema.
	schema, err := opClient.GetSchema(ctx, method, path)
	if err != nil {
		return nil, fmt.Errorf("failed to get schema for method %q: %w", method, err)
	}

	return schema, nil
}

// processFieldMappings applies field mappings to files and merges results.
// This is a common workflow used by both import and export operations.
func (c *Client) processFieldMappings(
	ctx context.Context,
	files map[string][]byte,
	fieldMappings []irminmodels.FieldMapping,
) (map[string][]byte, []error) {
	// If no field mappings, return files as-is
	if len(fieldMappings) == 0 {
		return files, nil
	}

	// Initialize DuckDB client for field mappings and merging
	duckDBClient, err := duckdb.NewQueryClient(ctx, c.Env, c.Logger)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to initialize DuckDB client: %w", err)}
	}
	defer duckDBClient.Close()

	// Apply field mappings to all files and collect results by destination
	destinationFiles, mappingErrors := c.applyFieldMappingsToAllFiles(ctx, duckDBClient, files, fieldMappings)
	if len(mappingErrors) > 0 {
		return nil, mappingErrors
	}

	// Merge files that map to the same destination
	mergedFiles, mergeErrors := c.mergeDestinationFiles(ctx, duckDBClient, destinationFiles)
	if len(mergeErrors) > 0 {
		return nil, mergeErrors
	}

	return mergedFiles, nil
}

// buildTargetPath constructs a target path based on base path, item name, and whether multiple items exist.
// This is used for both upload paths and connection paths.
func (c *Client) buildTargetPath(basePath, itemName string, hasMultipleItems bool) string {
	targetPath := strings.TrimPrefix(basePath, "/")
	if strings.HasSuffix(basePath, "/") || basePath == "" || hasMultipleItems {
		// If base path is a directory (ends with "/" or is empty), or there are multiple items,
		// append the item name to the path.
		targetPath = path.Join(targetPath, itemName)
	}
	return targetPath
}

// DataImport imports data from an external source into a lakeFS repository.
// It applies field mappings to route and transform data, merges files that map
// to the same destination, and uploads the results.
// Returns the metadata of the uploaded objects and any errors that occurred.
//
// Intentionally NOT wrapped in a GORM transaction. `dataImportInternal`
// performs an HTTP pull from the connector, DuckDB field-mapping
// transforms, and a LakeFS upload — no PostgreSQL writes at all. A prior
// revision wrapped it in `c.DB.WithContext(ctx).Transaction(...)` with
// a closure that returned nil (so the tx always committed). On context
// cancellation (workflow timeout), GORM's commit failed with
// "sql: transaction has already been committed or rolled back", that
// phantom error got merged into the returned error slice, and users
// saw it surface alongside the real failure ("context deadline
// exceeded on POST /stripe/operation/pull"). The wrapper added zero
// transactional integrity because there was nothing to roll back.
func (c *Client) DataImport(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
	workspace string,
	repository string,
	branch string,
	repositoryPath string,
	fieldMappings []irminmodels.FieldMapping,
) ([]lakefs.ObjectMetadata, []error) {
	// Note: No locking needed here - workflow execution is already locked per run,
	// and each workflow run creates its own independent connector operation.
	return c.dataImportInternal(
		ctx,
		connection,
		connectionPaths,
		workspace,
		repository,
		branch,
		repositoryPath,
		fieldMappings,
	)
}

// dataImportInternal contains the core data import logic, separated for clarity.
func (c *Client) dataImportInternal(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
	workspace string,
	repository string,
	branch string,
	repositoryPath string,
	fieldMappings []irminmodels.FieldMapping,
) ([]lakefs.ObjectMetadata, []error) {
	// When no field mappings are needed, use the streaming path to avoid loading
	// all files into memory. Files are streamed from the connector to a temp file,
	// extracted, and uploaded to LakeFS one at a time.
	if len(fieldMappings) == 0 {
		lakeFSRepo := utils.ConstructLakeFSRepositoryName(workspace, repository)
		metadata, streamErr := c.PullFilesFromConnectorStreaming(
			ctx, connection, connectionPaths, lakeFSRepo, branch, repositoryPath,
		)
		if streamErr != nil {
			return nil, []error{streamErr}
		}
		return metadata, nil
	}

	// With field mappings, files must be loaded into memory for DuckDB transforms.
	allFiles, err := c.PullFilesFromConnector(ctx, connection, connectionPaths)
	if err != nil {
		return nil, []error{err}
	}

	// Process field mappings (or return files as-is if no mappings)
	processedFiles, processingErrors := c.processFieldMappings(ctx, allFiles, fieldMappings)
	if len(processingErrors) > 0 {
		return nil, processingErrors
	}

	// Upload the processed files
	uploadedFiles, uploadErrors := c.uploadFiles(processedFiles, workspace, repository, branch, repositoryPath)
	if len(uploadErrors) > 0 {
		return nil, uploadErrors
	}

	return uploadedFiles, nil
}

// uploadFiles uploads files to lakeFS concurrently.
func (c *Client) uploadFiles(
	files map[string][]byte,
	workspace, repository, branch string,
	repositoryPath string,
) ([]lakefs.ObjectMetadata, []error) {
	var (
		errs    []error
		success []lakefs.ObjectMetadata
	)

	repoName := utils.ConstructLakeFSRepositoryName(workspace, repository)
	uploadCh := make(chan *lakefs.ObjectMetadata, len(files))
	upErrCh := make(chan error, len(files))

	// Upload files concurrently
	for filePath, fileContent := range files {
		go func() {
			// Use the first repository path as the base path, or empty string if none
			var basePath string
			if repositoryPath != "" {
				basePath = repositoryPath
			}
			uploadPath := c.buildTargetPath(basePath, filePath, len(files) > 1)

			meta, upErr := c.LakeFSClient.UploadObject(
				repoName,
				branch,
				uploadPath,
				bytes.NewReader(fileContent),
				false,
			)
			if upErr != nil {
				upErrCh <- fmt.Errorf("upload failed for %q: %w", uploadPath, upErr)
				return
			}
			uploadCh <- meta
		}()
	}

	// Collect upload results
	for range files {
		select {
		case meta := <-uploadCh:
			if meta != nil {
				success = append(success, *meta)
			}
		case e := <-upErrCh:
			errs = append(errs, e)
		}
	}

	return success, errs
}

// applyFieldMappingsToAllFiles applies field mappings to all source files.
func (c *Client) applyFieldMappingsToAllFiles(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	allFiles map[string][]byte,
	fieldMappings []irminmodels.FieldMapping,
) (map[string]map[string][]byte, []error) {
	// destinationFiles[destinationPath][sourcePath] = content
	destinationFiles := make(map[string]map[string][]byte)
	var errs []error

	for sourcePath, fileContent := range allFiles {
		// Apply field mappings to this source file
		results, err := c.ApplyFieldMappings(ctx, duckDBClient, fileContent, sourcePath, fieldMappings)
		if err != nil {
			errs = append(errs, fmt.Errorf("failed to apply field mappings to %s: %w", sourcePath, err))
			continue
		}

		// Organize results by destination path
		for destPath, destContent := range results {
			if destinationFiles[destPath] == nil {
				destinationFiles[destPath] = make(map[string][]byte)
			}
			destinationFiles[destPath][sourcePath] = destContent
		}
	}

	return destinationFiles, errs
}

// mergeDestinationFiles merges multiple source files that map to the same destination.
func (c *Client) mergeDestinationFiles(
	ctx context.Context,
	duckDBClient *duckdb.QueryClient,
	destinationFiles map[string]map[string][]byte,
) (map[string][]byte, []error) {
	mergedFiles := make(map[string][]byte)
	var errs []error

	for destPath, sourceFiles := range destinationFiles {
		if len(sourceFiles) == 1 {
			// Single source, no merging needed
			for _, content := range sourceFiles {
				mergedFiles[destPath] = content
				break
			}
		} else {
			// Multiple sources, need to merge
			mergeResult, err := duckDBClient.MergeFiles(
				ctx,
				sourceFiles,
				destPath,
				duckdb.MergeStrategyUnionDistinct, // Default strategy, could be configurable
			)
			if err != nil {
				errs = append(errs, fmt.Errorf("failed to merge files for destination %s: %w", destPath, err))
				continue
			}
			mergedFiles[destPath] = mergeResult.Content
		}
	}

	return mergedFiles, errs
}

// PullFilesFromConnector pulls files from a connector, unzips them, and returns a map of file paths to file contents.
// It returns a map of file paths to file contents and an error if any occurred.
func (c *Client) PullFilesFromConnector(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
) (map[string][]byte, error) {
	// Validate connector capability
	if err := c.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPull); err != nil {
		return nil, err
	}

	// Initialize connector operation.
	opClient, err := c.InitializeConnectorOperation(ctx, connection)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", err)
	}

	// Pull the matching files from the connector.
	pulled := make([]connectorsclient.PulledFile, 0)

	// If connectionPaths is empty or nil, pull all files by passing empty string
	// The connector service interprets empty path as "get all files"
	if len(connectionPaths) == 0 {
		pulledFiles, pullErr := opClient.OperationPull(ctx, "")
		if pullErr != nil {
			return nil, fmt.Errorf("failed to pull all files: %w", pullErr)
		}
		pulled = append(pulled, pulledFiles...)
	} else {
		// Pull specific paths
		for _, connectionPath := range connectionPaths {
			pulledFiles, pullErr := opClient.OperationPull(ctx, connectionPath)
			if pullErr != nil {
				return nil, fmt.Errorf("failed to pull files: %w", pullErr)
			}
			pulled = append(pulled, pulledFiles...)
		}
	}

	// Loop through the pulled files to unzip them and construct a list of all files.
	allFiles := make(map[string][]byte)
	var totalSize int64
	maxMB := c.Env.MaxInMemorySizeMB * InMemoryMultiplier
	maxBytes := int64(maxMB) * int64(utils.BytesPerMB)

	for _, file := range pulled {
		// Unzip the file
		unzipped, unzipFilesErr := irminutils.UnzipFiles(file.Content)
		if unzipFilesErr != nil {
			return nil, fmt.Errorf("failed to unzip file: %w", unzipFilesErr)
		}

		// Track accumulated size and fail early before copying into the map
		for _, content := range unzipped {
			totalSize += int64(len(content))
		}
		if totalSize > maxBytes {
			return nil, fmt.Errorf(
				"pulled data exceeds in-memory limit (%d MB);"+
					" consider removing field mappings to enable streaming import",
				maxMB,
			)
		}

		maps.Copy(allFiles, unzipped)
	}

	return allFiles, nil
}

// PullFilesFromConnectorStreaming pulls files from a connector and uploads them directly to LakeFS
// without loading all files into memory simultaneously. The connector response is streamed to a
// temporary file on disk, then each file is extracted and uploaded individually.
func (c *Client) PullFilesFromConnectorStreaming(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
	lakeFSRepo, branch string,
	pathPrefix string,
) ([]lakefs.ObjectMetadata, error) {
	if err := c.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPull); err != nil {
		return nil, err
	}

	opClient, err := c.InitializeConnectorOperation(ctx, connection)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", err)
	}

	var uploaded []lakefs.ObjectMetadata

	// Process each connection path
	paths := connectionPaths
	if len(paths) == 0 {
		paths = []string{""}
	}

	// Multiple connection paths means multiple items overall, which affects
	// buildTargetPath semantics (append filename vs replace).
	hasMultipleItems := len(paths) > 1

	for _, connectionPath := range paths {
		pulled, pullErr := c.pullAndExtractToLakeFS(
			ctx, opClient, connectionPath, lakeFSRepo, branch, pathPrefix, hasMultipleItems,
		)
		if pullErr != nil {
			return nil, pullErr
		}
		uploaded = append(uploaded, pulled...)
		// Once we've uploaded any files, subsequent uploads must use multi-file
		// semantics to avoid overwriting earlier uploads.
		if len(pulled) > 0 {
			hasMultipleItems = true
		}
	}

	return uploaded, nil
}

// pullAndExtractToLakeFS streams a single pull from the connector to a temp file,
// then extracts the zip and uploads each file to LakeFS.
// callerHasMultipleItems indicates whether the caller is processing multiple paths/files overall,
// which affects buildTargetPath semantics (append filename vs replace).
func (c *Client) pullAndExtractToLakeFS(
	ctx context.Context,
	opClient *connectorsclient.Client,
	connectionPath, lakeFSRepo, branch, pathPrefix string,
	callerHasMultipleItems bool,
) ([]lakefs.ObjectMetadata, error) {
	reader, pullErr := opClient.OperationPullStream(ctx, connectionPath)
	if pullErr != nil {
		return nil, fmt.Errorf("failed to pull files: %w", pullErr)
	}

	// Stream to temp file for seekable zip reading
	tempFile, tempErr := os.CreateTemp("", "connector-pull-*.zip")
	if tempErr != nil {
		_ = reader.Close()
		return nil, fmt.Errorf("failed to create temp file: %w", tempErr)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	if _, copyErr := io.Copy(tempFile, reader); copyErr != nil {
		_ = reader.Close()
		return nil, fmt.Errorf("failed to stream connector response: %w", copyErr)
	}
	_ = reader.Close()

	fileInfo, statErr := tempFile.Stat()
	if statErr != nil {
		return nil, fmt.Errorf("failed to stat temp file: %w", statErr)
	}

	zipReader, zipErr := zip.NewReader(tempFile, fileInfo.Size())
	if zipErr != nil {
		return nil, fmt.Errorf("failed to open zip: %w", zipErr)
	}

	// Count non-directory entries to match buildTargetPath's single-file vs multi-file behavior.
	// Use multi-file semantics if either: the caller is processing multiple paths overall,
	// or this individual zip contains multiple file entries.
	var fileEntries []*zip.File
	for _, f := range zipReader.File {
		if !f.FileInfo().IsDir() {
			fileEntries = append(fileEntries, f)
		}
	}
	hasMultipleFiles := callerHasMultipleItems || len(fileEntries) > 1

	var uploadedObjects []lakefs.ObjectMetadata
	for _, f := range fileEntries {
		rc, openErr := f.Open()
		if openErr != nil {
			return nil, fmt.Errorf("failed to open zip entry %s: %w", f.Name, openErr)
		}

		safeName, sanitizeErr := utils.SanitizeZipEntryPath(f.Name)
		if sanitizeErr != nil {
			_ = rc.Close()
			return nil, fmt.Errorf("unsafe zip entry path %s: %w", f.Name, sanitizeErr)
		}

		// Use buildTargetPath to match the same path logic as uploadFiles:
		// single file without trailing "/" uses pathPrefix as-is (replacing the file),
		// multiple files or trailing "/" appends the filename.
		uploadPath := c.buildTargetPath(pathPrefix, safeName, hasMultipleFiles)

		meta, uploadErr := c.LakeFSClient.UploadObject(lakeFSRepo, branch, uploadPath, rc, false)
		_ = rc.Close()
		if uploadErr != nil {
			return nil, fmt.Errorf("failed to upload %s to LakeFS: %w", f.Name, uploadErr)
		}

		if meta != nil {
			uploadedObjects = append(uploadedObjects, *meta)
		}
	}

	return uploadedObjects, nil
}

// fetchSingleFile fetches the content of a single file from lakeFS.
func (c *Client) fetchSingleFile(repoName, branch, filePath string) ([]byte, error) {
	data, err := c.LakeFSClient.GetFullObjectContent(repoName, branch, filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch object %q: %w", filePath, err)
	}
	return data, nil
}

// dirFetchResult holds the result of a single child file fetch.
type dirFetchResult struct {
	path    string
	content []byte
}

// fetchDirectoryContents fetches all child contents of a directory concurrently.
// Concurrency is capped at 10 goroutines and total accumulated size is bounded
// to prevent OOM on very large directories. A context is used to signal early
// abort so in-flight goroutines don't continue downloading after the limit is hit.
func (c *Client) fetchDirectoryContents(
	repoName, branch string,
	children []irminmodels.Object,
) (map[string][]byte, []string, []error) {
	files := make(map[string][]byte)
	var repositoryPaths []string
	var errs []error

	if len(children) == 0 {
		return files, repositoryPaths, errs
	}

	const maxConcurrency = 10

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch := make(chan dirFetchResult, maxConcurrency)
	errCh := make(chan error, maxConcurrency)

	// launchFetch starts a goroutine to fetch a single child, respecting context cancellation.
	launchFetch := func(childPath string) {
		go func() {
			if ctx.Err() != nil {
				errCh <- ctx.Err()
				return
			}
			data, err := c.LakeFSClient.GetFullObjectContent(repoName, branch, childPath)
			if err != nil {
				errCh <- fmt.Errorf("failed to fetch child %q: %w", childPath, err)
				return
			}
			ch <- dirFetchResult{path: childPath, content: data}
		}()
	}

	// Seed initial batch up to maxConcurrency.
	pending := 0
	childIdx := 0
	for childIdx < len(children) && pending < maxConcurrency {
		launchFetch(children[childIdx].Path)
		childIdx++
		pending++
	}

	files, repositoryPaths, errs = c.collectFetchResults(
		ctx, cancel, ch, errCh, children, &childIdx, &pending, launchFetch,
	)
	return files, repositoryPaths, errs
}

// collectFetchResults drains fetch results, enforces the size limit, and launches
// follow-up fetches as slots free up.
func (c *Client) collectFetchResults(
	ctx context.Context,
	cancel context.CancelFunc,
	ch <-chan dirFetchResult,
	errCh <-chan error,
	children []irminmodels.Object,
	childIdx *int,
	pending *int,
	launchFetch func(string),
) (map[string][]byte, []string, []error) {
	files := make(map[string][]byte)
	var repositoryPaths []string
	var errs []error
	var totalSize int64
	maxMB := c.Env.MaxInMemorySizeMB * InMemoryMultiplier
	maxBytes := int64(maxMB) * int64(utils.BytesPerMB)

	for *pending > 0 {
		select {
		case r := <-ch:
			*pending--
			totalSize += int64(len(r.content))
			if totalSize > maxBytes {
				cancel()
				errs = append(errs, fmt.Errorf(
					"directory contents exceed memory limit (%d MB); consider exporting fewer files",
					maxMB,
				))
				return files, repositoryPaths, errs
			}
			files[r.path] = r.content
			repositoryPaths = append(repositoryPaths, r.path)

			if *childIdx < len(children) {
				launchFetch(children[*childIdx].Path)
				*childIdx++
				*pending++
			}
		case e := <-errCh:
			*pending--
			if ctx.Err() == nil {
				errs = append(errs, e)
			}

			if *childIdx < len(children) {
				launchFetch(children[*childIdx].Path)
				*childIdx++
				*pending++
			}
		}
	}

	return files, repositoryPaths, errs
}

// fetchObjectsFromPaths fetches all objects and their contents from the given repository paths.
// It returns the objects metadata, file contents, repository paths that were fetched, and any errors.
// If requestedRepositoryPaths is empty, it fetches from the repository root.
func (c *Client) fetchObjectsFromPaths(
	repoName, branch string,
	requestedRepositoryPaths []string,
) ([]*irminmodels.Object, map[string][]byte, []string, []error) {
	var (
		errs            []error
		repositoryPaths []string
	)

	objects := make([]*irminmodels.Object, 0)
	files := make(map[string][]byte)

	// If no paths specified, fetch from repository root (empty string means root)
	if len(requestedRepositoryPaths) == 0 {
		requestedRepositoryPaths = []string{""}
	}

	for _, repositoryPath := range requestedRepositoryPaths {
		// Fetch object metadata
		obj, err := getObject(repositoryPath, repoName, branch, *c.LakeFSClient)
		if err != nil {
			errs = append(errs, fmt.Errorf("failed to get object %q: %w", repositoryPath, err))
			continue
		}
		objects = append(objects, obj)

		// Handle different object types
		if obj.Type == irminmodels.ObjectTypeGroup {
			// Directory: fetch child contents concurrently
			dirFiles, dirPaths, dirErrs := c.fetchDirectoryContents(repoName, branch, obj.Children)

			// Merge results
			for path, content := range dirFiles {
				files[path] = content
			}
			repositoryPaths = append(repositoryPaths, dirPaths...)
			errs = append(errs, dirErrs...)
		} else {
			// Single file: fetch content
			data, fetchErr := c.fetchSingleFile(repoName, branch, obj.Path)
			if fetchErr != nil {
				errs = append(errs, fetchErr)
				continue
			}
			files[obj.Path] = data
			repositoryPaths = append(repositoryPaths, obj.Path)
		}
	}

	return objects, files, repositoryPaths, errs
}

// DataExport exports data from a lakeFS repository to an external connector.
// It applies field mappings to route and transform data, merges files that map
// to the same destination, and pushes the results to the connector.
// Returns the paths of the files that were pushed and any errors that occurred.
//
// Intentionally NOT wrapped in a GORM transaction. `dataExportInternal`
// fetches from LakeFS (HTTP), runs DuckDB transforms, and pushes to the
// connector (HTTP) — no PostgreSQL writes. See the DataImport godoc
// above for the full rationale; the same phantom "sql: transaction has
// already been committed or rolled back" error was showing up here on
// context cancellation.
func (c *Client) DataExport(
	ctx context.Context,
	connection *db.Connection,
	connectionPath string,
	workspaceSlug string,
	repositorySlug string,
	branch string,
	requestedRepositoryPaths []string,
	fieldMappings []irminmodels.FieldMapping,
) ([]string, int64, []error) {
	// Note: No locking needed here - workflow execution is already locked per run,
	// and each workflow run creates its own independent connector operation.
	result, finalFiles, processErr := c.dataExportInternal(
		ctx,
		connection,
		connectionPath,
		workspaceSlug,
		repositorySlug,
		branch,
		requestedRepositoryPaths,
		fieldMappings,
	)
	totalBytes := int64(0)
	if len(processErr) == 0 {
		totalBytes = SumFileMapBytes(finalFiles)
	}
	return result, totalBytes, processErr
}

// dataExportInternal contains the core data export logic, separated for clarity.
func (c *Client) dataExportInternal(
	ctx context.Context,
	connection *db.Connection,
	connectionPath string,
	workspaceSlug string,
	repositorySlug string,
	branch string,
	requestedRepositoryPaths []string,
	fieldMappings []irminmodels.FieldMapping,
	tx ...*gorm.DB,
) ([]string, map[string][]byte, []error) {
	repoName := utils.ConstructLakeFSRepositoryName(workspaceSlug, repositorySlug)

	// Fetch all objects and their contents
	objects, files, repositoryPaths, fetchErrors := c.fetchObjectsFromPaths(repoName, branch, requestedRepositoryPaths)
	if len(fetchErrors) > 0 {
		return repositoryPaths, nil, fetchErrors
	}

	// Process field mappings (or return files as-is if no mappings)
	finalFiles, processingErrors := c.processFieldMappings(ctx, files, fieldMappings)
	if len(processingErrors) > 0 {
		return repositoryPaths, nil, processingErrors
	}

	// Push the files to the connection path
	_, pushErr := c.PushFilesToConnector(ctx, connection, connectionPath, objects, finalFiles, tx...)
	if pushErr != nil {
		return repositoryPaths, nil, []error{pushErr}
	}

	return repositoryPaths, finalFiles, nil
}

// SumFileMapBytes returns the total byte count across all values in a file map.
func SumFileMapBytes(files map[string][]byte) int64 {
	if len(files) == 0 {
		return 0
	}
	var totalBytes int64
	for _, content := range files {
		totalBytes += int64(len(content))
	}
	return totalBytes
}

// PushFilesToConnector pushes files to a connector.
// It returns the paths of the files that were pushed and an error if any occurred.
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) PushFilesToConnector(
	ctx context.Context,
	connection *db.Connection,
	connectionPath string,
	objects []*irminmodels.Object,
	files map[string][]byte,
	tx ...*gorm.DB,
) ([]string, error) {
	// Validate connector capability
	if err := c.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPush); err != nil {
		return nil, err
	}

	// Validate files against push schema if available
	targetSchema, schemaErr := c.DataMovementSchema(ctx, connection, "push", connectionPath, tx...)
	if schemaErr == nil && targetSchema != nil {
		// Create validation config with DuckDB support for non-JSON files (CSV, Parquet, etc.)
		validationConfig := &enginevalidation.Config{
			Ctx:    ctx,
			Env:    c.Env,
			Logger: c.Logger,
		}
		validationResult := enginevalidation.ValidateFiles(ctx, files, targetSchema, validationConfig)
		if !validationResult.Valid {
			return nil, &ConnectorSchemaValidationError{
				Result:         validationResult,
				OperationType:  "push",
				ConnectionName: connection.Name,
				ConnectionPath: connectionPath,
			}
		}
	}

	// Initialize connector operation.
	opClient, initializeConnectorOperationErr := c.InitializeConnectorOperation(ctx, connection, tx...)
	if initializeConnectorOperationErr != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", initializeConnectorOperationErr)
	}

	// Build the connection path to push the zip to.
	objName := ""
	if len(objects) > 0 && objects[0] != nil {
		objName = objects[0].Name
	}
	connPath := c.buildTargetPath(connectionPath, objName, len(files) > 1)

	// Push files: use presigned URL for large payloads, direct upload for small ones.
	pushErr := c.pushFilesWithSizeRouting(ctx, opClient, connPath, files)
	if pushErr != nil {
		return nil, fmt.Errorf("failed to push files: %w", pushErr)
	}

	// Return the files that were pushed.
	pushedPaths := make([]string, 0, len(files))
	for pushedPath := range files {
		pushedPaths = append(pushedPaths, pushedPath)
	}
	return pushedPaths, nil
}

// pushFilesWithSizeRouting zips and pushes files to a connector, choosing between
// direct upload (small payloads) and presigned URL (large payloads) based on total size.
func (c *Client) pushFilesWithSizeRouting(
	ctx context.Context,
	opClient *connectorsclient.Client,
	connPath string,
	files map[string][]byte,
) error {
	totalSize := int64(0)
	for _, content := range files {
		totalSize += int64(len(content))
	}

	threshold := int64(c.Env.MaxInMemorySizeMB) * int64(utils.BytesPerMB)
	if totalSize <= threshold {
		return c.pushFilesDirect(ctx, opClient, connPath, files)
	}
	return c.pushFilesViaTempFile(ctx, opClient, connPath, files)
}

// pushFilesDirect zips files in memory and sends them directly to the connector.
func (c *Client) pushFilesDirect(
	ctx context.Context,
	opClient *connectorsclient.Client,
	connPath string,
	files map[string][]byte,
) error {
	zipData, zipErr := irminutils.ZipFiles(files)
	if zipErr != nil {
		return fmt.Errorf("failed to zip files: %w", zipErr)
	}

	_, pushErr := opClient.OperationPush(
		ctx,
		connPath,
		connectorsclient.FormFile{Reader: bytes.NewBuffer(zipData), FileName: "export.zip"},
	)
	return pushErr
}

// presignedURLExpiry is the duration for which a presigned S3 URL is valid.
const presignedURLExpiry = 15 * time.Minute

// s3CleanupTimeout is the timeout for best-effort S3 object cleanup after a push.
const s3CleanupTimeout = 30 * time.Second

// pushFilesViaTempFile writes the zip to a temp file, uploads it to S3, generates
// a presigned GET URL, and sends that URL to the connector. The connector downloads
// the zip directly from S3, avoiding in-memory buffering of large payloads.
func (c *Client) pushFilesViaTempFile(
	ctx context.Context,
	opClient *connectorsclient.Client,
	connPath string,
	files map[string][]byte,
) error {
	// Create temp file for the zip
	tempFile, tempErr := os.CreateTemp("", "push-zip-*.zip")
	if tempErr != nil {
		return fmt.Errorf("failed to create temp file: %w", tempErr)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// Write zip to temp file instead of memory
	zipWriter := zip.NewWriter(tempFile)
	for filePath, content := range files {
		safePath, sanitizeErr := utils.SanitizeZipEntryPath(filePath)
		if sanitizeErr != nil {
			_ = zipWriter.Close()
			return fmt.Errorf("unsafe zip entry path: %w", sanitizeErr)
		}
		entry, createErr := zipWriter.Create(safePath)
		if createErr != nil {
			_ = zipWriter.Close()
			return fmt.Errorf("failed to create zip entry for %s: %w", safePath, createErr)
		}
		if _, writeErr := entry.Write(content); writeErr != nil {
			_ = zipWriter.Close()
			return fmt.Errorf("failed to write zip entry for %s: %w", safePath, writeErr)
		}
	}
	if closeErr := zipWriter.Close(); closeErr != nil {
		return fmt.Errorf("failed to close zip writer: %w", closeErr)
	}

	// Seek to beginning for reading
	if _, seekErr := tempFile.Seek(0, io.SeekStart); seekErr != nil {
		return fmt.Errorf("failed to seek temp file: %w", seekErr)
	}

	// Upload the temp file to S3
	s3Client, s3Err := bucket.CreateClient(c.Env, c.Env.IrminS3Bucket, c.DB)
	if s3Err != nil {
		return fmt.Errorf("failed to create S3 client: %w", s3Err)
	}

	s3Key := fmt.Sprintf("tmp/push-%s.zip", uuid.New().String())
	defer func() {
		// Safe to delete immediately: the connector's push handler is synchronous —
		// it downloads, extracts, and processes the zip within the same HTTP call.
		// OperationPushPresigned blocks until that call returns, so the file is no
		// longer needed by the time this defer runs. The presigned URL expiry is just
		// a safety margin for slow downloads, not for async processing.
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), s3CleanupTimeout)
		defer cleanupCancel()
		_, _ = s3Client.Conn().DeleteObject(cleanupCtx, &s3.DeleteObjectInput{
			Bucket: &s3Client.Bucket,
			Key:    &s3Key,
		})
	}()

	if uploadErr := s3Client.UploadReader(ctx, s3Key, tempFile); uploadErr != nil {
		return fmt.Errorf("failed to upload zip to S3: %w", uploadErr)
	}

	// Generate a presigned GET URL for the connector to download the zip
	presignedURL, presignErr := s3Client.PresignedGetURL(ctx, s3Key, presignedURLExpiry)
	if presignErr != nil {
		return fmt.Errorf("failed to generate presigned URL: %w", presignErr)
	}

	// Send the presigned URL to the connector instead of the file itself
	_, pushErr := opClient.OperationPushPresigned(ctx, connPath, presignedURL)
	return pushErr
}
