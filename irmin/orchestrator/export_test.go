package orchestrator

import (
	"irmin-api/db"
	"irmin-api/embeddings"
	"irmin-api/engine"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// This file exports internal functions for testing purposes.
// These exports are only available during testing (file ends with _test.go).

// ExportBuildWorkflowStartLog exports buildWorkflowStartLog for testing.
var ExportBuildWorkflowStartLog = buildWorkflowStartLog

// ExportPopulateTriggerDetails exports populateTriggerDetails for testing.
var ExportPopulateTriggerDetails = populateTriggerDetails

// ExportPopulateRepositoryTrigger exports populateRepositoryTrigger for testing.
var ExportPopulateRepositoryTrigger = populateRepositoryTrigger

// ExportPopulateWorkflowRunTrigger exports populateWorkflowRunTrigger for testing.
var ExportPopulateWorkflowRunTrigger = populateWorkflowRunTrigger

// ExportTrimPaths exports trimPaths for testing.
var ExportTrimPaths = trimPaths

// ExportCheckContextCancellation exports checkContextCancellation for testing.
var ExportCheckContextCancellation = checkContextCancellation

// ExportConvertQueryResultToExecutionResult exports convertQueryResultToExecutionResult for testing.
var ExportConvertQueryResultToExecutionResult = convertQueryResultToExecutionResult

// ExportConvertQueryDataToCSV exports convertQueryDataToCSV for testing.
var ExportConvertQueryDataToCSV = convertQueryDataToCSV

// ExportLogFieldMappings exports logFieldMappings method for testing.
var ExportLogFieldMappings = func(o *Orchestrator, mappings []irminmodels.FieldMapping) []string {
	return o.logFieldMappings(mappings)
}

// ExportVerifyTargetFileExists exports verifyTargetFileExists method for testing.
var ExportVerifyTargetFileExists = func(
	o *Orchestrator,
	targetName *string,
	results map[string][]byte,
	logs *[]string,
) error {
	return o.verifyTargetFileExists(targetName, results, logs)
}

// ExportCheckValidationResults exports checkValidationResults method for testing.
var ExportCheckValidationResults = func(
	o *Orchestrator,
	filesValidated int,
	validationErrors []string,
	mode string,
	targetName *string,
	previousStageResults map[string][]byte,
	failOnError bool,
	logs *[]string,
) error {
	return o.checkValidationResults(
		filesValidated,
		validationErrors,
		mode,
		targetName,
		previousStageResults,
		failOnError,
		logs,
	)
}

// ExportLogValidationSchemaDetails exports logValidationSchemaDetails method for testing.
var ExportLogValidationSchemaDetails = func(o *Orchestrator, schema *irminmodels.ObjectSchema, logs *[]string) {
	o.logValidationSchemaDetails(schema, logs)
}

// ExportLogValidationDataStructure exports logValidationDataStructure method for testing.
var ExportLogValidationDataStructure = func(o *Orchestrator, data []byte, logs *[]string) {
	o.logValidationDataStructure(data, logs)
}

// ExportLogArraySample exports logArraySample method for testing.
var ExportLogArraySample = func(o *Orchestrator, arr []any, logs *[]string) {
	o.logArraySample(arr, logs)
}

// ExportLogObjectSample exports logObjectSample method for testing.
var ExportLogObjectSample = func(o *Orchestrator, obj map[string]any, logs *[]string) {
	o.logObjectSample(obj, logs)
}

// ExportBuildTransformConfig exports buildTransformConfig method for testing.
var ExportBuildTransformConfig = func(o *Orchestrator, stage *db.PipelineStage, mode, targetName string) engine.TransformConfig {
	return o.buildTransformConfig(stage, mode, targetName)
}

// ExportLogTransformDetails exports logTransformDetails method for testing.
var ExportLogTransformDetails = func(o *Orchestrator, logs *[]string, stage *db.PipelineStage, config engine.TransformConfig) {
	o.logTransformDetails(logs, stage, config)
}

// ExportBuildEmbeddingConfig exports buildEmbeddingConfig method for testing.
var ExportBuildEmbeddingConfig = func(o *Orchestrator, stage *db.PipelineStage) embeddings.EmbeddingConfig {
	return o.buildEmbeddingConfig(stage)
}

// ExportGetMaxRuntime exports getMaxRuntime method for testing.
var ExportGetMaxRuntime = func(o *Orchestrator, workflow *db.Workflow) int {
	return o.getMaxRuntime(workflow)
}

// ExportGetMaxAttempts exports getMaxAttempts method for testing.
var ExportGetMaxAttempts = func(o *Orchestrator, workflow *db.Workflow) int {
	return o.getMaxAttempts(workflow)
}

// ExportAggregateOperationErrors exports aggregateOperationErrors for testing.
var ExportAggregateOperationErrors = func(operation string, errs []error) error {
	return aggregateOperationErrors(workflowOperation(operation), errs)
}
