package irminsdkvalidator

import (
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
)

// validateSQID validates SQID format using the SQID manager.
func (v *Validator) validateSQID(fl validator.FieldLevel) bool {
	// Skip SQID validation if no SQID manager is available (client-side scenario)
	if v.sqidManager == nil {
		return true
	}

	// Get the value of the field
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var sqidValue string
	if field.Kind() == reflect.Ptr {
		sqidValue = field.Elem().String()
	} else {
		sqidValue = field.String()
	}

	// Skip validation for empty strings - let other validators (required_if, omitempty) handle them
	if sqidValue == "" {
		return true
	}

	typeParam := fl.Param()

	// Get the type of the sqid
	typeParam = strings.TrimSpace(typeParam)

	// Get the sqid manager
	sqidManager := v.sqidManager

	// Decode the sqid
	decoded, err := sqidManager.Decode(typeParam, sqidValue)
	if err != nil {
		return false
	}

	// Check if the decoded value is a valid uint64
	if decoded == 0 {
		return false
	}

	return true
}

// validatePipelineStage validates pipeline stage configuration based on type.
func (v *Validator) validatePipelineStage(fl validator.FieldLevel) bool {
	// Get the parent struct (PipelineStage) from the Type field
	parentStruct := fl.Parent()

	// Make sure we're working with a struct
	if parentStruct.Kind() != reflect.Struct {
		return true // Let other validators handle non-struct cases
	}

	// Get the Type field value (this is the current field being validated)
	stageType := fl.Field().String()

	switch stageType {
	case "action":
		return v.validateActionPipelineStage(parentStruct)
	case "connection":
		return v.validateConnectionPipelineStage(parentStruct)
	case "repository":
		return v.validateRepositoryPipelineStage(parentStruct)
	case "repository_action":
		return v.validateRepositoryActionPipelineStage(parentStruct)
	case "trigger_workflow":
		return v.validateTriggerWorkflowPipelineStage(parentStruct)
	case "validation":
		return v.validateValidationPipelineStage(parentStruct)
	case "transform":
		return v.validateTransformPipelineStage(parentStruct)
	case "embeddings":
		return v.validateEmbeddingsPipelineStage(parentStruct)
	default:
		return true // Let oneof validation handle invalid types
	}
}

// validateActionPipelineStage validates action-type pipeline stages.
func (v *Validator) validateActionPipelineStage(parentStruct reflect.Value) bool {
	executableTypeField := parentStruct.FieldByName("ExecutableType")
	scriptIDField := parentStruct.FieldByName("ScriptID")
	queryIDField := parentStruct.FieldByName("QueryID")

	// Get ExecutableType value
	var executableType string
	if executableTypeField.IsValid() {
		executableType = executableTypeField.String()
	}

	// Validate based on ExecutableType
	switch executableType {
	case "script":
		// Action stages with script executable type must have a valid script ID
		if !v.validateResourceID(scriptIDField, "scripts") {
			return false
		}
	case "query":
		// Action stages with query executable type must have a valid query ID
		if !v.validateResourceID(queryIDField, "queries") {
			return false
		}
	default:
		// Action stages must have a valid ExecutableType (script or query)
		// If ExecutableType is not set or invalid, validation fails
		return false
	}

	return true
}

// validateConnectionPipelineStage validates connection-type pipeline stages.
func (v *Validator) validateConnectionPipelineStage(parentStruct reflect.Value) bool {
	connectionIDField := parentStruct.FieldByName("ConnectionID")
	writeField := parentStruct.FieldByName("Write")
	readField := parentStruct.FieldByName("Read")
	writePathField := parentStruct.FieldByName("ConnectionWritePath")
	readPathsField := parentStruct.FieldByName("ConnectionReadPaths")

	// Connection stages must have a valid connection ID (validated as SQID)
	if !v.validateResourceID(connectionIDField, "connections") {
		return false
	}

	// If it's a write stage, must have write path
	if writeField.IsValid() && writeField.Bool() {
		if !writePathField.IsValid() || writePathField.IsNil() ||
			(writePathField.Elem().IsValid() && writePathField.Elem().String() == "") {
			return false
		}
	}

	// If it's a read stage, must have read paths
	if readField.IsValid() && readField.Bool() {
		return v.validateReadPaths(readPathsField)
	}

	return true
}

// validateReadPaths validates that a read paths field is non-empty.
// Handles both direct slices and pointers to slices.
func (v *Validator) validateReadPaths(readPathsField reflect.Value) bool {
	if !readPathsField.IsValid() {
		return false
	}

	// Handle pointer to slice: dereference before checking length
	var pathsLen int
	if readPathsField.Kind() == reflect.Pointer {
		if readPathsField.IsNil() {
			return false
		}
		pathsLen = readPathsField.Elem().Len()
	} else {
		pathsLen = readPathsField.Len()
	}

	return pathsLen > 0
}

