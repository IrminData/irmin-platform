package irminmodels

type FieldMapping struct {
	SourcePath       string  `json:"source_path"`
	SourceField      *string `json:"source_field,omitempty"`
	DestinationPath  string  `json:"destination_path"`
	DestinationField *string `json:"destination_field,omitempty"`
}

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
	RepositoryBranch *string `json:"repository_branch,omitempty"`
	RepositoryPath   *string `json:"repository_path,omitempty"`
}

type ActionInputData struct {
	Repository     string `json:"repository"`
	RepositoryRef  string `json:"repository_ref"`
	RepositoryPath string `json:"repository_path"`
}

type Workflowable struct {
	Type             WorkflowableType  `json:"type"`
	ConnectionID     string            `json:"connection_id,omitempty"`
	ConnectionPath   string            `json:"connection_path,omitempty"`
	Repository       string            `json:"repository,omitempty"`
	RepositoryBranch string            `json:"repository_branch,omitempty"`
	RepositoryPath   string            `json:"repository_path,omitempty"`
	Live             bool              `json:"live,omitempty"`
	Stages           []PipelineStage   `json:"stages,omitempty"`
	Executable       string            `json:"executable,omitempty"`
	Input            []ActionInputData `json:"input,omitempty"`
	FieldMappings    []FieldMapping    `json:"field_mappings,omitempty"`
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
