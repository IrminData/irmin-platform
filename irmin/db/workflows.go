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
	Type          WorkflowableType      `json:"type"`
	Workspace     Workspace             `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   uint                  `json:"workspace_id"`
	Owner         User                  `json:"owner" gorm:"foreignKey:OwnerID"`
	OwnerID       uint                  `json:"owner_id"`
	Schedule      *Schedule             `json:"schedule,omitempty" gorm:"foreignKey:ScheduleID"`
	ScheduleID    *uint                 `json:"schedule_id,omitempty"`
	Import        *ImportWorkflowable   `json:"import,omitempty" gorm:"foreignKey:ImportID"`
	ImportID      *uint                 `json:"import_id,omitempty"`
	Export        *ExportWorkflowable   `json:"export,omitempty" gorm:"foreignKey:ExportID"`
	ExportID      *uint                 `json:"export_id,omitempty"`
	Action        *ActionWorkflowable   `json:"action,omitempty" gorm:"foreignKey:ActionID"`
	ActionID      *uint                 `json:"action_id,omitempty"`
	Pipeline      *PipelineWorkflowable `json:"pipeline,omitempty" gorm:"foreignKey:PipelineID"`
	PipelineID    *uint                 `json:"pipeline_id,omitempty"`
}

type ImportWorkflowable struct {
	gorm.Model
	Connection     Connection `json:"connection" gorm:"foreignKey:ConnectionID"`
	ConnectionID   uint       `json:"connection_id"`
	ConnectionPath string     `json:"connection_path"`
	Repository     Repository `json:"repository" gorm:"foreignKey:RepositoryID"`
	RepositoryID   uint       `json:"repository_id"`
	Branch         string     `json:"branch"`
	Path           string     `json:"path"`
}

type ExportWorkflowable struct {
	gorm.Model
	Connection     Connection `json:"connection" gorm:"foreignKey:ConnectionID"`
	ConnectionID   uint       `json:"connection_id"`
	ConnectionPath string     `json:"connection_path"`
	Repository     Repository `json:"repository" gorm:"foreignKey:RepositoryID"`
	RepositoryID   uint       `json:"repository_id"`
	Branch         string     `json:"branch"`
	Path           string     `json:"path"`
	Recursive      bool       `json:"recursive"`
}

type ActionWorkflowable struct {
	gorm.Model
	Executable   string      `json:"executable"`
	Repository   *Repository `json:"repository,omitempty" gorm:"foreignKey:RepositoryID"`
	RepositoryID *uint       `json:"repository_id,omitempty"`
	Branch       *string     `json:"branch,omitempty"`
	Path         *string     `json:"path,omitempty"`
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
	Description string                `json:"description"`
	Write       bool                  `json:"write"`
	Read        bool                  `json:"read"`
	Pipeline    *PipelineWorkflowable `json:"pipeline" gorm:"foreignKey:PipelineID"`
	PipelineID  *uint                 `json:"pipeline_id"`
	Type        PipelineStageType     `json:"type"`
	// Action
	Executable *string `json:"executable,omitempty"`
	// Connection
	Connection          *Connection `json:"connection,omitempty" gorm:"foreignKey:ConnectionID"`
	ConnectionID        *uint       `json:"connection_id,omitempty"`
	ConnectionWritePath *string     `json:"connection_write_path,omitempty"`
	ConnectionReadPath  *string     `json:"connection_read_path,omitempty"`
	// Repository
	Repository       *Repository `json:"repository" gorm:"foreignKey:RepositoryID"`
	RepositoryID     *uint       `json:"repository_id,omitempty"`
	RepositoryBranch *string     `json:"branch,omitempty"`
	RepositoryPath   *string     `json:"path,omitempty"`
}

// GetWorkflowsByWorkspaceID retrieves all workflows for a workspace
func GetWorkflowsByWorkspaceID(workspaceID uint) ([]Workflow, error) {
	var workflows []Workflow
	result := DB.Preload("Owner").Where("workspace_id = ?", workspaceID).Find(&workflows)
	return workflows, result.Error
}

// GetWorkflowsOfTypeByWorkspaceID retrieves all workflows of a specific type for a workspace
func GetWorkflowsOfTypeByWorkspaceID(workspaceID uint, workflowType WorkflowableType) ([]Workflow, error) {
	var workflows []Workflow
	result := DB.Preload("Owner").Where("workspace_id = ? AND type = ?", workspaceID, workflowType).Find(&workflows)
	return workflows, result.Error
}

// GetWorkflowByID retrieves a workflow by its ID
func GetWorkflowByID(id uint) (*Workflow, error) {
	var workflow Workflow
	result := DB.Preload("Owner").Preload("Schedule").Preload("Schedule.Triggers").Preload("Schedule.Triggers.Repository").First(&workflow, id)
	return &workflow, result.Error
}

// GetImportWorkflowableByID retrieves an import workflowable by its ID
func GetImportWorkflowableByID(id uint) (*ImportWorkflowable, error) {
	var importWorkflow ImportWorkflowable
	result := DB.Preload("Connection").Preload("Connection.Connector").Preload("Repository").First(&importWorkflow, id)
	return &importWorkflow, result.Error
}

// GetExportWorkflowableByID retrieves an export workflowable by its ID
func GetExportWorkflowableByID(id uint) (*ExportWorkflowable, error) {
	var exportWorkflow ExportWorkflowable
	result := DB.Preload("Connection").Preload("Connection.Connector").Preload("Repository").First(&exportWorkflow, id)
	return &exportWorkflow, result.Error
}

// GetActionWorkflowableByID retrieves an action workflowable by its ID
func GetActionWorkflowableByID(id uint) (*ActionWorkflowable, error) {
	var actionWorkflow ActionWorkflowable
	result := DB.Preload("Repository").First(&actionWorkflow, id)
	return &actionWorkflow, result.Error
}

// GetPipelineWorkflowableByID retrieves a pipeline workflowable by its ID
func GetPipelineWorkflowableByID(id uint) (*PipelineWorkflowable, error) {
	var pipeline PipelineWorkflowable
	result := DB.Preload("Stages").Preload("Stages.Connection").Preload("Stages.Connection.Connector").Preload("Stages.Repository").First(&pipeline, id)
	return &pipeline, result.Error
}

// CreateWorkflow creates a new workflow record in the database.
func CreateWorkflow(workflow *Workflow) (*Workflow, error) {
	if err := DB.Create(workflow).Error; err != nil {
		return nil, err
	}
	return workflow, nil
}

// CreateImportWorkflowable creates a new import workflowable record in the database.
func CreateImportWorkflowable(importWorkflow *ImportWorkflowable) (*ImportWorkflowable, error) {
	if err := DB.Create(&importWorkflow).Error; err != nil {
		return nil, err
	}
	return importWorkflow, nil
}

// CreateExportWorkflowable creates a new export workflowable record in the database.
func CreateExportWorkflowable(exportWorkflow *ExportWorkflowable) (*ExportWorkflowable, error) {
	if err := DB.Create(&exportWorkflow).Error; err != nil {
		return nil, err
	}
	return exportWorkflow, nil
}

// CreateActionWorkflowable creates a new action workflowable record in the database.
func CreateActionWorkflowable(actionWorkflow *ActionWorkflowable) (*ActionWorkflowable, error) {
	if err := DB.Create(&actionWorkflow).Error; err != nil {
		return nil, err
	}
	return actionWorkflow, nil
}

// CreatePipelineWorkflowable creates a new pipeline workflowable record in the database.
func CreatePipelineWorkflowable(pipeline *PipelineWorkflowable) (*PipelineWorkflowable, error) {
	if err := DB.Create(&pipeline).Error; err != nil {
		return nil, err
	}
	return pipeline, nil
}

// UpdateWorkflow updates an existing workflow record in the database.
func UpdateWorkflow(id uint, updates map[string]any) (*Workflow, error) {
	var workflow Workflow
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&Workflow{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated workflow record.
	if err := DB.Preload("Owner").Preload("Schedule").Preload("Schedule.Triggers").Preload("Schedule.Triggers.Repository").First(&workflow, id).Error; err != nil {
		return nil, err
	}
	return &workflow, nil
}

// UpdateImportWorkflowable updates an existing import workflowable record in the database.
func UpdateImportWorkflowable(id uint, updates map[string]any) (*ImportWorkflowable, error) {
	var importWorkflow ImportWorkflowable
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&ImportWorkflowable{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated import workflowable record.
	if err := DB.Preload("Connection").Preload("Connection.Connector").Preload("Repository").First(&importWorkflow, id).Error; err != nil {
		return nil, err
	}
	return &importWorkflow, nil
}

// UpdateExportWorkflowable updates an existing export workflowable record in the database.
func UpdateExportWorkflowable(id uint, updates map[string]any) (*ExportWorkflowable, error) {
	var exportWorkflow ExportWorkflowable
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&ExportWorkflowable{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated export workflowable record.
	if err := DB.Preload("Connection").Preload("Connection.Connector").Preload("Repository").First(&exportWorkflow, id).Error; err != nil {
		return nil, err
	}
	return &exportWorkflow, nil
}

// UpdateActionWorkflowable updates an existing action workflowable record in the database.
func UpdateActionWorkflowable(id uint, updates map[string]any) (*ActionWorkflowable, error) {
	var actionWorkflow ActionWorkflowable
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&ActionWorkflowable{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated action workflowable record.
	if err := DB.Preload("Repository").First(&actionWorkflow, id).Error; err != nil {
		return nil, err
	}
	return &actionWorkflow, nil
}

// UpdatePipelineWorkflowable updates an existing pipeline workflowable record in the database.
func UpdatePipelineWorkflowable(id uint, updates map[string]any) (*PipelineWorkflowable, error) {
	var pipeline PipelineWorkflowable
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&PipelineWorkflowable{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated pipeline workflowable record.
	if err := DB.Preload("Stages").Preload("Stages.Connection").Preload("Stages.Connection.Connector").Preload("Stages.Repository").First(&pipeline, id).Error; err != nil {
		return nil, err
	}
	return &pipeline, nil
}

// UpdatePipelineStage updates an existing pipeline stage record in the database.
func UpdatePipelineStage(id uint, updates map[string]any) (*PipelineStage, error) {
	var pipelineStage PipelineStage
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&PipelineStage{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated pipeline stage record.
	if err := DB.Preload("Pipeline").First(&pipelineStage, id).Error; err != nil {
		return nil, err
	}
	return &pipelineStage, nil
}

// DeleteWorkflow deletes a workflow and the related records.
func DeleteWorkflow(id uint) error {
	return DB.Select("Schedule").Select("Schedule.Triggers").Select("Import").Select("Export").Select("Action").Select("Pipeline").Select("Pipeline.Stages").Where("id = ?", id).Delete(&Workflow{}).Error
}

// DeleteActionWorkflowable deletes an action workflowable record.
func DeleteActionWorkflowable(id uint) error {
	return DB.Where("id = ?", id).Delete(&ActionWorkflowable{}).Error
}

// DeleteImportWorkflowable deletes an import workflowable record.
func DeleteImportWorkflowable(id uint) error {
	return DB.Where("id = ?", id).Delete(&ImportWorkflowable{}).Error
}

// DeleteExportWorkflowable deletes an export workflowable record.
func DeleteExportWorkflowable(id uint) error {
	return DB.Where("id = ?", id).Delete(&ExportWorkflowable{}).Error
}

// DeletePipelineWorkflowable deletes a pipeline workflowable record and its stages.
func DeletePipelineWorkflowable(id uint) error {
	return DB.Select("Stages").Where("id = ?", id).Delete(&PipelineWorkflowable{}).Error
}
