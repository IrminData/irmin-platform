package formatter

import (
	"context"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// formatLogEventFutures creates all async formatting operations for a log event.
func formatLogEventFutures(
	ctx context.Context,
	d *db.Database,
	logEvent db.LogEvent,
	sqidManager *irminsqids.SQIDManager,
) map[string]utils.FutureResult[any] {
	futures := make(map[string]utils.FutureResult[any])

	if logEvent.User != nil {
		futures["user"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatUserResponse(logEvent.User, sqidManager)
		})
	}

	if logEvent.Workspace != nil {
		futures["workspace"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatWorkspaceResponse(logEvent.Workspace, sqidManager)
		})
	}

	if logEvent.Connection != nil {
		futures["connection"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatConnectionResponse(logEvent.Connection, sqidManager)
		})
	}

	if logEvent.WorkflowRun != nil {
		futures["workflowRun"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatWorkflowRunResponse(logEvent.WorkflowRun, sqidManager)
		})
	}

	if logEvent.Workflow != nil {
		futures["workflow"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatWorkflowResponse(d, logEvent.Workflow, sqidManager)
		})
	}

	if logEvent.Repository != nil {
		futures["repository"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatRepositoryResponse(logEvent.Repository, sqidManager)
		})
	}

	if logEvent.StoredQuery != nil {
		futures["storedQuery"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatStoredQueryResponse(logEvent.StoredQuery, sqidManager)
		})
	}

	if logEvent.Policy != nil {
		futures["policy"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatPolicyResponse(logEvent.Policy, sqidManager)
		})
	}

	if logEvent.RepositoryObject != nil {
		futures["repositoryObject"] = utils.AsyncWithContext(ctx, func() (any, error) {
			return FormatRepositoryObjectResponse(logEvent.RepositoryObject, sqidManager)
		})
	}

	return futures
}

// awaitFutures awaits all futures and returns their results.
func awaitFutures(futures map[string]utils.FutureResult[any]) (map[string]any, error) {
	results := make(map[string]any)
	for key, future := range futures {
		result, err := future.Await()
		if err != nil {
			return nil, err
		}
		results[key] = result
	}
	return results, nil
}

// constructLogEvent creates the final LogEvent from the results.
func constructLogEvent(
	logEvent db.LogEvent,
	eventSqid string,
	results map[string]any,
) *irminmodels.LogEvent {
	event := &irminmodels.LogEvent{
		ID:          eventSqid,
		Type:        irminmodels.LogEventType(logEvent.Type),
		Description: logEvent.Description,
		CreatedAt:   logEvent.CreatedAt,
	}

	// Type assert and assign each result
	if user, ok := results["user"].(*irminmodels.User); ok {
		event.User = user
	}
	if workspace, ok := results["workspace"].(*irminmodels.Workspace); ok {
		event.Workspace = workspace
	}
	if connection, ok := results["connection"].(*irminmodels.Connection); ok {
		event.Connection = connection
	}
	if workflowRun, ok := results["workflowRun"].(*irminmodels.WorkflowRun); ok {
		event.WorkflowRun = workflowRun
	}
	if workflow, ok := results["workflow"].(*irminmodels.Workflow); ok {
		event.Workflow = workflow
	}
	if repository, ok := results["repository"].(*irminmodels.Repository); ok {
		event.Repository = repository
	}
	if storedQuery, ok := results["storedQuery"].(*irminmodels.StoredQuery); ok {
		event.StoredQuery = storedQuery
	}
	if policy, ok := results["policy"].(*irminmodels.Policy); ok {
		event.Policy = policy
	}
	if repositoryObject, ok := results["repositoryObject"].(*irminmodels.Object); ok {
		event.Object = repositoryObject
	}

	return event
}

func FormatLogEventResponse(
	ctx context.Context,
	d *db.Database,
	logEvent db.LogEvent,
	sqidManager *irminsqids.SQIDManager,
) (*irminmodels.LogEvent, error) {
	// Encode event SQID
	eventSqid, err := sqidManager.Encode("logs", uint64(logEvent.ID))
	if err != nil {
		return nil, err
	}

	// Create and await all futures
	futures := formatLogEventFutures(ctx, d, logEvent, sqidManager)
	results, err := awaitFutures(futures)
	if err != nil {
		return nil, err
	}

	// Construct and return the final event
	return constructLogEvent(logEvent, eventSqid, results), nil
}
