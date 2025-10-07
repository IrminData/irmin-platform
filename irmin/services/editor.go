package services

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/utils"
	"path"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

func (api *APIServices) ListEditorItems(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	itemPath string,
) ([]irminmodels.EditorItem, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceEditorScript,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list editor items",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Initialize the bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket, api.DB)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(c, "failed to create bucket client", "error", createBucketClientErr)
		return nil, createBucketClientErr
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct the full S3 key for the file
	itemPath = strings.TrimPrefix(itemPath, "/")
	key := editorPathPrefix + itemPath

	// Get the editor items at the specified path
	items, listObjectsErr := bucket.ListObjects(c, key)
	if listObjectsErr != nil {
		api.Logger.ErrorContext(c, "Error listing editor items", "error", listObjectsErr)
		return nil, listObjectsErr
	}

	// Format the editor items
	editorItems, formatEditorItemsErr := formatter.FormatEditorItemsResponse(items, workspace)
	if formatEditorItemsErr != nil {
		api.Logger.ErrorContext(c, "Error formatting editor items", "error", formatEditorItemsErr)
		return nil, formatEditorItemsErr
	}

	return editorItems, nil
}

func (api *APIServices) SaveEditorItem(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	itemPath string,
	req irmincore.CreateEditorItemRequest,
) (*irminmodels.EditorItem, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceEditorScript,
		nil,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to save editor item",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Get the content
	content := ""
	if req.Content != nil {
		content = *req.Content
	}

	// Validate the item path
	itemPath = strings.TrimPrefix(itemPath, "/")
	if itemPath == "" {
		return nil, ErrEditorItemPathRequired
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket, api.DB)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(c, "failed to create bucket client", "error", createBucketClientErr)
		return nil, createBucketClientErr
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct the full S3 key for the file
	key := editorPathPrefix + itemPath
	if req.Type == "folder" && !strings.HasSuffix(key, "/") {
		key += "/"
	}

	// Upload the content to S3 with advisory lock
	writePathErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return bucket.WritePath(c, key, content, tx)
	})
	if writePathErr != nil {
		api.Logger.ErrorContext(c, "Error uploading object", "error", writePathErr)
		return nil, writePathErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Editor item %s saved", itemPath),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Parse the item details from the path
	language := utils.DetermineEditorItemLanguageFromPath(itemPath)
	itemType := irminmodels.EditorItemTypeFile
	if language == nil {
		itemType = irminmodels.EditorItemTypeFolder
	}

	// Get the last modified time
	lastModified := time.Now()

	// Return the editor item.
	return &irminmodels.EditorItem{
		Name:         path.Base(itemPath),
		Path:         itemPath,
		Type:         itemType,
		Content:      req.Content,
		Language:     language,
		LastModified: lastModified,
	}, nil
}

func (api *APIServices) DeleteEditorItem(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	itemPath string,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceEditorScript,
		nil,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete editor item",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return ErrAccessDenied
	}

	// Format the item path
	itemPath = strings.TrimPrefix(itemPath, "/")
	if itemPath == "" {
		return ErrEditorItemPathRequired
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket, api.DB)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(c, "failed to create bucket client", "error", createBucketClientErr)
		return createBucketClientErr
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct full S3 key prefix for deletion
	keyPrefix := editorPathPrefix + itemPath

	// Delete all objects under the prefix with advisory lock
	deletePathErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return bucket.DeletePath(c, keyPrefix, tx)
	})
	if deletePathErr != nil {
		api.Logger.ErrorContext(c, "Error deleting editor items", "error", deletePathErr)
		return deletePathErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Editor item %s deleted", itemPath),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

func (api *APIServices) MoveEditorItem(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	sourcePath string,
	destinationPath string,
) (*irminmodels.EditorItem, error) {
	return api.transferEditorItem(c, user, workspace, sourcePath, destinationPath, true)
}

func (api *APIServices) CopyEditorItem(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	sourcePath string,
	destinationPath string,
) (*irminmodels.EditorItem, error) {
	return api.transferEditorItem(c, user, workspace, sourcePath, destinationPath, false)
}

func (api *APIServices) transferEditorItem(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	sourcePath string,
	destinationPath string,
	isMove bool,
) (*irminmodels.EditorItem, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceEditorScript,
		nil,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer editor item",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate paths
	sourcePath = strings.TrimPrefix(sourcePath, "/")
	if sourcePath == "" {
		return nil, ErrEditorItemPathRequired
	}

	destinationPath = strings.TrimPrefix(destinationPath, "/")
	if destinationPath == "" {
		return nil, ErrEditorItemDestinationPathRequired
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket, api.DB)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(c, "failed to create bucket client", "error", createBucketClientErr)
		return nil, createBucketClientErr
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Build full S3 key prefixes for source and destination
	sourcePrefix := editorPathPrefix + sourcePath
	destinationPrefix := editorPathPrefix + destinationPath

	// Move or copy the source to the destination with advisory lock
	duplicatePathErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return bucket.DuplicatePath(c, sourcePrefix, destinationPrefix, isMove, tx)
	})
	if duplicatePathErr != nil {
		api.Logger.ErrorContext(c, "Error transferring editor items", "error", duplicatePathErr)
		return nil, duplicatePathErr
	}

	// Log the event
	action := "moved"
	eventType := db.LogEventTypeUpdate
	if !isMove {
		action = "copied"
		eventType = db.LogEventTypeCreate
	}
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        eventType,
		Description: fmt.Sprintf("Editor item %s %s to %s", sourcePath, action, destinationPath),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Parse the item details from the destination path
	language := utils.DetermineEditorItemLanguageFromPath(destinationPath)
	itemType := irminmodels.EditorItemTypeFile
	if language == nil {
		itemType = irminmodels.EditorItemTypeFolder
	}

	// Get the last modified time
	lastModified := time.Now()

	// Return the editor item at the destination
	return &irminmodels.EditorItem{
		Name:         path.Base(destinationPath),
		Path:         destinationPath,
		Type:         itemType,
		Content:      nil, // Content not retrieved for move/copy operations
		Language:     language,
		LastModified: lastModified,
	}, nil
}

