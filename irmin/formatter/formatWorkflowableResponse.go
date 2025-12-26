package formatter

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
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
	sqidManager *irminsqids.SQIDManager,
) *irminmodels.Workflowable {
	if importWorkflowable == nil {
		return nil
	}

	// Ensure slices are never nil (use empty arrays for proper JSON serialization)
	importPaths := importWorkflowable.ImportFromConnectionPaths
	if importPaths == nil {
		importPaths = make([]string, 0)
	}
	fieldMappings := importWorkflowable.FieldMappings
	if fieldMappings == nil {
		fieldMappings = make([]irminmodels.FieldMapping, 0)
	}

	connectionSqid, _ := sqidManager.Encode("connections", uint64(importWorkflowable.ConnectionID))
	return &irminmodels.Workflowable{
		Type:                      irminmodels.WorkflowableTypeImport,
		ConnectionID:              connectionSqid,
		ImportFromConnectionPaths: importPaths,
		ImportToRepositoryPath:    importWorkflowable.ImportToRepositoryPath,
		Repository:                importWorkflowable.Repository.Slug,
		RepositoryBranch:          importWorkflowable.RepositoryBranch,
		FieldMappings:             fieldMappings,
	}
}

// formatExportWorkflowable formats an export workflowable response.
func formatExportWorkflowable(
	exportWorkflowable *db.ExportWorkflowable,
	sqidManager *irminsqids.SQIDManager,
) *irminmodels.Workflowable {
	if exportWorkflowable == nil {
		return nil
	}

	// Ensure slices are never nil (use empty arrays for proper JSON serialization)
	exportPaths := exportWorkflowable.ExportFromRepositoryPaths
	if exportPaths == nil {
		exportPaths = make([]string, 0)
	}
	fieldMappings := exportWorkflowable.FieldMappings
	if fieldMappings == nil {
		fieldMappings = make([]irminmodels.FieldMapping, 0)
	}

	connectionSqid, _ := sqidManager.Encode("connections", uint64(exportWorkflowable.ConnectionID))
	return &irminmodels.Workflowable{
		Type:                      irminmodels.WorkflowableTypeExport,
		ConnectionID:              connectionSqid,
		ExportFromRepositoryPaths: exportPaths,
		ExportToConnectionPath:    exportWorkflowable.ExportToConnectionPath,
		Repository:                exportWorkflowable.Repository.Slug,
		RepositoryBranch:          exportWorkflowable.RepositoryBranch,
		FieldMappings:             fieldMappings,
	}
}

// formatActionWorkflowable formats an action workflowable response.
func formatActionWorkflowable(
	actionWorkflowable *db.ActionWorkflowable,
	sqidManager *irminsqids.SQIDManager,
) *irminmodels.Workflowable {
	if actionWorkflowable == nil {
		return nil
	}

	var scriptSqid *string
	var querySqid *string

	// Construct the script sqid
	if actionWorkflowable.ScriptID != nil {
		encoded, scriptSqidErr := sqidManager.Encode("scripts", uint64(*actionWorkflowable.ScriptID))
		if scriptSqidErr != nil {
			return nil
		}
		scriptSqid = &encoded
	}
	if actionWorkflowable.QueryID != nil {
		encoded, querySqidErr := sqidManager.Encode("queries", uint64(*actionWorkflowable.QueryID))
		if querySqidErr != nil {
			return nil
		}
		querySqid = &encoded
	}

	response := &irminmodels.Workflowable{
		Type:           irminmodels.WorkflowableTypeAction,
		ExecutableType: actionWorkflowable.ExecutableType,
		ScriptID:       scriptSqid,
		QueryID:        querySqid,
	}

	if actionWorkflowable.ResultsRepository != nil {
		response.ResultsRepository = &actionWorkflowable.ResultsRepository.Slug
		response.ResultsRepositoryBranch = actionWorkflowable.ResultsRepositoryBranch
		resultsRepositoryPath := "/"
		if actionWorkflowable.ResultsRepositoryPath != nil {
			resultsRepositoryPath = *actionWorkflowable.ResultsRepositoryPath
		}
		response.ResultsRepositoryPath = &resultsRepositoryPath
	}

	// Always initialize Input as empty array if no inputs exist
	var inputsResponse []irminmodels.ActionInputData
	if actionWorkflowable.Inputs != nil {
		for _, input := range actionWorkflowable.Inputs {
			inputsResponse = append(inputsResponse, irminmodels.ActionInputData{
				Repository:     input.Repository.Slug,
				RepositoryRef:  input.RepositoryRef,
				RepositoryPath: input.RepositoryPath,
			})
		}
	}
	if inputsResponse == nil {
		inputsResponse = make([]irminmodels.ActionInputData, 0)
	}
	response.Input = inputsResponse

	return response
}

