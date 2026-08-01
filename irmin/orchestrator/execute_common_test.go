package orchestrator_test

import (
	"encoding/json"
	"testing"
	"time"

	"irmin-api/orchestrator"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
)

func TestLogFieldMappings_EmptyMappings(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	logs := orchestrator.ExportLogFieldMappings(o, nil)
	assert.That(t, logs == nil)

	logs = orchestrator.ExportLogFieldMappings(o, []irminmodels.FieldMapping{})
	assert.That(t, logs == nil)
}

func TestLogFieldMappings_RouteMapping(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:      "source/path",
			DestinationPath: "dest/path",
			// No source or destination field - this is a route mapping
		},
	}

	logs := orchestrator.ExportLogFieldMappings(o, mappings)

	assert.Equal(t, len(logs), 1)

	// Parse the JSON log
	var parsed orchestrator.FieldMappingLog
	err := json.Unmarshal([]byte(logs[0]), &parsed)
	assert.NoError(t, err)

	assert.Equal(t, parsed.Type, orchestrator.LogTypeFieldMapping)
	assert.Equal(t, parsed.SourcePath, "source/path")
	assert.Equal(t, parsed.DestinationPath, "dest/path")
	assert.Equal(t, parsed.TransformType, "route")
	assert.Equal(t, parsed.SourceField, "")
	assert.Equal(t, parsed.DestinationField, "")
}

func TestLogFieldMappings_RenameMapping(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	sourceField := "customer_id"
	destField := "id"
	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "source/path",
			SourceField:      &sourceField,
			DestinationPath:  "dest/path",
			DestinationField: &destField,
		},
	}

	logs := orchestrator.ExportLogFieldMappings(o, mappings)

	assert.Equal(t, len(logs), 1)

	var parsed orchestrator.FieldMappingLog
	err := json.Unmarshal([]byte(logs[0]), &parsed)
	assert.NoError(t, err)

	assert.Equal(t, parsed.TransformType, "rename")
	assert.Equal(t, parsed.SourceField, "customer_id")
	assert.Equal(t, parsed.DestinationField, "id")
}

func TestLogFieldMappings_CopyMapping(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	fieldName := "email"
	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "source/path",
			SourceField:      &fieldName,
			DestinationPath:  "dest/path",
			DestinationField: &fieldName,
		},
	}

	logs := orchestrator.ExportLogFieldMappings(o, mappings)

	assert.Equal(t, len(logs), 1)

	var parsed orchestrator.FieldMappingLog
	err := json.Unmarshal([]byte(logs[0]), &parsed)
	assert.NoError(t, err)

	assert.Equal(t, parsed.TransformType, "copy")
	assert.Equal(t, parsed.SourceField, "email")
	assert.Equal(t, parsed.DestinationField, "email")
}

func TestLogFieldMappings_MultipleMappings(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	sourceField1 := "old_name"
	destField1 := "new_name"
	fieldName := "status"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:      "path1",
			DestinationPath: "path2",
		},
		{
			SourcePath:       "path1",
			SourceField:      &sourceField1,
			DestinationPath:  "path2",
			DestinationField: &destField1,
		},
		{
			SourcePath:       "path1",
			SourceField:      &fieldName,
			DestinationPath:  "path2",
			DestinationField: &fieldName,
		},
	}

	logs := orchestrator.ExportLogFieldMappings(o, mappings)

	assert.Equal(t, len(logs), 3)

	// Parse all logs and check transform types
	var parsed0, parsed1, parsed2 orchestrator.FieldMappingLog
	assert.NoError(t, json.Unmarshal([]byte(logs[0]), &parsed0))
	assert.NoError(t, json.Unmarshal([]byte(logs[1]), &parsed1))
	assert.NoError(t, json.Unmarshal([]byte(logs[2]), &parsed2))

	assert.Equal(t, parsed0.TransformType, "route")
	assert.Equal(t, parsed1.TransformType, "rename")
	assert.Equal(t, parsed2.TransformType, "copy")
}

func TestConvertQueryResultToExecutionResult_Success(t *testing.T) {
	startedAt := time.Now()
	finishedAt := startedAt.Add(2 * time.Second)

	queryResult := &irminmodels.QueryResult{
		StartedAt:  startedAt,
		FinishedAt: finishedAt,
		Logs:       []string{"Query started", "Query completed"},
		Columns:    []string{"id", "name", "email"},
		Data: []map[string]any{
			{"id": 1, "name": "John", "email": "john@example.com"},
			{"id": 2, "name": "Jane", "email": "jane@example.com"},
		},
		HasErrors: false,
	}

	result := orchestrator.ExportConvertQueryResultToExecutionResult(queryResult)

	assert.Equal(t, result.StartTime, startedAt)
	assert.Equal(t, result.EndTime, finishedAt)
	assert.Equal(t, result.Logs, "Query started\nQuery completed")
	assert.That(t, len(result.ResultFiles) > 0)
	assert.That(t, result.ResultFiles["query_results.csv"] != nil)

	// Verify CSV content
	csvContent := string(result.ResultFiles["query_results.csv"])
	assert.That(t, len(csvContent) > 0)
}

