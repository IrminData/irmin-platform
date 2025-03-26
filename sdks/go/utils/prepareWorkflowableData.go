package irminUtils

import (
	"fmt"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func PrepareWorkflowableData(workflowable irminModels.Workflowable) (map[string]string, error) {
	fields := make(map[string]string)

	switch workflowable.Type {
	case irminModels.WorkflowableTypeImport:
		fields["connection_id"] = workflowable.ConnectionID
		fields["connection_path"] = workflowable.ConnectionPath
		fields["repository"] = workflowable.Repository
		fields["branch"] = workflowable.Branch
		fields["path"] = workflowable.Path
	case irminModels.WorkflowableTypeExport:
		fields["connection_id"] = workflowable.ConnectionID
		fields["connection_path"] = workflowable.ConnectionPath
		fields["repository"] = workflowable.Repository
		fields["branch"] = workflowable.Branch
		fields["path"] = workflowable.Path
		fields["recursive"] = fmt.Sprintf("%t", workflowable.Recursive)
	case irminModels.WorkflowableTypeAction:
		fields["executable"] = workflowable.Executable
		fields["repository"] = workflowable.Repository
		fields["branch"] = workflowable.Branch
		fields["path"] = workflowable.Path
	case irminModels.WorkflowableTypePipeline:
		fields["live"] = fmt.Sprintf("%t", workflowable.Live)
		for i, stage := range workflowable.Stages {
			fields[fmt.Sprintf("stages[%d].type", i)] = string(stage.Type)
			fields[fmt.Sprintf("stages[%d].description", i)] = stage.Description
			fields[fmt.Sprintf("stages[%d].read", i)] = fmt.Sprintf("%t", stage.Read)
			fields[fmt.Sprintf("stages[%d].write", i)] = fmt.Sprintf("%t", stage.Write)
			switch stage.Type {
			case irminModels.PipelineStageTypeRepository:
				fields[fmt.Sprintf("stages[%d].repository", i)] = *stage.Repository
				fields[fmt.Sprintf("stages[%d].branch", i)] = *stage.RepositoryBranch
				fields[fmt.Sprintf("stages[%d].path", i)] = *stage.RepositoryPath
			case irminModels.PipelineStageTypeAction:
				fields[fmt.Sprintf("stages[%d].executable", i)] = *stage.Executable
			case irminModels.PipelineStageTypeConnection:
				fields[fmt.Sprintf("stages[%d].connection", i)] = *stage.ConnectionID
				fields[fmt.Sprintf("stages[%d].connection_read_path", i)] = *stage.ConnectionReadPath
				fields[fmt.Sprintf("stages[%d].connection_write_path", i)] = *stage.ConnectionWritePath
			default:
				return nil, fmt.Errorf("invalid pipeline stage type: %s", stage.Type)
			}
		}
	default:
		return nil, fmt.Errorf("invalid workflowable type: %s", workflowable.Type)
	}

	return fields, nil
}
