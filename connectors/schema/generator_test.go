package schema_test

import (
	"irmin-connectors/schema"
	"log/slog"
	"testing"

	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

func TestNewGenerator(t *testing.T) {
	logger := slog.Default()

	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()
}

func TestGenerateSchemaFromData(t *testing.T) {
	logger := slog.Default()
	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()

	// Test data with different types
	data := []map[string]any{
		{"id": 1, "name": "John", "age": 30, "active": true, "score": 85.5},
		{"id": 2, "name": "Jane", "age": 25, "active": false, "score": 92.3},
		{"id": 3, "name": "Bob", "age": 35, "active": true, "score": 78.9},
	}

	result, err := generator.GenerateSchemaFromData(data)
	if err != nil {
		t.Fatalf("Failed to generate schema from data: %v", err)
	}

	// Verify basic schema properties - now we get ObjectSchema directly!
	if result.Type != "structured" {
		t.Errorf("Expected type 'structured', got %s", result.Type)
	}

	if result.ContentType == nil || *result.ContentType != "application/json" {
		t.Error("Expected content type to be application/json")
	}

	// Check JSON Schema was generated
	if result.Schema == nil {
		t.Error("Expected JSON Schema to be generated")
	}

	// Check JSON Schema properties - clean Core API style!
	if result.Schema.Type != "object" {
		t.Errorf("Expected JSON Schema type 'object', got %s", result.Schema.Type)
	}

	expectedFields := []string{"id", "name", "age", "active", "score"}
	for _, fieldName := range expectedFields {
		if _, exists := result.Schema.Properties[fieldName]; !exists {
			t.Errorf("Expected field '%s' to exist in JSON Schema", fieldName)
		}
	}

	// Verify JSON Schema properties
	if len(result.Schema.Properties) == 0 {
		t.Error("Expected JSON Schema to have properties")
	}
}

func TestGenerateSchemaFromBytes(t *testing.T) {
	logger := slog.Default()
	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()

	// Test CSV data
	csvData := []byte(`name,age,city,salary
John,30,New York,75000.50
Jane,25,Los Angeles,82000.00
Bob,35,Chicago,68000.75`)

	result, err := generator.GenerateSchemaFromBytes(csvData, "users.csv")
	if err != nil {
		t.Fatalf("Failed to generate schema from CSV bytes: %v", err)
	}

	// Verify schema properties - clean Core API style!
	if result.Type != "structured" {
		t.Errorf("Expected type 'structured', got %s", result.Type)
	}

	if result.ContentType == nil || *result.ContentType != "text/csv" {
		t.Error("Expected content type to be text/csv")
	}

	// Verify size calculation
	if result.Size == nil || *result.Size != len(csvData) {
		t.Errorf("Expected size %d, got %v", len(csvData), result.Size)
	}

	// Check JSON Schema fields
	if result.Schema == nil {
		t.Error("Expected JSON Schema to be generated")
	} else {
		expectedFields := []string{"name", "age", "city", "salary"}
		for _, expected := range expectedFields {
			if _, exists := result.Schema.Properties[expected]; !exists {
				t.Errorf("Expected field '%s' not found in JSON Schema", expected)
			}
		}
	}
}

func TestGenerateSchemaFromJSON(t *testing.T) {
	logger := slog.Default()
	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()

	// Test JSON data
	jsonData := []byte(`[
		{"name": "Alice", "age": 28, "address": {"street": "123 Main St", "city": "Boston"}},
		{"name": "Charlie", "age": 32, "address": {"street": "456 Oak Ave", "city": "Seattle"}}
	]`)

	result, err := generator.GenerateSchemaFromBytes(jsonData, "users.json")
	if err != nil {
		t.Fatalf("Failed to generate schema from JSON bytes: %v", err)
	}

	// Verify schema properties - clean Core API style!
	if result.Type != "structured" {
		t.Errorf("Expected type 'structured', got %s", result.Type)
	}

	if result.ContentType == nil || *result.ContentType != "application/json" {
		t.Error("Expected content type to be application/json")
	}

	// Check for nested structure in JSON Schema
	if result.Schema == nil {
		t.Error("Expected JSON Schema to be generated")
	} else {
		// Check that address field exists in JSON Schema
		if addressSchema, exists := result.Schema.Properties["address"]; !exists {
			t.Error("Expected 'address' field to exist in JSON Schema")
		} else if addressSchema.Type != "object" {
			t.Errorf("Expected address field to be object type, got %s", addressSchema.Type)
		} else if len(addressSchema.Properties) != 2 {
			t.Errorf("Expected address field to have 2 properties, got %d", len(addressSchema.Properties))
		}
	}
}

func TestDefaultSchemaGenerationOptions(t *testing.T) {
	options := schema.DefaultSchemaGenerationOptions()

	if !options.IncludeJSONSchema {
		t.Error("Expected IncludeJSONSchema to be true by default")
	}

	if options.SampleSize != 1000 {
		t.Errorf("Expected SampleSize to be 1000, got %d", options.SampleSize)
	}

	if !options.InferTypes {
		t.Error("Expected InferTypes to be true by default")
	}

	if !options.DetectRequired {
		t.Error("Expected DetectRequired to be true by default")
	}
}

func TestCoreAPIObjectTypeDetection(t *testing.T) {
	// Test Core API pattern: file extension → ObjectType + ContentType (no "format" mapping!)
	tests := []struct {
		filename            string
		expectedType        string
		expectedContentType string
	}{
		{"data.csv", "structured", "text/csv"},
		{"data.json", "structured", "application/json"},
		{"data.jsonl", "structured", "application/jsonl"},
		{"data.ndjson", "structured", "application/x-ndjson"},
		{"data.parquet", "structured", "application/vnd.apache.parquet"},
		{"data.tsv", "structured", "text/tab-separated-values"},
		{"data.xlsx", "structured", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
		{"data.pdf", "binary", "application/pdf"},
		{"data.txt", "binary", "text/plain"},
		{"folder", "group", ""},
		{"", "group", ""},
	}

	for _, test := range tests {
		objectDetails := irminutils.ParseObjectDetailsFromPath(test.filename)

		// Test Core API pattern: direct access to Type and ContentType
		if string(objectDetails.Type) != test.expectedType {
			t.Errorf("For filename %s, expected type %s, got %s",
				test.filename, test.expectedType, string(objectDetails.Type))
		}

		if objectDetails.ContentType != test.expectedContentType {
			t.Errorf("For filename %s, expected content type %s, got %s",
				test.filename, test.expectedContentType, objectDetails.ContentType)
		}
	}
}

func TestParseObjectDetailsIntegration(t *testing.T) {
	logger := slog.Default()
	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()

	tests := []struct {
		filename        string
		expectedType    string
		expectedContent string
		shouldAnalyze   bool
	}{
		{"data.csv", "structured", "text/csv", true},
		{"data.json", "structured", "application/json", true},
		{"data.xlsx", "structured", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", true},
		{"data.parquet", "structured", "application/vnd.apache.parquet", true},
		{"data.pdf", "binary", "application/pdf", false},
		{"data.jpg", "binary", "image/jpeg", false},
		{"data.txt", "binary", "text/plain", false},
		{"folder", "group", "", false},
	}

	for _, test := range tests {
		t.Run(test.filename, func(t *testing.T) {
			// Test Core API pattern: direct ObjectDetails access
			objectDetails := irminutils.ParseObjectDetailsFromPath(test.filename)

			if string(objectDetails.Type) != test.expectedType {
				t.Errorf("For filename %s, expected type %s, got %s",
					test.filename, test.expectedType, string(objectDetails.Type))
			}

			if objectDetails.ContentType != test.expectedContent {
				t.Errorf("For filename %s, expected content type %s, got %s",
					test.filename, test.expectedContent, objectDetails.ContentType)
			}

			// Test structured analysis support
			supports := generator.SupportsStructuredAnalysis(test.filename)
			if supports != test.shouldAnalyze {
				t.Errorf("For filename %s, expected SupportsStructuredAnalysis %v, got %v",
					test.filename, test.shouldAnalyze, supports)
			}
		})
	}
}

func TestGenerateSchemaFromBytesWithBinaryData(t *testing.T) {
	logger := slog.Default()
	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()

	// Test binary data (PDF content simulation)
	binaryData := []byte{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34} // %PDF-1.4

	result, err := generator.GenerateSchemaFromBytes(binaryData, "document.pdf")
	if err != nil {
		t.Fatalf("Failed to generate schema from binary data: %v", err)
	}

	// Verify schema properties for binary data - clean Core API style!
	if result.Type != "binary" {
		t.Errorf("Expected type 'binary', got %s", result.Type)
	}

	if result.ContentType == nil || *result.ContentType != "application/pdf" {
		t.Error("Expected content type to be application/pdf")
	}

	// Verify size calculation
	if result.Size == nil || *result.Size != len(binaryData) {
		t.Errorf("Expected size %d, got %v", len(binaryData), result.Size)
	}

	// For binary data, no JSON Schema should be generated (Core API behavior)
	if result.Schema != nil {
		t.Error("Expected no JSON Schema for binary data")
	}
}

func TestEnhancedMetadata(t *testing.T) {
	logger := slog.Default()
	generator, err := schema.NewGenerator(t.Context(), logger)
	if err != nil {
		t.Fatalf("Failed to create schema generator: %v", err)
	}
	defer generator.Close()

	// Test CSV data with enhanced metadata
	csvData := []byte(`name,age,city
John,30,New York
Jane,25,Los Angeles`)

	result, err := generator.GenerateSchemaFromBytes(csvData, "users.csv")
	if err != nil {
		t.Fatalf("Failed to generate schema: %v", err)
	}

	// Check Core API ObjectSchema properties
	if result.Type != "structured" {
		t.Errorf("Expected type 'structured', got %s", result.Type)
	}

	if result.ContentType == nil || *result.ContentType != "text/csv" {
		t.Error("Expected content type to be text/csv")
	}

	if result.Name != "users.csv" {
		t.Errorf("Expected name 'users.csv', got %s", result.Name)
	}
}
