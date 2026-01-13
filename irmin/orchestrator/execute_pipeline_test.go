package orchestrator_test

import (
	"testing"

	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/orchestrator"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestVerifyTargetFileExists_FileExists(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	targetName := "target.csv"
	results := map[string][]byte{
		"other.csv":  []byte("data1"),
		"target.csv": []byte("data2"),
	}
	var logs []string

	err := orchestrator.ExportVerifyTargetFileExists(o, &targetName, results, &logs)

	assert.NoError(t, err)
	assert.Equal(t, len(logs), 0)
}

func TestVerifyTargetFileExists_FileNotFound(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	targetName := "missing.csv"
	results := map[string][]byte{
		"other.csv":  []byte("data1"),
		"target.csv": []byte("data2"),
	}
	var logs []string

	err := orchestrator.ExportVerifyTargetFileExists(o, &targetName, results, &logs)

	assert.That(t, err != nil)
	assert.Equal(t, len(logs), 1)
	assert.That(t, len(logs[0]) > 0)
}

func TestVerifyTargetFileExists_EmptyResults(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	targetName := "target.csv"
	results := map[string][]byte{}
	var logs []string

	err := orchestrator.ExportVerifyTargetFileExists(o, &targetName, results, &logs)

	assert.That(t, err != nil)
	assert.Equal(t, len(logs), 1)
}

func TestCheckValidationResults_AllValid(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	err := orchestrator.ExportCheckValidationResults(
		o,
		5,          // filesValidated
		[]string{}, // validationErrors (empty = success)
		"all",      // mode
		nil,        // targetName
		map[string][]byte{"file1.csv": []byte("data")}, // previousStageResults
		true, // failOnError
		&logs,
	)

	assert.NoError(t, err)
}

func TestCheckValidationResults_ValidationErrors_FailOnError(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	err := orchestrator.ExportCheckValidationResults(
		o,
		3,                                  // filesValidated
		[]string{"error1", "error2"},       // validationErrors
		"all",                              // mode
		nil,                                // targetName
		map[string][]byte{"file.csv": nil}, // previousStageResults
		true,                               // failOnError
		&logs,
	)

	assert.That(t, err != nil)
	assert.That(t, len(logs) > 0)
}

func TestCheckValidationResults_ValidationErrors_NoFailOnError(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	err := orchestrator.ExportCheckValidationResults(
		o,
		3,                                  // filesValidated
		[]string{"error1", "error2"},       // validationErrors
		"all",                              // mode
		nil,                                // targetName
		map[string][]byte{"file.csv": nil}, // previousStageResults
		false,                              // failOnError - should not fail
		&logs,
	)

	assert.NoError(t, err) // Should not error when failOnError is false
	assert.That(t, len(logs) > 0)
}

func TestCheckValidationResults_NoFilesValidated_WithResults(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	err := orchestrator.ExportCheckValidationResults(
		o,
		0,          // filesValidated
		[]string{}, // validationErrors
		"all",      // mode
		nil,        // targetName
		map[string][]byte{"file.csv": []byte("data")}, // previousStageResults - has files
		true, // failOnError
		&logs,
	)

	assert.That(t, err != nil) // Should error because we had files but validated none
	assert.That(t, len(logs) > 0)
}

func TestCheckValidationResults_NoFilesValidated_EmptyResults(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	err := orchestrator.ExportCheckValidationResults(
		o,
		0,                   // filesValidated
		[]string{},          // validationErrors
		"all",               // mode
		nil,                 // targetName
		map[string][]byte{}, // previousStageResults - empty
		true,                // failOnError
		&logs,
	)

	assert.NoError(t, err) // Should not error because there were no files
	assert.That(t, len(logs) > 0)
}

func TestCheckValidationResults_SingleMode_NoTarget(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	err := orchestrator.ExportCheckValidationResults(
		o,
		0,                   // filesValidated
		[]string{},          // validationErrors
		"single",            // mode
		nil,                 // targetName - no target specified
		map[string][]byte{}, // previousStageResults
		true,                // failOnError
		&logs,
	)

	assert.NoError(t, err)
	// Should include message about single mode
	foundMessage := false
	for _, log := range logs {
		if len(log) > 0 {
			foundMessage = true
		}
	}
	assert.That(t, foundMessage)
}

func TestLogValidationSchemaDetails_NilSchema(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	orchestrator.ExportLogValidationSchemaDetails(o, nil, &logs)

	assert.Equal(t, len(logs), 0)
}

func TestLogValidationSchemaDetails_BasicSchema(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeBinary,
	}

	orchestrator.ExportLogValidationSchemaDetails(o, schema, &logs)

	assert.That(t, len(logs) > 0)
}

func TestLogValidationSchemaDetails_StructuredSchemaWithProperties(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type:     "object",
			Required: []string{"id", "name"},
			Properties: map[string]irminmodels.JSONSchema{
				"id":    {Type: "integer"},
				"name":  {Type: "string"},
				"email": {Type: "string"},
			},
		},
	}

	orchestrator.ExportLogValidationSchemaDetails(o, schema, &logs)

	assert.That(t, len(logs) >= 3) // At least schema type, JSON type, required, properties
}

