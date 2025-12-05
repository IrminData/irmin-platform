package db

import (
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

const (
	// DefaultWorkflowListLimit is the default limit for workflow listings to improve performance.
	DefaultWorkflowListLimit = 100
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
	FieldMappings             []irminmodels.FieldMapping `json:"field_mappings,omitempty"     gorm:"type:jsonb;serializer:json"`
	Connection                Connection                 `json:"connection"                   gorm:"foreignKey:ConnectionID"`
	ConnectionID              uint                       `json:"connection_id"                gorm:"index"`
	ImportFromConnectionPaths []string                   `json:"import_from_connection_paths" gorm:"type:jsonb;serializer:json"`
	ImportToRepositoryPath    string                     `json:"import_to_repository_path"`
	Repository                Repository                 `json:"repository"                   gorm:"foreignKey:RepositoryID"`
	RepositoryID              uint                       `json:"repository_id"                gorm:"index"`
	RepositoryBranch          string                     `json:"repository_branch"`
}

type ExportWorkflowable struct {
	gorm.Model
	FieldMappings             []irminmodels.FieldMapping `json:"field_mappings,omitempty"     gorm:"type:jsonb;serializer:json"`
	Connection                Connection                 `json:"connection"                   gorm:"foreignKey:ConnectionID"`
	ConnectionID              uint                       `json:"connection_id"                gorm:"index"`
	ExportFromRepositoryPaths []string                   `json:"export_from_repository_paths" gorm:"type:jsonb;serializer:json"`
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
	ScriptID                uint                      `json:"script_id"                 gorm:"index"`
	Script                  StoredScript              `json:"script"                    gorm:"foreignKey:ScriptID"`
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

	ScriptID *uint         `json:"script_id,omitempty"`
	Script   *StoredScript `json:"script,omitempty"    gorm:"foreignKey:ScriptID"`

	// Connection stage specific

	Connection          *Connection `json:"connection,omitempty"            gorm:"foreignKey:ConnectionID"`
	ConnectionID        *uint       `json:"connection_id,omitempty"`
	ConnectionWritePath *string     `json:"connection_write_path,omitempty"`
	ConnectionReadPaths []string    `json:"connection_read_paths"           gorm:"type:jsonb;serializer:json"`

	// Repository stage specific

	Repository          *Repository `json:"repository"                      gorm:"foreignKey:RepositoryID"`
	RepositoryID        *uint       `json:"repository_id,omitempty"`
	RepositoryBranch    *string     `json:"repository_branch,omitempty"`
	RepositoryWritePath *string     `json:"repository_write_path,omitempty"`
	RepositoryReadPaths []string    `json:"repository_read_paths"           gorm:"type:jsonb;serializer:json"`
}

// GetWorkflowsByWorkspaceID retrieves all workflows for a workspace.
// Optimized for listing - minimal preloads, reasonable limit.
func (d *Database) GetWorkflowsByWorkspaceID(workspaceID uint) ([]Workflow, error) {
	var workflows []Workflow
	result := d.Select("id, name, description, documentation, type, created_at, updated_at, owner_id, paused, workspace_id, schedule_id, import_id, export_id, action_id, pipeline_id").
		Preload("Owner").
		Preload("Tags").
		Preload("Schedule").
		Where(&Workflow{WorkspaceID: workspaceID}).
		Order("created_at desc").
		Limit(DefaultWorkflowListLimit).
		Find(&workflows)
	return workflows, result.Error
}

// GetWorkflowsOfTypeByWorkspaceID retrieves all workflows of a specific type for a workspace.
// Optimized for listing - minimal preloads, reasonable limit.
func (d *Database) GetWorkflowsOfTypeByWorkspaceID(
	workspaceID uint,
	workflowType irminmodels.WorkflowableType,
) ([]Workflow, error) {
	var workflows []Workflow
	result := d.Select("id, name, description, documentation, type, created_at, updated_at, owner_id, paused, workspace_id, schedule_id, import_id, export_id, action_id, pipeline_id").
		Preload("Owner").
		Preload("Tags").
		Preload("Schedule").
		Where(&Workflow{WorkspaceID: workspaceID, Type: workflowType}).
		Order("created_at desc").
		Limit(DefaultWorkflowListLimit).
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
	result := d.Preload("Connection").
		Preload("Connection.Connector").
		Preload("Repository").
		First(&importWorkflow, id)
	return &importWorkflow, result.Error
}

// GetExportWorkflowableByID retrieves an export workflowable by its ID.
func (d *Database) GetExportWorkflowableByID(id uint) (*ExportWorkflowable, error) {
	var exportWorkflow ExportWorkflowable
	result := d.Preload("Connection").
		Preload("Connection.Connector").
		Preload("Repository").
		First(&exportWorkflow, id)
	return &exportWorkflow, result.Error
}

// GetActionWorkflowableByID retrieves an action workflowable by its ID.
func (d *Database) GetActionWorkflowableByID(id uint) (*ActionWorkflowable, error) {
	var actionWorkflow ActionWorkflowable
	result := d.Preload("Repository").
		Preload("Inputs").
		Preload("Inputs.Repository").
		Preload("Script").
		First(&actionWorkflow, id)
	return &actionWorkflow, result.Error
}

// GetPipelineWorkflowableByID retrieves a pipeline workflowable by its ID.
func (d *Database) GetPipelineWorkflowableByID(id uint) (*PipelineWorkflowable, error) {
	var pipeline PipelineWorkflowable
	result := d.Preload("Stages").
		Preload("Stages.Connection").
		Preload("Stages.Connection.Connector").
		Preload("Stages.Repository").
		Preload("Stages.Script").
		First(&pipeline, id)
	return &pipeline, result.Error
}

// deleteWorkflowSchedule deletes a workflow's schedule and associated triggers if they exist.
func (d *Database) deleteWorkflowSchedule(tx *gorm.DB, scheduleID *uint) error {
	if scheduleID == nil {
		return nil
	}

	// Delete workflow triggers associated with this schedule
	if err := tx.Where(&WorkflowTrigger{ScheduleID: scheduleID}).Delete(&WorkflowTrigger{}).Error; err != nil {
		return err
	}
	// Delete the schedule itself
	return tx.Delete(&Schedule{}, *scheduleID).Error
}

// deleteWorkflowImport deletes a workflow's import workflowable if it exists.
func (d *Database) deleteWorkflowImport(tx *gorm.DB, importID *uint) error {
	if importID == nil {
		return nil
	}
	return tx.Delete(&ImportWorkflowable{}, *importID).Error
}

// deleteWorkflowExport deletes a workflow's export workflowable if it exists.
func (d *Database) deleteWorkflowExport(tx *gorm.DB, exportID *uint) error {
	if exportID == nil {
		return nil
	}
	return tx.Delete(&ExportWorkflowable{}, *exportID).Error
}

// deleteWorkflowAction deletes a workflow's action workflowable if it exists.
func (d *Database) deleteWorkflowAction(tx *gorm.DB, actionID *uint) error {
	if actionID == nil {
		return nil
	}
	return tx.Delete(&ActionWorkflowable{}, *actionID).Error
}

// deleteWorkflowPipeline deletes a workflow's pipeline workflowable and its stages if they exist.
func (d *Database) deleteWorkflowPipeline(tx *gorm.DB, pipelineID *uint) error {
	if pipelineID == nil {
		return nil
	}

	// Delete pipeline stages first
	if err := tx.Where(&PipelineStage{PipelineID: pipelineID}).Delete(&PipelineStage{}).Error; err != nil {
		return err
	}
	// Delete the pipeline itself
	return tx.Delete(&PipelineWorkflowable{}, *pipelineID).Error
}

// DeleteWorkflow deletes a workflow and all related records.
func (d *Database) DeleteWorkflow(tx *gorm.DB, id uint) error {
	// First get the workflow to ensure it exists and to get related IDs
	var workflow Workflow
	if err := tx.First(&workflow, id).Error; err != nil {
		return err
	}

	// Remove tag associations first
	if err := tx.Where(&WorkflowTag{WorkflowID: id}).Delete(&WorkflowTag{}).Error; err != nil {
		return err
	}

	// Delete workflow runs
	if err := tx.Where(&WorkflowRun{WorkflowID: id}).Delete(&WorkflowRun{}).Error; err != nil {
		return err
	}

	// Delete schedule and its triggers if exists
	if err := d.deleteWorkflowSchedule(tx, workflow.ScheduleID); err != nil {
		return err
	}

	// Delete workflowable based on type
	if err := d.deleteWorkflowImport(tx, workflow.ImportID); err != nil {
		return err
	}
	if err := d.deleteWorkflowExport(tx, workflow.ExportID); err != nil {
		return err
	}
	if err := d.deleteWorkflowAction(tx, workflow.ActionID); err != nil {
		return err
	}
	if err := d.deleteWorkflowPipeline(tx, workflow.PipelineID); err != nil {
		return err
	}

	// Finally delete the workflow itself
	return tx.Delete(&Workflow{}, id).Error
}