// formatPipelineStage formats a single pipeline stage.
//
//nolint:gocognit // This is fine
func formatPipelineStage(stage db.PipelineStage, sqidManager *irminsqids.SQIDManager) irminmodels.PipelineStage {
	switch stage.Type {
	case db.PipelineStageTypeAction:
		var scriptSqid *string
		var querySqid *string

		// Construct the script sqid
		if stage.ScriptID != nil {
			encoded, scriptSqidErr := sqidManager.Encode("scripts", uint64(*stage.ScriptID))
			if scriptSqidErr != nil {
				return irminmodels.PipelineStage{}
			}
			scriptSqid = &encoded
		}

		// Construct the query sqid
		if stage.QueryID != nil {
			encoded, querySqidErr := sqidManager.Encode("queries", uint64(*stage.QueryID))
			if querySqidErr != nil {
				return irminmodels.PipelineStage{}
			}
			querySqid = &encoded
		}

		return irminmodels.PipelineStage{
			Description:    stage.Description,
			Write:          stage.Write,
			Read:           stage.Read,
			Type:           irminmodels.PipelineStageTypeAction,
			ExecutableType: stage.ExecutableType,
			ScriptID:       scriptSqid,
			QueryID:        querySqid,
		}
	case db.PipelineStageTypeConnection:
		connectionSqid, _ := sqidManager.Encode("connections", uint64(*stage.ConnectionID))
		// Ensure read paths slice is never nil
		readPaths := stage.ConnectionReadPaths
		if readPaths == nil {
			readPaths = make([]string, 0)
		}
		return irminmodels.PipelineStage{
			Description:         stage.Description,
			Write:               stage.Write,
			Read:                stage.Read,
			Type:                irminmodels.PipelineStageTypeConnection,
			ConnectionWritePath: stage.ConnectionWritePath,
			ConnectionReadPaths: &readPaths,
			ConnectionID:        &connectionSqid,
		}
	case db.PipelineStageTypeRepository:
		repositorySlug := stage.Repository.Slug
		// Ensure read paths slice is never nil
		readPaths := stage.RepositoryReadPaths
		if readPaths == nil {
			readPaths = make([]string, 0)
		}
		return irminmodels.PipelineStage{
			Description:         stage.Description,
			Write:               stage.Write,
			Read:                stage.Read,
			Type:                irminmodels.PipelineStageTypeRepository,
			RepositoryBranch:    stage.RepositoryBranch,
			RepositoryWritePath: stage.RepositoryWritePath,
			RepositoryReadPaths: &readPaths,
			Repository:          &repositorySlug,
		}
	case db.PipelineStageTypeRepositoryAction:
		var repositorySlug *string
		if stage.RepositoryActionRepository != nil {
			repositorySlug = &stage.RepositoryActionRepository.Slug
		}

		return irminmodels.PipelineStage{
			Description:                   stage.Description,
			Write:                         stage.Write,
			Read:                          stage.Read,
			Type:                          irminmodels.PipelineStageTypeRepositoryAction,
			RepositoryActionType:          stage.RepositoryActionType,
			RepositoryActionRepository:    repositorySlug,
			RepositoryActionBranch:        stage.RepositoryActionBranch,
			RepositoryActionTargetBranch:  stage.RepositoryActionTargetBranch,
			RepositoryActionCommitMessage: stage.RepositoryActionCommitMessage,
			RepositoryActionRevertPath:    stage.RepositoryActionRevertPath,
			RepositoryActionMergeStrategy: stage.RepositoryActionMergeStrategy,
			RepositoryActionSquash:        stage.RepositoryActionSquash,
			RepositoryActionAllowEmpty:    stage.RepositoryActionAllowEmpty,
		}
	case db.PipelineStageTypeTriggerWorkflow:
		var workflowSqid *string
		if stage.TriggerWorkflowID != nil {
			encoded, workflowSqidErr := sqidManager.Encode("workflows", uint64(*stage.TriggerWorkflowID))
			if workflowSqidErr != nil {
				return irminmodels.PipelineStage{}
			}
			workflowSqid = &encoded
		}

		return irminmodels.PipelineStage{
			Description:       stage.Description,
			Write:             stage.Write,
			Read:              stage.Read,
			Type:              irminmodels.PipelineStageTypeTriggerWorkflow,
			TriggerWorkflowID: workflowSqid,
		}
	case db.PipelineStageTypeValidation:
		return irminmodels.PipelineStage{
			Description:          stage.Description,
			Write:                stage.Write,
			Read:                 stage.Read,
			Type:                 irminmodels.PipelineStageTypeValidation,
			ValidationSchema:     stage.ValidationSchema,
			ValidationMode:       stage.ValidationMode,
			FailOnError:          stage.FailOnError,
			ValidationTargetName: stage.ValidationTargetName,
		}
	default:
		return irminmodels.PipelineStage{}
	}
}

// formatPipelineWorkflowable formats a pipeline workflowable response.
func formatPipelineWorkflowable(
	pipelineWorkflowable *db.PipelineWorkflowable,
	sqidManager *irminsqids.SQIDManager,
) *irminmodels.Workflowable {
	if pipelineWorkflowable == nil {
		return nil
	}

	response := &irminmodels.Workflowable{
		Type: irminmodels.WorkflowableTypePipeline,
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
	sqidManager *irminsqids.SQIDManager,
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
		return formatActionWorkflowable(actionWorkflowable, sqidManager), nil
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
