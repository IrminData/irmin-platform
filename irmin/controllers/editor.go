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

func (api *APIControllers) EditorIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create a context for the request
	ctx := c.Context()

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
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	pathPrefix := "editor/" + workspace.Slug + "/"
	if path != "" {
		pathPrefix += path + "/"
	}

	// Get the editor items at the specified path
	items, listObjectsErr := bucket.ListObjects(ctx, pathPrefix)
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: editorItems,
	})
}

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
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Validate required fields
	if req.Type == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	content := ""
	if req.Content != nil {
		content = *req.Content
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct the full S3 key for the file
	key := "editor/" + workspace.Slug + "/" + path
	if req.Type == "folder" {
		key += "/"
	}

	// Upload the content to S3
	writePathErr := bucket.WritePath(c.Context(), key, content)
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "editor_item_saved"),
	})
}

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
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct full S3 key prefix for deletion
	keyPrefix := "editor/" + workspace.Slug + "/" + path

	// Delete all objects under the prefix
	deletePathErr := bucket.DeletePath(c.Context(), keyPrefix)
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
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
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	ctx := c.Context()

	// Build full S3 key prefixes for source and destination
	sourcePrefix := "editor/" + workspace.Slug + "/" + path
	destinationPrefix := "editor/" + workspace.Slug + "/" + destinationPath

	// Move or copy the source to the destination
	duplicatePathErr := bucket.DuplicatePath(ctx, sourcePrefix, destinationPrefix, isMove)
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, messageKey),
	})
}

func (api *APIControllers) MoveEditorItem(c fiber.Ctx) error {
	return api.handleEditorItemTransfer(c, true)
}

func (api *APIControllers) CopyEditorItem(c fiber.Ctx) error {
	return api.handleEditorItemTransfer(c, false)
}

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
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct the full S3 key for the file
	key := "editor/" + workspace.Slug + "/" + path

	// Retrieve the file from S3
	content, readPathErr := bucket.ReadPath(c.Context(), key)
	if readPathErr != nil {
		api.Logger.Error("Error reading object", "error", readPathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the item's content
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: content,
	})
}

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
		dataEngine, createDataEngineClientErr := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
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
		c.Context(),
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
		c.Context(),
		computeResult.ResultFiles,
		api.Env,
		api.Logger,
	)
	if parseStructuredFileErr != nil {
		api.Logger.Error("Error parsing structured files", "error", parseStructuredFileErr)
	}

	// Return the results
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
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
