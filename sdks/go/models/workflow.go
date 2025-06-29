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

	// Action stage specific

	Executable *string `json:"executable,omitempty"`

	// Connection stage specific

	ConnectionID         *string  `json:"connection_id,omitempty"`
	ConnectionWritePaths []string `json:"connection_write_paths,omitempty"`
	ConnectionReadPaths  []string `json:"connection_read_paths,omitempty"`

	// Repository stage specific

	Repository       *string  `json:"repository,omitempty"`
	RepositoryBranch *string  `json:"repository_branch,omitempty"`
	RepositoryPaths  []string `json:"repository_paths,omitempty"`
}

type ActionInputData struct {
	Repository     string `json:"repository"`
	RepositoryRef  string `json:"repository_ref"`
	RepositoryPath string `json:"repository_path"`
}

type Workflowable struct {
	Type WorkflowableType `json:"type"`

	// Import & Export workflowable

	FieldMappings    []FieldMapping `json:"field_mappings,omitempty"`
	ConnectionID     string         `json:"connection_id,omitempty"`
	ConnectionPaths  []string       `json:"connection_paths,omitempty"`
	Repository       string         `json:"repository,omitempty"`
	RepositoryBranch string         `json:"repository_branch,omitempty"`
	RepositoryPaths  []string       `json:"repository_paths,omitempty"`

	// Pipeline workflowable

	Live   bool            `json:"live,omitempty"`
	Stages []PipelineStage `json:"stages,omitempty"`

	// Action workflowable

	Executable              string            `json:"executable,omitempty"`
	Input                   []ActionInputData `json:"input,omitempty"`
	ResultsRepository       *string           `json:"results_repository,omitempty"`
	ResultsRepositoryBranch *string           `json:"results_repository_branch,omitempty"`
	ResultsRepositoryPath   string            `json:"results_repository_path,omitempty"`
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