// validateRepositoryPipelineStage validates repository-type pipeline stages.
func (v *Validator) validateRepositoryPipelineStage(parentStruct reflect.Value) bool {
	repositoryField := parentStruct.FieldByName("Repository")
	repositoryBranchField := parentStruct.FieldByName("RepositoryBranch")

	// Repository stages must have a repository
	if !repositoryField.IsValid() || repositoryField.IsNil() ||
		(repositoryField.Elem().IsValid() && repositoryField.Elem().String() == "") {
		return false
	}

	// Repository stages must have a branch
	if !repositoryBranchField.IsValid() || repositoryBranchField.IsNil() ||
		(repositoryBranchField.Elem().IsValid() && repositoryBranchField.Elem().String() == "") {
		return false
	}

	return true
}

// validateRepositoryActionPipelineStage validates repository_action-type pipeline stages.
func (v *Validator) validateRepositoryActionPipelineStage(parentStruct reflect.Value) bool {
	repositoryActionTypeField := parentStruct.FieldByName("RepositoryActionType")
	repositoryField := parentStruct.FieldByName("RepositoryActionRepository")
	branchField := parentStruct.FieldByName("RepositoryActionBranch")
	targetBranchField := parentStruct.FieldByName("RepositoryActionTargetBranch")
	deletePathField := parentStruct.FieldByName("RepositoryActionDeletePath")

	// Must have a repository action type
	if !repositoryActionTypeField.IsValid() || repositoryActionTypeField.IsNil() {
		return false
	}

	actionType := repositoryActionTypeField.Elem().String()
	if actionType != "commit" && actionType != "merge" && actionType != "revert" && actionType != "delete" {
		return false
	}

	// Must have a repository
	if !repositoryField.IsValid() || repositoryField.IsNil() ||
		(repositoryField.Elem().IsValid() && repositoryField.Elem().String() == "") {
		return false
	}

	// Must have a branch
	if !branchField.IsValid() || branchField.IsNil() ||
		(branchField.Elem().IsValid() && branchField.Elem().String() == "") {
		return false
	}

	// If it's a merge action, must have a target branch
	if actionType == "merge" {
		if !targetBranchField.IsValid() || targetBranchField.IsNil() ||
			(targetBranchField.Elem().IsValid() && targetBranchField.Elem().String() == "") {
			return false
		}
	}

	// If it's a delete action, must have a delete path
	if actionType == "delete" {
		if !deletePathField.IsValid() || deletePathField.IsNil() ||
			(deletePathField.Elem().IsValid() && deletePathField.Elem().String() == "") {
			return false
		}
	}

	return true
}

// validateTriggerWorkflowPipelineStage validates trigger_workflow-type pipeline stages.
func (v *Validator) validateTriggerWorkflowPipelineStage(parentStruct reflect.Value) bool {
	triggerWorkflowIDField := parentStruct.FieldByName("TriggerWorkflowID")

	// Trigger workflow stages must have a workflow ID (validated as SQID)
	if !v.validateResourceID(triggerWorkflowIDField, "workflows") {
		return false
	}

	return true
}

// validateValidationPipelineStage validates validation-type pipeline stages.
func (v *Validator) validateValidationPipelineStage(parentStruct reflect.Value) bool {
	validationSchemaField := parentStruct.FieldByName("ValidationSchema")
	validationModeField := parentStruct.FieldByName("ValidationMode")

	// ValidationSchema is required
	if !validationSchemaField.IsValid() || validationSchemaField.IsNil() {
		return false
	}

	// ValidationMode must be "single" or "all" if provided
	if validationModeField.IsValid() && !validationModeField.IsNil() {
		mode := validationModeField.Elem().String()
		if mode != "single" && mode != "all" {
			return false
		}
	}

	return true
}

