package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatWorkflowableResponse formats a workflowable object into an irminmodels.Workflowable object.
// It returns an error if the workflowable is not found.
func FormatWorkflowableResponse(d *db.Database, workflow *db.Workflow) (*irminmodels.Workflowable, error) {
	// Fetch the workflowable
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable
	var workflowableErr error
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		importWorkflowable, workflowableErr = d.GetImportWorkflowableByID(*workflow.ImportID)
	case db.WorkflowableTypeExport:
		exportWorkflowable, workflowableErr = d.GetExportWorkflowableByID(*workflow.ExportID)
	case db.WorkflowableTypeAction:
		actionWorkflowable, workflowableErr = d.GetActionWorkflowableByID(*workflow.ActionID)
	case db.WorkflowableTypePipeline:
		pipelineWorkflowable, workflowableErr = d.GetPipelineWorkflowableByID(*workflow.PipelineID)
	}
	if workflowableErr != nil {
		return nil, fmt.Errorf("error retrieving workflowable: %w", workflowableErr)
	}

	// Format the workflowable response.
	workflowableResponse := irminmodels.Workflowable{
		Type: irminmodels.WorkflowableType(workflow.Type),
	}
	switch workflow.Type {
	case db.WorkflowableTypeImport:
		if importWorkflowable != nil {
			connectionSqid, _ := utils.EncodeSqids("connections", uint64(importWorkflowable.ConnectionID))
			workflowableResponse.ConnectionID = connectionSqid
			workflowableResponse.ConnectionPath = importWorkflowable.ConnectionPath
			workflowableResponse.Repository = importWorkflowable.Repository.Slug
			workflowableResponse.Branch = importWorkflowable.Branch
			workflowableResponse.Path = importWorkflowable.Path
		}
	case db.WorkflowableTypeExport:
		if exportWorkflowable != nil {
			connectionSqid, _ := utils.EncodeSqids("connections", uint64(exportWorkflowable.ConnectionID))
			workflowableResponse.ConnectionID = connectionSqid
			workflowableResponse.ConnectionPath = exportWorkflowable.ConnectionPath
			workflowableResponse.Repository = exportWorkflowable.Repository.Slug
			workflowableResponse.Branch = exportWorkflowable.Branch
			workflowableResponse.Path = exportWorkflowable.Path
		}
	case db.WorkflowableTypeAction:
		if actionWorkflowable != nil {
			workflowableResponse.Executable = actionWorkflowable.Executable
			if actionWorkflowable.Repository != nil {
				workflowableResponse.Repository = actionWorkflowable.Repository.Slug
				workflowableResponse.Branch = *actionWorkflowable.Branch
				workflowableResponse.Path = *actionWorkflowable.Path
			}
			if actionWorkflowable.Inputs != nil {
				var inputsResponse []irminmodels.ActionInputData
				for _, input := range actionWorkflowable.Inputs {
					inputsResponse = append(inputsResponse, irminmodels.ActionInputData{
						Repository: input.Repository.Slug,
						Ref:        input.Ref,
						Path:       input.Path,
					})
				}
				workflowableResponse.Input = inputsResponse
			}
		}
	case db.WorkflowableTypePipeline:
		if pipelineWorkflowable != nil {
			workflowableResponse.Live = pipelineWorkflowable.Live
			// Sort the stages by order sequence
			slices.SortFunc(pipelineWorkflowable.Stages, func(a, b db.PipelineStage) int {
				return a.OrderSequence - b.OrderSequence
			})
			// Format the stages
			var stagesResponse []irminmodels.PipelineStage
			for _, stage := range pipelineWorkflowable.Stages {
				switch stage.Type {
				case db.PipelineStageTypeAction:
					stageResponse := irminmodels.PipelineStage{
						Description: stage.Description,
						Write:       stage.Write,
						Read:        stage.Read,
						Type:        irminmodels.PipelineStageTypeAction,
						Executable:  stage.Executable,
					}
					stagesResponse = append(stagesResponse, stageResponse)
				case db.PipelineStageTypeConnection:
					connectionSqid, _ := utils.EncodeSqids("connections", uint64(*stage.ConnectionID))
					stageResponse := irminmodels.PipelineStage{
						Description:         stage.Description,
						Write:               stage.Write,
						Read:                stage.Read,
						Type:                irminmodels.PipelineStageTypeConnection,
						ConnectionWritePath: stage.ConnectionWritePath,
						ConnectionReadPath:  stage.ConnectionReadPath,
						ConnectionID:        &connectionSqid,
					}
					stagesResponse = append(stagesResponse, stageResponse)
				case db.PipelineStageTypeRepository:
					repositorySlug := stage.Repository.Slug
					stageResponse := irminmodels.PipelineStage{
						Description:      stage.Description,
						Write:            stage.Write,
						Read:             stage.Read,
						Type:             irminmodels.PipelineStageTypeRepository,
						RepositoryBranch: stage.RepositoryBranch,
						RepositoryPath:   stage.RepositoryPath,
						Repository:       &repositorySlug,
					}
					stagesResponse = append(stagesResponse, stageResponse)
				}
			}
			workflowableResponse.Stages = stagesResponse
		}
	}
	return &workflowableResponse, nil
}
