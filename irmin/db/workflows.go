package db

import "gorm.io/gorm"

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
)

type Workflow struct {
	gorm.Model

	Name          string                `json:"name"`
	Description   string                `json:"description"`
	Documentation string                `json:"documentation"`
	Status        WorkflowStatus        `json:"status"`
	Type          WorkflowableType      `json:"type"`
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