// validateTransformPipelineStage validates transform-type pipeline stages.
//
//nolint:gocognit,gocyclo,cyclop // There is no need to refactor this code
func (v *Validator) validateTransformPipelineStage(parentStruct reflect.Value) bool {
	transformOperationField := parentStruct.FieldByName("TransformOperation")
	transformModeField := parentStruct.FieldByName("TransformMode")
	transformFieldRenamesField := parentStruct.FieldByName("TransformFieldRenames")
	transformFieldsToRemoveField := parentStruct.FieldByName("TransformFieldsToRemove")
	transformOutputFormatField := parentStruct.FieldByName("TransformOutputFormat")
	transformOutputNameField := parentStruct.FieldByName("TransformOutputName")
	transformTargetNameField := parentStruct.FieldByName("TransformTargetName")

	// TransformOperation is required
	if !transformOperationField.IsValid() || transformOperationField.IsNil() {
		return false
	}

	operation := transformOperationField.Elem().String()
	if operation != "field_rename" && operation != "field_remove" && operation != "file_rename" &&
		operation != "file_remove" && operation != "format_convert" {
		return false
	}

	// TransformMode must be "single" or "all" if provided
	if transformModeField.IsValid() && !transformModeField.IsNil() {
		mode := transformModeField.Elem().String()
		if mode != "single" && mode != "all" {
			return false
		}
	}

	// Validate operation-specific requirements
	switch operation {
	case "field_rename":
		// field_rename requires TransformFieldRenames to be non-empty
		if !transformFieldRenamesField.IsValid() || transformFieldRenamesField.Len() == 0 {
			return false
		}
	case "field_remove":
		// field_remove requires TransformFieldsToRemove to be non-empty
		if !transformFieldsToRemoveField.IsValid() || transformFieldsToRemoveField.Len() == 0 {
			return false
		}
	case "format_convert":
		// format_convert requires TransformOutputFormat
		if !transformOutputFormatField.IsValid() || transformOutputFormatField.IsNil() {
			return false
		}
		outputFormat := transformOutputFormatField.Elem().String()
		if outputFormat != "csv" && outputFormat != "json" && outputFormat != "parquet" {
			return false
		}
	case "file_rename":
		// file_rename requires TransformOutputName
		if !transformOutputNameField.IsValid() || transformOutputNameField.IsNil() {
			return false
		}
		outputName := transformOutputNameField.Elem().String()
		if outputName == "" {
			return false
		}
	case "file_remove":
		// file_remove requires TransformTargetName to specify which file to remove
		if !transformTargetNameField.IsValid() || transformTargetNameField.IsNil() {
			return false
		}
		targetName := transformTargetNameField.Elem().String()
		if targetName == "" {
			return false
		}
	}

	return true
}

// validateWorkflowable validates workflowable configuration based on type.
func (v *Validator) validateWorkflowable(fl validator.FieldLevel) bool {
	// Get the parent struct (Workflowable) from the Type field
	parentStruct := fl.Parent()

	// Make sure we're working with a struct
	if parentStruct.Kind() != reflect.Struct {
		return true // Let other validators handle non-struct cases
	}

	// Get the Type field value (this is the current field being validated)
	workflowableType := fl.Field().String()

	// Validate common fields first
	if !v.validateCommonWorkflowableFields(parentStruct) {
		return false
	}

	switch workflowableType {
	case "import":
		return v.validateImportWorkflowable(parentStruct)
	case "export":
		return v.validateExportWorkflowable(parentStruct)
	case "pipeline":
		return v.validatePipelineWorkflowable(parentStruct)
	case "action":
		return v.validateActionWorkflowable(parentStruct)
	default:
		return true // Let oneof validation handle invalid types
	}
}

// validateImportWorkflowable validates import-type workflowables.
func (v *Validator) validateImportWorkflowable(parentStruct reflect.Value) bool {
	connectionIDField := parentStruct.FieldByName("ConnectionID")
	fromConnectionPathsField := parentStruct.FieldByName("ImportFromConnectionPaths")

	// Import workflowables must have a connection ID
	if !v.validateResourceID(connectionIDField, "connections") {
		return false
	}

	// ImportFromConnectionPaths can be empty - empty means "import all paths"
	// Only validate that the field exists, not that it has values
	if !fromConnectionPathsField.IsValid() {
		return false
	}

	// Destination path can be empty (treated as root)
	// No validation needed for ImportToRepositoryPath

	return true
}

// validateExportWorkflowable validates export-type workflowables.
func (v *Validator) validateExportWorkflowable(parentStruct reflect.Value) bool {
	connectionIDField := parentStruct.FieldByName("ConnectionID")
	fromRepositoryPathsField := parentStruct.FieldByName("ExportFromRepositoryPaths")
	toConnectionPathField := parentStruct.FieldByName("ExportToConnectionPath")

	// Export workflowables must have a connection ID
	if !v.validateResourceID(connectionIDField, "connections") {
		return false
	}

	// ExportFromRepositoryPaths can be empty - empty means "export all repository paths"
	// Only validate that the field exists, not that it has values
	if !fromRepositoryPathsField.IsValid() {
		return false
	}

	// Must have destination path
	if !toConnectionPathField.IsValid() || toConnectionPathField.String() == "" {
		return false
	}

	return true
}

// validateCommonWorkflowableFields validates fields common to import/export workflowables.
func (v *Validator) validateCommonWorkflowableFields(parentStruct reflect.Value) bool {
	workflowableType := parentStruct.FieldByName("Type").String()

	// Only validate common fields for import/export types
	if workflowableType != "import" && workflowableType != "export" {
		return true
	}

	repositoryField := parentStruct.FieldByName("Repository")
	repositoryBranchField := parentStruct.FieldByName("RepositoryBranch")

	// Must have repository
	if !repositoryField.IsValid() || repositoryField.String() == "" {
		return false
	}

	// Must have repository branch
	if !repositoryBranchField.IsValid() || repositoryBranchField.String() == "" {
		return false
	}

	// FieldMappings validation is handled by standard tags:
	// - "required_if=Type import,required_if=Type export" ensures they're required when needed
	// - "dive" validates each FieldMapping when present
	// Custom validator doesn't need to check this field

	return true
}

