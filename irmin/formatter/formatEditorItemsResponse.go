package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// FormatEditorItemsResponse formats a list of S3 objects into a nested tree of EditorItem objects.
func FormatEditorItemsResponse(
	items []types.Object,
	workspace *db.Workspace,
) ([]irminmodels.EditorItem, error) {
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
		itemType := irminmodels.EditorItemTypeFile
		if strings.HasSuffix(*item.Key, "/") {
			itemType = irminmodels.EditorItemTypeFolder
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
				folder := findOrCreateFolder(current, segment, folderPath, *item.LastModified)
				current = &folder.Children
			} else {
				// Last segment: this is the actual item (file or folder) to be inserted.
				addItemToTree(current, segment, relativePath, accumulatedPath, itemType, language, *item.LastModified)
			}
		}
	}
	return editorItems, nil
}

// createFolderItem creates a new folder EditorItem.
func createFolderItem(name, path string, lastModified time.Time) irminmodels.EditorItem {
	return irminmodels.EditorItem{
		Name:         name,
		Path:         path,
		Type:         irminmodels.EditorItemTypeFolder,
		LastModified: lastModified,
	}
}

// createFileItem creates a new file EditorItem.
func createFileItem(name, path string, language *string, lastModified time.Time) irminmodels.EditorItem {
	return irminmodels.EditorItem{
		Name:         name,
		Path:         path,
		Type:         irminmodels.EditorItemTypeFile,
		Language:     language,
		LastModified: lastModified,
	}
}

// findOrCreateFolder finds an existing folder in the current slice or creates a new one.
func findOrCreateFolder(
	current *[]irminmodels.EditorItem,
	segment, folderPath string,
	lastModified time.Time,
) *irminmodels.EditorItem {
	for j := range *current {
		if (*current)[j].Name == segment && (*current)[j].Type == irminmodels.EditorItemTypeFolder {
			return &(*current)[j]
		}
	}

	newFolder := createFolderItem(segment, folderPath, lastModified)
	*current = append(*current, newFolder)
	return &(*current)[len(*current)-1]
}

// addItemToTree adds a file or folder item to the tree structure.
func addItemToTree(
	current *[]irminmodels.EditorItem,
	segment, relativePath, accumulatedPath string,
	itemType irminmodels.EditorItemType,
	language *string,
	lastModified time.Time,
) {
	if itemType == irminmodels.EditorItemTypeFolder {
		folderPath := accumulatedPath + "/"
		var folderExists bool
		for j := range *current {
			if (*current)[j].Name == segment && (*current)[j].Type == irminmodels.EditorItemTypeFolder {
				folderExists = true
				break
			}
		}
		if !folderExists {
			*current = append(*current, createFolderItem(segment, folderPath, lastModified))
		}
	} else {
		*current = append(*current, createFileItem(segment, relativePath, language, lastModified))
	}
}
