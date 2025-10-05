package engine

import (
	"bytes"
	"context"
	"fmt"
	"maps"
	"path"
	"strings"

	connectorsclient "irmin-api/connectors-client"
	"irmin-api/db"
	"irmin-api/duckdb"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"gorm.io/gorm"
)

// InitializeConnectorOperation sets up a connector operation and returns an operation client,
// along with a cancel function to clean up when done.
// It returns an error if initialization fails.
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) InitializeConnectorOperation(
	connection *db.Connection,
	tx ...*gorm.DB,
) (*connectorsclient.Client, func(), error) {
	// Create a lock key based on connector ID to prevent race conditions
	lockKey := fmt.Sprintf("connector_operation_init:%d", connection.ID)

	// If a transaction is provided, use it; otherwise create a new one
	if len(tx) > 0 && tx[0] != nil {
		// Use provided transaction
		var result *connectorsclient.Client
		var cancelFunc func()

		// Acquire advisory lock to prevent concurrent initialization of the same connector
		if lockErr := db.LockKeyTx(tx[0], lockKey); lockErr != nil {
			return nil, nil, fmt.Errorf(
				"failed to acquire advisory lock for connector operation creation with connection %d: %w",
				connection.ID,
				lockErr,
			)
		}

		// Process the connector initialization
		var processErr error
		result, cancelFunc, processErr = c.initializeConnectorOperationInternal(connection)
		return result, cancelFunc, processErr
	}

	// Create new transaction
	var result *connectorsclient.Client
	var cancelFunc func()
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent initialization of the same connector
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for connector operation creation with connection %d: %w",
				connection.ID,
				lockErr,
			)
		}

		// Process the connector initialization
		var processErr error
		result, cancelFunc, processErr = c.initializeConnectorOperationInternal(connection)
		return processErr
	})

	if transactionErr != nil {
		return nil, nil, transactionErr
	}

	return result, cancelFunc, nil
}

// initializeConnectorOperationInternal contains the core connector initialization logic, separated for clarity.
func (c *Client) initializeConnectorOperationInternal(
	connection *db.Connection,
) (*connectorsclient.Client, func(), error) {
	// Create base connector client.
	baseClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		connection.Connector.SystemToken,
		c.Locale,
	)

	// Initialize a new operation.
	op, err := baseClient.InitOperation(connection.Details, connection.Settings)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to initialize operation: %w", err)
	}

	// Define cancel function with error logging.
	cancel := func() {
		if cancelErr := baseClient.CancelOperation(op.ID); cancelErr != nil {
			c.Logger.Error("failed to cancel operation", "error", cancelErr)
		}
	}

	// Create operation-specific client (always in English for schema retrieval/actions).
	opClient := connectorsclient.NewClient(
		connection.Connector.APIBaseURL,
		op.Token,
		"en",
	)

	return opClient, cancel, nil
}

