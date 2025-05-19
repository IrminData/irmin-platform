package engine

import (
	"bytes"
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

// DataImport imports data from an external source into a lakeFS repository.
// It returns the paths of the files that were pulled and an error if any occurred.
func (c *Client) DataImport(
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

	// Pull the files from the connector.
	allFiles, err := c.PullFilesFromConnector(connection, connectionPath)
	if err != nil {
		return nil, []error{err}
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
// It returns the paths of the files that were pushed and an error if any occurred.
func (c *Client) DataExport(
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
	obj, getObjectErr := getObject(repositoryPath, repoName, branch, *c.LakeFSClient)
	if getObjectErr != nil {
		errs = append(errs, fmt.Errorf("failed to get object %q: %w", repositoryPath, getObjectErr))
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

	// Push the files to the connector.
	_, pushFilesToConnectorErr := c.PushFilesToConnector(connection, connectionPath, obj, files)
	if pushFilesToConnectorErr != nil {
		errs = append(errs, pushFilesToConnectorErr)
		return nil, errs
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
	connPath := strings.Trim(connectionPath, "/")
	if strings.HasSuffix(connectionPath, "/") || connectionPath == "" || len(files) > 1 {
		// If connection path is a directory (ends with "/" or is empty),
		// or there is more than one file, append the pulled file name to the path.
		if obj != nil {
			connPath = path.Join(connPath, obj.Name)
		}
	}

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
