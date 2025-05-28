package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatLogEventResponse(
	d *db.Database,
	logEvent db.LogEvent,
	sqidManager *utils.SQIDManager,
) (*irminmodels.LogEvent, error) {
	eventSqid, err := sqidManager.Encode("logs", uint64(logEvent.ID))
	if err != nil {
		return nil, err
	}

	var user *irminmodels.User
	if logEvent.User != nil {
		user, err = FormatUserResponse(logEvent.User, sqidManager)
		if err != nil {
			return nil, err
		}
	}

	var workspace *irminmodels.Workspace
	if logEvent.Workspace != nil {
		workspace, err = FormatWorkspaceResponse(logEvent.Workspace, sqidManager)
		if err != nil {
			return nil, err
		}
	}

	var connection *irminmodels.Connection
	if logEvent.Connection != nil {
		connection, err = FormatConnectionResponse(logEvent.Connection, sqidManager)
		if err != nil {
			return nil, err
		}
	}

	var workflowRun *irminmodels.WorkflowRun
	if logEvent.WorkflowRun != nil {
		workflowRun, err = FormatWorkflowRunResponse(logEvent.WorkflowRun, sqidManager)
		if err != nil {
			return nil, err
		}
	}

	var workflow *irminmodels.Workflow
	if logEvent.Workflow != nil {
		workflow, err = FormatWorkflowResponse(d, logEvent.Workflow, sqidManager)
		if err != nil {
			return nil, err
		}
	}

	var repository *irminmodels.Repository
	if logEvent.Repository != nil {
		repository, err = FormatRepositoryResponse(logEvent.Repository, sqidManager)
		if err != nil {
			return nil, err
		}
	}

	eventType := irminmodels.LogEventType(logEvent.Type)
	event := &irminmodels.LogEvent{
		ID:          eventSqid,
		Type:        eventType,
		Description: logEvent.Description,
		CreatedAt:   logEvent.CreatedAt,
		Workspace:   workspace,
		User:        user,
		WorkflowRun: workflowRun,
		Workflow:    workflow,
		Repository:  repository,
		Connection:  connection,
	}

	return event, nil
}
