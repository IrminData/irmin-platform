package orchestrator

import (
	"context"
	"errors"
	"irmin-api/db"
)

// executeImportWorkflowable executes the import workflow for a given workflowable.
// It checks the sync_mode to determine whether to perform a full import or patch import:
// - "full": Always performs a full data import from the connection.
// - "patch": Only accepts patch-based events (requires trigger payload with patches).
// - "auto" (default): Full import on schedule/manual, patch import on events with patches.
func (o *Orchestrator) executeImportWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.ImportWorkflowable,
) ([]string, error) {
	// Determine sync mode (default to "auto" if not set)
	syncMode := workflowable.SyncMode
	if syncMode == "" {
		syncMode = syncModeAuto
	}

	// Check if we should use patch mode based on sync_mode and trigger payload
	usePatchMode := false
	hasPatchPayload := hasPatchesInPayload(run.TriggerPayload)

	switch syncMode {
	case syncModePatch:
		// Patch mode requires patches in trigger payload
		if !hasPatchPayload {
			return []string{
					"Patch mode requires trigger payload with patches",
				}, errors.New(
					"patch mode requires trigger payload with patches",
				)
		}
		usePatchMode = true

	case syncModeAuto:
		// Auto mode: use patch import if trigger payload contains patches
		if hasPatchPayload {
			usePatchMode = true
		}

	case syncModeFull:
		// Full mode: always do full import
		usePatchMode = false

	default:
		// Unknown mode, default to full
		usePatchMode = false
	}

	// Route to appropriate handler
	if usePatchMode {
		return o.performPatchImport(ctx, workflow, run, workflowable)
	}

	// Perform full import using existing common logic
	return o.executeWorkflowableCommon(
		ctx,
		workflow,
		run,
		workflowable.ConnectionID,
		workflowable.ImportFromConnectionPaths,
		&workflow.Workspace,
		&workflowable.Repository,
		[]string{workflowable.ImportToRepositoryPath},
		workflowable.RepositoryBranch,
		operationImport,
		workflowable.FieldMappings,
	)
}
