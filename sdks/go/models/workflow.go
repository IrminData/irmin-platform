package irminmodels

type FieldMapping struct {
	SourcePath       string  `json:"source_path"                 validate:"required,min=1"`
	SourceField      *string `json:"source_field,omitempty"      validate:"min=1"`
	DestinationPath  string  `json:"destination_path"            validate:"required,min=1"`
	DestinationField *string `json:"destination_field,omitempty" validate:"min=1"`
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
	Description   string            `json:"description"    validate:"required,min=1,max=200"`
	Write         bool              `json:"write"`
	Read          bool              `json:"read"`
	OrderSequence int               `json:"order_sequence" validate:"required,min=1"`
	Type          PipelineStageType `json:"type"           validate:"required,oneof=action connection repository"`

	// Action stage specific

	Executable *string `json:"executable,omitempty" validate:"min=1"`

	// Connection stage specific

	ConnectionID        *string  `json:"connection_id,omitempty"         validate:"validsqid=connections"`
	ConnectionWritePath *string  `json:"connection_write_path,omitempty" validate:"min=1"`
	ConnectionReadPaths []string `json:"connection_read_paths,omitempty" validate:"dive,min=1"`

	// Repository stage specific

	Repository          *string  `json:"repository,omitempty"            validate:"min=1"`
	RepositoryBranch    *string  `json:"repository_branch,omitempty"     validate:"min=1"`
	RepositoryWritePath *string  `json:"repository_write_path,omitempty" validate:"min=1"`
	RepositoryReadPaths []string `json:"repository_read_paths,omitempty" validate:"dive,min=1"`
}

type ActionInputData struct {
	Repository     string `json:"repository"      validate:"required,min=1"`
	RepositoryRef  string `json:"repository_ref"  validate:"required,min=1"`
	RepositoryPath string `json:"repository_path" validate:"required,min=1"`
}

type Workflowable struct {
	Type WorkflowableType `json:"type" validate:"required,oneof=import action export pipeline"`

	// Import & Export workflowable

	FieldMappings    []FieldMapping `json:"field_mappings,omitempty"    validate:"dive,required_if=Type import,required_if=Type export"`
	ConnectionID     string         `json:"connection_id,omitempty"     validate:"validsqid=connections,required_if=Type import,required_if=Type export"`
	Repository       string         `json:"repository,omitempty"        validate:"min=1,required_if=Type import,required_if=Type export"`
	RepositoryBranch string         `json:"repository_branch,omitempty" validate:"min=1,required_if=Type import,required_if=Type export"`

	// Import workflowable

	ImportFromConnectionPaths []string `json:"import_from_connection_paths,omitempty" validate:"dive,min=1,required_if=Type import"`
	ImportToRepositoryPath    string   `json:"import_to_repository_path,omitempty"    validate:"min=1,required_if=Type import"`

	// Export workflowable

	ExportFromRepositoryPaths []string `json:"export_from_repository_paths,omitempty" validate:"dive,min=1,required_if=Type export"`
	ExportToConnectionPath    string   `json:"export_to_connection_path,omitempty"    validate:"min=1,required_if=Type export"`

	// Pipeline workflowable

	Live   bool            `json:"live,omitempty"`
	Stages []PipelineStage `json:"stages,omitempty" validate:"dive"`

	// Action workflowable

	Executable              string            `json:"executable,omitempty"                validate:"min=1,required_if=Type action"`
	Input                   []ActionInputData `json:"input,omitempty"                     validate:"dive"`
	ResultsRepository       *string           `json:"results_repository,omitempty"        validate:"min=1"`
	ResultsRepositoryBranch *string           `json:"results_repository_branch,omitempty" validate:"min=1"`
	ResultsRepositoryPath   string            `json:"results_repository_path,omitempty"   validate:"min=1"`
}

type Workflow struct {
	ID            string           `json:"id"                     validate:"required,validsqid=workflows"`
	Name          string           `json:"name"                   validate:"required,min=1,max=100"`
	Description   string           `json:"description"            validate:"max=500"`
	Documentation string           `json:"documentation"`
	Status        WorkflowStatus   `json:"status"                 validate:"required,oneof=paused pending initiating running complete error cancelled"`
	Type          WorkflowableType `json:"type"                   validate:"required,oneof=import action export pipeline"`
	Owner         User             `json:"owner"                  validate:"required"`
	Tags          []Tag            `json:"tags,omitempty"         validate:"dive"`
	Schedule      *Schedule        `json:"schedule,omitempty"`
	Workflowable  *Workflowable    `json:"workflowable,omitempty"`
}
