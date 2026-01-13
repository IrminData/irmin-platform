package orchestrator

import (
	"encoding/json"
	"time"
)

// WorkflowLogType identifies the type of structured log entry.
type WorkflowLogType string

const (
	// LogTypeText is a plain text log entry (backward compatible).
	LogTypeText WorkflowLogType = "text"
	// LogTypeWorkflowStart indicates the start of a workflow run with trigger info.
	LogTypeWorkflowStart WorkflowLogType = "workflow_start"
	// LogTypeWorkflowEnd indicates the end of a workflow run.
	LogTypeWorkflowEnd WorkflowLogType = "workflow_end"
	// LogTypeImportSummary summarizes an import operation.
	LogTypeImportSummary WorkflowLogType = "import_summary"
	// LogTypeImportObject logs details of an imported object.
	LogTypeImportObject WorkflowLogType = "import_object"
	// LogTypeExportSummary summarizes an export operation.
	LogTypeExportSummary WorkflowLogType = "export_summary"
	// LogTypeExportObject logs details of an exported object.
	LogTypeExportObject WorkflowLogType = "export_object"
	// LogTypeFieldMapping logs a field mapping transformation.
	LogTypeFieldMapping WorkflowLogType = "field_mapping"
	// LogTypeConnectorOp logs a connector operation.
	LogTypeConnectorOp WorkflowLogType = "connector_operation"
	// LogTypeScriptExec logs script execution details.
	LogTypeScriptExec WorkflowLogType = "script_execution"
	// LogTypeQueryExec logs query execution details.
	LogTypeQueryExec WorkflowLogType = "query_execution"
	// LogTypeObjectModified logs an object modification (create/update/delete).
	LogTypeObjectModified WorkflowLogType = "object_modified"
	// LogTypeCommit logs a repository commit.
	LogTypeCommit WorkflowLogType = "commit"
	// LogTypeStageStart indicates the start of a pipeline stage.
	LogTypeStageStart WorkflowLogType = "stage_start"
	// LogTypeStageEnd indicates the end of a pipeline stage.
	LogTypeStageEnd WorkflowLogType = "stage_end"
	// LogTypeInputFile logs an input file being processed.
	LogTypeInputFile WorkflowLogType = "input_file"
	// LogTypeOutputFile logs an output file being saved.
	LogTypeOutputFile WorkflowLogType = "output_file"
)

// BaseLogEntry contains common fields for all structured log entries.
type BaseLogEntry struct {
	Type      WorkflowLogType `json:"type"`
	Timestamp time.Time       `json:"timestamp"`
	Message   string          `json:"message"`
}

// WorkflowStartLog logs the start of a workflow run with trigger information.
type WorkflowStartLog struct {
	BaseLogEntry
	WorkflowID   uint   `json:"workflow_id"`
	WorkflowName string `json:"workflow_name"`
	WorkflowType string `json:"workflow_type"`
	RunID        uint   `json:"run_id"`
	// Trigger information
	TriggerType string `json:"trigger_type"`           // "time", "repository-event", "workflow-run-event", "manual"
	TriggerID   *uint  `json:"trigger_id,omitempty"`   // ID of the trigger if applicable
	TriggeredBy string `json:"triggered_by,omitempty"` // User email if manually triggered
	// Time trigger details
	Cron  string `json:"cron,omitempty"`
	RRule string `json:"rrule,omitempty"`
	// Repository event trigger details
	RepositoryEvent string `json:"repository_event,omitempty"` // e.g., "pre-commit", "post-commit"
	RepositorySlug  string `json:"repository_slug,omitempty"`
	RepositoryRef   string `json:"repository_ref,omitempty"`
	// Workflow run event trigger details
	WorkflowRunEvent   string `json:"workflow_run_event,omitempty"` // "pre-workflow-run", "post-workflow-run"
	LinkedWorkflowID   *uint  `json:"linked_workflow_id,omitempty"`
	LinkedWorkflowName string `json:"linked_workflow_name,omitempty"`
}

