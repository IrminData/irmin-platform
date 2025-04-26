package engine

import (
	"bytes"
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log"
	"strings"

	irminConnectorClient "github.com/IrminData/irmin-sdk-go/connector"
	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// DataMovementSchema retrieves the schema for a specific operation method from the connector.
func (c *Client) DataMovementSchema(ctx context.Context, connection *db.Connection, method string) (*irminModels.ObjectSchema, error) {
	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, connection.Connector.SystemToken, c.Locale)

	// Initialize operation with the connector
	op, err := connectorClient.InitOperation(connection.Details, connection.Settings)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize operation: %w", err)
	}
	// Close the operation when done
	defer connectorClient.CancelOperation(int(op.ID))

	// Create connector operation client
	connectorOpClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, op.Token, "en")

	// Retrieve the schema for the specified operation method.
	schema, err := connectorOpClient.GetSchema(method)
	if err != nil {
		return nil, fmt.Errorf("failed to get schema: %w", err)
	}

	return schema, nil
}

// schemaToRelevantPaths takes a path and a schema, and returns a list of relevant paths based on the schema type.
func schemaToRelevantPaths(path string, schema *irminModels.ObjectSchema) []string {
	var pathsToPull []string
	// Check if the path is a directory or a file.
	if schema.Type == irminModels.ObjectSchemaTypeGroup {
		// If it's a directory, iterate through its children.
		for _, child := range schema.Children {
			// Recursively call the function for each child.
			pathsToPull = append(pathsToPull, schemaToRelevantPaths(path, &child)...)
		}
	} else {
		// If it's a file, see if it matches the requested path.
		if strings.HasPrefix(schema.Path, path) {
			// If it matches, we need to pull it.
			// Remove the leading path from the schema path.
			schema.Path = strings.TrimPrefix(schema.Path, "/")
			// Add it to the paths to pull.
			pathsToPull = append(pathsToPull, schema.Path)
		}
	}
	return pathsToPull
}

// DataImport imports data into a workspace repository from an external source using a connector.
// It pulls files from the connector and uploads them to the specified branch and path in the lakeFS repository.
// The function returns a list of file paths in the repository successfuly imported and any errors encountered during the process.
func (c *Client) DataImport(ctx context.Context, connection *db.Connection, connectionPath, workspace, repository, branch, path string) ([]string, []error) {
	var errors []error
	var successfulRepositoryPaths []string

	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, connection.Connector.SystemToken, c.Locale)

	// Initialize operation with the connector
	op, err := connectorClient.InitOperation(connection.Details, connection.Settings)
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to initialize operation: %w", err))
		return successfulRepositoryPaths, errors
	}
	// Close the operation when done
	defer connectorClient.CancelOperation(int(op.ID))

	// Create connector operation client
	connectorOpClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, op.Token, "en")

	// Retrieve the schema for operation method "pull"
	schema, err := connectorOpClient.GetSchema("pull")
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to get schema: %w", err))
		return successfulRepositoryPaths, errors
	}

	// Determine the paths to pull based on the schema and the requested connection path.
	pathsToPull := schemaToRelevantPaths(connectionPath, schema)
	if len(pathsToPull) == 0 {
		errors = append(errors, fmt.Errorf("no relevant paths found for the specified connection path: %s", connectionPath))
		return successfulRepositoryPaths, errors
	}

	// Loop through the paths to pull them one by one.
	var fileFutures []utils.FutureResult[[]irminConnectorClient.PulledFile]
	for _, pathToPull := range pathsToPull {
		fileFutures = append(fileFutures, utils.AsyncWithContext(ctx, func() ([]irminConnectorClient.PulledFile, error) {
			// Pull files from the connector for each path.
			fmt.Printf("Pulling files from path: %s\n", pathToPull)
			pathFiles, err := connectorOpClient.OperationPull(pathToPull)
			if err != nil {
				return nil, fmt.Errorf("failed to pull files: %w", err)
			}
			return pathFiles, nil
		}))
	}

	// Await all file pulls.
	var files []irminConnectorClient.PulledFile
	for _, future := range fileFutures {
		pathFiles, err := future.Await()
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to pull files: %w", err))
			continue
		}
		files = append(files, pathFiles...)
	}

	// Check if any files were pulled.
	if len(files) == 0 {
		errors = append(errors, fmt.Errorf("no files pulled from the connector"))
		return successfulRepositoryPaths, errors
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Upload each file concurrently.
	var uploadFutures []utils.FutureResult[*lakefs.ObjectMetadata]
	for _, file := range files {
		uploadFutures = append(uploadFutures, utils.AsyncWithContext(ctx, func() (*lakefs.ObjectMetadata, error) {
			// Create a new reader for the file content.
			reader := bytes.NewReader(file.Content)
			// Construct the file path to upload to.
			filePath := strings.Trim(path, "/")
			filePath = strings.Trim(filePath, file.Filename)
			if filePath == "" {
				filePath = file.Filename
			} else {
				filePath = fmt.Sprintf("%s/%s", filePath, file.Filename)
			}
			// Upload the file to the lakeFS repository.
			return c.LakeFSClient.UploadObject(lakeFSRepositoryName, branch, filePath, reader, false)
		}))
	}

	// Await all uploads.
	for _, future := range uploadFutures {
		result, err := future.Await()
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to upload file: %w", err))
			continue
		}
		// Add the uploaded file path to the successful repository paths.
		successfulRepositoryPaths = append(successfulRepositoryPaths, result.Path)
		log.Printf("Upload result: %v", result)
	}

	return successfulRepositoryPaths, errors
}