// DataMovementSchema retrieves the schema for a specific method from the connector.
// It returns the schema and an error if any occurred.
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) DataMovementSchema(
	connection *db.Connection,
	method string,
	tx ...*gorm.DB,
) (*irminmodels.ObjectSchema, error) {
	opClient, cancel, err := c.InitializeConnectorOperation(connection, tx...)
	if err != nil {
		return nil, err
	}
	// Ensure operation is cancelled when done.
	defer cancel()

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

	// Retrieve method schema.
	schema, err := opClient.GetSchema(method)
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
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) DataImport(
	ctx context.Context,
	connection *db.Connection,
	connectionPaths []string,
	workspace string,
	repository string,
	branch string,
	repositoryPath string,
	fieldMappings []irminmodels.FieldMapping,
	tx ...*gorm.DB,
) ([]lakefs.ObjectMetadata, []error) {
	// Create a lock key based on workspace, repository, and branch to prevent race conditions
	lockKey := fmt.Sprintf("data_import:%d:%s:%s:%s", connection.ID, workspace, repository, branch)

	// If a transaction is provided, use it; otherwise create a new one
	if len(tx) > 0 && tx[0] != nil {
		// Use provided transaction
		var result []lakefs.ObjectMetadata

		// Acquire advisory lock to prevent concurrent imports to the same branch
		if lockErr := db.LockKeyTx(tx[0], lockKey); lockErr != nil {
			return nil, []error{fmt.Errorf(
				"failed to acquire advisory lock for data import to branch %s with connection %d: %w",
				branch,
				connection.ID,
				lockErr,
			)}
		}

		// Process the data import
		var processErr []error
		result, processErr = c.dataImportInternal(
			ctx,
			connection,
			connectionPaths,
			workspace,
			repository,
			branch,
			repositoryPath,
			fieldMappings,
		)
		return result, processErr
	}

	// Create new transaction
	var result []lakefs.ObjectMetadata
	var resultErrors []error
	transactionErr := c.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent imports to the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for data import to branch %s with connection %d: %w",
				branch,
				connection.ID,
				lockErr,
			)
		}

		// Process the data import
		var processErr []error
		result, processErr = c.dataImportInternal(
			ctx,
			connection,
			connectionPaths,
			workspace,
			repository,
			branch,
			repositoryPath,
			fieldMappings,
		)
		resultErrors = processErr
		// Don't fail the transaction based on process errors - let them be collected
		return nil
	})

	if transactionErr != nil {
		// Combine transaction error with any existing process errors
		allErrors := []error{transactionErr}
		allErrors = append(allErrors, resultErrors...)
		return nil, allErrors
	}

	return result, resultErrors
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
	// Pull the files from the connector.
	allFiles, err := c.PullFilesFromConnector(connection, connectionPaths)
	if err != nil {
		return nil, []error{err}
	}

	// Process field mappings (or return files as-is if no mappings)
	processedFiles, processingErrors := c.processFieldMappings(ctx, allFiles, fieldMappings)
	if len(processingErrors) > 0 {
		return nil, processingErrors
	}

	// Upload the processed files
	return c.uploadFiles(processedFiles, workspace, repository, branch, repositoryPath)
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
	connection *db.Connection,
	connectionPaths []string,
) (map[string][]byte, error) {
	// Initialize connector operation.
	opClient, cancel, err := c.InitializeConnectorOperation(connection)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", err)
	}
	defer cancel()

	// Pull the matching files from the connector.
	pulled := make([]connectorsclient.PulledFile, 0)
	for _, connectionPath := range connectionPaths {
		pulledFiles, pullErr := opClient.OperationPull(connectionPath)
		if pullErr != nil {
			return nil, fmt.Errorf("failed to pull files: %w", pullErr)
		}
		pulled = append(pulled, pulledFiles...)
	}

	// Loop through the pulled files to unzip them and construct a list of all files.
	allFiles := make(map[string][]byte)
	for _, file := range pulled {
		// Unzip the file
		unzipped, unzipFilesErr := irminutils.UnzipFiles(file.Content)
		if unzipFilesErr != nil {
			return nil, fmt.Errorf("failed to unzip file: %w", unzipFilesErr)
		}

		// Add the unzipped files to the list of all files.
		maps.Copy(allFiles, unzipped)
	}

	return allFiles, nil
}

// fetchSingleFile fetches the content of a single file from lakeFS.
func (c *Client) fetchSingleFile(repoName, branch, filePath string) ([]byte, error) {
	data, err := c.LakeFSClient.GetFullObjectContent(repoName, branch, filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch object %q: %w", filePath, err)
	}
	return data, nil
}

// fetchDirectoryContents fetches all child contents of a directory concurrently.
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

	// Use buffered channels sized to the number of children
	ch := make(chan struct {
		path    string
		content []byte
	}, len(children))
	errCh := make(chan error, len(children))

	// Launch concurrent fetches
	for _, child := range children {
		go func() {
			data, err := c.LakeFSClient.GetFullObjectContent(repoName, branch, child.Path)
			if err != nil {
				errCh <- fmt.Errorf("failed to fetch child %q: %w", child.Path, err)
				return
			}
			ch <- struct {
				path    string
				content []byte
			}{path: child.Path, content: data}
		}()
	}

	// Collect results
	for range children {
		select {
		case r := <-ch:
			files[r.path] = r.content
			repositoryPaths = append(repositoryPaths, r.path)
		case e := <-errCh:
			errs = append(errs, e)
		}
	}

	return files, repositoryPaths, errs
}

