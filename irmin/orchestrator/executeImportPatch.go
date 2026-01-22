package orchestrator

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// performPatchImport applies patches from the trigger payload to the repository.
// This is used when an import workflow is triggered by a connection event
// and sync_mode is "auto" or "patch".
func (o *Orchestrator) performPatchImport(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.ImportWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before patch import: %w", ctx.Err())
	}

	// Validate trigger payload exists
	if len(run.TriggerPayload) == 0 {
		logs = append(logs, "No trigger payload available for patch import")
		return logs, errors.New("trigger payload is required for patch import")
	}

	// Parse patches from trigger payload
	patches, parseErr := parsePatchesFromPayload(run.TriggerPayload)
	if parseErr != nil {
		logs = append(logs, fmt.Sprintf("Failed to parse patches from trigger payload: %v", parseErr))
		return logs, parseErr
	}

	if len(patches) == 0 {
		logs = append(logs, "No patches found in trigger payload")
		return logs, nil
	}

	logs = append(logs, fmt.Sprintf("Applying %d patches to repository '%s@%s'",
		len(patches), workflowable.Repository.Slug, workflowable.RepositoryBranch))

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

		patchLogs, patchErr := o.applyPatchesToFile(
			ctx,
			workflow,
			&workflowable.Repository,
			workflowable.RepositoryBranch,
			filePath,
			filePatches,
		)
		logs = append(logs, patchLogs...)
		if patchErr != nil {
			logs = append(logs, fmt.Sprintf("Failed to apply patches to %s: %v", filePath, patchErr))
			return logs, patchErr
		}
		patchedFiles++
	}

	logs = append(logs, fmt.Sprintf("Successfully applied patches to %d file(s)", patchedFiles))

	// Commit changes
	author := workflow.Owner.Email
	if workflow.Owner.FirstName != "" && workflow.Owner.LastName != "" {
		author = fmt.Sprintf("%s %s <%s>", workflow.Owner.FirstName, workflow.Owner.LastName, workflow.Owner.Email)
	}

	commitLogs := o.commitWorkflowChanges(
		ctx,
		workflow.Workspace.Slug,
		workflowable.Repository.Slug,
		workflowable.RepositoryBranch,
		workflow.Name,
		"import-patch",
		run.ID,
		"",
		author,
	)
	logs = append(logs, commitLogs...)

	return logs, nil
}

// parsePatchesFromPayload extracts patch operations from a trigger payload.
// Supports both direct array format and wrapped object with "patches" field.
func parsePatchesFromPayload(payload json.RawMessage) ([]irminmodels.PatchOperation, error) {
	// First try to parse as a direct array of patches
	var patches []irminmodels.PatchOperation
	if err := json.Unmarshal(payload, &patches); err == nil && len(patches) > 0 {
		return patches, nil
	}

	// Try parsing as object with patches field (webhook payload format)
	var wrapper struct {
		Patches []irminmodels.PatchOperation `json:"patches"`
	}
	if err := json.Unmarshal(payload, &wrapper); err != nil {
		return nil, fmt.Errorf("failed to parse patches from payload: %w", err)
	}

	return wrapper.Patches, nil
}

// hasPatchesInPayload checks if the trigger payload contains patches.
func hasPatchesInPayload(payload json.RawMessage) bool {
	if len(payload) == 0 {
		return false
	}

	// Try to parse and check for patches
	patches, err := parsePatchesFromPayload(payload)
	if err != nil {
		return false
	}

	return len(patches) > 0
}
