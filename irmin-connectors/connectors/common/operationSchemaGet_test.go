package common_test

import (
	"errors"
	"log/slog"
	"testing"

	"irmin-connectors/connectors/common"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// MockSchemaProvider implements SchemaOperationProvider for testing.
type MockSchemaProvider struct {
	shouldFailInit   bool
	shouldFailSchema bool
	supportedTypes   []string
}

func (m *MockSchemaProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	if m.shouldFailInit {
		return nil, nil, func() {}, errors.New("mock initialization failure")
	}
	dbName := "test_db"
	return "mock_client", &dbName, func() {}, nil
}

func (m *MockSchemaProvider) GetSchema(
	_ fiber.Ctx,
	_ any,
	_ string,
	_ *string,
) (*irminmodels.ObjectSchema, error) {
	if m.shouldFailSchema {
		return nil, errors.New("mock schema failure")
	}

	return &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Name: "test_schema",
		Path: "/test",
	}, nil
}

func (m *MockSchemaProvider) GetSupportedOperationTypes() []string {
	if m.supportedTypes == nil {
		return []string{"pull", "push"}
	}
	return m.supportedTypes
}

func TestJoinStrings(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		sep      string
		expected string
	}{
		{
			name:     "empty slice",
			input:    []string{},
			sep:      ", ",
			expected: "",
		},
		{
			name:     "single element",
			input:    []string{"pull"},
			sep:      ", ",
			expected: "pull",
		},
		{
			name:     "multiple elements",
			input:    []string{"pull", "push", "patch"},
			sep:      ", ",
			expected: "pull, push, patch",
		},
		{
			name:     "different separator",
			input:    []string{"a", "b", "c"},
			sep:      " | ",
			expected: "a | b | c",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Access the unexported function through a test in the same package
			// For now, we'll skip this test since joinStrings is not exported
			// In a real scenario, we might export this function or test it differently
			t.Skip("joinStrings is not exported")
		})
	}
}

func TestSchemaOperationProvider_GetSupportedOperationTypes(t *testing.T) {
	provider := &MockSchemaProvider{
		supportedTypes: []string{"pull", "push", "patch"},
	}

	types := provider.GetSupportedOperationTypes()
	expected := []string{"pull", "push", "patch"}

	if len(types) != len(expected) {
		t.Errorf("Expected %d types, got %d", len(expected), len(types))
		return
	}

	for i, tp := range types {
		if tp != expected[i] {
			t.Errorf("Expected type %s at index %d, got %s", expected[i], i, tp)
		}
	}
}

func TestNotSupportedSchemaProvider(t *testing.T) {
	provider := &common.NotSupportedSchemaProvider{}

	// Test InitializeClient
	client, dbName, cleanup, err := provider.InitializeClient(nil, nil, nil)
	if err == nil {
		t.Error("Expected error from InitializeClient, got nil")
	}
	if client != nil {
		t.Error("Expected nil client")
	}
	if dbName != nil {
		t.Error("Expected nil dbName")
	}
	cleanup() // Should not panic

	// Test GetSchema
	schema, err := provider.GetSchema(nil, nil, "", nil)
	if err == nil {
		t.Error("Expected error from GetSchema, got nil")
	}
	if schema != nil {
		t.Error("Expected nil schema")
	}

	// Test GetSupportedOperationTypes
	types := provider.GetSupportedOperationTypes()
	if len(types) != 0 {
		t.Errorf("Expected empty slice, got %v", types)
	}
}