func TestLogValidationSchemaDetails_WithContentType(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	contentType := "application/json"
	schema := &irminmodels.ObjectSchema{
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: &contentType,
	}

	orchestrator.ExportLogValidationSchemaDetails(o, schema, &logs)

	assert.That(t, len(logs) >= 2)
}

func TestLogValidationDataStructure_EmptyData(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	orchestrator.ExportLogValidationDataStructure(o, []byte{}, &logs)

	assert.Equal(t, len(logs), 0)
}

func TestLogValidationDataStructure_ValidJSONObject(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	jsonData := []byte(`{"id": 1, "name": "test"}`)

	orchestrator.ExportLogValidationDataStructure(o, jsonData, &logs)

	assert.That(t, len(logs) >= 2) // Data type and object sample
}

func TestLogValidationDataStructure_ValidJSONArray(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	jsonData := []byte(`[{"id": 1}, {"id": 2}]`)

	orchestrator.ExportLogValidationDataStructure(o, jsonData, &logs)

	assert.That(t, len(logs) >= 2) // Data type and array sample
}

func TestLogValidationDataStructure_InvalidJSON(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	invalidJSON := []byte(`not valid json`)

	orchestrator.ExportLogValidationDataStructure(o, invalidJSON, &logs)

	assert.That(t, len(logs) >= 1) // Should log parse error
}

func TestLogArraySample_EmptyArray(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	orchestrator.ExportLogArraySample(o, []any{}, &logs)

	assert.Equal(t, len(logs), 1) // Just array length
}

func TestLogArraySample_ArrayWithItems(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	arr := []any{
		map[string]any{"id": 1, "name": "test"},
		map[string]any{"id": 2, "name": "test2"},
	}

	orchestrator.ExportLogArraySample(o, arr, &logs)

	assert.That(t, len(logs) >= 3) // Array length, first item type, first item sample
}

func TestLogObjectSample_EmptyObject(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	orchestrator.ExportLogObjectSample(o, map[string]any{}, &logs)

	assert.Equal(t, len(logs), 1) // Just object keys
}

func TestLogObjectSample_ObjectWithKeys(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string

	obj := map[string]any{
		"id":    1,
		"name":  "test",
		"email": "test@example.com",
	}

	orchestrator.ExportLogObjectSample(o, obj, &logs)

	assert.That(t, len(logs) >= 2) // Object keys and sample
}

func TestBuildTransformConfig_FieldRename(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	operation := irminmodels.TransformOpFieldRename

	stage := &db.PipelineStage{
		TransformOperation: &operation,
		TransformFieldRenames: []irminmodels.FieldRename{
			{OldName: "old_id", NewName: "id"},
			{OldName: "old_name", NewName: "name"},
		},
	}

	config := orchestrator.ExportBuildTransformConfig(o, stage, "all", "")

	assert.Equal(t, config.Operation, irminmodels.TransformOpFieldRename)
	assert.Equal(t, config.Mode, "all")
	assert.Equal(t, len(config.FieldRenames), 2)
}

func TestBuildTransformConfig_FieldRemove(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	operation := irminmodels.TransformOpFieldRemove

	stage := &db.PipelineStage{
		TransformOperation:      &operation,
		TransformFieldsToRemove: []string{"temp_field", "debug_field"},
	}

	config := orchestrator.ExportBuildTransformConfig(o, stage, "single", "target.csv")

	assert.Equal(t, config.Operation, irminmodels.TransformOpFieldRemove)
	assert.Equal(t, config.Mode, "single")
	assert.Equal(t, config.TargetName, "target.csv")
	assert.Equal(t, len(config.FieldsToRemove), 2)
}

func TestBuildTransformConfig_FileRename(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	operation := irminmodels.TransformOpFileRename
	outputName := "renamed_output.csv"

	stage := &db.PipelineStage{
		TransformOperation:  &operation,
		TransformOutputName: &outputName,
	}

	config := orchestrator.ExportBuildTransformConfig(o, stage, "single", "input.csv")

	assert.Equal(t, config.Operation, irminmodels.TransformOpFileRename)
	assert.Equal(t, config.OutputName, "renamed_output.csv")
}

func TestBuildTransformConfig_FileRemove(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	operation := irminmodels.TransformOpFileRemove

	stage := &db.PipelineStage{
		TransformOperation: &operation,
	}

	config := orchestrator.ExportBuildTransformConfig(o, stage, "single", "unwanted.csv")

	assert.Equal(t, config.Operation, irminmodels.TransformOpFileRemove)
}

func TestBuildTransformConfig_FormatConvert(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	operation := irminmodels.TransformOpFormatConvert
	outputFormat := irminmodels.OutputFormatParquet

	stage := &db.PipelineStage{
		TransformOperation:    &operation,
		TransformOutputFormat: &outputFormat,
	}

	config := orchestrator.ExportBuildTransformConfig(o, stage, "all", "")

	assert.Equal(t, config.Operation, irminmodels.TransformOpFormatConvert)
	assert.Equal(t, config.OutputFormat, irminmodels.OutputFormatParquet)
}

