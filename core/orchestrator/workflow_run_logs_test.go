package orchestrator_test

import (
	"encoding/json"
	"irmin-api/orchestrator"
	"testing"
	"time"

	"github.com/zeebo/assert"
)

func TestWorkflowLogBuilder_Text(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()
	log := builder.Text("Simple log message")
	assert.Equal(t, log, "Simple log message")
}

func TestWorkflowLogBuilder_WorkflowStart(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.WorkflowStart(orchestrator.WorkflowStartLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Workflow started",
		},
		WorkflowID:   1,
		WorkflowName: "Test Workflow",
		WorkflowType: "import",
		RunID:        100,
		TriggerType:  "time",
		Cron:         "0 0 * * *",
	})

	var parsed orchestrator.WorkflowStartLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeWorkflowStart)
	assert.Equal(t, parsed.WorkflowID, uint(1))
	assert.Equal(t, parsed.WorkflowName, "Test Workflow")
	assert.Equal(t, parsed.TriggerType, "time")
	assert.Equal(t, parsed.Cron, "0 0 * * *")
	assert.That(t, !parsed.Timestamp.IsZero())
}

func TestWorkflowLogBuilder_WorkflowStartWithRepositoryTrigger(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.WorkflowStart(orchestrator.WorkflowStartLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Workflow triggered by repository event",
		},
		WorkflowID:      2,
		WorkflowName:    "Data Sync",
		WorkflowType:    "import",
		RunID:           101,
		TriggerType:     "repository-event",
		TriggerID:       ptrUint(5),
		RepositoryEvent: "post-commit",
		RepositorySlug:  "data-warehouse",
		RepositoryRef:   "main",
	})

	var parsed orchestrator.WorkflowStartLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.TriggerType, "repository-event")
	assert.Equal(t, parsed.RepositoryEvent, "post-commit")
	assert.Equal(t, parsed.RepositorySlug, "data-warehouse")
	assert.Equal(t, parsed.RepositoryRef, "main")
}

func TestWorkflowLogBuilder_WorkflowStartWithManualTrigger(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.WorkflowStart(orchestrator.WorkflowStartLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Workflow manually triggered",
		},
		WorkflowID:   3,
		WorkflowName: "Manual Export",
		WorkflowType: "export",
		RunID:        102,
		TriggerType:  "manual",
		TriggeredBy:  "user@example.com",
	})

	var parsed orchestrator.WorkflowStartLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.TriggerType, "manual")
	assert.Equal(t, parsed.TriggeredBy, "user@example.com")
}

func TestWorkflowLogBuilder_WorkflowEnd(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.WorkflowEnd(orchestrator.WorkflowEndLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Workflow completed",
		},
		WorkflowID: 1,
		RunID:      100,
		Status:     "complete",
		DurationMs: 5000,
	})

	var parsed orchestrator.WorkflowEndLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeWorkflowEnd)
	assert.Equal(t, parsed.Status, "complete")
	assert.Equal(t, parsed.DurationMs, int64(5000))
}

func TestWorkflowLogBuilder_ImportSummary(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ImportSummary(orchestrator.ImportSummaryLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Import completed",
		},
		ConnectorName:   "PostgreSQL Production",
		ConnectorType:   "postgresql",
		ConnectionPaths: "public/customers,public/orders",
		RepositorySlug:  "data-warehouse",
		RepositoryPath:  "data/",
		Branch:          "main",
		TotalFiles:      2,
		TotalBytes:      102400,
	})

	var parsed orchestrator.ImportSummaryLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeImportSummary)
	assert.Equal(t, parsed.ConnectorName, "PostgreSQL Production")
	assert.Equal(t, parsed.TotalFiles, 2)
	assert.Equal(t, parsed.TotalBytes, int64(102400))
}

