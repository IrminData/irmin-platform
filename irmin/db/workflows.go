package db

import (
	"gorm.io/gorm"
)

type WorkflowableType string

const (
	WorkflowableTypeImport   WorkflowableType = "import"
	WorkflowableTypeAction   WorkflowableType = "action"
	WorkflowableTypeExport   WorkflowableType = "export"
	WorkflowableTypePipeline WorkflowableType = "pipeline"
)

type WorkflowStatus string

const (
	WorkflowStatusPaused     WorkflowStatus = "paused"
	WorkflowStatusPending    WorkflowStatus = "pending"
	WorkflowStatusInitiating WorkflowStatus = "initiating"
	WorkflowStatusRunning    WorkflowStatus = "running"
	WorkflowStatusComplete   WorkflowStatus = "complete"
	WorkflowStatusError      WorkflowStatus = "error"
	WorkflowStatusCancelled  WorkflowStatus = "cancelled"
)

type Workflow struct {
	gorm.Model

	Name          string                `json:"name"`
	Description   string                `json:"description"`
	Documentation string                `json:"documentation"`
	Paused        bool                  `json:"paused"`
	Type          WorkflowableType      `json:"type"`
	Workspace     Workspace             `json:"workspace"             gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   uint                  `json:"workspace_id"`
	Owner         User                  `json:"owner"                 gorm:"foreignKey:OwnerID"`
	OwnerID       uint                  `json:"owner_id"`
	Schedule      *Schedule             `json:"schedule,omitempty"    gorm:"foreignKey:ScheduleID"`
	ScheduleID    *uint                 `json:"schedule_id,omitempty"`
	Import        *ImportWorkflowable   `json:"import,omitempty"      gorm:"foreignKey:ImportID"`
	ImportID      *uint                 `json:"import_id,omitempty"`
	Export        *ExportWorkflowable   `json:"export,omitempty"      gorm:"foreignKey:ExportID"`
	ExportID      *uint                 `json:"export_id,omitempty"`
	Action        *ActionWorkflowable   `json:"action,omitempty"      gorm:"foreignKey:ActionID"`
	ActionID      *uint                 `json:"action_id,omitempty"`
	Pipeline      *PipelineWorkflowable `json:"pipeline,omitempty"    gorm:"foreignKey:PipelineID"`
	PipelineID    *uint                 `json:"pipeline_id,omitempty"`
}

type ImportWorkflowable struct {
	gorm.Model
	Connection     Connection `json:"connection"      gorm:"foreignKey:ConnectionID"`
	ConnectionID   uint       `json:"connection_id"`
	ConnectionPath string     `json:"connection_path"`
	Repository     Repository `json:"repository"      gorm:"foreignKey:RepositoryID"`
	RepositoryID   uint       `json:"repository_id"`
	Branch         string     `json:"branch"`
	Path           string     `json:"path"`
}

type ExportWorkflowable struct {
	gorm.Model
	Connection     Connection `json:"connection"      gorm:"foreignKey:ConnectionID"`
	ConnectionID   uint       `json:"connection_id"`
	ConnectionPath string     `json:"connection_path"`
	Repository     Repository `json:"repository"      gorm:"foreignKey:RepositoryID"`
	RepositoryID   uint       `json:"repository_id"`
	Branch         string     `json:"branch"`
	Path           string     `json:"path"`
}

type ActionWorkflowableInput struct {
	gorm.Model
	Repository           Repository          `json:"repository"             gorm:"foreignKey:RepositoryID"`
	RepositoryID         uint                `json:"repository_id"`
	Ref                  string              `json:"ref"`
	Path                 string              `json:"path"`
	ActionWorkflowable   *ActionWorkflowable `json:"action_workflowable"    gorm:"foreignKey:ActionWorkflowableID"`
	ActionWorkflowableID *uint               `json:"action_workflowable_id"`
}

type ActionWorkflowable struct {
	gorm.Model
	Executable   string                    `json:"executable"`
	Repository   *Repository               `json:"repository,omitempty"    gorm:"foreignKey:RepositoryID"`
	RepositoryID *uint                     `json:"repository_id,omitempty"`
	Branch       *string                   `json:"branch,omitempty"`
	Path         *string                   `json:"path,omitempty"`
	Inputs       []ActionWorkflowableInput `json:"inputs"                  gorm:"foreignKey:ActionWorkflowableID"`
}

type PipelineWorkflowable struct {
	gorm.Model
	Live   bool            `json:"live"`
	Stages []PipelineStage `json:"stages" gorm:"foreignKey:PipelineID"`
}

type PipelineStageType string

const (
	PipelineStageTypeAction     PipelineStageType = "action"
	PipelineStageTypeConnection PipelineStageType = "connection"
	PipelineStageTypeRepository PipelineStageType = "repository"
)

type PipelineStage struct {
	gorm.Model
	OrderSequence int                   `json:"order_sequence"`
	Description   string                `json:"description"`
	Write         bool                  `json:"write"`
	Read          bool                  `json:"read"`
	Pipeline      *PipelineWorkflowable `json:"pipeline"                        gorm:"foreignKey:PipelineID"`
	PipelineID    *uint                 `json:"pipeline_id"`
	Type          PipelineStageType     `json:"type"`
	// Action
	Executable *string `json:"executable,omitempty"`
	// Connection
	Connection          *Connection `json:"connection,omitempty"            gorm:"foreignKey:ConnectionID"`
	ConnectionID        *uint       `json:"connection_id,omitempty"`
	ConnectionWritePath *string     `json:"connection_write_path,omitempty"`
	ConnectionReadPath  *string     `json:"connection_read_path,omitempty"`
	// Repository
	Repository       *Repository `json:"repository"                      gorm:"foreignKey:RepositoryID"`
	RepositoryID     *uint       `json:"repository_id,omitempty"`
	RepositoryBranch *string     `json:"branch,omitempty"`
	RepositoryPath   *string     `json:"path,omitempty"`
}

// GetWorkflowsByWorkspaceID retrieves all workflows for a workspace.
func (d *Database) GetWorkflowsByWorkspaceID(workspaceID uint) ([]Workflow, error) {
	var workflows []Workflow
	result := d.Preload("Owner").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&workflows)
	return workflows, result.Error
}

// GetWorkflowsOfTypeByWorkspaceID retrieves all workflows of a specific type for a workspace.
func (d *Database) GetWorkflowsOfTypeByWorkspaceID(
	workspaceID uint,
	workflowType WorkflowableType,
) ([]Workflow, error) {
	var workflows []Workflow
	result := d.Preload("Owner").
		Where("workspace_id = ? AND type = ?", workspaceID, workflowType).
		Order("created_at desc").
		Find(&workflows)
	return workflows, result.Error
}

// GetWorkflowByID retrieves a workflow by its ID.
func (d *Database) GetWorkflowByID(id uint) (*Workflow, error) {
	var workflow Workflow
	result := d.Preload("Owner").
		Preload("Workspace").
		Preload("Schedule").
		Preload("Schedule.Triggers").
		Preload("Schedule.Triggers.Repository").
		First(&workflow, id)
	return &workflow, result.Error
}

// GetImportWorkflowableByID retrieves an import workflowable by its ID.
func (d *Database) GetImportWorkflowableByID(id uint) (*ImportWorkflowable, error) {
	var importWorkflow ImportWorkflowable
	result := d.Preload("Connection").Preload("Connection.Connector").Preload("Repository").First(&importWorkflow, id)
	return &importWorkflow, result.Error
}

// GetExportWorkflowableByID retrieves an export workflowable by its ID.
func (d *Database) GetExportWorkflowableByID(id uint) (*ExportWorkflowable, error) {
	var exportWorkflow ExportWorkflowable
	result := d.Preload("Connection").Preload("Connection.Connector").Preload("Repository").First(&exportWorkflow, id)
	return &exportWorkflow, result.Error
}

// GetActionWorkflowableByID retrieves an action workflowable by its ID.
func (d *Database) GetActionWorkflowableByID(id uint) (*ActionWorkflowable, error) {
	var actionWorkflow ActionWorkflowable
	result := d.Preload("Repository").Preload("Inputs").Preload("Inputs.Repository").First(&actionWorkflow, id)
	return &actionWorkflow, result.Error
}

// GetPipelineWorkflowableByID retrieves a pipeline workflowable by its ID.
func (d *Database) GetPipelineWorkflowableByID(id uint) (*PipelineWorkflowable, error) {
	var pipeline PipelineWorkflowable
	result := d.Preload("Stages").
		Preload("Stages.Connection").
		Preload("Stages.Connection.Connector").
		Preload("Stages.Repository").
		First(&pipeline, id)
	return &pipeline, result.Error
}

// CreateWorkflow creates a new workflow record in the database.
func (d *Database) CreateWorkflow(workflow *Workflow) (*Workflow, error) {
	if err := d.Create(workflow).Error; err != nil {
		return nil, err
	}
	return workflow, nil
}

// CreateImportWorkflowable creates a new import workflowable record in the database.
func (d *Database) CreateImportWorkflowable(importWorkflow *ImportWorkflowable) (*ImportWorkflowable, error) {
	if err := d.Create(&importWorkflow).Error; err != nil {
		return nil, err
	}
	return importWorkflow, nil
}

// CreateExportWorkflowable creates a new export workflowable record in the database.
func (d *Database) CreateExportWorkflowable(exportWorkflow *ExportWorkflowable) (*ExportWorkflowable, error) {
	if err := d.Create(&exportWorkflow).Error; err != nil {
		return nil, err
	}
	return exportWorkflow, nil
}

// CreateActionWorkflowable creates a new action workflowable record in the database.
func (d *Database) CreateActionWorkflowable(actionWorkflow *ActionWorkflowable) (*ActionWorkflowable, error) {
	if err := d.Create(&actionWorkflow).Error; err != nil {
		return nil, err
	}
	return actionWorkflow, nil
}

// CreatePipelineWorkflowable creates a new pipeline workflowable record in the database.
func (d *Database) CreatePipelineWorkflowable(pipeline *PipelineWorkflowable) (*PipelineWorkflowable, error) {
	if err := d.Create(&pipeline).Error; err != nil {
		return nil, err
	}
	return pipeline, nil
}

// UpdateWorkflow updates an existing workflow record in the database.
func (d *Database) UpdateWorkflow(workflow *Workflow) (*Workflow, error) {
	if err := d.Save(workflow).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated workflow record with all relations
	if err := d.Preload("Owner").
		Preload("Workspace").
		Preload("Schedule").
		Preload("Schedule.Triggers").
		Preload("Schedule.Triggers.Repository").
		First(workflow, workflow.ID).Error; err != nil {
		return nil, err
	}
	return workflow, nil
}

// UpdateImportWorkflowable updates an existing import workflowable record in the database.
func (d *Database) UpdateImportWorkflowable(importWorkflow *ImportWorkflowable) (*ImportWorkflowable, error) {
	if err := d.Save(importWorkflow).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated import workflowable record with all relations
	if err := d.Preload("Connection").
		Preload("Connection.Connector").
		Preload("Repository").
		First(importWorkflow, importWorkflow.ID).Error; err != nil {
		return nil, err
	}
	return importWorkflow, nil
}

// UpdateExportWorkflowable updates an existing export workflowable record in the database.
func (d *Database) UpdateExportWorkflowable(exportWorkflow *ExportWorkflowable) (*ExportWorkflowable, error) {
	if err := d.Save(exportWorkflow).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated export workflowable record with all relations
	if err := d.Preload("Connection").
		Preload("Connection.Connector").
		Preload("Repository").
		First(exportWorkflow, exportWorkflow.ID).Error; err != nil {
		return nil, err
	}
	return exportWorkflow, nil
}

// UpdateActionWorkflowable updates an existing action workflowable record in the database.
func (d *Database) UpdateActionWorkflowable(actionWorkflow *ActionWorkflowable) (*ActionWorkflowable, error) {
	if err := d.Save(actionWorkflow).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated action workflowable record with all relations
	if err := d.Preload("Repository").
		Preload("Inputs").
		First(actionWorkflow, actionWorkflow.ID).Error; err != nil {
		return nil, err
	}
	return actionWorkflow, nil
}

// UpdatePipelineWorkflowable updates an existing pipeline workflowable record in the database.
func (d *Database) UpdatePipelineWorkflowable(pipeline *PipelineWorkflowable) (*PipelineWorkflowable, error) {
	if err := d.Save(pipeline).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated pipeline workflowable record with all relations
	if err := d.Preload("Stages").
		Preload("Stages.Connection").
		Preload("Stages.Connection.Connector").
		Preload("Stages.Repository").
		First(pipeline, pipeline.ID).Error; err != nil {
		return nil, err
	}
	return pipeline, nil
}

// UpdatePipelineStage updates an existing pipeline stage record in the database.
func (d *Database) UpdatePipelineStage(pipelineStage *PipelineStage) (*PipelineStage, error) {
	if err := d.Save(pipelineStage).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated pipeline stage record with all relations
	if err := d.Preload("Pipeline").
		First(pipelineStage, pipelineStage.ID).Error; err != nil {
		return nil, err
	}
	return pipelineStage, nil
}

// DeleteWorkflow deletes a workflow and all related records.
func (d *Database) DeleteWorkflow(id uint) error {
	// First get the workflow to ensure it exists and to get related IDs
	var workflow Workflow
	if err := d.First(&workflow, id).Error; err != nil {
		return err
	}

	// Delete in a transaction to ensure atomicity
	return d.Transaction(func(tx *gorm.DB) error {
		// Delete workflow runs first
		if err := tx.Where("workflow_id = ?", id).Delete(&WorkflowRun{}).Error; err != nil {
			return err
		}

		// Delete schedule and its triggers if exists
		if workflow.ScheduleID != nil {
			if err := tx.Where("schedule_id = ?", *workflow.ScheduleID).Delete(&WorkflowTrigger{}).Error; err != nil {
				return err
			}
			if err := tx.Delete(&Schedule{}, *workflow.ScheduleID).Error; err != nil {
				return err
			}
		}

		// Delete workflowable based on type
		switch workflow.Type {
		case WorkflowableTypeImport:
			if workflow.ImportID != nil {
				if err := tx.Delete(&ImportWorkflowable{}, *workflow.ImportID).Error; err != nil {
					return err
				}
			}
		case WorkflowableTypeExport:
			if workflow.ExportID != nil {
				if err := tx.Delete(&ExportWorkflowable{}, *workflow.ExportID).Error; err != nil {
					return err
				}
			}
		case WorkflowableTypeAction:
			if workflow.ActionID != nil {
				// Delete action inputs first
				if err := tx.Where("action_workflowable_id = ?", *workflow.ActionID).Delete(&ActionWorkflowableInput{}).Error; err != nil {
					return err
				}
				if err := tx.Delete(&ActionWorkflowable{}, *workflow.ActionID).Error; err != nil {
					return err
				}
			}
		case WorkflowableTypePipeline:
			if workflow.PipelineID != nil {
				// Delete pipeline stages first
				if err := tx.Where("pipeline_id = ?", *workflow.PipelineID).Delete(&PipelineStage{}).Error; err != nil {
					return err
				}
				if err := tx.Delete(&PipelineWorkflowable{}, *workflow.PipelineID).Error; err != nil {
					return err
				}
			}
		}

		// Finally delete the workflow itself
		return tx.Delete(&workflow).Error
	})
}

// DeleteActionWorkflowable deletes an action workflowable and its inputs.
func (d *Database) DeleteActionWorkflowable(id uint) error {
	return d.Transaction(func(tx *gorm.DB) error {
		// Delete action inputs first
		if err := tx.Where("action_workflowable_id = ?", id).Delete(&ActionWorkflowableInput{}).Error; err != nil {
			return err
		}
		// Then delete the action workflowable
		return tx.Delete(&ActionWorkflowable{}, id).Error
	})
}

// DeleteImportWorkflowable deletes an import workflowable.
func (d *Database) DeleteImportWorkflowable(id uint) error {
	return d.Delete(&ImportWorkflowable{}, id).Error
}

// DeleteExportWorkflowable deletes an export workflowable.
func (d *Database) DeleteExportWorkflowable(id uint) error {
	return d.Delete(&ExportWorkflowable{}, id).Error
}

// DeletePipelineWorkflowable deletes a pipeline workflowable and its stages.
func (d *Database) DeletePipelineWorkflowable(id uint) error {
	return d.Transaction(func(tx *gorm.DB) error {
		// Delete pipeline stages first
		if err := tx.Where("pipeline_id = ?", id).Delete(&PipelineStage{}).Error; err != nil {
			return err
		}
		// Then delete the pipeline workflowable
		return tx.Delete(&PipelineWorkflowable{}, id).Error
	})
}
