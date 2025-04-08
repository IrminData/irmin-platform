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

// DataImport imports data into a workspace repository from an external source using a connector.
func (c *Client) DataImport(ctx context.Context, connection *db.Connection, workspace, repository, branch, path string) error {
	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, connection.Connector.SystemToken, c.Locale)

	// Initialize operation with the connector
	op, err := connectorClient.InitOperation(connection.Details, connection.Settings)
	if err != nil {
		return fmt.Errorf("failed to initialize operation: %w", err)
	}

	// Create connector operation client
	connectorOpClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, op.Token, "en")

	// Pull files from the connector
	files, err := connectorOpClient.OperationPull(path)
	if err != nil {
		return fmt.Errorf("failed to pull files: %w", err)
	}

	// Close the operation
	if err := connectorClient.CancelOperation(int(op.ID)); err != nil {
		return fmt.Errorf("failed to close operation: %w", err)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Upload each file concurrently.
	uploadFutures := make([]utils.FutureResult[*lakefs.ObjectMetadata], len(files))
	for i, file := range files {
		// Capture the loop variable.
		f := file
		uploadFutures[i] = utils.AsyncWithContext(ctx, func() (*lakefs.ObjectMetadata, error) {
			// Create a new reader for the file content.
			reader := bytes.NewReader(f.Content)
			// Construct the file path to upload to.
			filePath := strings.Trim(path, "/")
			filePath = strings.Trim(filePath, f.Filename)
			filePath = fmt.Sprintf("%s/%s", filePath, f.Filename)
			// Upload the file to the lakeFS repository.
			return c.LakeFSClient.UploadObject(lakeFSRepositoryName, branch, filePath, reader, false)
		})
	}

	// Await all uploads.
	for _, future := range uploadFutures {
		result, err := future.Await()
		if err != nil {
			return fmt.Errorf("failed to upload file: %w", err)
		}
		log.Printf("Upload result: %v", result)
	}

	return nil
}

// DataExport exports data from a workspace repository to an external source using a connector.
func (c *Client) DataExport(ctx context.Context, connection *db.Connection, workspace, repository, branch, path string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Fetch the object metadata from the repository.
	irminObject, err := getObject(path, lakeFSRepositoryName, branch, *c.LakeFSClient)
	if err != nil {
		return fmt.Errorf("failed to get object: %w", err)
	}

	// Files to upload to the connector, where the key is the file name and the value is the file content.
	filesToUpload := make(map[string][]byte)

	// Check if the object is a directory.
	if irminObject.Type == irminModels.ObjectTypeGroup {
		for _, child := range irminObject.Children {
			// Fetch the content of the child object.
			content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, branch, child.Path)
			if err != nil {
				return fmt.Errorf("failed to get object content: %w", err)
			}
			filesToUpload[child.Name] = content
		}
	} else {
		// Fetch the content of the object.
		content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, branch, irminObject.Path)
		if err != nil {
			return fmt.Errorf("failed to get object content: %w", err)
		}
		filesToUpload[irminObject.Name] = content
	}

	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, connection.Connector.SystemToken, c.Locale)

	// Initialize operation with the connector
	op, err := connectorClient.InitOperation(connection.Details, connection.Settings)
	if err != nil {
		return fmt.Errorf("failed to initialize operation: %w", err)
	}

	// Create connector operation client
	connectorOpClient := irminConnectorClient.NewClient(connection.Connector.APIBaseURL, op.Token, "en")

	// Upload each file concurrently.
	pushFutures := make([]utils.FutureResult[string], len(filesToUpload))
	count := 0
	for fileName, file := range filesToUpload {
		// Capture the loop variable.
		pushFutures[count] = utils.AsyncWithContext(ctx, func() (string, error) {
			// Construct the file path for the connector.
			filePath := strings.Trim(path, "/")
			filePath = strings.Trim(filePath, fileName)
			filePath = fmt.Sprintf("%s/%s", filePath, fileName)
			// Upload the file to the connector.
			return connectorOpClient.OperationPush(filePath, irminConnectorClient.FormFile{
				Reader: bytes.NewBuffer(file),
			})
		})
		count++
	}

	// Await all uploads.
	var errors []error
	for _, future := range pushFutures {
		_, err := future.Await()
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to upload file: %w", err))
		}
	}

	// Close the operation
	if err := connectorClient.CancelOperation(int(op.ID)); err != nil {
		return fmt.Errorf("failed to close operation: %w", err)
	}

	// Check if there were any errors during the upload process.
	if len(errors) > 0 {
		return fmt.Errorf("failed to upload files: %v", errors)
	}

	return nil
}