func TestWorkflowLogBuilder_ImportObject(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ImportObject(orchestrator.ImportObjectLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Imported: customers.csv",
		},
		ConnectorName:  "PostgreSQL Production",
		ConnectionPath: "public/customers",
		RepositorySlug: "data-warehouse",
		RepositoryPath: "data/customers.csv",
		Branch:         "main",
		FileName:       "customers.csv",
		SizeBytes:      51200,
		Checksum:       "abc123def456",
		ContentType:    "text/csv",
	})

	var parsed orchestrator.ImportObjectLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeImportObject)
	assert.Equal(t, parsed.FileName, "customers.csv")
	assert.Equal(t, parsed.SizeBytes, int64(51200))
	assert.Equal(t, parsed.Checksum, "abc123def456")
}

func TestWorkflowLogBuilder_ExportSummary(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ExportSummary(orchestrator.ExportSummaryLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Export completed",
		},
		RepositorySlug:  "data-warehouse",
		RepositoryPaths: "data/customers.csv,data/orders.csv",
		Branch:          "main",
		ConnectorName:   "S3 Backup",
		ConnectorType:   "s3",
		ConnectionPath:  "backups/daily/",
		TotalFiles:      2,
	})

	var parsed orchestrator.ExportSummaryLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeExportSummary)
	assert.Equal(t, parsed.TotalFiles, 2)
}

func TestWorkflowLogBuilder_ExportObject(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ExportObject(orchestrator.ExportObjectLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Exported: customers.csv",
		},
		RepositorySlug: "data-warehouse",
		RepositoryPath: "data/customers.csv",
		Branch:         "main",
		ConnectorName:  "S3 Backup",
		ConnectionPath: "backups/daily/customers.csv",
		FileName:       "customers.csv",
		SizeBytes:      51200,
	})

	var parsed orchestrator.ExportObjectLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeExportObject)
	assert.Equal(t, parsed.FileName, "customers.csv")
}

func TestWorkflowLogBuilder_FieldMapping(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.FieldMapping(orchestrator.FieldMappingLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Mapped: customer_id -> id",
		},
		SourcePath:       "data/raw.csv",
		SourceField:      "customer_id",
		DestinationPath:  "data/processed.csv",
		DestinationField: "id",
		TransformType:    "rename",
	})

	var parsed orchestrator.FieldMappingLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeFieldMapping)
	assert.Equal(t, parsed.SourceField, "customer_id")
	assert.Equal(t, parsed.DestinationField, "id")
	assert.Equal(t, parsed.TransformType, "rename")
}

func TestWorkflowLogBuilder_ConnectorOp(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ConnectorOp(orchestrator.ConnectorOperationLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Connected to database",
		},
		ConnectorName: "PostgreSQL Production",
		OperationType: "connect",
		Metadata: map[string]any{
			"host":     "db.example.com",
			"database": "production",
		},
	})

	var parsed orchestrator.ConnectorOperationLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeConnectorOp)
	assert.Equal(t, parsed.OperationType, "connect")
	assert.Equal(t, parsed.Metadata["host"], "db.example.com")
}

func TestWorkflowLogBuilder_ScriptExec(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()
	startTime := time.Now()
	endTime := startTime.Add(5 * time.Second)

	log := builder.ScriptExec(orchestrator.ScriptExecutionLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Script completed: transform.py",
		},
		ScriptID:      42,
		ScriptName:    "transform.py",
		RuntimeType:   "python",
		StartTime:     startTime,
		EndTime:       endTime,
		DurationMs:    5000,
		Success:       true,
		InputFiles:    []string{"input.csv"},
		OutputFiles:   []string{"output.csv", "report.json"},
		OutputPreview: "Processing complete...",
	})

	var parsed orchestrator.ScriptExecutionLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeScriptExec)
	assert.Equal(t, parsed.ScriptName, "transform.py")
	assert.Equal(t, parsed.RuntimeType, "python")
	assert.Equal(t, parsed.DurationMs, int64(5000))
	assert.Equal(t, parsed.Success, true)
	assert.Equal(t, len(parsed.InputFiles), 1)
	assert.Equal(t, len(parsed.OutputFiles), 2)
}

