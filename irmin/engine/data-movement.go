package engine

import (
	"bytes"
	"context"
	"fmt"
	"path"
	"strings"

	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminConnectorClient "github.com/IrminData/irmin-sdk-go/connector"
	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// initializeConnectorOperation sets up a connector operation and returns an operation client,
// along with a cancel function to clean up when done.
// It returns an error if initialization fails.
func (c *Client) initializeConnectorOperation(connection *db.Connection) (*irminConnectorClient.Client, func(), error) {
	// Create base connector client.
	baseClient := irminConnectorClient.NewClient(
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
		if cancelErr := baseClient.CancelOperation(int(op.ID)); cancelErr != nil {
			fmt.Printf("failed to cancel operation %d: %v", op.ID, cancelErr)
		}
	}

	// Create operation-specific client (always in English for schema retrieval/actions).
	opClient := irminConnectorClient.NewClient(
		connection.Connector.APIBaseURL,
		op.Token,
		"en",
	)

	return opClient, cancel, nil
}

// DataMovementSchema retrieves the schema for a specific method from the connector.
//
// Parameters:
//
//	ctx - context for request cancellation and deadlines.
//	connection - database connection details for connector.
//	method - the operation method to retrieve schema for (e.g. "pull").
//
// Returns:
//
//	ObjectSchema pointer for the requested method, or an error if retrieval fails.
func (c *Client) DataMovementSchema(ctx context.Context, connection *db.Connection, method string) (*irminModels.ObjectSchema, error) {
	opClient, cancel, err := c.initializeConnectorOperation(connection)
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

// schemaToRelevantPaths computes paths to pull based on the schema tree and a requested prefix.
//
// Parameters:
//
//	prefix - the target path prefix to filter file entries by.
//	schema - the full object schema tree.
//
// Returns:
//
//	slice of matching paths (without leading slash).
func schemaToRelevantPaths(prefix string, schema *irminModels.ObjectSchema) []string {
	var paths []string

	if schema.Type == irminModels.ObjectSchemaTypeGroup {
		// Directory: traverse children.
		for _, child := range schema.Children {
			childPaths := schemaToRelevantPaths(prefix, &child)
			paths = append(paths, childPaths...)
		}
	} else {
		// File: include if its path matches the prefix.
		if strings.HasPrefix(schema.Path, prefix) {
			// Trim leading slash and prefix.
			relative := strings.TrimPrefix(schema.Path, prefix)
			relative = strings.TrimPrefix(relative, "/")
			paths = append(paths, relative)
		}
	}

	return paths
}

// DataImport imports data from an external source into a lakeFS repository.
//
// Parameters:
//
//	ctx - context for request cancellation and deadlines.
//	connection - database connection with connector info.
//	connectionPath - path in external source to pull data from.
//	workspace - lakeFS workspace name.
//	repository - lakeFS repository name.
//	branch - branch in repository to import to.
//	pathPrefix - path in repository to upload files under.
//
// Returns:
//
//	slice of successfully imported paths, slice of errors encountered.
func (c *Client) DataImport(
	ctx context.Context,
	connection *db.Connection,
	connectionPath,
	workspace,
	repository,
	branch,
	pathPrefix string,
) ([]string, []error) {
	var (
		errs    []error
		success []string
	)

	// Initialize connector operation.
	opClient, cancel, err := c.initializeConnectorOperation(connection)
	if err != nil {
		errs = append(errs, err)
		return success, errs
	}
	defer cancel()

	// Get pull schema.
	schema, err := opClient.GetSchema("pull")
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to get pull schema: %w", err))
		return success, errs
	}

	// Determine files to pull.
	paths := schemaToRelevantPaths(connectionPath, schema)
	if len(paths) == 0 {
		errs = append(errs, fmt.Errorf(
			"no relevant paths found for connectionPath %q",
			connectionPath,
		))
		return success, errs
	}

	// Pull files concurrently.
	filesCh := make(chan []irminConnectorClient.PulledFile, len(paths))
	errCh := make(chan error, len(paths))

	for _, rel := range paths {
		rel := rel
		go func() {
			pulled, pullErr := opClient.OperationPull(rel)
			if pullErr != nil {
				errCh <- fmt.Errorf("pull failed for %q: %w", rel, pullErr)
				return
			}
			filesCh <- pulled
		}()
	}

	// Collect results.
	var allFiles []irminConnectorClient.PulledFile
	for i := 0; i < len(paths); i++ {
		select {
		case f := <-filesCh:
			allFiles = append(allFiles, f...)
		case e := <-errCh:
			errs = append(errs, e)
		}
	}
	close(filesCh)
	close(errCh)

	if len(allFiles) == 0 {
		errs = append(errs, fmt.Errorf("no files pulled from connector"))
		return success, errs
	}

	// Prepare upload to lakeFS.
	repoName := utils.GetLakeFSRepositoryName(workspace, repository)
	uploadCh := make(chan *lakefs.ObjectMetadata, len(allFiles))
	upErrCh := make(chan error, len(allFiles))

	for _, file := range allFiles {
		file := file
		go func() {
			reader := bytes.NewReader(file.Content)
			// Build repository path.
			uploadPath := strings.Trim(pathPrefix, "/")
			uploadPath = path.Join(uploadPath, file.Filename)

			meta, upErr := c.LakeFSClient.UploadObject(
				repoName,
				branch,
				uploadPath,
				reader,
				false,
			)
			if upErr != nil {
				upErrCh <- fmt.Errorf("upload failed for %q: %w", uploadPath, upErr)
				return
			}
			uploadCh <- meta
		}()
	}

	// Collect upload results.
	for i := 0; i < len(allFiles); i++ {
		select {
		case meta := <-uploadCh:
			success = append(success, meta.Path)
		case e := <-upErrCh:
			errs = append(errs, e)
		}
	}

	return success, errs
}

// DataExport exports data from a lakeFS repository to an external connector.
//
// Parameters:
//
//	ctx - context for request cancellation and deadlines.
//	connection - database connection with connector info.
//	connectionPath - target path in connector to upload data to.
//	workspace - lakeFS workspace name.
//	repository - lakeFS repository name.
//	branch - branch in repository to export from.
//	pathPrefix - path in repository to source files from.
//
// Returns:
//
//	slice of successfully exported connector paths, slice of errors encountered.
func (c *Client) DataExport(
	ctx context.Context,
	connection *db.Connection,
	connectionPath,
	workspace,
	repository,
	branch,
	pathPrefix string,
) ([]string, []error) {
	var (
		errs    []error
		success []string
	)

	repoName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Fetch object metadata (file or directory).
	obj, err := getObject(pathPrefix, repoName, branch, *c.LakeFSClient)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to get object %q: %w", pathPrefix, err))
		return nil, errs
	}

	// Collect files for upload.
	files := make(map[string][]byte)
	if obj.Type == irminModels.ObjectTypeGroup {
		// Directory: fetch child contents concurrently.
		ch := make(chan struct {
			name    string
			content []byte
		}, len(obj.Children))
		errCh := make(chan error, len(obj.Children))

		for _, child := range obj.Children {
			child := child
			go func() {
				data, getErr := c.LakeFSClient.GetFullObjectContent(
					repoName,
					branch,
					child.Path,
				)
				if getErr != nil {
					errCh <- fmt.Errorf("failed to fetch child %q: %w", child.Path, getErr)
					return
				}
				ch <- struct {
					name    string
					content []byte
				}{name: child.Name, content: data}
			}()
		}

		for i := 0; i < len(obj.Children); i++ {
			select {
			case r := <-ch:
				files[r.name] = r.content
			case e := <-errCh:
				errs = append(errs, e)
			}
		}
	} else {
		// Single file: fetch content.
		data, getErr := c.LakeFSClient.GetFullObjectContent(repoName, branch, obj.Path)
		if getErr != nil {
			errs = append(errs, fmt.Errorf("failed to fetch object %q: %w", obj.Path, getErr))
			return success, errs
		}
		files[obj.Name] = data
	}

	// Initialize connector operation.
	opClient, cancel, initErr := c.initializeConnectorOperation(connection)
	if initErr != nil {
		errs = append(errs, initErr)
		return success, errs
	}
	defer cancel()

	// Push files concurrently to connector.
	pushCh := make(chan string, len(files))
	pushErrCh := make(chan error, len(files))

	for fileName, data := range files {
		fileName, data := fileName, data
		go func() {
			connPath := strings.Trim(pathPrefix, "/")
			connPath = path.Join(connPath, fileName)
			_, pushErr := opClient.OperationPush(
				connPath,
				irminConnectorClient.FormFile{Reader: bytes.NewBuffer(data)},
			)
			if pushErr != nil {
				pushErrCh <- fmt.Errorf("push failed for %q: %w", connPath, pushErr)
				return
			}
			pushCh <- connPath
		}()
	}

	// Collect push results.
	for i := 0; i < len(files); i++ {
		select {
		case p := <-pushCh:
			success = append(success, p)
		case e := <-pushErrCh:
			errs = append(errs, e)
		}
	}

	return success, errs
}
