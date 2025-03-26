package controllers

import (
	"log"
	"strings"
	"time"

	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

type EditorItem struct {
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	Type         string    `json:"type"` // file or folder
	Content      *string   `json:"content,omitempty"`
	LastModified time.Time `json:"last_modified"`
}

func EditorIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Create a context for the request
	ctx := c.Context()

	// Get the path from the query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")

	// Initialize the bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create a list of editor items
	var editorItems []EditorItem
	for _, item := range items {
		// Skip the base path
		if *item.Key == pathPrefix {
			continue
		}

		// Get the item's name
		name := strings.TrimPrefix(*item.Key, pathPrefix)
		if strings.Contains(name, "/") {
			name = strings.Split(name, "/")[0]
		}

		// Get the item's path
		itemPath := strings.TrimPrefix(*item.Key, "editor/"+workspace.Slug+"/")

		// Determine the item's type
		itemType := "file"
		if strings.HasSuffix(*item.Key, "/") {
			itemType = "folder"
		}

		editorItems = append(editorItems, EditorItem{
			Name:         name,
			Path:         itemPath,
			Type:         itemType,
			LastModified: *item.LastModified,
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: editorItems,
	})
}

func EditorItemStore(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"type"}, []string{"content"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	content := fields["content"]

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("editor_item_saved"),
	})
}

func EditorItemDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("editor_item_deleted"),
	})
}

func MoveEditorItem(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"destination_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	destination_path := strings.Trim(fields["destination_path"], "/")
	if destination_path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("editor_item_moved"),
	})
}

func CopyEditorItem(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get the path from query parameters
	params, err := utils.ParseQueryParams(c, nil, []string{"path"})
	if err != nil {
		log.Printf("Error retrieving query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"destination_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	destination_path := strings.Trim(fields["destination_path"], "/")
	if destination_path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the item's content
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: content,
	})
}
