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
	default:
		return true // Let oneof validation handle invalid types
	}
}

// validateActionPipelineStage validates action-type pipeline stages.
func (v *Validator) validateActionPipelineStage(parentStruct reflect.Value) bool {
	executableField := parentStruct.FieldByName("Executable")

	// Action stages must have an executable
	if !executableField.IsValid() || executableField.IsNil() ||
		(executableField.Elem().IsValid() && executableField.Elem().String() == "") {
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

	// Connection stages must have a connection ID
	if !v.validateConnectionID(connectionIDField) {
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
		if !readPathsField.IsValid() || readPathsField.Len() == 0 {
			return false
		}
	}

	return true
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
	if !v.validateConnectionID(connectionIDField) {
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
	if !v.validateConnectionID(connectionIDField) {
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
func (v *Validator) validateActionWorkflowable(_ reflect.Value) bool {
	// Action workflowables are valid by default
	// Specific validation is handled by standard field validators
	return true
}

// validateConnectionID validates that a connection ID field is a valid SQID.
func (v *Validator) validateConnectionID(connectionIDField reflect.Value) bool {
	if !connectionIDField.IsValid() {
		return false
	}

	var connectionID string
	if connectionIDField.Kind() == reflect.Ptr {
		if connectionIDField.IsNil() {
			return false
		}
		connectionID = connectionIDField.Elem().String()
	} else {
		connectionID = connectionIDField.String()
	}

	if connectionID == "" {
		return false
	}

	// Skip SQID validation if no SQID manager is available (client-side scenario)
	if v.sqidManager == nil {
		return true
	}

	// Validate that the connection ID is a valid SQID for connection type
	decoded, err := v.sqidManager.Decode("connections", connectionID)
	if err != nil {
		return false
	}

	// Check if the decoded value is a valid uint64
	if decoded == 0 {
		return false
	}

	return true
}
