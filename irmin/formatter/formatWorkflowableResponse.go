package formatter

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// getWorkflowable retrieves the appropriate workflowable based on the workflow type.
func getWorkflowable(d *db.Database, workflow *db.Workflow) (any, error) {
	switch workflow.Type {
	case irminmodels.WorkflowableTypeImport:
		return d.GetImportWorkflowableByID(*workflow.ImportID)
	case irminmodels.WorkflowableTypeExport:
		return d.GetExportWorkflowableByID(*workflow.ExportID)
	case irminmodels.WorkflowableTypeAction:
		return d.GetActionWorkflowableByID(*workflow.ActionID)
	case irminmodels.WorkflowableTypePipeline:
		return d.GetPipelineWorkflowableByID(*workflow.PipelineID)
	default:
		return nil, fmt.Errorf("unknown workflow type: %s", workflow.Type)
	}
}

// formatImportWorkflowable formats an import workflowable response.
func formatImportWorkflowable(
	importWorkflowable *db.ImportWorkflowable,
	sqidManager *utils.SQIDManager,
) *irminmodels.Workflowable {
	if importWorkflowable == nil {
		return nil
	}

	connectionSqid, _ := sqidManager.Encode("connections", uint64(importWorkflowable.ConnectionID))
	return &irminmodels.Workflowable{
		Type:             irminmodels.WorkflowableTypeImport,
		ConnectionID:     connectionSqid,
		ConnectionPath:   importWorkflowable.ConnectionPath,
		Repository:       importWorkflowable.Repository.Slug,
		RepositoryBranch: importWorkflowable.RepositoryBranch,
		RepositoryPath:   importWorkflowable.RepositoryPath,
		FieldMappings:    importWorkflowable.FieldMappings,
	}
}

// formatExportWorkflowable formats an export workflowable response.
func formatExportWorkflowable(
	exportWorkflowable *db.ExportWorkflowable,
	sqidManager *utils.SQIDManager,
) *irminmodels.Workflowable {
	if exportWorkflowable == nil {
		return nil
	}

	connectionSqid, _ := sqidManager.Encode("connections", uint64(exportWorkflowable.ConnectionID))
	return &irminmodels.Workflowable{
		Type:             irminmodels.WorkflowableTypeExport,
		ConnectionID:     connectionSqid,
		ConnectionPath:   exportWorkflowable.ConnectionPath,
		Repository:       exportWorkflowable.Repository.Slug,
		RepositoryBranch: exportWorkflowable.RepositoryBranch,
		RepositoryPath:   exportWorkflowable.RepositoryPath,
		FieldMappings:    exportWorkflowable.FieldMappings,
	}
}

// formatActionWorkflowable formats an action workflowable response.
func formatActionWorkflowable(
	actionWorkflowable *db.ActionWorkflowable,
) *irminmodels.Workflowable {
	if actionWorkflowable == nil {
		return nil
	}

	response := &irminmodels.Workflowable{
		Type:       irminmodels.WorkflowableTypeAction,
		Executable: actionWorkflowable.Executable,
	}

	if actionWorkflowable.Repository != nil {
		response.Repository = actionWorkflowable.Repository.Slug
		response.RepositoryBranch = *actionWorkflowable.RepositoryBranch
		response.RepositoryPath = *actionWorkflowable.RepositoryPath
	}

	if actionWorkflowable.Inputs != nil {
		var inputsResponse []irminmodels.ActionInputData
		for _, input := range actionWorkflowable.Inputs {
			inputsResponse = append(inputsResponse, irminmodels.ActionInputData{
				Repository:     input.Repository.Slug,
				RepositoryRef:  input.RepositoryRef,
				RepositoryPath: input.RepositoryPath,
			})
		}
		if len(inputsResponse) == 0 {
			inputsResponse = make([]irminmodels.ActionInputData, 0)
		}
		response.Input = inputsResponse
	}

	return response
}

