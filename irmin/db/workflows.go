package db

import (
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

type Workflow struct {
	gorm.Model

	Name          string                       `json:"name"`
	Description   string                       `json:"description"`
	Documentation string                       `json:"documentation"`
	Paused        bool                         `json:"paused"`
	Type          irminmodels.WorkflowableType `json:"type"                  gorm:"index"`
	Workspace     Workspace                    `json:"workspace"             gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   uint                         `json:"workspace_id"          gorm:"index"`
	Owner         User                         `json:"owner"                 gorm:"foreignKey:OwnerID"`
	OwnerID       uint                         `json:"owner_id"`
	Schedule      *Schedule                    `json:"schedule,omitempty"    gorm:"foreignKey:ScheduleID"`
	ScheduleID    *uint                        `json:"schedule_id,omitempty" gorm:"index"`
	Import        *ImportWorkflowable          `json:"import,omitempty"      gorm:"foreignKey:ImportID"`
	ImportID      *uint                        `json:"import_id,omitempty"   gorm:"index"`
	Export        *ExportWorkflowable          `json:"export,omitempty"      gorm:"foreignKey:ExportID"`
	ExportID      *uint                        `json:"export_id,omitempty"   gorm:"index"`
	Action        *ActionWorkflowable          `json:"action,omitempty"      gorm:"foreignKey:ActionID"`
	ActionID      *uint                        `json:"action_id,omitempty"   gorm:"index"`
	Pipeline      *PipelineWorkflowable        `json:"pipeline,omitempty"    gorm:"foreignKey:PipelineID"`
	PipelineID    *uint                        `json:"pipeline_id,omitempty" gorm:"index"`
	Tags          []Tag                        `json:"tags,omitempty"        gorm:"many2many:workflow_tags;"`
}

type ImportWorkflowable struct {
	gorm.Model
	FieldMappings             []irminmodels.FieldMapping `json:"field_mappings,omitempty"     gorm:"type:jsonb"`
	Connection                Connection                 `json:"connection"                   gorm:"foreignKey:ConnectionID"`
	ConnectionID              uint                       `json:"connection_id"                gorm:"index"`
	ImportFromConnectionPaths []string                   `json:"import_from_connection_paths" gorm:"type:jsonb"`
	ImportToRepositoryPath    string                     `json:"import_to_repository_path"`
	Repository                Repository                 `json:"repository"                   gorm:"foreignKey:RepositoryID"`
	RepositoryID              uint                       `json:"repository_id"                gorm:"index"`
	RepositoryBranch          string                     `json:"repository_branch"`
}

type ExportWorkflowable struct {
	gorm.Model
	FieldMappings             []irminmodels.FieldMapping `json:"field_mappings,omitempty"     gorm:"type:jsonb"`
	Connection                Connection                 `json:"connection"                   gorm:"foreignKey:ConnectionID"`
	ConnectionID              uint                       `json:"connection_id"                gorm:"index"`
	ExportFromRepositoryPaths []string                   `json:"export_from_repository_paths" gorm:"type:jsonb"`
	ExportToConnectionPath    string                     `json:"export_to_connection_path"`
	Repository                Repository                 `json:"repository"                   gorm:"foreignKey:RepositoryID"`
	RepositoryID              uint                       `json:"repository_id"                gorm:"index"`
	RepositoryBranch          string                     `json:"repository_branch"`
}

type ActionWorkflowableInput struct {
	gorm.Model
	Repository           Repository          `json:"repository"             gorm:"foreignKey:RepositoryID"`
	RepositoryID         uint                `json:"repository_id"          gorm:"index"`
	RepositoryRef        string              `json:"repository_ref"`
	RepositoryPath       string              `json:"repository_path"`
	ActionWorkflowable   *ActionWorkflowable `json:"action_workflowable"    gorm:"foreignKey:ActionWorkflowableID"`
	ActionWorkflowableID *uint               `json:"action_workflowable_id"`
}

type ActionWorkflowable struct {
	gorm.Model
	Executable              string                    `json:"executable"`
	ResultsRepository       *Repository               `json:"results_repository"        gorm:"foreignKey:ResultsRepositoryID"`
	ResultsRepositoryID     *uint                     `json:"results_repository_id"     gorm:"index"`
	ResultsRepositoryBranch *string                   `json:"results_repository_branch"`
	ResultsRepositoryPath   *string                   `json:"results_repository_path"`
	Inputs                  []ActionWorkflowableInput `json:"inputs"                    gorm:"foreignKey:ActionWorkflowableID"`
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
	Pipeline      *PipelineWorkflowable `json:"pipeline"       gorm:"foreignKey:PipelineID"`
	PipelineID    *uint                 `json:"pipeline_id"    gorm:"index"`
	Type          PipelineStageType     `json:"type"`

	// Action stage specific

	Executable *string `json:"executable,omitempty"`

	// Connection stage specific

	Connection          *Connection `json:"connection,omitempty"            gorm:"foreignKey:ConnectionID"`
	ConnectionID        *uint       `json:"connection_id,omitempty"`
	ConnectionWritePath *string     `json:"connection_write_path,omitempty"`
	ConnectionReadPaths []string    `json:"connection_read_paths"           gorm:"type:jsonb"`

	// Repository stage specific

	Repository          *Repository `json:"repository"                      gorm:"foreignKey:RepositoryID"`
	RepositoryID        *uint       `json:"repository_id,omitempty"`
	RepositoryBranch    *string     `json:"repository_branch,omitempty"`
	RepositoryWritePath *string     `json:"repository_write_path,omitempty"`
	RepositoryReadPaths []string    `json:"repository_read_paths"           gorm:"type:jsonb"`
}

// GetWorkflowsByWorkspaceID retrieves all workflows for a workspace.
func (d *Database) GetWorkflowsByWorkspaceID(workspaceID uint) ([]Workflow, error) {
	var workflows []Workflow
	result := d.Preload("Owner").
		Preload("Tags").
		Where("workspace_id = ?", workspaceID).
		Order("created_at desc").
		Find(&workflows)
	return workflows, result.Error
}

// GetWorkflowsOfTypeByWorkspaceID retrieves all workflows of a specific type for a workspace.
func (d *Database) GetWorkflowsOfTypeByWorkspaceID(
	workspaceID uint,
	workflowType irminmodels.WorkflowableType,
) ([]Workflow, error) {
	var workflows []Workflow
	result := d.Preload("Owner").
		Preload("Tags").
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
		Preload("Tags").
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

// DeleteWorkflow deletes a workflow and all related records.
func (d *Database) DeleteWorkflow(tx *gorm.DB, id uint) error {
	// First get the workflow to ensure it exists and to get related IDs
	var workflow Workflow
	if err := tx.First(&workflow, id).Error; err != nil {
		return err
	}

	// Remove tag associations first
	if err := tx.Where("workflow_id = ?", id).Delete(&WorkflowTag{}).Error; err != nil {
		return err
	}
	// Delete workflow runs
	if err := tx.Where("workflow_id = ?", id).Delete(&WorkflowRun{}).Error; err != nil {
		return err
	}

	// Delete schedule and its triggers if exists
	if err := tx.Where("schedule_id = ?", *workflow.ScheduleID).Delete(&WorkflowTrigger{}).Error; err != nil {
		return err
	}
	if err := tx.Delete(&Schedule{}, *workflow.ScheduleID).Error; err != nil {
		return err
	}

	// Delete workflowable
	if deleteImportErr := tx.Delete(&ImportWorkflowable{}, *workflow.ImportID).Error; deleteImportErr != nil {
		return deleteImportErr
	}
	if deleteExportErr := tx.Delete(&ExportWorkflowable{}, *workflow.ExportID).Error; deleteExportErr != nil {
		return deleteExportErr
	}
	if deleteActionErr := tx.Delete(&ActionWorkflowable{}, *workflow.ActionID).Error; deleteActionErr != nil {
		return deleteActionErr
	}
	if deletePipelineStagesErr := tx.Where("pipeline_id = ?", *workflow.PipelineID).Delete(&PipelineStage{}).Error; deletePipelineStagesErr != nil {
		return deletePipelineStagesErr
	}
	if deletePipelineErr := tx.Delete(&PipelineWorkflowable{}, *workflow.PipelineID).Error; deletePipelineErr != nil {
		return deletePipelineErr
	}

	// Finally delete the workflow itself
	return tx.Delete(&Workflow{}, id).Error
}
