package controllers

import (
	"fmt"
	"log"
	"strings"

	"irmin-api/bucket"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func EditorIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Create a context for the request
	ctx := c.Context()

	// Get the path from the query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")

	// Initialize the bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	pathPrefix := "editor/" + workspace.Slug + "/"
	if path != "" {
		pathPrefix += path + "/"
	}

	// Get the editor items at the specified path
	items, err := bucket.ListObjects(ctx, pathPrefix)
	if err != nil {
		log.Printf("Error listing editor items: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Recursively constructs a nested tree of EditorItem objects.
	var editorItems []irminmodels.EditorItem
	for _, item := range items {
		// Skip items matching the base path if necessary. In this case, we assume
		// that items equal to the base path have been filtered out elsewhere.
		// Remove the "editor/<workspace.Slug>/" prefix from the key to get the relative path.
		relativePath := strings.TrimPrefix(*item.Key, "editor/"+workspace.Slug+"/")

		// Split the relative path into non-empty segments (folder names or file name)
		var segments []string
		for _, seg := range strings.Split(relativePath, "/") {
			if seg != "" {
				segments = append(segments, seg)
			}
		}
		if len(segments) == 0 {
			continue
		}

		// Determine the item's type: "file" or "folder"
		itemType := "file"
		if strings.HasSuffix(*item.Key, "/") {
			itemType = "folder"
		}

		// Determine the language for file items
		language := utils.ParseEditorItemLanguageFromPath(relativePath)

		// 'current' points to the slice where the next item should be inserted.
		current := &editorItems

		// Build the folder path gradually from the segments.
		// Start with an empty path.
		var accumulatedPath string

		// Iterate over segments. For segments except the last, create or reuse folder nodes.
		for i, segment := range segments {
			// Append the current segment to the accumulated path.
			if accumulatedPath == "" {
				accumulatedPath = segment
			} else {
				accumulatedPath = accumulatedPath + "/" + segment
			}

			// For folder nodes, always include a trailing slash.
			folderPath := accumulatedPath + "/"

			// If we're not at the last segment, this segment represents a folder.
			if i < len(segments)-1 {
				// Look for an existing folder with this name in the current slice.
				var folder *irminmodels.EditorItem
				for j := range *current {
					if (*current)[j].Name == segment && (*current)[j].Type == "folder" {
						folder = &(*current)[j]
						break
					}
				}
				// If the folder does not exist, create it.
				if folder == nil {
					newFolder := irminmodels.EditorItem{
						// Folder name is the current segment
						Name: segment,
						// Folder path is the accumulated folder path
						Path: folderPath,
						// Mark as folder
						Type: "folder",
						// Use the item's last modified (or update as needed)
						LastModified: *item.LastModified,
					}
					*current = append(*current, newFolder)
					folder = &(*current)[len(*current)-1]
				}
				// Continue traversing into the folder's children.
				current = &folder.Children
			} else {
				// Last segment: this is the actual item (file or folder) to be inserted.
				if itemType == "folder" {
					// For a folder item, check if it already exists.
					var folderExists bool
					for j := range *current {
						if (*current)[j].Name == segment && (*current)[j].Type == "folder" {
							folderExists = true
							break
						}
					}
					if !folderExists {
						newFolder := irminmodels.EditorItem{
							Name:         segment,
							Path:         folderPath, // Folder paths include a trailing slash
							Type:         "folder",
							LastModified: *item.LastModified,
						}
						*current = append(*current, newFolder)
					}
				} else {
					// For a file, create the file EditorItem using the full relative path.
					fileItem := irminmodels.EditorItem{
						Name:         segment,
						Path:         relativePath,
						Type:         "file",
						Language:     language,
						LastModified: *item.LastModified,
					}
					*current = append(*current, fileItem)
				}
			}
		}
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: editorItems,
	})
}

func EditorItemStore(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"type"}, []string{"content"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	content := fields["content"]

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct the full S3 key for the file
	key := "editor/" + workspace.Slug + "/" + path
	if fields["type"] == "folder" {
		key += "/"
	}

	// Upload the content to S3
	err = bucket.WritePath(c.Context(), key, content)
	if err != nil {
		log.Printf("Error uploading object: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Editor item %s saved", path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("editor_item_saved"),
	})
}

func EditorItemDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct full S3 key prefix for deletion
	keyPrefix := "editor/" + workspace.Slug + "/" + path

	// Delete all objects under the prefix
	err = bucket.DeletePath(c.Context(), keyPrefix)
	if err != nil {
		log.Printf("Error deleting editor items: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Editor item %s deleted", path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("editor_item_deleted"),
	})
}