// WorkflowEndLog logs the end of a workflow run.
type WorkflowEndLog struct {
	BaseLogEntry
	WorkflowID uint   `json:"workflow_id"`
	RunID      uint   `json:"run_id"`
	Status     string `json:"status"` // "complete", "error", "cancelled"
	DurationMs int64  `json:"duration_ms"`
}

// ImportSummaryLog summarizes an import operation.
type ImportSummaryLog struct {
	BaseLogEntry
	ConnectorName   string `json:"connector_name"`
	ConnectorType   string `json:"connector_type,omitempty"`
	ConnectionPaths string `json:"connection_paths"` // Comma-separated source paths
	RepositorySlug  string `json:"repository_slug"`
	RepositoryPath  string `json:"repository_path"`
	Branch          string `json:"branch"`
	TotalFiles      int    `json:"total_files"`
	TotalBytes      int64  `json:"total_bytes"`
}

// ImportObjectLog logs details of an imported object.
type ImportObjectLog struct {
	BaseLogEntry
	ConnectorName  string `json:"connector_name"`
	ConnectionPath string `json:"connection_path"`
	RepositorySlug string `json:"repository_slug"`
	RepositoryPath string `json:"repository_path"`
	Branch         string `json:"branch"`
	FileName       string `json:"file_name"`
	SizeBytes      int64  `json:"size_bytes"`
	Checksum       string `json:"checksum,omitempty"`
	ContentType    string `json:"content_type,omitempty"`
}

// ExportSummaryLog summarizes an export operation.
type ExportSummaryLog struct {
	BaseLogEntry
	RepositorySlug  string `json:"repository_slug"`
	RepositoryPaths string `json:"repository_paths"` // Comma-separated source paths
	Branch          string `json:"branch"`
	ConnectorName   string `json:"connector_name"`
	ConnectorType   string `json:"connector_type,omitempty"`
	ConnectionPath  string `json:"connection_path"`
	TotalFiles      int    `json:"total_files"`
}

// ExportObjectLog logs details of an exported object.
type ExportObjectLog struct {
	BaseLogEntry
	RepositorySlug string `json:"repository_slug"`
	RepositoryPath string `json:"repository_path"`
	Branch         string `json:"branch"`
	ConnectorName  string `json:"connector_name"`
	ConnectionPath string `json:"connection_path"`
	FileName       string `json:"file_name"`
	SizeBytes      int64  `json:"size_bytes,omitempty"`
	Checksum       string `json:"checksum,omitempty"`
}

// FieldMappingLog logs a field mapping transformation.
type FieldMappingLog struct {
	BaseLogEntry
	SourcePath       string `json:"source_path"`
	SourceField      string `json:"source_field,omitempty"`
	DestinationPath  string `json:"destination_path"`
	DestinationField string `json:"destination_field,omitempty"`
	TransformType    string `json:"transform_type"` // "rename", "copy", "route"
}

