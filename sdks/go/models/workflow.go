package irminmodels

type WorkflowableType string

const (
	WorkflowableTypeImport   WorkflowableType = "import"
	WorkflowableTypeAction   WorkflowableType = "action"
	WorkflowableTypeExport   WorkflowableType = "export"
	WorkflowableTypePipeline WorkflowableType = "pipeline"
)

type WorkflowStatus string

const (
	WorkflowStatusEmpty      WorkflowStatus = ""
	WorkflowStatusPaused     WorkflowStatus = "paused"
	WorkflowStatusPending    WorkflowStatus = "pending"
	WorkflowStatusInitiating WorkflowStatus = "initiating"
	WorkflowStatusRunning    WorkflowStatus = "running"
	WorkflowStatusComplete   WorkflowStatus = "complete"
	WorkflowStatusError      WorkflowStatus = "error"
	WorkflowStatusCancelled  WorkflowStatus = "cancelled"
)

type PipelineStageType string

const (
	PipelineStageTypeAction     PipelineStageType = "action"
	PipelineStageTypeConnection PipelineStageType = "connection"
	PipelineStageTypeRepository PipelineStageType = "repository"
)

type PipelineStage struct {
	Description string            `json:"description"`
	Write       bool              `json:"write"`
	Read        bool              `json:"read"`
	Type        PipelineStageType `json:"type"`
	// Action
	Executable *string `json:"executable,omitempty"`
	// Connection
	ConnectionID        *string `json:"connection_id,omitempty"`
	ConnectionWritePath *string `json:"connection_write_path,omitempty"`
	ConnectionReadPath  *string `json:"connection_read_path,omitempty"`
	// Repository
	Repository       *string `json:"repository,omitempty"`
	RepositoryBranch *string `json:"branch,omitempty"`
	RepositoryPath   *string `json:"path,omitempty"`
}

type ActionInputData struct {
	Repository string `json:"repository"`
	Ref        string `json:"ref"`
	Path       string `json:"path"`
}

type Workflowable struct {
	Type           WorkflowableType  `json:"type"`
	ConnectionID   string            `json:"connection_id,omitempty"`
	ConnectionPath string            `json:"connection_path,omitempty"`
	Repository     string            `json:"repository,omitempty"`
	Branch         string            `json:"branch,omitempty"`
	Path           string            `json:"path,omitempty"`
	Executable     string            `json:"executable,omitempty"`
	Live           bool              `json:"live,omitempty"`
	Stages         []PipelineStage   `json:"stages,omitempty"`
	Input          []ActionInputData `json:"input,omitempty"`
}

type Workflow struct {
	ID            string           `json:"id"`
	Name          string           `json:"name"`
	Description   string           `json:"description"`
	Documentation string           `json:"documentation"`
	Status        WorkflowStatus   `json:"status"`
	Type          WorkflowableType `json:"type"`
	Owner         User             `json:"owner"`
	Tags          []Tag            `json:"tags,omitempty"`
	Schedule      *Schedule        `json:"schedule,omitempty"`
	Workflowable  *Workflowable    `json:"workflowable,omitempty"`
}
