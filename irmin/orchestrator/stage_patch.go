package orchestrator

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"strings"

	connectorsclient "irmin-api/connectors-client"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// findPatchFileInTriggerEvent checks if trigger_event.json contains patches.
// Returns "trigger_event.json" if patches are found, empty string otherwise.
func findPatchFileInTriggerEvent(previousStageResults map[string][]byte) string {
	data, ok := previousStageResults["trigger_event.json"]
	if !ok {
		return ""
	}
	var triggerEvent map[string]json.RawMessage
	if err := json.Unmarshal(data, &triggerEvent); err != nil {
		return ""
	}
	if _, hasPatch := triggerEvent["patches"]; hasPatch {
		return "trigger_event.json"
	}
	return ""
}

// handlePatchStage executes a patch stage in the pipeline.
// It reads patch operations from previous stage results and applies them
// to either a connection (external system) or a repository (LakeFS).
func (o *Orchestrator) handlePatchStage(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	previousStageResults map[string][]byte,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before patch stage: %w", ctx.Err())
	}

	// Validate direction is set
	if stage.PatchDirection == nil {
		logs = append(logs, "Patch direction is not set")
		return logs, errors.New("patch direction is not set")
	}

	// Determine which file contains the patches
	patchFileName := "patches.json"
	if stage.PatchSourceFileName != nil && *stage.PatchSourceFileName != "" {
		patchFileName = *stage.PatchSourceFileName
	}

	// Check for trigger_event.json first (common for connection events)
	if patchFileName == "patches.json" {
		if foundFile := findPatchFileInTriggerEvent(previousStageResults); foundFile != "" {
			patchFileName = foundFile
			logs = append(logs, "Using patches from trigger_event.json")
		}
	}

	// Read patches from previous stage results
	patchData, ok := previousStageResults[patchFileName]
	if !ok {
		logs = append(logs, fmt.Sprintf("Patch file '%s' not found in previous stage results", patchFileName))
		return logs, fmt.Errorf("patch file '%s' not found in previous stage results", patchFileName)
	}

	// Parse patches - handle both direct array and wrapped object
	var patches []irminmodels.PatchOperation
	if err := json.Unmarshal(patchData, &patches); err != nil {
		// Try parsing as object with patches field (for trigger_event.json)
		var wrapper struct {
			Patches []irminmodels.PatchOperation `json:"patches"`
		}
		if wrapperErr := json.Unmarshal(patchData, &wrapper); wrapperErr != nil {
			logs = append(logs, fmt.Sprintf("Failed to parse patches from '%s': %v", patchFileName, err))
			return logs, fmt.Errorf("failed to parse patches: %w", err)
		}
		patches = wrapper.Patches
	}

	if len(patches) == 0 {
		logs = append(logs, "No patches to apply")
		return logs, nil
	}

	logs = append(logs, fmt.Sprintf("Processing %d patch operations (direction: %s)",
		len(patches), *stage.PatchDirection))

	// Route to appropriate handler based on direction
	switch *stage.PatchDirection {
	case db.PatchDirectionToConnection:
		return o.applyPatchesToConnection(ctx, workflow, stage, patches, logs)
	case db.PatchDirectionToRepository:
		return o.applyPatchesToRepository(ctx, workflow, stage, patches, logs)
	default:
		return logs, fmt.Errorf("unknown patch direction: %s", *stage.PatchDirection)
	}
}

// applyPatchesToConnection sends patches to an external connector.
func (o *Orchestrator) applyPatchesToConnection(
	ctx context.Context,
	_ *db.Workflow,
	stage *db.PipelineStage,
	patches []irminmodels.PatchOperation,
	logs []string,
) ([]string, error) {
	// Validate connection is configured
	if stage.PatchConnectionID == nil {
		logs = append(logs, "Patch connection ID is not set")
		return logs, errors.New("patch connection ID is not set")
	}

	// Get the connection
	connection, err := o.db.GetConnectionByID(*stage.PatchConnectionID)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Failed to get connection: %v", err))
		return logs, fmt.Errorf("failed to get connection: %w", err)
	}

	logs = append(logs, fmt.Sprintf("Applying patches to connection '%s'", connection.Name))

	// Initialize connector operation
	opClient, err := o.dataEngine.InitializeConnectorOperation(ctx, connection)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Failed to initialize connector: %v", err))
		return logs, fmt.Errorf("failed to initialize connector: %w", err)
	}

	// Serialize patches to JSON
	patchJSON, err := json.Marshal(patches)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Failed to marshal patches: %v", err))
		return logs, fmt.Errorf("failed to marshal patches: %w", err)
	}

	// Send patches to connector
	_, patchErr := opClient.OperationPatch(ctx, connectorsclient.FormFile{
		Reader:    bytes.NewReader(patchJSON),
		FieldName: "patches",
		FileName:  "patches.json",
	})
	if patchErr != nil {
		logs = append(logs, fmt.Sprintf("Patch operation failed: %v", patchErr))
		return logs, fmt.Errorf("patch operation failed: %w", patchErr)
	}

	logs = append(logs, fmt.Sprintf("Successfully applied %d patches to connection '%s'",
		len(patches), connection.Name))
	return logs, nil
}

