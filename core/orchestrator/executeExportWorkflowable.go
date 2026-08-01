package orchestrator

import (
	"context"
	"errors"
	"irmin-api/db"
)

// executeExportWorkflowable executes the export workflow for a given workflowable.
// It checks the sync_mode to determine whether to perform a full export or patch export:
// - "full": Always performs a full data export to the connection.
// - "patch": Only accepts patch-based events (requires trigger payload with patches).
// - "auto" (default): Full export on schedule/manual, patch export on events with patches.
func (o *Orchestrator) executeExportWorkflowable(
	ctx context.Context,
	workflow *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.ExportWorkflowable,
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
		// Auto mode: use patch export if trigger payload contains patches
		if hasPatchPayload {
			usePatchMode = true
		}

	case syncModeFull:
		// Full mode: always do full export
		usePatchMode = false

	default:
		// Unknown mode, default to full
		usePatchMode = false
	}

	// Route to appropriate handler
	if usePatchMode {
		return o.performPatchExport(ctx, workflow, run, workflowable)
	}

	// Perform full export using existing common logic
	return o.executeWorkflowableCommon(
		ctx,
		workflow,
		run,
		workflowable.ConnectionID,
		[]string{workflowable.ExportToConnectionPath},
		&workflow.Workspace,
		&workflowable.Repository,
		workflowable.ExportFromRepositoryPaths,
		workflowable.RepositoryBranch,
		operationExport,
		workflowable.FieldMappings,
	)
}