func TestConvertQueryResultToExecutionResult_EmptyData(t *testing.T) {
	queryResult := &irminmodels.QueryResult{
		Logs:      []string{"Query completed"},
		Columns:   []string{},
		Data:      []map[string]any{},
		HasErrors: false,
	}

	result := orchestrator.ExportConvertQueryResultToExecutionResult(queryResult)

	assert.Equal(t, result.Logs, "Query completed")
	// Should not have query_results.csv because data is empty
	assert.That(t, result.ResultFiles["query_results.csv"] == nil)
}

func TestConvertQueryResultToExecutionResult_NilValues(t *testing.T) {
	queryResult := &irminmodels.QueryResult{
		Columns: []string{"id", "name", "nullable"},
		Data: []map[string]any{
			{"id": 1, "name": "Test", "nullable": nil},
			{"id": 2, "name": nil, "nullable": "value"},
		},
		HasErrors: false,
	}

	result := orchestrator.ExportConvertQueryResultToExecutionResult(queryResult)

	csvContent := string(result.ResultFiles["query_results.csv"])
	assert.That(t, len(csvContent) > 0)
}

func TestConvertQueryDataToCSV_ValidData(t *testing.T) {
	data := []map[string]any{
		{"id": 1, "name": "Alice", "active": true},
		{"id": 2, "name": "Bob", "active": false},
	}
	columns := []string{"id", "name", "active"}

	csvBytes, err := orchestrator.ExportConvertQueryDataToCSV(data, columns)

	assert.NoError(t, err)
	csvContent := string(csvBytes)

	// Check header
	assert.That(t, len(csvContent) > 0)
	// Should contain the column headers
	lines := splitCSVLines(csvContent)
	assert.That(t, len(lines) >= 3) // header + 2 data rows
}

func TestConvertQueryDataToCSV_EmptyData(t *testing.T) {
	data := []map[string]any{}
	columns := []string{"id", "name"}

	csvBytes, err := orchestrator.ExportConvertQueryDataToCSV(data, columns)

	assert.NoError(t, err)
	// Should at least have the header row
	csvContent := string(csvBytes)
	assert.That(t, len(csvContent) > 0)
}

func TestConvertQueryDataToCSV_NilValues(t *testing.T) {
	data := []map[string]any{
		{"id": 1, "name": nil},
		{"id": nil, "name": "Test"},
	}
	columns := []string{"id", "name"}

	csvBytes, err := orchestrator.ExportConvertQueryDataToCSV(data, columns)

	assert.NoError(t, err)
	csvContent := string(csvBytes)
	assert.That(t, len(csvContent) > 0)
}

func TestConvertQueryDataToCSV_SpecialCharacters(t *testing.T) {
	data := []map[string]any{
		{"id": 1, "name": "Name with, comma"},
		{"id": 2, "name": "Name with \"quotes\""},
		{"id": 3, "name": "Name with\nnewline"},
	}
	columns := []string{"id", "name"}

	csvBytes, err := orchestrator.ExportConvertQueryDataToCSV(data, columns)

	assert.NoError(t, err)
	csvContent := string(csvBytes)
	assert.That(t, len(csvContent) > 0)
}

func TestConvertQueryDataToCSV_DifferentTypes(t *testing.T) {
	data := []map[string]any{
		{"int": 42, "float": 3.14, "bool": true, "string": "test"},
		{"int": -1, "float": 2.71828, "bool": false, "string": ""},
	}
	columns := []string{"int", "float", "bool", "string"}

	csvBytes, err := orchestrator.ExportConvertQueryDataToCSV(data, columns)

	assert.NoError(t, err)
	csvContent := string(csvBytes)
	assert.That(t, len(csvContent) > 0)
}

// Helper function to split CSV content into lines.
func splitCSVLines(content string) []string {
	var lines []string
	var currentLine string
	inQuotes := false

	for _, char := range content {
		if char == '"' {
			inQuotes = !inQuotes
		}
		if char == '\n' && !inQuotes {
			lines = append(lines, currentLine)
			currentLine = ""
		} else {
			currentLine += string(char)
		}
	}
	if currentLine != "" {
		lines = append(lines, currentLine)
	}
	return lines
}