// applyPatchesToRepository applies patches to files in a LakeFS repository.
func (o *Orchestrator) applyPatchesToRepository(
	ctx context.Context,
	workflow *db.Workflow,
	stage *db.PipelineStage,
	patches []irminmodels.PatchOperation,
	logs []string,
) ([]string, error) {
	// Validate repository is configured and loaded
	if stage.PatchRepository == nil {
		logs = append(logs, "Patch repository is not configured")
		return logs, errors.New("patch repository is not configured")
	}

	repo := stage.PatchRepository

	// Determine branch
	branch := repo.DefaultBranch
	if stage.PatchRepositoryBranch != nil && *stage.PatchRepositoryBranch != "" {
		branch = *stage.PatchRepositoryBranch
	}

	logs = append(logs, fmt.Sprintf("Applying patches to repository '%s@%s'", repo.Slug, branch))

	// Group patches by file path
	patchesByFile := groupPatchesByFile(patches)

	// Apply patches to each file
	patchedFiles := 0
	for filePath, filePatches := range patchesByFile {
		// Check context cancellation
		if ctx.Err() != nil {
			logs = append(logs, fmt.Sprintf("Cancelled during patch application: %v", ctx.Err()))
			return logs, ctx.Err()
		}

		patchLogs, patchErr := o.applyPatchesToFile(ctx, workflow, repo, branch, filePath, filePatches)
		logs = append(logs, patchLogs...)
		if patchErr != nil {
			logs = append(logs, fmt.Sprintf("Failed to apply patches to %s: %v", filePath, patchErr))
			return logs, patchErr
		}
		patchedFiles++
	}

	logs = append(logs, fmt.Sprintf("Successfully applied patches to %d file(s) in repository '%s@%s'",
		patchedFiles, repo.Slug, branch))
	return logs, nil
}

// groupPatchesByFile groups patches by their target file path.
// The file path is extracted from the patch path (first segment after leading slash).
func groupPatchesByFile(patches []irminmodels.PatchOperation) map[string][]irminmodels.PatchOperation {
	result := make(map[string][]irminmodels.PatchOperation)
	for _, patch := range patches {
		// Extract file path from patch path
		// Path format: /file.json/field/subfield or /dir/file.json/field
		filePath := extractFilePath(patch.Path)
		result[filePath] = append(result[filePath], patch)
	}
	return result
}

// extractFilePath extracts the file path from a JSON pointer path.
// It assumes the first segment(s) that end in a file extension are the file path.
func extractFilePath(patchPath string) string {
	// Remove leading slash
	path := strings.TrimPrefix(patchPath, "/")
	segments := strings.Split(path, "/")

	// Look for file extension or use first segment
	filePath := segments[0]
	for i, segment := range segments {
		// Check if this segment looks like a file (has extension)
		if strings.Contains(segment, ".") {
			filePath = strings.Join(segments[:i+1], "/")
			break
		}
	}

	return filePath
}

