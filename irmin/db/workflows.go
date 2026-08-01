package db

import (
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
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
	SyncMode                  string                     `json:"sync_mode"                    gorm:"type:varchar(20);default:'auto'"`
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
	SyncMode                  string                     `json:"sync_mode"                    gorm:"type:varchar(20);default:'auto'"`
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
	ExecutableType          irminmodels.ActionExecutableType `json:"executable_type"`
	ScriptID                *uint                            `json:"script_id"                 gorm:"index"`
	Script                  *StoredScript                    `json:"script"                    gorm:"foreignKey:ScriptID"`
	QueryID                 *uint                            `json:"query_id"                  gorm:"index"`
	Query                   *StoredQuery                     `json:"query"                     gorm:"foreignKey:QueryID"`
	ResultsRepository       *Repository                      `json:"results_repository"        gorm:"foreignKey:ResultsRepositoryID"`
	ResultsRepositoryID     *uint                            `json:"results_repository_id"     gorm:"index"`
	ResultsRepositoryBranch *string                          `json:"results_repository_branch"`
	ResultsRepositoryPath   *string                          `json:"results_repository_path"`
	Inputs                  []ActionWorkflowableInput        `json:"inputs"                    gorm:"foreignKey:ActionWorkflowableID"`
}

type PipelineWorkflowable struct {
	gorm.Model
	Stages []PipelineStage `json:"stages" gorm:"foreignKey:PipelineID"`
}

type PipelineStageType string

const (
	PipelineStageTypeAction           PipelineStageType = "action"
	PipelineStageTypeConnection       PipelineStageType = "connection"
	PipelineStageTypeRepository       PipelineStageType = "repository"
	PipelineStageTypeRepositoryAction PipelineStageType = "repository_action"
	PipelineStageTypeTriggerWorkflow  PipelineStageType = "trigger_workflow"
	PipelineStageTypeValidation       PipelineStageType = "validation"
	PipelineStageTypeTransform        PipelineStageType = "transform"
	PipelineStageTypeEmbeddings       PipelineStageType = "embeddings"
	PipelineStageTypePatch            PipelineStageType = "patch"
	PipelineStageTypeFieldMapping     PipelineStageType = "field_mapping"
)

// DataPassMode controls how a pipeline stage's output merges with existing pipeline data.
type DataPassMode string

const (
	// DataPassModeMerge adds/overwrites files in the pipeline data (default).
	DataPassModeMerge DataPassMode = "merge"
	// DataPassModeReplace clears all previous pipeline data, keeping only this stage's output.
	DataPassModeReplace DataPassMode = "replace"
)

// PatchDirection indicates whether to apply patches to a connection or repository
type PatchDirection string

const (
	PatchDirectionToConnection PatchDirection = "to_connection"
	PatchDirectionToRepository PatchDirection = "to_repository"
)

