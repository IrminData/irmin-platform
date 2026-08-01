package orchestrator

import (
	"context"
	"errors"
	"fmt"

	"irmin-api/connectorjobs"
	"irmin-api/db"

	"github.com/IrminData/irmin-platform/sdks/go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// performPatchExport sends patches from the trigger payload to the connection.
// This is used when an export workflow is triggered by a repository event
// with diff patches and sync_mode is "auto" or "patch".
func (o *Orchestrator) performPatchExport(
	ctx context.Context,
	_ *db.Workflow,
	run *db.WorkflowRun,
	workflowable *db.ExportWorkflowable,
) ([]string, error) {
	var logs []string

	// Check for context cancellation
	if ctx.Err() != nil {
		return logs, fmt.Errorf("workflow execution cancelled before patch export: %w", ctx.Err())
	}

	// Validate trigger payload exists
	if len(run.TriggerPayload) == 0 {
		logs = append(logs, "No trigger payload available for patch export")
		return logs, errors.New("trigger payload is required for patch export")
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

	// Get the connection
	connection, err := o.db.GetConnectionByID(workflowable.ConnectionID)
	if err != nil {
		logs = append(logs, fmt.Sprintf("Failed to get connection: %v", err))
		return logs, fmt.Errorf("failed to get connection: %w", err)
	}

	logs = append(logs, fmt.Sprintf("Exporting %d patches to connection '%s'",
		len(patches), connection.Name))

	// Check if connection supports apply_patch capability
	hasApplyPatch := false
	for _, cap := range connection.Connector.Capabilities {
		if cap == string(irminmodels.ConnectorCapabilityApplyPatch) {
			hasApplyPatch = true
			break
		}
	}

	if !hasApplyPatch {
		logs = append(logs, fmt.Sprintf("Connection '%s' does not support patch operations", connection.Name))
		return logs, fmt.Errorf("connection '%s' does not support apply_patch capability", connection.Name)
	}

	// Start the async patch job via the SDK. The server returns a
	// job_id we poll to terminal; patches are multipart-uploaded once
	// here, the connector-side worker applies them sequentially.
	client := connectorjobs.NewConnectorClient(connection)

	start, startErr := client.StartOperationPatch(ctx, connectorsclient.StartOperationPatchRequest{
		Patches:  patches,
		Details:  connection.Details,
		Settings: connection.Settings,
	})
	if startErr != nil {
		logs = append(logs, fmt.Sprintf("Failed to start patch job: %v", startErr))
		return logs, fmt.Errorf("failed to start patch job: %w", startErr)
	}

	if jobErr := connectorjobs.Run(ctx, start); jobErr != nil {
		logs = append(logs, fmt.Sprintf("Patch job %s failed: %v", start.JobID, jobErr))
		return logs, fmt.Errorf("patch job %s failed: %w", start.JobID, jobErr)
	}

	logs = append(logs, fmt.Sprintf("Successfully exported %d patches to connection '%s'",
		len(patches), connection.Name))
	return logs, nil
}