func TestWorkflowLogBuilder_QueryExec(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()
	startTime := time.Now()
	endTime := startTime.Add(2 * time.Second)

	log := builder.QueryExec(orchestrator.QueryExecutionLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Query executed successfully",
		},
		QueryID:      10,
		QueryPreview: "SELECT * FROM customers WHERE...",
		StartTime:    startTime,
		EndTime:      endTime,
		DurationMs:   2000,
		RowsReturned: 1500,
		Columns:      []string{"id", "name", "email"},
		Success:      true,
	})

	var parsed orchestrator.QueryExecutionLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeQueryExec)
	assert.Equal(t, parsed.RowsReturned, 1500)
	assert.Equal(t, len(parsed.Columns), 3)
	assert.Equal(t, parsed.Success, true)
}

func TestWorkflowLogBuilder_QueryExecWithError(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.QueryExec(orchestrator.QueryExecutionLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Query failed",
		},
		QueryID:      11,
		QueryPreview: "SELECT * FROM invalid_table",
		DurationMs:   100,
		Success:      false,
		ErrorMessage: "Table 'invalid_table' does not exist",
	})

	var parsed orchestrator.QueryExecutionLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Success, false)
	assert.Equal(t, parsed.ErrorMessage, "Table 'invalid_table' does not exist")
}

func TestWorkflowLogBuilder_ObjectModified(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ObjectModified(orchestrator.ObjectModifiedLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Created: output.csv",
		},
		Operation:      "created",
		RepositorySlug: "data-warehouse",
		Path:           "results/output.csv",
		Branch:         "main",
		SizeBytes:      25600,
		ContentType:    "text/csv",
	})

	var parsed orchestrator.ObjectModifiedLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeObjectModified)
	assert.Equal(t, parsed.Operation, "created")
	assert.Equal(t, parsed.SizeBytes, int64(25600))
}

func TestWorkflowLogBuilder_Commit(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.Commit(orchestrator.CommitLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Committed changes",
		},
		RepositorySlug: "data-warehouse",
		Branch:         "main",
		CommitHash:     "abc123def456",
		Author:         "John Doe <john@example.com>",
	})

	var parsed orchestrator.CommitLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeCommit)
	assert.Equal(t, parsed.CommitHash, "abc123def456")
	assert.Equal(t, parsed.Author, "John Doe <john@example.com>")
}

func TestWorkflowLogBuilder_StageStart(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.StageStart(orchestrator.StageLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Starting stage 1",
		},
		StageNumber: 1,
		StageType:   "action",
		Description: "Transform data",
	})

	var parsed orchestrator.StageLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeStageStart)
	assert.Equal(t, parsed.StageNumber, 1)
	assert.Equal(t, parsed.StageType, "action")
}

func TestWorkflowLogBuilder_StageEnd(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.StageEnd(orchestrator.StageLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Completed stage 1",
		},
		StageNumber: 1,
		StageType:   "action",
		DurationMs:  3000,
		Success:     true,
	})

	var parsed orchestrator.StageLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeStageEnd)
	assert.Equal(t, parsed.DurationMs, int64(3000))
	assert.Equal(t, parsed.Success, true)
}

func TestWorkflowLogBuilder_InputFile(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.InputFile(orchestrator.InputFileLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Loaded input: data.csv",
		},
		RepositorySlug: "data-warehouse",
		Path:           "data/input.csv",
		Ref:            "main",
		SizeBytes:      10240,
	})

	var parsed orchestrator.InputFileLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeInputFile)
	assert.Equal(t, parsed.Path, "data/input.csv")
	assert.Equal(t, parsed.SizeBytes, int64(10240))
}