type PipelineStage struct {
	gorm.Model
	OrderSequence int                   `json:"order_sequence"`
	Description   string                `json:"description"`
	Write         bool                  `json:"write"`
	Read          bool                  `json:"read"`
	DataPassMode  DataPassMode          `json:"data_pass_mode" gorm:"type:varchar(20);default:'merge'"`
	Pipeline      *PipelineWorkflowable `json:"pipeline"       gorm:"foreignKey:PipelineID"`
	PipelineID    *uint                 `json:"pipeline_id"    gorm:"index"`
	Type          PipelineStageType     `json:"type"`

	// Action stage specific

	ExecutableType irminmodels.ActionExecutableType `json:"executable_type,omitempty"`
	ScriptID       *uint                            `json:"script_id,omitempty"`
	Script         *StoredScript                    `json:"script,omitempty"          gorm:"foreignKey:ScriptID"`
	QueryID        *uint                            `json:"query_id,omitempty"`
	Query          *StoredQuery                     `json:"query,omitempty"           gorm:"foreignKey:QueryID"`

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

	// Repository Action stage specific

	RepositoryActionType          *irminmodels.RepositoryActionType `json:"repository_action_type,omitempty"`
	RepositoryActionRepository    *Repository                       `json:"repository_action_repository,omitempty"     gorm:"foreignKey:RepositoryActionRepositoryID"`
	RepositoryActionRepositoryID  *uint                             `json:"repository_action_repository_id,omitempty"`
	RepositoryActionBranch        *string                           `json:"repository_action_branch,omitempty"`
	RepositoryActionTargetBranch  *string                           `json:"repository_action_target_branch,omitempty"`
	RepositoryActionCommitMessage *string                           `json:"repository_action_commit_message,omitempty"`
	RepositoryActionRevertPath    *string                           `json:"repository_action_revert_path,omitempty"`
	RepositoryActionDeletePath    *string                           `json:"repository_action_delete_path,omitempty"`
	RepositoryActionMergeStrategy *string                           `json:"repository_action_merge_strategy,omitempty"`
	RepositoryActionSquash        *bool                             `json:"repository_action_squash,omitempty"`
	RepositoryActionAllowEmpty    *bool                             `json:"repository_action_allow_empty,omitempty"`

	// Trigger Workflow stage specific

	TriggerWorkflow   *Workflow `json:"trigger_workflow,omitempty"    gorm:"foreignKey:TriggerWorkflowID"`
	TriggerWorkflowID *uint     `json:"trigger_workflow_id,omitempty"`

	// Validation stage specific

	ValidationSchema     *irminmodels.ObjectSchema `json:"validation_schema,omitempty"      gorm:"type:jsonb;serializer:json"`
	ValidationMode       *string                   `json:"validation_mode,omitempty"`
	FailOnError          *bool                     `json:"fail_on_error,omitempty"`
	ValidationTargetName *string                   `json:"validation_target_name,omitempty"`

	// Transform stage specific

	TransformOperation      *irminmodels.TransformOperationType `json:"transform_operation,omitempty"`
	TransformMode           *string                             `json:"transform_mode,omitempty"`
	TransformTargetName     *string                             `json:"transform_target_name,omitempty"`
	TransformFieldRenames   []irminmodels.FieldRename           `json:"transform_field_renames,omitempty"    gorm:"type:jsonb;serializer:json"`
	TransformFieldsToRemove []string                            `json:"transform_fields_to_remove,omitempty" gorm:"type:jsonb;serializer:json"`
	TransformOutputName     *string                             `json:"transform_output_name,omitempty"`
	TransformOutputFormat   *irminmodels.OutputFormat           `json:"transform_output_format,omitempty"`

	// Embeddings stage specific

	EmbeddingsOperation    *irminmodels.EmbeddingsOperationType `json:"embeddings_operation,omitempty"`
	EmbeddingsModel        *string                              `json:"embeddings_model,omitempty"`
	EmbeddingsDimensions   *int                                 `json:"embeddings_dimensions,omitempty"`
	EmbeddingsChunkSize    *int                                 `json:"embeddings_chunk_size,omitempty"`
	EmbeddingsOverlap      *int                                 `json:"embeddings_overlap,omitempty"`
	EmbeddingsOutputPath   *string                              `json:"embeddings_output_path,omitempty"`
	EmbeddingsRepository   *Repository                          `json:"embeddings_repository,omitempty"    gorm:"foreignKey:EmbeddingsRepositoryID"`
	EmbeddingsRepositoryID *uint                                `json:"embeddings_repository_id,omitempty"`
	EmbeddingsBranch       *string                              `json:"embeddings_branch,omitempty"`
	EmbeddingsPath         *string                              `json:"embeddings_path,omitempty"`
	EmbeddingsQuery        *string                              `json:"embeddings_query,omitempty"`
	EmbeddingsTopK         *int                                 `json:"embeddings_top_k,omitempty"`
	EmbeddingsFilter       map[string]string                    `json:"embeddings_filter,omitempty"        gorm:"type:jsonb;serializer:json"`
	EmbeddingsMetadata     map[string]string                    `json:"embeddings_metadata,omitempty"      gorm:"type:jsonb;serializer:json"`
	EmbeddingsPriority     *float64                             `json:"embeddings_priority,omitempty"`

	// Patch stage specific - applies JSON patches to connections or repositories

	PatchDirection        *PatchDirection `json:"patch_direction,omitempty"`                                             // to_connection or to_repository
	PatchConnection       *Connection     `json:"patch_connection,omitempty"        gorm:"foreignKey:PatchConnectionID"` // Target connection for to_connection
	PatchConnectionID     *uint           `json:"patch_connection_id,omitempty"`
	PatchRepository       *Repository     `json:"patch_repository,omitempty"        gorm:"foreignKey:PatchRepositoryID"` // Target repository for to_repository
	PatchRepositoryID     *uint           `json:"patch_repository_id,omitempty"`
	PatchRepositoryBranch *string         `json:"patch_repository_branch,omitempty"` // Branch for repository patches
	PatchSourceFileName   *string         `json:"patch_source_file_name,omitempty"`  // Which file in previousStageResults contains patches (defaults to patches.json)

	// Field mapping stage specific - applies field mappings to transform data structure

	FieldMappingMappings   []irminmodels.FieldMapping `json:"field_mapping_mappings,omitempty"    gorm:"type:jsonb;serializer:json"`
	FieldMappingMode       *string                    `json:"field_mapping_mode,omitempty"`
	FieldMappingTargetName *string                    `json:"field_mapping_target_name,omitempty"`
	FieldMappingOutputName *string                    `json:"field_mapping_output_name,omitempty"`
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
	result := d.Preload("ResultsRepository").
		Preload("Inputs").
		Preload("Inputs.Repository").
		Preload("Script").
		Preload("Query").
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
		Preload("Stages.Query").
		Preload("Stages.RepositoryActionRepository").
		Preload("Stages.TriggerWorkflow").
		Preload("Stages.EmbeddingsRepository").
		Preload("Stages.PatchConnection").
		Preload("Stages.PatchConnection.Connector").
		Preload("Stages.PatchRepository").
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

	// Delete AI Application custom tools that reference this workflow
	if err := tx.Where(&AIApplicationCustomTool{WorkflowID: &id}).Delete(&AIApplicationCustomTool{}).Error; err != nil {
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
