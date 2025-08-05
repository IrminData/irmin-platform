package controllers

import (
	"fmt"
	"strings"

	"irmin-api/bucket"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// EditorIndex godoc
// @Summary List editor items
// @Description Get all editor items at the specified path in the workspace
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string false "Path to list items from" default("")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]object} "Editor items retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor [get]
func (api *APIControllers) EditorIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from the query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	path := strings.TrimPrefix(params["path"], "/")

	// Initialize the bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct the full S3 key for the file
	key := editorPathPrefix + path

	// Get the editor items at the specified path
	items, listObjectsErr := bucket.ListObjects(c, key)
	if listObjectsErr != nil {
		api.Logger.Error("Error listing editor items", "error", listObjectsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the editor items
	editorItems, formatEditorItemsErr := formatter.FormatEditorItemsResponse(items, workspace)
	if formatEditorItemsErr != nil {
		api.Logger.Error("Error formatting editor items", "error", formatEditorItemsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: editorItems,
	})
}

// EditorItemStore godoc
// @Summary Create or update editor item
// @Description Create a new editor item or update an existing one at the specified path
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path where to create/update the item"
// @Param request body irmincore.CreateEditorItemRequest true "Editor item content and type"
// @Success 200 {object} irminmodels.IrminAPIResponse "Editor item saved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor [post]
func (api *APIControllers) EditorItemStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	path := strings.TrimPrefix(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the JSON request body
	var req irmincore.CreateEditorItemRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}
	content := ""
	if req.Content != nil {
		content = *req.Content
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct the full S3 key for the file
	key := editorPathPrefix + path
	if req.Type == "folder" && !strings.HasSuffix(key, "/") {
		key += "/"
	}

	// Upload the content to S3
	writePathErr := bucket.WritePath(c, key, content)
	if writePathErr != nil {
		api.Logger.Error("Error uploading object", "error", writePathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Editor item %s saved", path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "editor_item_saved"),
	})
}

// EditorItemDestroy godoc
// @Summary Delete editor item
// @Description Delete an editor item or folder at the specified path
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path of the item to delete"
// @Success 200 {object} irminmodels.IrminAPIResponse "Editor item deleted successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid or missing path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor [delete]
func (api *APIControllers) EditorItemDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	path := strings.TrimPrefix(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct full S3 key prefix for deletion
	keyPrefix := editorPathPrefix + path

	// Delete all objects under the prefix
	deletePathErr := bucket.DeletePath(c, keyPrefix)
	if deletePathErr != nil {
		api.Logger.Error("Error deleting editor items", "error", deletePathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Editor item %s deleted", path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "editor_item_deleted"),
	})
}

// handleEditorItemTransfer handles the common logic for moving or copying editor items.
func (api *APIControllers) handleEditorItemTransfer(c fiber.Ctx, isMove bool) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	path := strings.TrimPrefix(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the JSON request body
	var req irmincore.MoveEditorItemRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Validate required fields
	if req.DestinationPath == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	destinationPath := strings.TrimPrefix(req.DestinationPath, "/")
	if destinationPath == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Build full S3 key prefixes for source and destination
	sourcePrefix := editorPathPrefix + path
	destinationPrefix := editorPathPrefix + destinationPath

	// Move or copy the source to the destination
	duplicatePathErr := bucket.DuplicatePath(c, sourcePrefix, destinationPrefix, isMove)
	if duplicatePathErr != nil {
		api.Logger.Error("Error transferring editor items", "error", duplicatePathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		Description: fmt.Sprintf("Editor item %s %s to %s", path, action, destinationPath),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	messageKey := "editor_item_moved"
	if !isMove {
		messageKey = "editor_item_copied"
	}
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, messageKey),
	})
}

// MoveEditorItem godoc
// @Summary Move editor item
// @Description Move an editor item from one path to another within the workspace
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Source path of the item to move"
// @Param request body irmincore.MoveEditorItemRequest true "Destination path"
// @Success 200 {object} irminmodels.IrminAPIResponse "Editor item moved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid paths"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/move [post]
func (api *APIControllers) MoveEditorItem(c fiber.Ctx) error {
	return api.handleEditorItemTransfer(c, true)
}

// CopyEditorItem godoc
// @Summary Copy editor item
// @Description Copy an editor item from one path to another within the workspace
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Source path of the item to copy"
// @Param request body irmincore.MoveEditorItemRequest true "Destination path"
// @Success 200 {object} irminmodels.IrminAPIResponse "Editor item copied successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid paths"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/copy [post]
func (api *APIControllers) CopyEditorItem(c fiber.Ctx) error {
	return api.handleEditorItemTransfer(c, false)
}

// EditorItemContent godoc
// @Summary Get editor item content
// @Description Get the content of a specific editor item
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path of the item to retrieve"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=string} "Editor item content retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid or missing path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/content [get]
func (api *APIControllers) EditorItemContent(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the file path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	path := strings.TrimPrefix(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Construct the full S3 key for the file
	key := editorPathPrefix + path

	// Retrieve the file from S3
	content, readPathErr := bucket.ReadPath(c, key)
	if readPathErr != nil {
		api.Logger.Error("Error reading object", "error", readPathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the item's content
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: content,
	})
}

// EditorItemExecute godoc
// @Summary Execute editor item
// @Description Execute an editor item (script) in the compute sandbox with optional input data
// @Tags editor
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param path query string true "Path of the item to execute"
// @Param request body irmincore.ExecuteEditorItemRequest false "Optional input data from repositories"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ScriptResult} "Editor item executed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid path or input data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/editor/execute [post]
func (api *APIControllers) EditorItemExecute(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !localeOk || !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the file path from query parameters
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"path"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error retrieving query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	path := strings.TrimPrefix(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the JSON request body for optional input data
	var req irmincore.ExecuteEditorItemRequest
	if err := c.Bind().JSON(&req); err != nil {
		// If JSON parsing fails, assume no input data (optional)
		req.Input = nil
	}

	// Initialize a map to store the input objects
	inputFiles := make(map[string][]byte)

	// Check if we have input data repositories and paths
	if len(req.Input) > 0 {
		// Initialize Data Engine client
		dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
		if createDataEngineClientErr != nil {
			api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}

		// Create a slice to store all async operations
		var futures []utils.FutureResult[[]byte]

		// Launch concurrent fetches for each input object
		for _, input := range req.Input {
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
				api.Logger.Error("Error getting object", "error", awaitErr)
				return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
					Errors: []string{api.lm.T(dict, "error_occurred")},
				})
			}
			// Add the object to the input objects map using the original path
			inputFiles[req.Input[i].RepositoryPath] = content
		}
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Editor item '%s' executed", path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the file in the compute sandbox
	computeSandbox := sandbox.NewComputeSandbox(api.Env, api.DB, api.Logger)
	computeResult, executeEditorItemErr := computeSandbox.ExecuteEditorItem(
		c,
		inputFiles,
		*user,
		path,
		workspace.Slug,
	)
	if executeEditorItemErr != nil {
		api.Logger.Error("Error executing editor item in the compute sandbox", "error", executeEditorItemErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		api.Logger.Error("Error parsing structured files", "error", parseStructuredFileErr)
	}

	// Return the results
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: &irminmodels.ScriptResult{
			StructuredResults: parsedResults,
			StartedAt:         computeResult.StartTime,
			FinishedAt:        computeResult.EndTime,
			Duration:          computeResult.EndTime.Sub(computeResult.StartTime),
			HasErrors:         hasErrors,
			Logs:              strings.Split(computeResult.Logs, "\n"),
		},
	})
}