func TestWorkflowLogBuilder_OutputFile(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.OutputFile(orchestrator.OutputFileLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Saved output: results.csv",
		},
		RepositorySlug: "data-warehouse",
		Path:           "results/output.csv",
		Branch:         "main",
		SizeBytes:      20480,
		ContentType:    "text/csv",
	})

	var parsed orchestrator.OutputFileLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)
	assert.Equal(t, parsed.Type, orchestrator.LogTypeOutputFile)
	assert.Equal(t, parsed.Path, "results/output.csv")
	assert.Equal(t, parsed.SizeBytes, int64(20480))
}

func TestParseLogEntry_PlainText(t *testing.T) {
	entry, logType, err := orchestrator.ParseLogEntry("Simple log message")
	assert.NoError(t, err)
	assert.Equal(t, logType, orchestrator.LogTypeText)
	assert.Equal(t, entry.(string), "Simple log message")
}

func TestParseLogEntry_EmptyString(t *testing.T) {
	entry, logType, err := orchestrator.ParseLogEntry("")
	assert.NoError(t, err)
	assert.Equal(t, logType, orchestrator.LogTypeText)
	assert.Equal(t, entry.(string), "")
}

func TestParseLogEntry_StructuredImportObject(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()
	log := builder.ImportObject(orchestrator.ImportObjectLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Imported: test.csv",
		},
		FileName:  "test.csv",
		SizeBytes: 1024,
	})

	entry, logType, err := orchestrator.ParseLogEntry(log)
	assert.NoError(t, err)
	assert.Equal(t, logType, orchestrator.LogTypeImportObject)

	parsed, ok := entry.(orchestrator.ImportObjectLog)
	assert.That(t, ok)
	assert.Equal(t, parsed.FileName, "test.csv")
	assert.Equal(t, parsed.SizeBytes, int64(1024))
}

func TestParseLogEntry_StructuredScriptExec(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()
	log := builder.ScriptExec(orchestrator.ScriptExecutionLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Script completed",
		},
		ScriptName:  "transform.py",
		RuntimeType: "python",
		Success:     true,
	})

	entry, logType, err := orchestrator.ParseLogEntry(log)
	assert.NoError(t, err)
	assert.Equal(t, logType, orchestrator.LogTypeScriptExec)

	parsed, ok := entry.(orchestrator.ScriptExecutionLog)
	assert.That(t, ok)
	assert.Equal(t, parsed.ScriptName, "transform.py")
	assert.Equal(t, parsed.Success, true)
}

func TestParseLogEntry_InvalidJSON(t *testing.T) {
	entry, logType, err := orchestrator.ParseLogEntry("{invalid json}")
	assert.NoError(t, err)
	assert.Equal(t, logType, orchestrator.LogTypeText)
	assert.Equal(t, entry.(string), "{invalid json}")
}

func TestParseLogEntry_MixedLogs(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	logs := []string{
		"Plain text log",
		builder.ImportObject(orchestrator.ImportObjectLog{
			BaseLogEntry: orchestrator.BaseLogEntry{Message: "Imported file"},
			FileName:     "data.csv",
		}),
		"Another plain text",
		builder.Commit(orchestrator.CommitLog{
			BaseLogEntry: orchestrator.BaseLogEntry{Message: "Committed"},
			CommitHash:   "abc123",
		}),
	}

	expectedTypes := []orchestrator.WorkflowLogType{
		orchestrator.LogTypeText,
		orchestrator.LogTypeImportObject,
		orchestrator.LogTypeText,
		orchestrator.LogTypeCommit,
	}

	for i, log := range logs {
		_, logType, err := orchestrator.ParseLogEntry(log)
		assert.NoError(t, err)
		assert.Equal(t, logType, expectedTypes[i])
	}
}