// DataExport exports data from a workspace repository to an external source using a connector.
// It retrieves files from the lakeFS repository and uploads them to the specified connection path in the connector.
// The function returns a list of file paths in the connector successfully exported and any errors encountered during the process.
func (c *Client) DataExport(ctx context.Context, connection *db.Connection, connectionPath, workspace, repository, branch, path string) ([]string, []error) {
	var errors []error
	var successfulConnectionPaths []string

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Fetch the object metadata from the repository.
	irminObject, err := getObject(path, lakeFSRepositoryName, branch, *c.LakeFSClient)
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to get object: %w", err))
		return nil, errors
	}

	// Files to upload to the connector, where the key is the file name and the value is the file content.
	filesToUpload := make(map[string][]byte)

	// Check if the object is a directory.
	if irminObject.Type == irminModels.ObjectTypeGroup {
		type ChildContentResult struct {
			name    string
			content []byte
		}

		var fetchFutures []utils.FutureResult[*ChildContentResult]

		// Iterate through the children of the directory.
		// TODO: This currently only direct decendants, should be recursive.
		for _, child := range irminObject.Children {
			fetchFutures = append(fetchFutures, utils.AsyncWithContext(ctx, func() (*ChildContentResult, error) {
				// Fetch the content of the child object.
				content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, branch, child.Path)
				if err != nil {
					return nil, fmt.Errorf("failed to get object content: %w", err)
				}
				return &ChildContentResult{
					name:    child.Name,
					content: content,
				}, nil
			}))
		}

		// Await all fetches
		for _, future := range fetchFutures {
			result, err := future.Await()
			if err != nil {
				errors = append(errors, err)
				continue
			}
			if result == nil {
				continue
			}
			// Add the fetched content to the files to upload.
			filesToUpload[result.name] = result.content
		}
	} else {
		// Fetch the content of the object.
		content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, branch, irminObject.Path)
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to get object content: %w", err))
			return successfulConnectionPaths, errors
		}
		filesToUpload[irminObject.Name] = content
	}

	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, connection.Connector.SystemToken, c.Locale)

	// Initialize operation with the connector
	op, err := connectorClient.InitOperation(connection.Details, connection.Settings)
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to initialize operation: %w", err))
		return nil, errors
	}

	// Close the operation when done
	defer connectorClient.CancelOperation(int(op.ID))

	// Create connector operation client
	connectorOpClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, op.Token, "en")

	// Upload each file concurrently.
	var pushFutures []utils.FutureResult[string]
	for fileName, file := range filesToUpload {
		pushFutures = append(pushFutures, utils.AsyncWithContext(ctx, func() (string, error) {
			// Construct the file path for the connector.
			filePath := strings.Trim(path, "/")
			filePath = strings.Trim(filePath, fileName)
			if filePath == "" {
				filePath = fileName
			} else {
				filePath = fmt.Sprintf("%s/%s", filePath, fileName)
			}
			// Upload the file to the connector.
			_, err := connectorOpClient.OperationPush(filePath, irminConnectorClient.FormFile{
				Reader: bytes.NewBuffer(file),
			})
			return filePath, err
		}))
	}

	// Await all uploads.
	for _, future := range pushFutures {
		_, err := future.Await()
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to upload file: %w", err))
		}
	}

	return successfulConnectionPaths, errors
}