func TestLogTransformDetails_FieldRename(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string
	operation := irminmodels.TransformOpFieldRename

	stage := &db.PipelineStage{
		TransformOperation: &operation,
	}
	config := engine.TransformConfig{
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "old", NewName: "new"},
		},
	}

	orchestrator.ExportLogTransformDetails(o, &logs, stage, config)

	assert.That(t, len(logs) >= 2)
}

func TestLogTransformDetails_FieldRemove(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string
	operation := irminmodels.TransformOpFieldRemove

	stage := &db.PipelineStage{
		TransformOperation: &operation,
	}
	config := engine.TransformConfig{
		FieldsToRemove: []string{"field1", "field2"},
	}

	orchestrator.ExportLogTransformDetails(o, &logs, stage, config)

	assert.Equal(t, len(logs), 1)
}

func TestLogTransformDetails_FileRename(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string
	operation := irminmodels.TransformOpFileRename

	stage := &db.PipelineStage{
		TransformOperation: &operation,
	}
	config := engine.TransformConfig{
		OutputName: "new_name.csv",
	}

	orchestrator.ExportLogTransformDetails(o, &logs, stage, config)

	assert.Equal(t, len(logs), 1)
}

func TestLogTransformDetails_FileRemove(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string
	operation := irminmodels.TransformOpFileRemove

	stage := &db.PipelineStage{
		TransformOperation: &operation,
	}
	config := engine.TransformConfig{}

	orchestrator.ExportLogTransformDetails(o, &logs, stage, config)

	assert.Equal(t, len(logs), 1)
}

func TestLogTransformDetails_FormatConvert(t *testing.T) {
	o := &orchestrator.Orchestrator{}
	var logs []string
	operation := irminmodels.TransformOpFormatConvert

	stage := &db.PipelineStage{
		TransformOperation: &operation,
	}
	config := engine.TransformConfig{
		OutputFormat: irminmodels.OutputFormatJSON,
	}

	orchestrator.ExportLogTransformDetails(o, &logs, stage, config)

	assert.Equal(t, len(logs), 1)
}

func TestBuildEmbeddingConfig_DefaultValues(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	stage := &db.PipelineStage{}

	config := orchestrator.ExportBuildEmbeddingConfig(o, stage)

	// Should have default values
	assert.That(t, config.Model != "")
	assert.That(t, config.Dimensions > 0)
}

func TestBuildEmbeddingConfig_CustomValues(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	model := "text-embedding-3-large"
	dimensions := 1024
	chunkSize := 500
	overlap := 50

	stage := &db.PipelineStage{
		EmbeddingsModel:      &model,
		EmbeddingsDimensions: &dimensions,
		EmbeddingsChunkSize:  &chunkSize,
		EmbeddingsOverlap:    &overlap,
	}

	config := orchestrator.ExportBuildEmbeddingConfig(o, stage)

	assert.Equal(t, config.Model, "text-embedding-3-large")
	assert.Equal(t, config.Dimensions, 1024)
	assert.Equal(t, config.ChunkSize, 500)
	assert.Equal(t, config.Overlap, 50)
}

func TestGetMaxRuntime_WithSchedule(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	workflow := &db.Workflow{
		Schedule: &db.Schedule{
			MaxRuntime: 600,
		},
	}

	maxRuntime := orchestrator.ExportGetMaxRuntime(o, workflow)

	assert.Equal(t, maxRuntime, 600)
}

func TestGetMaxRuntime_WithZeroRuntime(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	workflow := &db.Workflow{
		Schedule: &db.Schedule{
			MaxRuntime: 0,
		},
	}

	maxRuntime := orchestrator.ExportGetMaxRuntime(o, workflow)

	assert.Equal(t, maxRuntime, orchestrator.DefaultMaxWorkflowRuntime)
}

func TestGetMaxRuntime_NilSchedule(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	workflow := &db.Workflow{
		Schedule: nil,
	}

	maxRuntime := orchestrator.ExportGetMaxRuntime(o, workflow)

	assert.Equal(t, maxRuntime, orchestrator.DefaultMaxWorkflowRuntime)
}

func TestGetMaxAttempts_WithRetries(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	workflow := &db.Workflow{
		Schedule: &db.Schedule{
			MaxRetries: 3,
		},
	}

	maxAttempts := orchestrator.ExportGetMaxAttempts(o, workflow)

	assert.Equal(t, maxAttempts, 4) // 3 retries + 1 initial attempt
}

func TestGetMaxAttempts_ZeroRetries(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	workflow := &db.Workflow{
		Schedule: &db.Schedule{
			MaxRetries: 0,
		},
	}

	maxAttempts := orchestrator.ExportGetMaxAttempts(o, workflow)

	assert.Equal(t, maxAttempts, 1)
}

func TestGetMaxAttempts_NilSchedule(t *testing.T) {
	o := &orchestrator.Orchestrator{}

	workflow := &db.Workflow{
		Schedule: nil,
	}

	maxAttempts := orchestrator.ExportGetMaxAttempts(o, workflow)

	assert.Equal(t, maxAttempts, 1)
}