// fetchObjectsFromPaths fetches all objects and their contents from the given repository paths.
// It returns the objects metadata, file contents, repository paths that were fetched, and any errors.
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
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) DataExport(
	ctx context.Context,
	connection *db.Connection,
	connectionPath string,
	workspaceSlug string,
	repositorySlug string,
	branch string,
	requestedRepositoryPaths []string,
	fieldMappings []irminmodels.FieldMapping,
	tx ...*gorm.DB,
) ([]string, []error) {
	// Create a lock key based on workspace, repository, and branch to prevent race conditions
	lockKey := fmt.Sprintf("data_export:%d:%s:%s:%s", connection.ID, workspaceSlug, repositorySlug, branch)

	// If a transaction is provided, use it; otherwise create a new one
	if len(tx) > 0 && tx[0] != nil {
		// Use provided transaction
		// Acquire advisory lock to prevent concurrent exports from the same branch
		if lockErr := db.LockKeyTx(tx[0], lockKey); lockErr != nil {
			return nil, []error{fmt.Errorf(
				"failed to acquire advisory lock for data export from branch %s with connection %d: %w",
				branch,
				connection.ID,
				lockErr,
			)}
		}

		// Process the data export
		result, processErr := c.dataExportInternal(
			ctx,
			connection,
			connectionPath,
			workspaceSlug,
			repositorySlug,
			branch,
			requestedRepositoryPaths,
			fieldMappings,
			tx[0],
		)
		return result, processErr
	}

	// Create new transaction
	var result []string
	var resultErrors []error
	transactionErr := c.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent exports from the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for data export from branch %s with connection %d: %w",
				branch,
				connection.ID,
				lockErr,
			)
		}

		// Process the data export
		var processErr []error
		result, processErr = c.dataExportInternal(
			ctx,
			connection,
			connectionPath,
			workspaceSlug,
			repositorySlug,
			branch,
			requestedRepositoryPaths,
			fieldMappings,
		)
		resultErrors = processErr
		// Don't fail the transaction based on process errors - let them be collected
		return nil
	})

	if transactionErr != nil {
		// Combine transaction error with any existing process errors
		allErrors := []error{transactionErr}
		allErrors = append(allErrors, resultErrors...)
		return nil, allErrors
	}

	return result, resultErrors
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
) ([]string, []error) {
	repoName := utils.ConstructLakeFSRepositoryName(workspaceSlug, repositorySlug)

	// Fetch all objects and their contents
	objects, files, repositoryPaths, fetchErrors := c.fetchObjectsFromPaths(repoName, branch, requestedRepositoryPaths)
	if len(fetchErrors) > 0 {
		return repositoryPaths, fetchErrors
	}

	// Process field mappings (or return files as-is if no mappings)
	finalFiles, processingErrors := c.processFieldMappings(ctx, files, fieldMappings)
	if len(processingErrors) > 0 {
		return repositoryPaths, processingErrors
	}

	// Push the files to the connection path
	_, pushErr := c.PushFilesToConnector(connection, connectionPath, objects, finalFiles, tx...)
	if pushErr != nil {
		return repositoryPaths, []error{pushErr}
	}

	return repositoryPaths, nil
}

// PushFilesToConnector pushes files to a connector.
// It returns the paths of the files that were pushed and an error if any occurred.
// If tx is provided, it will be used instead of creating a new transaction.
func (c *Client) PushFilesToConnector(
	connection *db.Connection,
	connectionPath string,
	objects []*irminmodels.Object,
	files map[string][]byte,
	tx ...*gorm.DB,
) ([]string, error) {
	// Zip the files.
	zip, zipFilesErr := irminutils.ZipFiles(files)
	if zipFilesErr != nil {
		return nil, fmt.Errorf("failed to zip files: %w", zipFilesErr)
	}

	// Initialize connector operation.
	opClient, cancel, initializeConnectorOperationErr := c.InitializeConnectorOperation(connection, tx...)
	if initializeConnectorOperationErr != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", initializeConnectorOperationErr)
	}
	defer cancel()

	// Build the connection path to push the zip to.
	objName := ""
	if len(objects) > 0 && objects[0] != nil {
		objName = objects[0].Name
	}
	connPath := c.buildTargetPath(connectionPath, objName, len(files) > 1)

	// Push the zip to the correct path in the connector.
	_, pushFilesErr := opClient.OperationPush(
		connPath,
		connectorsclient.FormFile{Reader: bytes.NewBuffer(zip)},
	)
	if pushFilesErr != nil {
		return nil, fmt.Errorf("failed to push files: %w", pushFilesErr)
	}

	// Return the files that were pushed.
	pushedPaths := make([]string, 0, len(files))
	for pushedPath := range files {
		pushedPaths = append(pushedPaths, pushedPath)
	}
	return pushedPaths, nil
}
