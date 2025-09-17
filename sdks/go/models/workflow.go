package irminmodels

type FieldMapping struct {
	SourcePath       string  `json:"source_path"                 validate:"required" example:"/data/customers.csv"`
	SourceField      *string `json:"source_field,omitempty"                          example:"email"`
	DestinationPath  string  `json:"destination_path"            validate:"required" example:"/processed/customers.json"`
	DestinationField *string `json:"destination_field,omitempty"                     example:"customer_email"`
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
	Description   string            `json:"description"    validate:"required,max=200"                                               example:"Process customer data"`
	Write         bool              `json:"write"                                                                                    example:"true"`
	Read          bool              `json:"read"                                                                                     example:"true"`
	OrderSequence int               `json:"order_sequence" validate:"required"                                                       example:"1"`
	Type          PipelineStageType `json:"type"           validate:"required,oneof=action connection repository,validpipelinestage" example:"repository"`

	// Action stage specific
	Executable *string `json:"executable,omitempty" validate:"min=1" example:"python data_processor.py"`

	// Connection stage specific
	ConnectionID        *string   `json:"connection_id,omitempty"         validate:"validsqid=connections" example:"conn_8x2m9k4n7p5q"`
	ConnectionWritePath *string   `json:"connection_write_path,omitempty"                                  example:"/exports/processed_data.csv"`
	ConnectionReadPaths *[]string `json:"connection_read_paths,omitempty" validate:"dive"                  example:"/imports/raw_data.csv,/imports/metadata.json"`

	// Repository stage specific
	Repository          *string   `json:"repository,omitempty"            example:"customer-analytics"`
	RepositoryBranch    *string   `json:"repository_branch,omitempty"     example:"main"`
	RepositoryWritePath *string   `json:"repository_write_path,omitempty" validate:"omitempty" example:"/processed/customers.json"`
	RepositoryReadPaths *[]string `json:"repository_read_paths,omitempty" example:"/raw/customers.csv,/config/schema.json" validate:"dive"`
}

type ActionInputData struct {
	Repository     string `json:"repository"      validate:"required" example:"customer-analytics"`
	RepositoryRef  string `json:"repository_ref"  validate:"required" example:"main"`
	RepositoryPath string `json:"repository_path" validate:"omitempty" example:"/data/customers.csv"`
}

type Workflowable struct {
	Type WorkflowableType `json:"type" validate:"required,oneof=import action export pipeline,validworkflowable" example:"import"`

	// Import & Export workflowable
	FieldMappings    []FieldMapping `json:"field_mappings,omitempty"    validate:"dive,required_if=Type import,required_if=Type export"`
	ConnectionID     string         `json:"connection_id,omitempty"     validate:"validsqid=connections,required_if=Type import,required_if=Type export" example:"conn_8x2m9k4n7p5q"`
	Repository       string         `json:"repository,omitempty"        validate:"required_if=Type import,required_if=Type export"                       example:"customer-analytics"`
	RepositoryBranch string         `json:"repository_branch,omitempty" validate:"required_if=Type import,required_if=Type export"                       example:"main"`

	// Import workflowable

	ImportFromConnectionPaths []string `json:"import_from_connection_paths,omitempty" validate:"dive,required_if=Type import" example:"/exports/customers.csv,/exports/metadata.json"`
	ImportToRepositoryPath    string   `json:"import_to_repository_path,omitempty"    validate:"omitempty"      example:"/imported/customers.json"`

	// Export workflowable

	ExportFromRepositoryPaths []string `json:"export_from_repository_paths,omitempty" validate:"dive,required_if=Type export" example:"/processed/customers.json,/processed/summary.json"`
	ExportToConnectionPath    string   `json:"export_to_connection_path,omitempty"    validate:"omitempty"      example:"/exports/final_data.csv"`

	// Pipeline workflowable

	Live   bool            `json:"live,omitempty"   example:"true"`
	Stages []PipelineStage `json:"stages,omitempty"                validate:"dive"`

	// Action workflowable

	Executable              string            `json:"executable,omitempty"                validate:"required_if=Type action" example:"python analyze_data.py"`
	Input                   []ActionInputData `json:"input,omitempty"                     validate:"dive"`
	ResultsRepository       *string           `json:"results_repository,omitempty"                                           example:"analytics-results"`
	ResultsRepositoryBranch *string           `json:"results_repository_branch,omitempty"                                    example:"main"`
	ResultsRepositoryPath   *string           `json:"results_repository_path,omitempty" validate:"omitempty" example:"/results/analysis.json"`
}

type Workflow struct {
	ID            string           `json:"id"                     validate:"required,validsqid=workflows" example:"wf_8x2m9k4n7p5q"`
	Name          string           `json:"name"                   validate:"required,max=100"             example:"Customer Data Import"`
	Description   string           `json:"description"            validate:"max=500"                      example:"Imports customer data from external sources and processes it for analytics"`
	Documentation string           `json:"documentation"          validate:"validdocumentation"           example:"# Customer Data Import"`
	Status        WorkflowStatus   `json:"status"                 validate:"required"                     example:"running"`
	Type          WorkflowableType `json:"type"                   validate:"required"                     example:"import"`
	Owner         User             `json:"owner"                  validate:"required"`
	Tags          []Tag            `json:"tags,omitempty"         validate:"dive"`
	Schedule      *Schedule        `json:"schedule,omitempty"`
	Workflowable  *Workflowable    `json:"workflowable,omitempty"`
}
