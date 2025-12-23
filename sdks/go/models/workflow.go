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
	PipelineStageTypeAction           PipelineStageType = "action"
	PipelineStageTypeConnection       PipelineStageType = "connection"
	PipelineStageTypeRepository       PipelineStageType = "repository"
	PipelineStageTypeRepositoryAction PipelineStageType = "repository_action"
	PipelineStageTypeTriggerWorkflow  PipelineStageType = "trigger_workflow"
	PipelineStageTypeValidation       PipelineStageType = "validation"
)

type RepositoryActionType string

const (
	RepositoryActionTypeCommit RepositoryActionType = "commit"
	RepositoryActionTypeMerge  RepositoryActionType = "merge"
	RepositoryActionTypeRevert RepositoryActionType = "revert"
)

type PipelineStage struct {
	Description   string            `json:"description"    validate:"required,max=200"                                                                                             example:"Process customer data"`
	Write         bool              `json:"write"                                                                                                                                  example:"true"`
	Read          bool              `json:"read"                                                                                                                                   example:"true"`
	OrderSequence int               `json:"order_sequence"                                                                                                                         example:"1"`
	Type          PipelineStageType `json:"type"           validate:"required,oneof=action connection repository repository_action trigger_workflow validation,validpipelinestage" example:"repository"`

	// Action stage specific
	ExecutableType ActionExecutableType `json:"executable_type,omitempty" validate:"omitempty,oneof=script query,required_if=Type action"          example:"script"`
	ScriptID       *string              `json:"script_id,omitempty"       validate:"omitempty,validsqid=scripts,required_if=ExecutableType script" example:"scr_8x2m9k4n7p5q"`
	QueryID        *string              `json:"query_id,omitempty"        validate:"omitempty,validsqid=queries,required_if=ExecutableType query"  example:"qry_8x2m9k4n7p5q"`

	// Connection stage specific
	ConnectionID        *string   `json:"connection_id,omitempty"         validate:"required_if=Type connection" example:"conn_8x2m9k4n7p5q"`
	ConnectionWritePath *string   `json:"connection_write_path,omitempty"                                        example:"/exports/processed_data.csv"`
	ConnectionReadPaths *[]string `json:"connection_read_paths,omitempty" validate:"omitempty,dive"              example:"/imports/raw_data.csv,/imports/metadata.json"`

	// Repository stage specific
	Repository          *string   `json:"repository,omitempty"            validate:"required_if=Type repository" example:"customer-analytics"`
	RepositoryBranch    *string   `json:"repository_branch,omitempty"                                            example:"main"`
	RepositoryWritePath *string   `json:"repository_write_path,omitempty" validate:"omitempty"                   example:"/processed/customers.json"`
	RepositoryReadPaths *[]string `json:"repository_read_paths,omitempty" validate:"omitempty,dive"              example:"/raw/customers.csv,/config/schema.json"`

	// Repository Action stage specific
	RepositoryActionType          *RepositoryActionType `json:"repository_action_type,omitempty"           validate:"omitempty,oneof=commit merge revert,required_if=Type repository_action" example:"commit"`
	RepositoryActionRepository    *string               `json:"repository_action_repository,omitempty"     validate:"required_if=Type repository_action"                                     example:"customer-analytics"`
	RepositoryActionBranch        *string               `json:"repository_action_branch,omitempty"         validate:"required_if=Type repository_action"                                     example:"main"`
	RepositoryActionTargetBranch  *string               `json:"repository_action_target_branch,omitempty"                                                                                    example:"staging"`
	RepositoryActionCommitMessage *string               `json:"repository_action_commit_message,omitempty"                                                                                   example:"Automated commit from workflow"`
	RepositoryActionRevertPath    *string               `json:"repository_action_revert_path,omitempty"                                                                                      example:"/data/customers.csv"`
	RepositoryActionMergeStrategy *string               `json:"repository_action_merge_strategy,omitempty"                                                                                   example:"recursive"`
	RepositoryActionSquash        *bool                 `json:"repository_action_squash,omitempty"                                                                                           example:"false"`
	RepositoryActionAllowEmpty    *bool                 `json:"repository_action_allow_empty,omitempty"                                                                                      example:"false"`

	// Trigger Workflow stage specific
	TriggerWorkflowID *string `json:"trigger_workflow_id,omitempty" validate:"omitempty,validsqid=workflows,required_if=Type trigger_workflow" example:"wf_8x2m9k4n7p5q"`

	// Validation stage specific
	ValidationSchema     *ObjectSchema `json:"validation_schema,omitempty"`
	ValidationMode       *string       `json:"validation_mode,omitempty"` // "single" or "all"
	FailOnError          *bool         `json:"fail_on_error,omitempty"`
	ValidationTargetName *string       `json:"validation_target_name,omitempty"`
}