// formatPipelineStage formats a single pipeline stage.
func formatPipelineStage(stage db.PipelineStage, sqidManager *utils.SQIDManager) irminmodels.PipelineStage {
	switch stage.Type {
	case db.PipelineStageTypeAction:
		return irminmodels.PipelineStage{
			Description: stage.Description,
			Write:       stage.Write,
			Read:        stage.Read,
			Type:        irminmodels.PipelineStageTypeAction,
			Executable:  stage.Executable,
		}
	case db.PipelineStageTypeConnection:
		connectionSqid, _ := sqidManager.Encode("connections", uint64(*stage.ConnectionID))
		return irminmodels.PipelineStage{
			Description:         stage.Description,
			Write:               stage.Write,
			Read:                stage.Read,
			Type:                irminmodels.PipelineStageTypeConnection,
			ConnectionWritePath: stage.ConnectionWritePath,
			ConnectionReadPath:  stage.ConnectionReadPath,
			ConnectionID:        &connectionSqid,
		}
	case db.PipelineStageTypeRepository:
		repositorySlug := stage.Repository.Slug
		return irminmodels.PipelineStage{
			Description:      stage.Description,
			Write:            stage.Write,
			Read:             stage.Read,
			Type:             irminmodels.PipelineStageTypeRepository,
			RepositoryBranch: stage.RepositoryBranch,
			RepositoryPath:   stage.RepositoryPath,
			Repository:       &repositorySlug,
		}
	default:
		return irminmodels.PipelineStage{}
	}
}

// formatPipelineWorkflowable formats a pipeline workflowable response.
func formatPipelineWorkflowable(
	pipelineWorkflowable *db.PipelineWorkflowable,
	sqidManager *utils.SQIDManager,
) *irminmodels.Workflowable {
	if pipelineWorkflowable == nil {
		return nil
	}

	response := &irminmodels.Workflowable{
		Type: irminmodels.WorkflowableTypePipeline,
		Live: pipelineWorkflowable.Live,
	}

	// Sort the stages by order sequence
	slices.SortFunc(pipelineWorkflowable.Stages, func(a, b db.PipelineStage) int {
		return a.OrderSequence - b.OrderSequence
	})

	// Format the stages
	var stagesResponse []irminmodels.PipelineStage
	for _, stage := range pipelineWorkflowable.Stages {
		stagesResponse = append(stagesResponse, formatPipelineStage(stage, sqidManager))
	}
	if len(stagesResponse) == 0 {
		stagesResponse = make([]irminmodels.PipelineStage, 0)
	}
	response.Stages = stagesResponse

	return response
}

// FormatWorkflowableResponse formats a workflowable object into an irminmodels.Workflowable object.
// It returns an error if the workflowable is not found or if type assertion fails.
func FormatWorkflowableResponse(
	d *db.Database,
	workflow *db.Workflow,
	sqidManager *utils.SQIDManager,
) (*irminmodels.Workflowable, error) {
	workflowable, err := getWorkflowable(d, workflow)
	if err != nil {
		return nil, fmt.Errorf("error retrieving workflowable: %w", err)
	}

	switch workflow.Type {
	case irminmodels.WorkflowableTypeImport:
		importWorkflowable, ok := workflowable.(*db.ImportWorkflowable)
		if !ok {
			return nil, errors.New("invalid type assertion for import workflowable")
		}
		return formatImportWorkflowable(importWorkflowable, sqidManager), nil
	case irminmodels.WorkflowableTypeExport:
		exportWorkflowable, ok := workflowable.(*db.ExportWorkflowable)
		if !ok {
			return nil, errors.New("invalid type assertion for export workflowable")
		}
		return formatExportWorkflowable(exportWorkflowable, sqidManager), nil
	case irminmodels.WorkflowableTypeAction:
		actionWorkflowable, ok := workflowable.(*db.ActionWorkflowable)
		if !ok {
			return nil, errors.New("invalid type assertion for action workflowable")
		}
		return formatActionWorkflowable(actionWorkflowable), nil
	case irminmodels.WorkflowableTypePipeline:
		pipelineWorkflowable, ok := workflowable.(*db.PipelineWorkflowable)
		if !ok {
			return nil, errors.New("invalid type assertion for pipeline workflowable")
		}
		return formatPipelineWorkflowable(pipelineWorkflowable, sqidManager), nil
	default:
		return nil, fmt.Errorf("unknown workflow type: %s", workflow.Type)
	}
}
