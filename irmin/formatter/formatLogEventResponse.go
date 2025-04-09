package formatter

import (
	"irmin-api/db"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatLogEventResponse(logEvent db.LogEvent) (*irminModels.LogEvent, error) {
	eventSqid, err := utils.EncodeSqids("logs", uint64(logEvent.ID))
	if err != nil {
		return nil, err
	}

	var user *irminModels.User
	if logEvent.User != nil {
		user, err = FormatUserResponse(*logEvent.User)
		if err != nil {
			return nil, err
		}
	}

	var workspace *irminModels.Workspace
	if logEvent.Workspace != nil {
		workspace, err = FormatWorkspaceResponse(*logEvent.Workspace)
		if err != nil {
			return nil, err
		}
	}

	var connection *irminModels.Connection
	if logEvent.Connection != nil {
		connection, err = FormatConnectionResponse(*logEvent.Connection)
		if err != nil {
			return nil, err
		}
	}

	var workflowRun *irminModels.WorkflowRun
	if logEvent.WorkflowRun != nil {
		workflowRun, err = FormatWorkflowRunResponse(logEvent.WorkflowRun)
		if err != nil {
			return nil, err
		}
	}

	var workflow *irminModels.Workflow
	if logEvent.Workflow != nil {
		workflow, err = FormatWorkflowResponse(*logEvent.Workflow)
		if err != nil {
			return nil, err
		}
	}

	var repository *irminModels.Repository
	if logEvent.Repository != nil {
		repository, err = FormatRepositoryResponse(logEvent.Repository, nil)
		if err != nil {
			return nil, err
		}
	}

	eventType := irminModels.LogEventType(logEvent.Type)
	event := &irminModels.LogEvent{
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
