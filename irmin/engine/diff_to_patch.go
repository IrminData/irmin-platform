package engine

import (
	"encoding/base64"
	"encoding/json"
	"irmin-api/lakefs"
	"mime"
	"path/filepath"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// DiffToPatchOptions contains options for converting diffs to patches.
type DiffToPatchOptions struct {
	// WorkspaceSlug is the workspace containing the repository.
	WorkspaceSlug string
	// RepositorySlug is the repository where the diff occurred.
	RepositorySlug string
	// Ref is the reference (branch/commit) to get file content from.
	Ref string
	// IncludeBinaryAsBase64 determines whether binary files should be
	// included as base64-encoded values. If false, binary files are skipped.
	IncludeBinaryAsBase64 bool
}

// DiffToPatchResult contains the result of converting diffs to patches.
type DiffToPatchResult struct {
	Patches      []irminmodels.PatchOperation `json:"patches"`
	SkippedFiles []string                     `json:"skipped_files,omitempty"`
	Errors       []string                     `json:"errors,omitempty"`
}

// ConvertDiffToPatches converts LakeFS diff entries to JSON patch operations.
// For added and changed files, it fetches the file content and includes it in the patch value.
// For removed files, it creates a remove operation.
func (c *Client) ConvertDiffToPatches(
	diffs []lakefs.Diff,
	opts DiffToPatchOptions,
) (*DiffToPatchResult, error) {
	result := &DiffToPatchResult{
		Patches:      make([]irminmodels.PatchOperation, 0, len(diffs)),
		SkippedFiles: make([]string, 0),
		Errors:       make([]string, 0),
	}

	for _, diff := range diffs {
		patch, skip, err := c.convertSingleDiff(diff, opts)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		if skip {
			result.SkippedFiles = append(result.SkippedFiles, diff.Path)
			continue
		}
		if patch != nil {
			result.Patches = append(result.Patches, *patch)
		}
	}

	return result, nil
}

// convertSingleDiff converts a single diff entry to a patch operation.
// Returns (patch, shouldSkip, error).
func (c *Client) convertSingleDiff(
	diff lakefs.Diff,
	opts DiffToPatchOptions,
) (*irminmodels.PatchOperation, bool, error) {
	// Build the JSON pointer path (just use the file path with leading slash)
	path := "/" + diff.Path

	switch diff.Type {
	case lakefs.DiffTypeAdded:
		return c.createAddPatch(path, diff, opts)

	case lakefs.DiffTypeChanged:
		return c.createReplacePatch(path, diff, opts)

	case lakefs.DiffTypeRemoved:
		return &irminmodels.PatchOperation{
			Op:   "remove",
			Path: path,
		}, false, nil

	case lakefs.DiffTypeConflict, lakefs.DiffTypePrefixChanged:
		// Skip conflicts and prefix changes - they need manual resolution
		return nil, true, nil

	default:
		return nil, true, nil
	}
}

// fileContentResult holds the result of fetching file content for a patch.
type fileContentResult struct {
	Value       *any
	ContentType *string
}

// createAddPatch creates an "add" patch operation for a newly added file.
func (c *Client) createAddPatch(
	path string,
	diff lakefs.Diff,
	opts DiffToPatchOptions,
) (*irminmodels.PatchOperation, bool, error) {
	result, skip, err := c.getFileContentAsValue(diff.Path, opts)
	if err != nil || skip {
		return nil, skip, err
	}

	return &irminmodels.PatchOperation{
		Op:          "add",
		Path:        path,
		Value:       result.Value,
		ContentType: result.ContentType,
	}, false, nil
}

// createReplacePatch creates a "replace" patch operation for a changed file.
func (c *Client) createReplacePatch(
	path string,
	diff lakefs.Diff,
	opts DiffToPatchOptions,
) (*irminmodels.PatchOperation, bool, error) {
	result, skip, err := c.getFileContentAsValue(diff.Path, opts)
	if err != nil || skip {
		return nil, skip, err
	}

	return &irminmodels.PatchOperation{
		Op:          "replace",
		Path:        path,
		Value:       result.Value,
		ContentType: result.ContentType,
	}, false, nil
}

// getFileContentAsValue fetches file content and returns it as a patch value.
// For JSON files, it parses the content. For text files, it returns as string.
// For binary files, it either base64 encodes or skips based on options.
func (c *Client) getFileContentAsValue(
	filePath string,
	opts DiffToPatchOptions,
) (*fileContentResult, bool, error) {
	// Fetch file content from the repository
	content, err := c.GetObjectContent(
		opts.WorkspaceSlug,
		opts.RepositorySlug,
		filePath,
		opts.Ref,
	)
	if err != nil {
		return nil, false, err
	}

	// Determine content type based on file extension
	ext := strings.ToLower(filepath.Ext(filePath))
	mimeType := mime.TypeByExtension(ext)

	// Handle JSON files - parse and include as structured data
	if isJSONFile(ext, mimeType) {
		var jsonValue any
		if jsonErr := json.Unmarshal(content, &jsonValue); jsonErr != nil {
			// If JSON parsing fails, treat as text (intentional fallback)
			strValue := string(content)
			var textResult any = strValue
			//nolint:nilerr // Intentional: JSON parse failure is not an error, we fall back to text
			return &fileContentResult{Value: &textResult}, false, nil
		}
		return &fileContentResult{Value: &jsonValue}, false, nil
	}

	// Handle text files
	if isTextFile(ext, mimeType, content) {
		strValue := string(content)
		var result any = strValue
		return &fileContentResult{Value: &result}, false, nil
	}

	// Handle binary files
	if !opts.IncludeBinaryAsBase64 {
		return nil, true, nil // Skip binary files
	}

	// Base64 encode binary content and set ContentType
	encoded := base64.StdEncoding.EncodeToString(content)
	var result any = encoded
	return &fileContentResult{
		Value:       &result,
		ContentType: &mimeType,
	}, false, nil
}

// isJSONFile checks if a file is a JSON file based on extension or MIME type.
func isJSONFile(ext, mimeType string) bool {
	if ext == ".json" || ext == ".jsonl" || ext == ".geojson" {
		return true
	}
	return strings.Contains(mimeType, "json")
}

// isTextFile checks if a file is a text file.
func isTextFile(ext, mimeType string, content []byte) bool {
	// Check MIME type first
	if strings.HasPrefix(mimeType, "text/") {
		return true
	}

	// Check common text extensions
	textExts := map[string]bool{
		".txt": true, ".md": true, ".csv": true, ".tsv": true,
		".xml": true, ".html": true, ".htm": true,
		".yaml": true, ".yml": true, ".toml": true,
		".sql": true, ".py": true, ".js": true, ".ts": true,
		".go": true, ".rs": true, ".java": true, ".c": true, ".cpp": true,
		".h": true, ".hpp": true, ".css": true, ".scss": true,
		".sh": true, ".bash": true, ".zsh": true,
		".conf": true, ".cfg": true, ".ini": true,
		".log": true, ".env": true,
	}
	if textExts[ext] {
		return true
	}

	// Check if content looks like text (no null bytes in first 8KB)
	const binaryCheckSize = 8192
	checkLen := min(len(content), binaryCheckSize)
	for i := range checkLen {
		if content[i] == 0 {
			return false
		}
	}
	return true
}

// GeneratePatchPayload creates a complete payload structure for trigger events
// that includes the patches along with metadata.
func GeneratePatchPayload(
	result *DiffToPatchResult,
	repositorySlug string,
	ref string,
	commitID string,
) map[string]any {
	return map[string]any{
		"patches":       result.Patches,
		"repository":    repositorySlug,
		"ref":           ref,
		"commit_id":     commitID,
		"skipped_files": result.SkippedFiles,
		"patch_count":   len(result.Patches),
	}
}
