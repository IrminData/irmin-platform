package engine

import (
	"bytes"
	"context"
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"log"

	irminConnectorClient "github.com/IrminData/irmin-sdk-go/connector"
)

// DataImport imports data into a workspace repository from an external source using a connector.
func (c *Client) DataImport(ctx context.Context, workspace, connector_token, connector_url, repository, branch, path string) error {
	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connector_url, connector_token, c.Locale)

	// Pull the files asynchronously.
	pullFuture := utils.AsyncWithContext(ctx, func() ([]irminConnectorClient.PulledFile, error) {
		return connectorClient.OperationPull(path)
	})
	files, err := pullFuture.Await()
	if err != nil {
		return fmt.Errorf("failed to pull files: %w", err)
	}

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Upload each file concurrently.
	uploadFutures := make([]utils.FutureResult[*lakefs.ObjectMetadata], len(files))
	for i, file := range files {
		// Capture the loop variable.
		f := file
		uploadFutures[i] = utils.AsyncWithContext(ctx, func() (*lakefs.ObjectMetadata, error) {
			reader := bytes.NewReader(f.Content)
			return c.LakeFSClient.UploadObject(lakeFSRepositoryName, branch, f.Filename, reader, false)
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
func (c *Client) DataExport(workspace, connector_token, connector_url, repository, branch, path string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Fetch the object metadata from the repository.
	irminObject, err := getObject(path, lakeFSRepositoryName, branch, *c.LakeFSClient)
	if err != nil {
		return fmt.Errorf("failed to get object: %w", err)
	}

	// Fetch the content of the object.
	content, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, branch, irminObject.Path)
	if err != nil {
		return fmt.Errorf("failed to get object content: %w", err)
	}

	// Create connector client instance.
	connectorClient := irminConnectorClient.NewClient(connector_url, connector_token, c.Locale)

	// Push the file to the connector
	connectorClient.OperationPush(irminObject.Path, irminConnectorClient.FormFile{
		Reader: bytes.NewBuffer(content),
	})

	return nil
}
