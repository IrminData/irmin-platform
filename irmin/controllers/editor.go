package controllers

import (
	"io"
	"log"
	"strings"
	"time"

	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	"github.com/aws/aws-sdk-go-v2/service/s3"
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")

	// Initialize the bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
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
	items, err := bucket.Conn().ListObjects(ctx, &s3.ListObjectsInput{
		Prefix: &pathPrefix,
		Bucket: &bucket.Bucket,
	})
	if err != nil {
		log.Printf("Error listing objects: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create a list of editor items
	var editorItems []EditorItem
	for _, item := range items.Contents {
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

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"type"}, []string{"content"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	content := fields["content"]

	// Create bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
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
	_, err = bucket.Conn().PutObject(c.Context(), &s3.PutObjectInput{
		Bucket: &bucket.Bucket,
		Key:    &key,
		Body:   strings.NewReader(content),
	})
	if err != nil {
		log.Printf("Error uploading object: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct full S3 key prefix for deletion
	keyPrefix := "editor/" + workspace.Slug + "/" + path

	// List all objects under the given prefix
	objects, err := bucket.Conn().ListObjects(c.Context(), &s3.ListObjectsInput{
		Bucket: &bucket.Bucket,
		Prefix: &keyPrefix,
	})
	if err != nil {
		log.Printf("Error listing objects for deletion: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Delete each object found
	for _, item := range objects.Contents {
		_, err := bucket.Conn().DeleteObject(c.Context(), &s3.DeleteObjectInput{
			Bucket: &bucket.Bucket,
			Key:    item.Key,
		})
		if err != nil {
			log.Printf("Error deleting object %s: %v", *item.Key, err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"destination_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	destination_path := strings.Trim(fields["destination_path"], "/")
	if destination_path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	ctx := c.Context()

	// Build full S3 key prefixes for source and destination
	sourcePrefix := "editor/" + workspace.Slug + "/" + path
	destinationPrefix := "editor/" + workspace.Slug + "/" + destination_path

	// List objects under the source prefix
	objects, err := bucket.Conn().ListObjects(ctx, &s3.ListObjectsInput{
		Bucket: &bucket.Bucket,
		Prefix: &sourcePrefix,
	})
	if err != nil {
		log.Printf("Error listing objects for move: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// For each object, copy to the destination and then delete the original
	for _, item := range objects.Contents {
		// Compute the relative path after the source prefix
		relPath := strings.TrimPrefix(*item.Key, sourcePrefix)
		destKey := destinationPrefix + relPath

		// Construct the copy source (bucket/key)
		copySource := bucket.Bucket + "/" + *item.Key
		_, err := bucket.Conn().CopyObject(ctx, &s3.CopyObjectInput{
			Bucket:     &bucket.Bucket,
			CopySource: &copySource,
			Key:        &destKey,
		})
		if err != nil {
			log.Printf("Error copying object %s to %s: %v", *item.Key, destKey, err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}

		// Delete the original object
		_, err = bucket.Conn().DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: &bucket.Bucket,
			Key:    item.Key,
		})
		if err != nil {
			log.Printf("Error deleting original object %s: %v", *item.Key, err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Parse the form data
	fields, err := utils.ParseFormFields(c, []string{"destination_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	destination_path := strings.Trim(fields["destination_path"], "/")
	if destination_path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"destination_path is required"},
		})
	}

	// Create bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	ctx := c.Context()

	// Build full S3 key prefixes for source and destination
	sourcePrefix := "editor/" + workspace.Slug + "/" + path
	destinationPrefix := "editor/" + workspace.Slug + "/" + destination_path

	// List objects under the source prefix
	objects, err := bucket.Conn().ListObjects(ctx, &s3.ListObjectsInput{
		Bucket: &bucket.Bucket,
		Prefix: &sourcePrefix,
	})
	if err != nil {
		log.Printf("Error listing objects for copy: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Copy each object from source to destination
	for _, item := range objects.Contents {
		relPath := strings.TrimPrefix(*item.Key, sourcePrefix)
		destKey := destinationPrefix + relPath

		copySource := bucket.Bucket + "/" + *item.Key
		_, err := bucket.Conn().CopyObject(ctx, &s3.CopyObjectInput{
			Bucket:     &bucket.Bucket,
			CopySource: &copySource,
			Key:        &destKey,
		})
		if err != nil {
			log.Printf("Error copying object %s to %s: %v", *item.Key, destKey, err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	path := strings.Trim(params["path"], "/")
	if path == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{"path is required"},
		})
	}

	// Create bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Construct the full S3 key for the file
	key := "editor/" + workspace.Slug + "/" + path

	// Retrieve the file from S3
	obj, err := bucket.Conn().GetObject(c.Context(), &s3.GetObjectInput{
		Bucket: &bucket.Bucket,
		Key:    &key,
	})
	if err != nil {
		log.Printf("Error retrieving object content: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer obj.Body.Close()

	// Read the object's content
	contentBytes, err := io.ReadAll(obj.Body)
	if err != nil {
		log.Printf("Error reading object content: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the item's content
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: string(contentBytes),
	})
}