// applyPatchesToFile applies a set of patches to a single file in the repository.
func (o *Orchestrator) applyPatchesToFile(
	_ context.Context,
	workflow *db.Workflow,
	repo *db.Repository,
	branch string,
	filePath string,
	patches []irminmodels.PatchOperation,
) ([]string, error) {
	var logs []string

	// Read current file content
	content, err := o.dataEngine.GetObjectContent(
		workflow.Workspace.Slug,
		repo.Slug,
		filePath,
		branch,
	)
	if err != nil {
		// For "add" operations, missing file is OK - we'll create it
		hasAddOnly := true
		for _, p := range patches {
			if p.Op != "add" {
				hasAddOnly = false
				break
			}
		}
		if !hasAddOnly {
			return logs, fmt.Errorf("failed to read file %s: %w", filePath, err)
		}
		// Initialize empty content for add operations
		content = []byte("{}")
		logs = append(logs, fmt.Sprintf("File %s does not exist, will be created", filePath))
	}

	// Parse content as JSON
	var data any
	if jsonErr := json.Unmarshal(content, &data); jsonErr != nil {
		return logs, fmt.Errorf("failed to parse file %s as JSON: %w", filePath, jsonErr)
	}

	// Apply each patch
	for _, patch := range patches {
		data, err = applyJSONPatch(data, patch, filePath)
		if err != nil {
			logs = append(logs, fmt.Sprintf("Failed to apply %s to %s: %v", patch.Op, patch.Path, err))
			return logs, err
		}
		logs = append(logs, fmt.Sprintf("Applied %s operation to %s", patch.Op, patch.Path))
	}

	// Serialize modified content
	newContent, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return logs, fmt.Errorf("failed to serialize modified content: %w", err)
	}

	// Upload modified file
	_, uploadErr := o.dataEngine.UploadObject(
		workflow.Workspace.Slug,
		repo.Slug,
		filePath,
		branch,
		bytes.NewReader(newContent),
	)
	if uploadErr != nil {
		return logs, fmt.Errorf("failed to upload patched file %s: %w", filePath, uploadErr)
	}

	return logs, nil
}

// applyJSONPatch applies a single JSON patch operation to a data structure.
func applyJSONPatch(data any, patch irminmodels.PatchOperation, filePath string) (any, error) {
	// Get the JSON pointer path relative to the file
	// Remove the file path prefix from the patch path
	jsonPointer := patch.Path
	if strings.HasPrefix(jsonPointer, "/"+filePath) {
		jsonPointer = strings.TrimPrefix(jsonPointer, "/"+filePath)
	}
	if jsonPointer == "" {
		jsonPointer = "/"
	}

	switch patch.Op {
	case "add":
		return applyAddPatch(data, jsonPointer, patch.Value)
	case "remove":
		return applyRemovePatch(data, jsonPointer)
	case "replace":
		return applyReplacePatch(data, jsonPointer, patch.Value)
	case "copy":
		if patch.From == nil {
			return nil, errors.New("'from' field required for copy operation")
		}
		return applyCopyPatch(data, *patch.From, jsonPointer)
	case "move":
		if patch.From == nil {
			return nil, errors.New("'from' field required for move operation")
		}
		return applyMovePatch(data, *patch.From, jsonPointer)
	default:
		return nil, fmt.Errorf("unknown patch operation: %s", patch.Op)
	}
}

// applyAddPatch adds a value at the specified JSON pointer path.
func applyAddPatch(data any, pointer string, value *any) (any, error) {
	if value == nil {
		return nil, errors.New("value required for add operation")
	}

	// Handle root replacement
	if pointer == "/" || pointer == "" {
		return *value, nil
	}

	return setValueAtPointer(data, pointer, *value)
}

// applyRemovePatch removes the value at the specified JSON pointer path.
func applyRemovePatch(data any, pointer string) (any, error) {
	return removeValueAtPointer(data, pointer)
}

// applyReplacePatch replaces the value at the specified JSON pointer path.
func applyReplacePatch(data any, pointer string, value *any) (any, error) {
	if value == nil {
		return nil, errors.New("value required for replace operation")
	}

	// Handle root replacement
	if pointer == "/" || pointer == "" {
		return *value, nil
	}

	return setValueAtPointer(data, pointer, *value)
}

// applyCopyPatch copies a value from one path to another.
func applyCopyPatch(data any, from, to string) (any, error) {
	value, err := getValueAtPointer(data, from)
	if err != nil {
		return nil, fmt.Errorf("failed to get value at '%s': %w", from, err)
	}
	return setValueAtPointer(data, to, value)
}

// applyMovePatch moves a value from one path to another.
func applyMovePatch(data any, from, to string) (any, error) {
	value, err := getValueAtPointer(data, from)
	if err != nil {
		return nil, fmt.Errorf("failed to get value at '%s': %w", from, err)
	}
	data, err = removeValueAtPointer(data, from)
	if err != nil {
		return nil, err
	}
	return setValueAtPointer(data, to, value)
}