// validatePipelineWorkflowable validates pipeline-type workflowables.
func (v *Validator) validatePipelineWorkflowable(parentStruct reflect.Value) bool {
	stagesField := parentStruct.FieldByName("Stages")

	// Pipeline workflowables must have stages array, but it can be empty
	if !stagesField.IsValid() {
		return false
	}

	return true
}

// validateActionWorkflowable validates action-type workflowables.
func (v *Validator) validateActionWorkflowable(parentStruct reflect.Value) bool {
	executableTypeField := parentStruct.FieldByName("ExecutableType")
	scriptIDField := parentStruct.FieldByName("ScriptID")
	queryIDField := parentStruct.FieldByName("QueryID")

	// Get ExecutableType value
	var executableType string
	if executableTypeField.IsValid() {
		executableType = executableTypeField.String()
	}

	// Validate based on ExecutableType
	switch executableType {
	case "script":
		// Action workflowables with script executable type must have a valid script ID
		if !v.validateResourceID(scriptIDField, "scripts") {
			return false
		}
	case "query":
		// Action workflowables with query executable type must have a valid query ID
		if !v.validateResourceID(queryIDField, "queries") {
			return false
		}
	default:
		// Action workflowables must have a valid ExecutableType (script or query)
		// If ExecutableType is not set or invalid, validation fails
		return false
	}

	return true
}

// validateResourceID validates that a resource ID field is a valid SQID for a given resource type.
func (v *Validator) validateResourceID(resourceIDField reflect.Value, resourceType string) bool {
	if !resourceIDField.IsValid() {
		return false
	}

	var resourceID string
	if resourceIDField.Kind() == reflect.Ptr {
		if resourceIDField.IsNil() {
			return false
		}
		resourceID = resourceIDField.Elem().String()
	} else {
		resourceID = resourceIDField.String()
	}

	if resourceID == "" {
		return false
	}

	// Skip SQID validation if no SQID manager is available (client-side scenario)
	if v.sqidManager == nil {
		return true
	}

	// Validate that the resource ID is a valid SQID for the resource type
	decoded, err := v.sqidManager.Decode(resourceType, resourceID)
	if err != nil {
		return false
	}

	// Check if the decoded value is a valid uint64
	if decoded == 0 {
		return false
	}

	return true
}

// validateEmbeddingsPipelineStage validates embeddings-type pipeline stages.
//
//nolint:gocognit // There is no need to refactor this code
func (v *Validator) validateEmbeddingsPipelineStage(parentStruct reflect.Value) bool {
	embeddingsOperationField := parentStruct.FieldByName("EmbeddingsOperation")
	embeddingsRepositoryField := parentStruct.FieldByName("EmbeddingsRepository")
	embeddingsOutputPathField := parentStruct.FieldByName("EmbeddingsOutputPath")
	embeddingsPathField := parentStruct.FieldByName("EmbeddingsPath")
	embeddingsQueryField := parentStruct.FieldByName("EmbeddingsQuery")

	// EmbeddingsOperation is required
	if !embeddingsOperationField.IsValid() || embeddingsOperationField.IsNil() {
		return false
	}

	operation := embeddingsOperationField.Elem().String()
	if operation != "vectorize" && operation != "search" {
		return false
	}

	// EmbeddingsRepository is required for all operations
	if !embeddingsRepositoryField.IsValid() || embeddingsRepositoryField.IsNil() ||
		(embeddingsRepositoryField.Elem().IsValid() && embeddingsRepositoryField.Elem().String() == "") {
		return false
	}

	// Validate operation-specific requirements
	switch operation {
	case "vectorize":
		// vectorize requires EmbeddingsOutputPath
		if !embeddingsOutputPathField.IsValid() || embeddingsOutputPathField.IsNil() {
			return false
		}
		outputPath := embeddingsOutputPathField.Elem().String()
		if outputPath == "" {
			return false
		}
	case "search":
		// search requires EmbeddingsPath
		if !embeddingsPathField.IsValid() || embeddingsPathField.IsNil() {
			return false
		}
		path := embeddingsPathField.Elem().String()
		if path == "" {
			return false
		}
		// search requires EmbeddingsQuery
		if !embeddingsQueryField.IsValid() || embeddingsQueryField.IsNil() {
			return false
		}
		query := embeddingsQueryField.Elem().String()
		if query == "" {
			return false
		}
	}

	return true
}