type ActionInputData struct {
	Repository     string `json:"repository"      validate:"required"  example:"customer-analytics"`
	RepositoryRef  string `json:"repository_ref"  validate:"required"  example:"main"`
	RepositoryPath string `json:"repository_path" validate:"omitempty" example:"/data/customers.csv"`
}

type ActionExecutableType string

const (
	ActionExecutableTypeScript ActionExecutableType = "script"
	ActionExecutableTypeQuery  ActionExecutableType = "query"
)

type Workflowable struct {
	Type WorkflowableType `json:"type" validate:"required,oneof=import action export pipeline,validworkflowable" example:"import"`

	// Import & Export workflowable
	FieldMappings    []FieldMapping `json:"field_mappings,omitempty"    validate:"dive,required_if=Type import,required_if=Type export"`
	ConnectionID     string         `json:"connection_id,omitempty"     validate:"validsqid=connections,required_if=Type import,required_if=Type export" example:"conn_8x2m9k4n7p5q"`
	Repository       string         `json:"repository,omitempty"        validate:"required_if=Type import,required_if=Type export"                       example:"customer-analytics"`
	RepositoryBranch string         `json:"repository_branch,omitempty" validate:"required_if=Type import,required_if=Type export"                       example:"main"`

	// Import workflowable

	ImportFromConnectionPaths []string `json:"import_from_connection_paths,omitempty" example:"/exports/customers.csv,/exports/metadata.json"`
	ImportToRepositoryPath    string   `json:"import_to_repository_path,omitempty"    example:"/imported/customers.json"                      validate:"omitempty"`

	// Export workflowable

	ExportFromRepositoryPaths []string `json:"export_from_repository_paths,omitempty" example:"/processed/customers.json,/processed/summary.json"`
	ExportToConnectionPath    string   `json:"export_to_connection_path,omitempty"    example:"/exports/final_data.csv"`

	// Pipeline workflowable

	Stages []PipelineStage `json:"stages,omitempty" validate:"dive"`

	// Action workflowable

	ExecutableType          ActionExecutableType `json:"executable_type,omitempty"           validate:"omitempty,oneof=script query,required_if=Type action"          example:"script"`
	ScriptID                *string              `json:"script_id,omitempty"                 validate:"required_if=ExecutableType script,omitempty,validsqid=scripts" example:"scr_8x2m9k4n7p5q"`
	QueryID                 *string              `json:"query_id,omitempty"                  validate:"required_if=ExecutableType query,omitempty,validsqid=queries"  example:"qry_8x2m9k4n7p5q"`
	Input                   []ActionInputData    `json:"input,omitempty"                     validate:"dive"`
	ResultsRepository       *string              `json:"results_repository,omitempty"                                                                                 example:"analytics-results"`
	ResultsRepositoryBranch *string              `json:"results_repository_branch,omitempty"                                                                          example:"main"`
	ResultsRepositoryPath   *string              `json:"results_repository_path,omitempty"   validate:"omitempty"                                                     example:"/results/analysis.json"`
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