func TestParseLogEntry_AllTypes(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	testCases := []struct {
		name     string
		log      string
		expected orchestrator.WorkflowLogType
	}{
		{
			name: "WorkflowStart",
			log: builder.WorkflowStart(
				orchestrator.WorkflowStartLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeWorkflowStart,
		},
		{
			name: "WorkflowEnd",
			log: builder.WorkflowEnd(
				orchestrator.WorkflowEndLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeWorkflowEnd,
		},
		{
			name: "ImportSummary",
			log: builder.ImportSummary(
				orchestrator.ImportSummaryLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeImportSummary,
		},
		{
			name: "ImportObject",
			log: builder.ImportObject(
				orchestrator.ImportObjectLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeImportObject,
		},
		{
			name: "ExportSummary",
			log: builder.ExportSummary(
				orchestrator.ExportSummaryLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeExportSummary,
		},
		{
			name: "ExportObject",
			log: builder.ExportObject(
				orchestrator.ExportObjectLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeExportObject,
		},
		{
			name: "FieldMapping",
			log: builder.FieldMapping(
				orchestrator.FieldMappingLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeFieldMapping,
		},
		{
			name: "ConnectorOp",
			log: builder.ConnectorOp(
				orchestrator.ConnectorOperationLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeConnectorOp,
		},
		{
			name: "ScriptExec",
			log: builder.ScriptExec(
				orchestrator.ScriptExecutionLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeScriptExec,
		},
		{
			name: "QueryExec",
			log: builder.QueryExec(
				orchestrator.QueryExecutionLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeQueryExec,
		},
		{
			name: "ObjectModified",
			log: builder.ObjectModified(
				orchestrator.ObjectModifiedLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeObjectModified,
		},
		{
			name:     "Commit",
			log:      builder.Commit(orchestrator.CommitLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}}),
			expected: orchestrator.LogTypeCommit,
		},
		{
			name: "StageStart",
			log: builder.StageStart(
				orchestrator.StageLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeStageStart,
		},
		{
			name:     "StageEnd",
			log:      builder.StageEnd(orchestrator.StageLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}}),
			expected: orchestrator.LogTypeStageEnd,
		},
		{
			name: "InputFile",
			log: builder.InputFile(
				orchestrator.InputFileLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeInputFile,
		},
		{
			name: "OutputFile",
			log: builder.OutputFile(
				orchestrator.OutputFileLog{BaseLogEntry: orchestrator.BaseLogEntry{Message: "test"}},
			),
			expected: orchestrator.LogTypeOutputFile,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, logType, err := orchestrator.ParseLogEntry(tc.log)
			assert.NoError(t, err)
			assert.Equal(t, logType, tc.expected)
		})
	}
}

func TestParseLogEntry_SpecialCharacters(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	log := builder.ImportObject(orchestrator.ImportObjectLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "File with special chars: \"quotes\", 'apostrophes', \\ backslash",
		},
		FileName:       "file with spaces & special.csv",
		RepositoryPath: "/path/to/file with/spaces",
	})

	entry, logType, err := orchestrator.ParseLogEntry(log)
	assert.NoError(t, err)
	assert.Equal(t, logType, orchestrator.LogTypeImportObject)

	parsed, ok := entry.(orchestrator.ImportObjectLog)
	assert.That(t, ok)
	assert.Equal(t, parsed.FileName, "file with spaces & special.csv")
}

func TestTimestampIsPopulated(t *testing.T) {
	builder := orchestrator.NewWorkflowLogBuilder()

	before := time.Now()
	log := builder.ImportObject(orchestrator.ImportObjectLog{
		BaseLogEntry: orchestrator.BaseLogEntry{
			Message: "Test",
		},
		FileName: "test.csv",
	})
	after := time.Now()

	var parsed orchestrator.ImportObjectLog
	err := json.Unmarshal([]byte(log), &parsed)
	assert.NoError(t, err)

	assert.That(t, !parsed.Timestamp.Before(before))
	assert.That(t, !parsed.Timestamp.After(after))
}

// Helper function to create uint pointer.
func ptrUint(v uint) *uint {
	return &v
}
