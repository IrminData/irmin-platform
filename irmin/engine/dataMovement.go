package engine

import (
	"bytes"
	"fmt"
	"path"
	"strings"

	"irmin-api/db"
	"irmin-api/duckdb"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// InitializeConnectorOperation sets up a connector operation and returns an operation client,
// along with a cancel function to clean up when done.
// It returns an error if initialization fails.
func (c *Client) InitializeConnectorOperation(connection *db.Connection) (*irminconnectorclient.Client, func(), error) {
	// Create base connector client.
	baseClient := irminconnectorclient.NewClient(
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
	opClient := irminconnectorclient.NewClient(
		connection.Connector.APIBaseURL,
		op.Token,
		"en",
	)

	return opClient, cancel, nil
}

// DataMovementSchema retrieves the schema for a specific method from the connector.
// It returns the schema and an error if any occurred.
func (c *Client) DataMovementSchema(connection *db.Connection, method string) (*irminmodels.ObjectSchema, error) {
	opClient, cancel, err := c.InitializeConnectorOperation(connection)
	if err != nil {
		return nil, err
	}
	// Ensure operation is cancelled when done.
	defer cancel()

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
	files map[string][]byte,
	fieldMappings []irminmodels.FieldMapping,
) (map[string][]byte, []error) {
	// If no field mappings, return files as-is
	if len(fieldMappings) == 0 {
		return files, nil
	}

	// Initialize DuckDB client for field mappings and merging
	duckDBClient, err := duckdb.NewQueryClient(c.Env, c.Logger)
	if err != nil {
		return nil, []error{fmt.Errorf("failed to initialize DuckDB client: %w", err)}
	}
	defer duckDBClient.Close()

	// Apply field mappings to all files and collect results by destination
	destinationFiles, mappingErrors := c.applyFieldMappingsToAllFiles(duckDBClient, files, fieldMappings)
	if len(mappingErrors) > 0 {
		return nil, mappingErrors
	}

	// Merge files that map to the same destination
	mergedFiles, mergeErrors := c.mergeDestinationFiles(duckDBClient, destinationFiles)
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
func (c *Client) DataImport(
	connection *db.Connection,
	connectionPath,
	workspace,
	repository,
	branch,
	repositoryPath string,
	fieldMappings []irminmodels.FieldMapping,
) ([]lakefs.ObjectMetadata, []error) {
	// Pull the files from the connector.
	allFiles, err := c.PullFilesFromConnector(connection, connectionPath)
	if err != nil {
		return nil, []error{err}
	}

	// Process field mappings (or return files as-is if no mappings)
	processedFiles, processingErrors := c.processFieldMappings(allFiles, fieldMappings)
	if len(processingErrors) > 0 {
		return nil, processingErrors
	}

	// Upload the processed files
	return c.uploadFiles(processedFiles, workspace, repository, branch, repositoryPath)
}

// uploadFiles uploads files to lakeFS concurrently.
func (c *Client) uploadFiles(
	files map[string][]byte,
	workspace, repository, branch, repositoryPath string,
) ([]lakefs.ObjectMetadata, []error) {
	var (
		errs    []error
		success []lakefs.ObjectMetadata
	)

	repoName := utils.GetLakeFSRepositoryName(workspace, repository)
	uploadCh := make(chan *lakefs.ObjectMetadata, len(files))
	upErrCh := make(chan error, len(files))

	// Upload files concurrently
	for filePath, fileContent := range files {
		go func() {
			uploadPath := c.buildTargetPath(repositoryPath, filePath, len(files) > 1)

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
	duckDBClient *duckdb.QueryClient,
	allFiles map[string][]byte,
	fieldMappings []irminmodels.FieldMapping,
) (map[string]map[string][]byte, []error) {
	// destinationFiles[destinationPath][sourcePath] = content
	destinationFiles := make(map[string]map[string][]byte)
	var errs []error

	for sourcePath, fileContent := range allFiles {
		// Apply field mappings to this source file
		results, err := c.ApplyFieldMappings(duckDBClient, fileContent, sourcePath, fieldMappings)
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
func (c *Client) PullFilesFromConnector(connection *db.Connection, connectionPath string) (map[string][]byte, error) {
	// Initialize connector operation.
	opClient, cancel, err := c.InitializeConnectorOperation(connection)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", err)
	}
	defer cancel()

	// Pull the matching files from the connector.
	pulled, pullErr := opClient.OperationPull(connectionPath)
	if pullErr != nil {
		return nil, fmt.Errorf("failed to pull files: %w", pullErr)
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
		for filePath, fileContent := range unzipped {
			allFiles[filePath] = fileContent
		}
	}

	return allFiles, nil
}

// DataExport exports data from a lakeFS repository to an external connector.
// It applies field mappings to route and transform data, merges files that map
// to the same destination, and pushes the results to the connector.
// Returns the paths of the files that were pushed and any errors that occurred.
func (c *Client) DataExport(
	connection *db.Connection,
	connectionPath,
	workspace,
	repository,
	branch,
	repositoryPath string,
	fieldMappings []irminmodels.FieldMapping,
) ([]string, []error) {
	var (
		errs            []error
		repositoryPaths []string
	)

	repoName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Fetch object metadata (file or directory).
	obj, getObjectErr := getObject(repositoryPath, repoName, branch, *c.LakeFSClient)
	if getObjectErr != nil {
		errs = append(errs, fmt.Errorf("failed to get object %q: %w", repositoryPath, getObjectErr))
		return nil, errs
	}

	// Collect files for processing.
	files := make(map[string][]byte)
	if obj.Type == irminmodels.ObjectTypeGroup {
		// Directory: fetch child contents concurrently.
		ch := make(chan struct {
			name    string
			content []byte
		}, len(obj.Children))
		errCh := make(chan error, len(obj.Children))

		for _, child := range obj.Children {
			go func() {
				data, getFullObjectContentErr := c.LakeFSClient.GetFullObjectContent(
					repoName,
					branch,
					child.Path,
				)
				if getFullObjectContentErr != nil {
					errCh <- fmt.Errorf("failed to fetch child %q: %w", child.Path, getFullObjectContentErr)
					return
				}
				ch <- struct {
					name    string
					content []byte
				}{name: child.Name, content: data}
			}()
		}

		for range len(obj.Children) {
			select {
			case r := <-ch:
				files[r.name] = r.content
				repositoryPaths = append(repositoryPaths, r.name)
			case e := <-errCh:
				errs = append(errs, e)
			}
		}
	} else {
		// Single file: fetch content.
		data, getFullObjectContentErr := c.LakeFSClient.GetFullObjectContent(repoName, branch, obj.Path)
		if getFullObjectContentErr != nil {
			errs = append(errs, fmt.Errorf("failed to fetch object %q: %w", obj.Path, getFullObjectContentErr))
			return nil, errs
		}
		files[obj.Name] = data
		repositoryPaths = append(repositoryPaths, obj.Path)
	}

	// Process field mappings (or return files as-is if no mappings)
	finalFiles, processingErrors := c.processFieldMappings(files, fieldMappings)
	if len(processingErrors) > 0 {
		errs = append(errs, processingErrors...)
		return repositoryPaths, errs
	}

	// Push the files to the connector.
	_, pushFilesToConnectorErr := c.PushFilesToConnector(connection, connectionPath, obj, finalFiles)
	if pushFilesToConnectorErr != nil {
		errs = append(errs, pushFilesToConnectorErr)
		return repositoryPaths, errs
	}

	// Return the repository paths and errors.
	return repositoryPaths, errs
}

// PushFilesToConnector pushes files to a connector.
// It returns the paths of the files that were pushed and an error if any occurred.
func (c *Client) PushFilesToConnector(
	connection *db.Connection,
	connectionPath string,
	obj *irminmodels.Object,
	files map[string][]byte,
) ([]string, error) {
	// Zip the files.
	zip, zipFilesErr := irminutils.ZipFiles(files)
	if zipFilesErr != nil {
		return nil, fmt.Errorf("failed to zip files: %w", zipFilesErr)
	}

	// Initialize connector operation.
	opClient, cancel, initializeConnectorOperationErr := c.InitializeConnectorOperation(connection)
	if initializeConnectorOperationErr != nil {
		return nil, fmt.Errorf("failed to initialize connector operation: %w", initializeConnectorOperationErr)
	}
	defer cancel()

	// Build the connection path to push the zip to.
	objName := ""
	if obj != nil {
		objName = obj.Name
	}
	connPath := c.buildTargetPath(connectionPath, objName, len(files) > 1)

	// Push the zip to the correct path in the connector.
	_, pushFilesErr := opClient.OperationPush(
		connPath,
		irminconnectorclient.FormFile{Reader: bytes.NewBuffer(zip)},
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