func (api *APIServices) GetEditorItemContent(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	itemPath string,
) (string, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceEditorScript,
		nil,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return "", err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get editor item content",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return "", ErrAccessDenied
	}

	// Validate the item path
	itemPath = strings.TrimPrefix(itemPath, "/")
	if itemPath == "" {
		return "", ErrEditorItemPathRequired
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket, api.DB)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(c, "failed to create bucket client", "error", createBucketClientErr)
		return "", createBucketClientErr
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct the full S3 key for the file
	key := editorPathPrefix + itemPath

	// Retrieve the file from S3
	content, readPathErr := bucket.ReadPath(c, key)
	if readPathErr != nil {
		api.Logger.ErrorContext(c, "Error reading object", "error", readPathErr)
		return "", readPathErr
	}

	if content == nil {
		return "", nil
	}

	return *content, nil
}

func (api *APIServices) ExecuteEditorItem(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	itemPath string,
	inputData []irminmodels.ActionInputData,
	locale string,
) (*irminmodels.ScriptResult, error) {
	// Validate the item path
	itemPath = strings.TrimPrefix(itemPath, "/")
	if itemPath == "" {
		return nil, ErrEditorItemPathRequired
	}

	// Initialize a map to store the input objects
	inputFiles := make(map[string][]byte)

	// Check if we have input data repositories and paths
	if len(inputData) > 0 {
		// Initialize Data Engine client
		dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
		if createDataEngineClientErr != nil {
			api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
			return nil, createDataEngineClientErr
		}

		// Create a slice to store all async operations
		var futures []utils.FutureResult[[]byte]

		// Launch concurrent fetches for each input object
		for _, input := range inputData {
			inputRepository := input.Repository
			inputPath := strings.TrimPrefix(input.RepositoryPath, "/")
			inputRef := input.RepositoryRef

			// Create an async operation for fetching the object
			future := utils.Async(func() ([]byte, error) {
				return dataEngine.GetObjectContent(workspace.Slug, inputRepository, inputPath, inputRef)
			})
			futures = append(futures, future)
		}

		// Wait for all results and handle errors
		for i, future := range futures {
			content, awaitErr := future.Await()
			if awaitErr != nil {
				api.Logger.ErrorContext(c, "Error getting object", "error", awaitErr)
				return nil, awaitErr
			}
			// Add the object to the input objects map using the original path
			inputFiles[inputData[i].RepositoryPath] = content
		}
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Editor item '%s' executed", itemPath),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the file in the compute sandbox
	computeSandbox := sandbox.NewComputeSandbox(api.Env, api.DB, api.Logger)
	computeResult, executeEditorItemErr := computeSandbox.ExecuteEditorItem(
		c,
		inputFiles,
		*user,
		itemPath,
		workspace.Slug,
	)
	if executeEditorItemErr != nil {
		api.Logger.ErrorContext(c, "Error executing editor item in the compute sandbox", "error", executeEditorItemErr)
		return nil, executeEditorItemErr
	}

	// Check if the logs contain errors
	hasErrors := strings.Contains(strings.ToLower(computeResult.Logs), "error")

	// Parse the structured result files if any
	parsedResults, parseStructuredFileErr := lib.ParseStructuredFiles(
		c,
		computeResult.ResultFiles,
		api.Env,
		api.Logger,
	)
	if parseStructuredFileErr != nil {
		api.Logger.ErrorContext(c, "Error parsing structured files", "error", parseStructuredFileErr)
	}

	// Return the results
	return &irminmodels.ScriptResult{
		StructuredResults: parsedResults,
		StartedAt:         computeResult.StartTime,
		FinishedAt:        computeResult.EndTime,
		Duration:          computeResult.EndTime.Sub(computeResult.StartTime),
		HasErrors:         hasErrors,
		Logs:              strings.Split(computeResult.Logs, "\n"),
	}, nil
}