// getValueAtPointer retrieves a value at a JSON pointer path.
func getValueAtPointer(data any, pointer string) (any, error) {
	pointer = strings.TrimPrefix(pointer, "/")
	if pointer == "" {
		return data, nil
	}

	segments := strings.Split(pointer, "/")
	current := data

	for _, segment := range segments {
		switch v := current.(type) {
		case map[string]any:
			var ok bool
			current, ok = v[segment]
			if !ok {
				return nil, fmt.Errorf("key '%s' not found", segment)
			}
		case []any:
			idx := parseArrayIndex(segment, len(v))
			if idx < 0 || idx >= len(v) {
				return nil, fmt.Errorf("array index %s out of bounds", segment)
			}
			current = v[idx]
		default:
			return nil, fmt.Errorf("cannot navigate into %T with segment '%s'", current, segment)
		}
	}

	return current, nil
}

// setValueAtPointer sets a value at a JSON pointer path.
func setValueAtPointer(data any, pointer string, value any) (any, error) {
	pointer = strings.TrimPrefix(pointer, "/")
	if pointer == "" {
		return value, nil
	}

	segments := strings.Split(pointer, "/")
	return setValueRecursive(data, segments, value)
}

// setValueRecursive recursively navigates and sets a value.
//
//nolint:gocognit // Recursive JSON pointer navigation is inherently complex
func setValueRecursive(data any, segments []string, value any) (any, error) {
	if len(segments) == 0 {
		return value, nil
	}

	segment := segments[0]
	remaining := segments[1:]

	switch v := data.(type) {
	case map[string]any:
		if len(remaining) == 0 {
			v[segment] = value
			return v, nil
		}
		child, ok := v[segment]
		if !ok {
			// Create intermediate object
			child = make(map[string]any)
		}
		newChild, err := setValueRecursive(child, remaining, value)
		if err != nil {
			return nil, err
		}
		v[segment] = newChild
		return v, nil

	case []any:
		idx := parseArrayIndex(segment, len(v))
		if idx < 0 {
			return nil, fmt.Errorf("invalid array index: %s", segment)
		}
		// Handle "-" for appending
		if segment == "-" {
			if len(remaining) == 0 {
				return append(v, value), nil
			}
			return nil, errors.New("cannot navigate past array append marker '-'")
		}
		if idx >= len(v) {
			return nil, fmt.Errorf("array index %d out of bounds (len=%d)", idx, len(v))
		}
		if len(remaining) == 0 {
			v[idx] = value
			return v, nil
		}
		newChild, err := setValueRecursive(v[idx], remaining, value)
		if err != nil {
			return nil, err
		}
		v[idx] = newChild
		return v, nil

	case nil:
		// Create a new map
		newMap := make(map[string]any)
		return setValueRecursive(newMap, segments, value)

	default:
		return nil, fmt.Errorf("cannot set value in %T", data)
	}
}

// removeValueAtPointer removes a value at a JSON pointer path.
func removeValueAtPointer(data any, pointer string) (any, error) {
	pointer = strings.TrimPrefix(pointer, "/")
	if pointer == "" {
		return nil, errors.New("cannot remove root")
	}

	segments := strings.Split(pointer, "/")
	return removeValueRecursive(data, segments)
}

// removeValueRecursive recursively navigates and removes a value.
func removeValueRecursive(data any, segments []string) (any, error) {
	if len(segments) == 0 {
		return nil, errors.New("no segments to remove")
	}

	segment := segments[0]
	remaining := segments[1:]

	switch v := data.(type) {
	case map[string]any:
		if len(remaining) == 0 {
			delete(v, segment)
			return v, nil
		}
		child, ok := v[segment]
		if !ok {
			return nil, fmt.Errorf("key '%s' not found", segment)
		}
		newChild, err := removeValueRecursive(child, remaining)
		if err != nil {
			return nil, err
		}
		v[segment] = newChild
		return v, nil

	case []any:
		idx := parseArrayIndex(segment, len(v))
		if idx < 0 || idx >= len(v) {
			return nil, fmt.Errorf("array index %s out of bounds", segment)
		}
		if len(remaining) == 0 {
			// Remove element from array
			return append(v[:idx], v[idx+1:]...), nil
		}
		newChild, err := removeValueRecursive(v[idx], remaining)
		if err != nil {
			return nil, err
		}
		v[idx] = newChild
		return v, nil

	default:
		return nil, fmt.Errorf("cannot navigate into %T", data)
	}
}

// parseArrayIndex parses an array index from a JSON pointer segment.
func parseArrayIndex(segment string, arrayLen int) int {
	if segment == "-" {
		return arrayLen // Append position
	}
	var idx int
	if _, err := fmt.Sscanf(segment, "%d", &idx); err != nil {
		return -1
	}
	return idx
}
