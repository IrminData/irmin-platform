package models

// WorkflowableType represents the types of workflows that can exist.
type WorkflowableType string

const (
	WorkflowableTypeImport   WorkflowableType = "import"
	WorkflowableTypeAction   WorkflowableType = "action"
	WorkflowableTypeExport   WorkflowableType = "export"
	WorkflowableTypePipeline WorkflowableType = "pipeline"
)

// WorkflowStatus represents the status of a workflow.
type WorkflowStatus string

const (
	WorkflowStatusPaused     WorkflowStatus = "paused"
	WorkflowStatusPending    WorkflowStatus = "pending"
	WorkflowStatusInitiating WorkflowStatus = "initiating"
	WorkflowStatusRunning    WorkflowStatus = "running"
	WorkflowStatusComplete   WorkflowStatus = "complete"
	WorkflowStatusError      WorkflowStatus = "error"
)

// WorkflowBase represents the base structure of a workflow.
type WorkflowBase struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Owner         User              `json:"owner"`
	Schedule      *WorkflowSchedule `json:"schedule,omitempty"`
	Status        WorkflowStatus    `json:"status"`
	Workflowable  interface{}       `json:"workflowable"` // Import, Export, Action, Pipeline
	Description   string            `json:"description"`
	Documentation string            `json:"documentation"`
	CreatedAt     string            `json:"created_at"`
	UpdatedAt     string            `json:"updated_at"`
}

// Workflow represents a polymorphic workflow object.
type Workflow struct {
	WorkflowBase
	Type WorkflowableType `json:"type"`
}

// ImportWorkflow represents a workflow of type "import".
type ImportWorkflow struct {
	WorkflowBase
	Type         WorkflowableType `json:"type"` // "import"
	Workflowable Import           `json:"workflowable"`
}

// ExportWorkflow represents a workflow of type "export".
type ExportWorkflow struct {
	WorkflowBase
	Type         WorkflowableType `json:"type"` // "export"
	Workflowable Export           `json:"workflowable"`
}

// ActionWorkflow represents a workflow of type "action".
type ActionWorkflow struct {
	WorkflowBase
	Type         WorkflowableType `json:"type"` // "action"
	Workflowable Action           `json:"workflowable"`
}

// PipelineWorkflow represents a workflow of type "pipeline".
type PipelineWorkflow struct {
	WorkflowBase
	Type         WorkflowableType `json:"type"` // "pipeline"
	Workflowable Pipeline         `json:"workflowable"`
}

// WorkflowRun represents a single execution of a workflow.
type WorkflowRun struct {
	ID         string         `json:"id"`
	WorkflowID string         `json:"workflow_id"`
	Owner      User           `json:"owner"`
	Status     WorkflowStatus `json:"status"`
	StartedAt  string         `json:"started_at"`
	FinishedAt *string        `json:"finished_at,omitempty"`
}

// Import represents the configuration for an import workflow.
type Import struct {
	Connection     Connection `json:"connection"`
	ConnectionPath string     `json:"connection_path"`
	Repository     Repository `json:"repository"`
	Branch         string     `json:"branch"`
	Path           string     `json:"path"`
}

// Export represents the configuration for an export workflow.
type Export struct {
	Connection     Connection `json:"connection"`
	ConnectionPath string     `json:"connection_path"`
	Repository     Repository `json:"repository"`
	Branch         string     `json:"branch"`
	Path           string     `json:"path"`
	Recursive      bool       `json:"recursive"`
}

// Action represents the configuration for an action workflow.
type Action struct {
	Executable string      `json:"executable"`
	Repository *Repository `json:"repository,omitempty"`
	Branch     *string     `json:"branch,omitempty"`
	Path       *string     `json:"path,omitempty"`
}

// Pipeline represents the configuration for a pipeline workflow.
type Pipeline struct {
	Live   bool            `json:"live"`   // Whether the pipeline runs continuously
	Stages []PipelineStage `json:"stages"` // Chain of stages in the pipeline
}

// PipelineStage interface for dynamic type handling
type PipelineStage interface {
	GetType() string
}

// CommonProperties holds common fields for all pipeline stages
type CommonProperties struct {
	Description string `json:"description"` // Explanation of the stage's responsibility
	Write       bool   `json:"write"`       // Whether the input of the stage should be used
	Read        bool   `json:"read"`        // Whether the result should be passed to the next stage
}

// PipelineStageAction represents a stage that executes an action
type PipelineStageAction struct {
	CommonProperties
	Type       string `json:"type"`       // Always "action"
	Executable string `json:"executable"` // Path to the action script
}

func (a *PipelineStageAction) GetType() string {
	return "action"
}

// PipelineStageConnection represents a stage that uses a connection
type PipelineStageConnection struct {
	CommonProperties
	Type                string     `json:"type"`                  // Always "connection"
	Connection          Connection `json:"connection"`            // Connection details
	ConnectionWritePath string     `json:"connection_write_path"` // Path to write within the connection
	ConnectionReadPath  string     `json:"connection_read_path"`  // Path to read within the connection
}

func (c *PipelineStageConnection) GetType() string {
	return "connection"
}

// PipelineStageRepository represents a stage that uses a repository
type PipelineStageRepository struct {
	CommonProperties
	Type       string     `json:"type"`       // Always "repository"
	Repository Repository `json:"repository"` // Repository details
	Branch     string     `json:"branch"`     // Branch in the repository
	Path       string     `json:"path"`       // Path within the repository
}

func (r *PipelineStageRepository) GetType() string {
	return "repository"
}