func MoveEditorItem(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"destination_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	destination_path := strings.Trim(fields["destination_path"], "/")
	if destination_path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	ctx := c.Context()

	// Build full S3 key prefixes for source and destination
	sourcePrefix := "editor/" + workspace.Slug + "/" + path
	destinationPrefix := "editor/" + workspace.Slug + "/" + destination_path

	// Move the source to the destination
	err = bucket.DuplicatePath(ctx, sourcePrefix, destinationPrefix, true)
	if err != nil {
		log.Printf("Error moving editor items: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Editor item %s moved to %s", path, destination_path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("editor_item_moved"),
	})
}

func CopyEditorItem(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"destination_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	destination_path := strings.Trim(fields["destination_path"], "/")
	if destination_path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	ctx := c.Context()

	// Build full S3 key prefixes for source and destination
	sourcePrefix := "editor/" + workspace.Slug + "/" + path
	destinationPrefix := "editor/" + workspace.Slug + "/" + destination_path

	// Copy the source to the destination
	err = bucket.DuplicatePath(ctx, sourcePrefix, destinationPrefix, false)
	if err != nil {
		log.Printf("Error copying editor items: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Editor item %s copied to %s", path, destination_path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("editor_item_copied"),
	})
}

func EditorItemContent(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the file path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct the full S3 key for the file
	key := "editor/" + workspace.Slug + "/" + path

	// Retrieve the file from S3
	content, err := bucket.ReadPath(c.Context(), key)
	if err != nil {
		log.Printf("Error reading object: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the item's content
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: content,
	})
}

func EditorItemExecute(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the file path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Get the optional input data repositories and paths from form fields
	inputObjects, err := utils.ParseArrayFormFields(c, "input")
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize a map to store the input objects
	inputFiles := make(map[string][]byte)

	// Check if we have input data repositories and paths
	if len(inputObjects) > 0 {
		// Initialize Data Engine client
		dataEngine := engine.NewClient(locale)

		// Create a slice to store all async operations
		var futures []utils.FutureResult[[]byte]

		// Launch concurrent fetches for each input object
		for _, input := range inputObjects {
			repository := input["repository"]
			path := input["path"]
			ref := input["ref"]

			// Create an async operation for fetching the object
			future := utils.Async(func() ([]byte, error) {
				return dataEngine.GetObjectContent(workspace.Slug, repository, path, ref)
			})
			futures = append(futures, future)
		}

		// Wait for all results and handle errors
		for i, future := range futures {
			content, err := future.Await()
			if err != nil {
				log.Printf("Error getting object: %v", err)
				return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
					Errors: []string{dict.T("error_occurred")},
				})
			}
			// Add the object to the input objects map using the original path
			inputFiles[inputObjects[i]["path"]] = content
		}
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Editor item '%s' executed", path),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the file in the compute sandbox
	ctx := c.Context()
	computeResult, err := sandbox.ExecuteEditorItem(ctx, inputFiles, *user, path, workspace.Slug)
	if err != nil {
		log.Printf("Error executing editor item in the compute sandbox: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	// Check if the logs contain errors
	hasErrors := strings.Contains(strings.ToLower(computeResult.Logs), "error")

	// Parse the structured result files if any
	parsedResults, err := lib.ParseStructuredFile(computeResult.ResultFiles)
	if err != nil {
		log.Printf("Error parsing structured files: %v", err)
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
