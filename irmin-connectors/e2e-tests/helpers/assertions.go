package helpers

import (
	"fmt"
	"strings"

	connectorsclient "irmin-connectors/e2e-tests/connectors-client"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// TestError represents a test assertion failure.
type TestError struct {
	Message string
}

func (e *TestError) Error() string {
	return e.Message
}

// AssertNotNil checks that a value is not nil.
func AssertNotNil(value any, message string) error {
	if value == nil {
		return &TestError{Message: fmt.Sprintf("Expected non-nil value: %s", message)}
	}
	return nil
}

// AssertNotEmpty checks that a string is not empty.
func AssertNotEmpty(value string, fieldName string) error {
	if value == "" {
		return &TestError{Message: fmt.Sprintf("Expected non-empty %s", fieldName)}
	}
	return nil
}

// AssertNoError checks that an error is nil.
func AssertNoError(err error, context string) error {
	if err != nil {
		return &TestError{Message: fmt.Sprintf("Unexpected error in %s: %v", context, err)}
	}
	return nil
}

// AssertError checks that an error occurred.
func AssertError(err error, context string) error {
	if err == nil {
		return &TestError{Message: fmt.Sprintf("Expected error in %s but got none", context)}
	}
	return nil
}

// AssertContains checks that a slice contains a specific value.
func AssertContains(slice []string, value string, context string) error {
	for _, item := range slice {
		if item == value {
			return nil
		}
	}
	return &TestError{Message: fmt.Sprintf("Expected %s to contain '%s', got: %v", context, value, slice)}
}

// AssertCapabilityContains checks that capabilities contain a specific capability.
func AssertCapabilityContains(
	capabilities []irminmodels.ConnectorCapability,
	capability irminmodels.ConnectorCapability,
	context string,
) error {
	for _, cap := range capabilities {
		if cap == capability {
			return nil
		}
	}
	return &TestError{Message: fmt.Sprintf("Expected capabilities to contain '%s' in %s", capability, context)}
}

// AssertTrue checks that a condition is true.
func AssertTrue(condition bool, message string) error {
	if !condition {
		return &TestError{Message: fmt.Sprintf("Assertion failed: %s", message)}
	}
	return nil
}

// AssertFalse checks that a condition is false.
func AssertFalse(condition bool, message string) error {
	if condition {
		return &TestError{Message: fmt.Sprintf("Assertion failed (expected false): %s", message)}
	}
	return nil
}

// AssertGreaterThan checks that a value is greater than another.
func AssertGreaterThan(value, threshold int, context string) error {
	if value <= threshold {
		return &TestError{Message: fmt.Sprintf("Expected %s (%d) to be greater than %d", context, value, threshold)}
	}
	return nil
}

// AssertValidConnectorInfo validates the connector info structure.
func AssertValidConnectorInfo(info *connectorsclient.ConnectorInfo) error {
	if err := AssertNotEmpty(info.Name, "name"); err != nil {
		return err
	}
	if err := AssertNotEmpty(info.Version, "version"); err != nil {
		return err
	}
	if err := AssertNotEmpty(info.StructureVersion, "structure_version"); err != nil {
		return err
	}
	if err := AssertNotEmpty(info.APIBaseURL, "api_base_url"); err != nil {
		return err
	}
	if len(info.Capabilities) == 0 {
		return &TestError{Message: "Expected at least one capability"}
	}
	return nil
}

// AssertValidDynamicField validates a dynamic field structure.
func AssertValidDynamicField(field irminmodels.DynamicField, fieldName string) error {
	if err := AssertNotEmpty(string(field.Type), fmt.Sprintf("%s.type", fieldName)); err != nil {
		return err
	}
	if err := AssertNotEmpty(field.Label, fmt.Sprintf("%s.label", fieldName)); err != nil {
		return err
	}
	return nil
}

// AssertValidOperation validates an operation structure.
func AssertValidOperation(op *connectorsclient.Operation) error {
	if op.ID == 0 {
		return &TestError{Message: "Expected operation ID to be non-zero"}
	}
	if err := AssertNotEmpty(op.Token, "operation token"); err != nil {
		return err
	}
	if err := AssertNotEmpty(op.ConfigHash, "config hash"); err != nil {
		return err
	}
	return nil
}

// AssertValidObjectSchema validates an object schema structure.
func AssertValidObjectSchema(schema *irminmodels.ObjectSchema) error {
	if err := AssertNotEmpty(string(schema.Type), "schema type"); err != nil {
		return err
	}
	// Basic validation - schema structure can vary by connector
	return nil
}

// AssertValidationResult checks connector configuration validation results.
func AssertValidationResult(result *irminmodels.ConnectorConfigurationValidationResult, shouldBeValid bool) error {
	if shouldBeValid {
		return validateSuccessfulResult(result)
	}
	return validateFailedResult(result)
}

// validateSuccessfulResult validates that the configuration passed validation.
func validateSuccessfulResult(result *irminmodels.ConnectorConfigurationValidationResult) error {
	if !result.OK {
		errMsg := "Configuration validation failed"
		if len(result.Errors) > 0 {
			errMsg = fmt.Sprintf("%s: %s", errMsg, strings.Join(result.Errors, ", "))
		}
		return &TestError{Message: errMsg}
	}
	if !result.CanConnect {
		return &TestError{Message: "Expected to be able to connect"}
	}
	return nil
}

// validateFailedResult validates that the configuration failed validation.
func validateFailedResult(result *irminmodels.ConnectorConfigurationValidationResult) error {
	if result.OK {
		return &TestError{Message: "Expected configuration validation to fail"}
	}
	return nil
}