// ConnectorOperationLog logs a connector operation.
type ConnectorOperationLog struct {
	BaseLogEntry
	ConnectorName string         `json:"connector_name,omitempty"`
	OperationType string         `json:"operation_type"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

// ScriptExecutionLog logs script execution details.
type ScriptExecutionLog struct {
	BaseLogEntry
	ScriptID      uint      `json:"script_id,omitempty"`
	ScriptName    string    `json:"script_name,omitempty"`
	RuntimeType   string    `json:"runtime_type"` // python, node, go, typescript
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	DurationMs    int64     `json:"duration_ms"`
	Success       bool      `json:"success"`
	InputFiles    []string  `json:"input_files,omitempty"`
	OutputFiles   []string  `json:"output_files,omitempty"`
	OutputPreview string    `json:"output_preview,omitempty"` // First N chars of output
}

// QueryExecutionLog logs query execution details.
type QueryExecutionLog struct {
	BaseLogEntry
	QueryID      uint      `json:"query_id,omitempty"`
	QueryPreview string    `json:"query_preview"` // Truncated SQL
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	DurationMs   int64     `json:"duration_ms"`
	RowsReturned int       `json:"rows_returned"`
	Columns      []string  `json:"columns,omitempty"`
	Success      bool      `json:"success"`
	ErrorMessage string    `json:"error_message,omitempty"`
}

// ObjectModifiedLog logs an object modification.
type ObjectModifiedLog struct {
	BaseLogEntry
	Operation      string `json:"operation"` // "created", "updated", "deleted"
	RepositorySlug string `json:"repository_slug"`
	Path           string `json:"path"`
	Branch         string `json:"branch"`
	SizeBytes      int64  `json:"size_bytes,omitempty"`
	ContentType    string `json:"content_type,omitempty"`
}

// CommitLog logs a repository commit.
type CommitLog struct {
	BaseLogEntry
	RepositorySlug string `json:"repository_slug"`
	Branch         string `json:"branch"`
	CommitHash     string `json:"commit_hash"`
	Author         string `json:"author"`
}

// StageLog logs pipeline stage execution.
type StageLog struct {
	BaseLogEntry
	StageNumber int    `json:"stage_number"`
	StageType   string `json:"stage_type"`
	Description string `json:"description,omitempty"`
	DurationMs  int64  `json:"duration_ms,omitempty"`
	Success     bool   `json:"success,omitempty"`
}

// InputFileLog logs an input file being processed.
type InputFileLog struct {
	BaseLogEntry
	RepositorySlug string `json:"repository_slug"`
	Path           string `json:"path"`
	Ref            string `json:"ref"`
	SizeBytes      int64  `json:"size_bytes"`
}

// OutputFileLog logs an output file being saved.
type OutputFileLog struct {
	BaseLogEntry
	RepositorySlug string `json:"repository_slug"`
	Path           string `json:"path"`
	Branch         string `json:"branch"`
	SizeBytes      int64  `json:"size_bytes"`
	ContentType    string `json:"content_type,omitempty"`
}

// WorkflowLogBuilder provides helpers for creating structured log entries.
type WorkflowLogBuilder struct{}

// NewWorkflowLogBuilder creates a new WorkflowLogBuilder.
func NewWorkflowLogBuilder() *WorkflowLogBuilder {
	return &WorkflowLogBuilder{}
}

// Text creates a plain text log entry (backward compatible).
func (b *WorkflowLogBuilder) Text(message string) string {
	return message
}

// serialize converts a log entry to a JSON string.
func (b *WorkflowLogBuilder) serialize(entry any) string {
	data, err := json.Marshal(entry)
	if err != nil {
		return "[log serialization error]"
	}
	return string(data)
}

// WorkflowStart creates a workflow start log entry.
func (b *WorkflowLogBuilder) WorkflowStart(log WorkflowStartLog) string {
	log.Type = LogTypeWorkflowStart
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// WorkflowEnd creates a workflow end log entry.
func (b *WorkflowLogBuilder) WorkflowEnd(log WorkflowEndLog) string {
	log.Type = LogTypeWorkflowEnd
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ImportSummary creates an import summary log entry.
func (b *WorkflowLogBuilder) ImportSummary(log ImportSummaryLog) string {
	log.Type = LogTypeImportSummary
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ImportObject creates an import object log entry.
func (b *WorkflowLogBuilder) ImportObject(log ImportObjectLog) string {
	log.Type = LogTypeImportObject
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ExportSummary creates an export summary log entry.
func (b *WorkflowLogBuilder) ExportSummary(log ExportSummaryLog) string {
	log.Type = LogTypeExportSummary
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ExportObject creates an export object log entry.
func (b *WorkflowLogBuilder) ExportObject(log ExportObjectLog) string {
	log.Type = LogTypeExportObject
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// FieldMapping creates a field mapping log entry.
func (b *WorkflowLogBuilder) FieldMapping(log FieldMappingLog) string {
	log.Type = LogTypeFieldMapping
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ConnectorOp creates a connector operation log entry.
func (b *WorkflowLogBuilder) ConnectorOp(log ConnectorOperationLog) string {
	log.Type = LogTypeConnectorOp
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ScriptExec creates a script execution log entry.
func (b *WorkflowLogBuilder) ScriptExec(log ScriptExecutionLog) string {
	log.Type = LogTypeScriptExec
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// QueryExec creates a query execution log entry.
func (b *WorkflowLogBuilder) QueryExec(log QueryExecutionLog) string {
	log.Type = LogTypeQueryExec
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ObjectModified creates an object modified log entry.
func (b *WorkflowLogBuilder) ObjectModified(log ObjectModifiedLog) string {
	log.Type = LogTypeObjectModified
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// Commit creates a commit log entry.
func (b *WorkflowLogBuilder) Commit(log CommitLog) string {
	log.Type = LogTypeCommit
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// StageStart creates a stage start log entry.
func (b *WorkflowLogBuilder) StageStart(log StageLog) string {
	log.Type = LogTypeStageStart
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// StageEnd creates a stage end log entry.
func (b *WorkflowLogBuilder) StageEnd(log StageLog) string {
	log.Type = LogTypeStageEnd
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// InputFile creates an input file log entry.
func (b *WorkflowLogBuilder) InputFile(log InputFileLog) string {
	log.Type = LogTypeInputFile
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// OutputFile creates an output file log entry.
func (b *WorkflowLogBuilder) OutputFile(log OutputFileLog) string {
	log.Type = LogTypeOutputFile
	log.Timestamp = time.Now()
	return b.serialize(log)
}

// ParseLogEntry attempts to parse a log string as a structured entry.
// Returns the parsed entry, its type, and any error.
// Plain text strings return as-is with LogTypeText.
func ParseLogEntry(logStr string) (any, WorkflowLogType, error) {
	if len(logStr) == 0 || logStr[0] != '{' {
		return logStr, LogTypeText, nil
	}

	var base BaseLogEntry
	if err := json.Unmarshal([]byte(logStr), &base); err != nil {
		// Not valid JSON, treat as plain text
		return logStr, LogTypeText, nil //nolint:nilerr // Intentionally treating invalid JSON as plain text
	}

	return parseStructuredLogEntry(logStr, base.Type)
}

// parseStructuredLogEntry parses a JSON log string into its specific type.
func parseStructuredLogEntry(logStr string, logType WorkflowLogType) (any, WorkflowLogType, error) {
	var result any
	var err error

	switch logType { //nolint:exhaustive // LogTypeText is handled by returning base entry
	case LogTypeWorkflowStart:
		result, err = unmarshalLog[WorkflowStartLog](logStr)
	case LogTypeWorkflowEnd:
		result, err = unmarshalLog[WorkflowEndLog](logStr)
	case LogTypeImportSummary:
		result, err = unmarshalLog[ImportSummaryLog](logStr)
	case LogTypeImportObject:
		result, err = unmarshalLog[ImportObjectLog](logStr)
	case LogTypeExportSummary:
		result, err = unmarshalLog[ExportSummaryLog](logStr)
	case LogTypeExportObject:
		result, err = unmarshalLog[ExportObjectLog](logStr)
	case LogTypeFieldMapping:
		result, err = unmarshalLog[FieldMappingLog](logStr)
	case LogTypeConnectorOp:
		result, err = unmarshalLog[ConnectorOperationLog](logStr)
	case LogTypeScriptExec:
		result, err = unmarshalLog[ScriptExecutionLog](logStr)
	case LogTypeQueryExec:
		result, err = unmarshalLog[QueryExecutionLog](logStr)
	case LogTypeObjectModified:
		result, err = unmarshalLog[ObjectModifiedLog](logStr)
	case LogTypeCommit:
		result, err = unmarshalLog[CommitLog](logStr)
	case LogTypeStageStart, LogTypeStageEnd:
		result, err = unmarshalLog[StageLog](logStr)
	case LogTypeInputFile:
		result, err = unmarshalLog[InputFileLog](logStr)
	case LogTypeOutputFile:
		result, err = unmarshalLog[OutputFileLog](logStr)
	default:
		var base BaseLogEntry
		if unmarshalErr := json.Unmarshal([]byte(logStr), &base); unmarshalErr != nil {
			return logStr, LogTypeText, unmarshalErr
		}
		return base, logType, nil
	}

	if err != nil {
		return logStr, LogTypeText, err
	}
	return result, logType, nil
}

// unmarshalLog is a generic helper to unmarshal a log entry.
func unmarshalLog[T any](logStr string) (T, error) {
	var entry T
	err := json.Unmarshal([]byte(logStr), &entry)
	return entry, err
}
