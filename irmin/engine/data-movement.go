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

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

// initializeConnectorOperation sets up a connector operation and returns an operation client,
// along with a cancel function to clean up when done.
// It returns an error if initialization fails.
func (c *Client) initializeConnectorOperation(connection *db.Connection) (*irminconnectorclient.Client, func(), error) {
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
		if cancelErr := baseClient.CancelOperation(int(op.ID)); cancelErr != nil {
			fmt.Printf("failed to cancel operation %d: %v", op.ID, cancelErr)
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
func (c *Client) DataMovementSchema(
	ctx context.Context,
	connection *db.Connection,
	method string,
) (*irminmodels.ObjectSchema, error) {
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
//	repositoryPath - path in repository to upload files under.
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
	repositoryPath string,
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

	// Pull the matching files from the connector.
	pulled, err := opClient.OperationPull(repositoryPath)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to pull files: %w", err))
		return success, errs
	}

	// Loop through the pulled files to unzip them and construct a list of all files.
	allFiles := make(map[string][]byte)
	for _, file := range pulled {
		// Unzip the file
		unzipped, err := irminutils.UnzipFiles(file.Content)
		if err != nil {
			errs = append(errs, fmt.Errorf("failed to unzip file: %w", err))
			return success, errs
		}

		// Add the unzipped files to the list of all files.
		for filePath, fileContent := range unzipped {
			allFiles[filePath] = fileContent
		}
	}

	// Prepare upload to lakeFS.
	repoName := utils.GetLakeFSRepositoryName(workspace, repository)
	uploadCh := make(chan *lakefs.ObjectMetadata, len(allFiles))
	upErrCh := make(chan error, len(allFiles))

	// Upload files concurrently.
	for filePath, fileContent := range allFiles {
		go func() {
			// Build the full path to the file.
			uploadPath := strings.Trim(repositoryPath, "/")
			if strings.HasSuffix(repositoryPath, "/") || repositoryPath == "" || len(allFiles) > 1 {
				// If repository path is a directory (ends with "/" or is empty), or there is more than one file,
				// append the pulled file name to the path.
				uploadPath = path.Join(uploadPath, filePath)
			}

			// Upload the file.
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

	// Collect upload results.
	for range allFiles {
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
//	slice of successfully exported paths, slice of errors encountered.
func (c *Client) DataExport(
	ctx context.Context,
	connection *db.Connection,
	connectionPath,
	workspace,
	repository,
	branch,
	repositoryPath string,
) ([]string, []error) {
	var (
		errs            []error
		repositoryPaths []string
	)

	repoName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Fetch object metadata (file or directory).
	obj, err := getObject(repositoryPath, repoName, branch, *c.LakeFSClient)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to get object %q: %w", repositoryPath, err))
		return nil, errs
	}

	// Collect files for upload.
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
		data, getErr := c.LakeFSClient.GetFullObjectContent(repoName, branch, obj.Path)
		if getErr != nil {
			errs = append(errs, fmt.Errorf("failed to fetch object %q: %w", obj.Path, getErr))
			return nil, errs
		}
		files[obj.Name] = data
		repositoryPaths = append(repositoryPaths, obj.Path)
	}

	// Zip the files.
	zip, err := irminutils.ZipFiles(files)
	if err != nil {
		errs = append(errs, fmt.Errorf("failed to zip files: %w", err))
		return nil, errs
	}

	// Initialize connector operation.
	opClient, cancel, initErr := c.initializeConnectorOperation(connection)
	if initErr != nil {
		errs = append(errs, initErr)
		return nil, errs
	}
	defer cancel()

	// Build the connection path to push the zip to.
	connPath := strings.Trim(connectionPath, "/")
	if strings.HasSuffix(connectionPath, "/") || connectionPath == "" || len(files) > 1 {
		// If connection path is a directory (ends with "/" or is empty),
		// or there is more than one file, append the pulled file name to the path.
		connPath = path.Join(connPath, obj.Name)
	}

	// Push the zip to the correct path in the connector.
	_, pushErr := opClient.OperationPush(
		connPath,
		irminconnectorclient.FormFile{Reader: bytes.NewBuffer(zip)},
	)
	if pushErr != nil {
		errs = append(errs, fmt.Errorf("failed to push files: %w", pushErr))
		return nil, errs
	}

	return repositoryPaths, errs
}
