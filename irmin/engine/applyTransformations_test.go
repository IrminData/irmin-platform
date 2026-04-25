package engine_test

import (
	"fmt"
	"irmin-api/engine"
	"irmin-api/lib"
	"strings"
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// ApplyTransformationsTestSuite provides test setup for transformations functionality.
type ApplyTransformationsTestSuite struct {
	*lib.TestSuite
	engineClient *engine.Client
}

// setupApplyTransformationsTestSuite initializes the test suite with DuckDB and engine clients.
func setupApplyTransformationsTestSuite(t *testing.T) *ApplyTransformationsTestSuite {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	// Initialize engine client with proper fields
	engineClient, err := engine.NewClient(t.Context(), testSuite.Logger, testSuite.Env, testSuite.DB)
	if err != nil {
		t.Fatalf("Failed to create engine client: %v", err)
	}

	return &ApplyTransformationsTestSuite{
		TestSuite:    testSuite,
		engineClient: engineClient,
	}
}

// =============================================================================
// Input Validation Tests
// =============================================================================

// TestApplyTransformationsInputValidation tests input validation.
func TestApplyTransformationsInputValidation(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	// Test nil duckDBClient
	result, err := suite.engineClient.ApplyTransformations(
		t.Context(),
		nil,
		map[string][]byte{"test.csv": []byte("a,b\n1,2")},
		engine.TransformConfig{Operation: irminmodels.TransformOpFieldRename},
	)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "duckDBClient cannot be nil", err.Error())

	// Test empty files
	result, err = suite.engineClient.ApplyTransformations(
		t.Context(),
		suite.DuckDBClient,
		map[string][]byte{},
		engine.TransformConfig{Operation: irminmodels.TransformOpFieldRename},
	)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "files cannot be empty", err.Error())
}

// =============================================================================
// Field Rename Operation Tests
// =============================================================================

// TestTransformFieldRenameBasic tests renaming a single field in a CSV file.
func TestTransformFieldRenameBasic(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age,department
John,30,Engineering
Jane,25,Marketing`)

	files := map[string][]byte{
		"employees.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation: irminmodels.TransformOpFieldRename,
		Mode:      "all",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "name", NewName: "full_name"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["employees.csv"]
	assert.True(t, exists)
	assert.True(t, len(content) > 0)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "full_name"))
	assert.True(t, strings.Contains(contentStr, "age"))
	assert.True(t, strings.Contains(contentStr, "department"))
	assert.True(t, strings.Contains(contentStr, "John"))
	assert.True(t, strings.Contains(contentStr, "Jane"))
}

// TestTransformFieldRenameMultiple tests renaming multiple fields at once.
func TestTransformFieldRenameMultiple(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`id,name,dept
1,John,Engineering
2,Jane,Marketing`)

	files := map[string][]byte{
		"data.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation: irminmodels.TransformOpFieldRename,
		Mode:      "all",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "id", NewName: "employee_id"},
			{OldName: "name", NewName: "full_name"},
			{OldName: "dept", NewName: "department"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["data.csv"]
	assert.True(t, exists)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "employee_id"))
	assert.True(t, strings.Contains(contentStr, "full_name"))
	assert.True(t, strings.Contains(contentStr, "department"))
}

// TestTransformFieldRenameNoRenames tests that empty renames returns original content.
func TestTransformFieldRenameNoRenames(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age
John,30
Jane,25`)

	files := map[string][]byte{
		"test.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFieldRename,
		Mode:         "all",
		FieldRenames: []irminmodels.FieldRename{}, // Empty renames
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["test.csv"]
	assert.True(t, exists)
	assert.Equal(t, fileContent, content)
}

// =============================================================================
// Field Remove Operation Tests
// =============================================================================

// TestTransformFieldRemoveBasic tests removing a single field from a CSV file.
func TestTransformFieldRemoveBasic(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age,salary,department
John,30,75000,Engineering
Jane,25,65000,Marketing`)

	files := map[string][]byte{
		"employees.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:      irminmodels.TransformOpFieldRemove,
		Mode:           "all",
		FieldsToRemove: []string{"salary"},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["employees.csv"]
	assert.True(t, exists)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "name"))
	assert.True(t, strings.Contains(contentStr, "age"))
	assert.True(t, strings.Contains(contentStr, "department"))
	assert.False(t, strings.Contains(contentStr, "salary"))
	assert.False(t, strings.Contains(contentStr, "75000"))
	assert.False(t, strings.Contains(contentStr, "65000"))
}

// TestTransformFieldRemoveMultiple tests removing multiple fields at once.
func TestTransformFieldRemoveMultiple(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`id,name,internal_id,temp_flag,email
1,John,INT001,true,john@example.com
2,Jane,INT002,false,jane@example.com`)

	files := map[string][]byte{
		"users.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:      irminmodels.TransformOpFieldRemove,
		Mode:           "all",
		FieldsToRemove: []string{"internal_id", "temp_flag"},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["users.csv"]
	assert.True(t, exists)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "id"))
	assert.True(t, strings.Contains(contentStr, "name"))
	assert.True(t, strings.Contains(contentStr, "email"))
	assert.False(t, strings.Contains(contentStr, "internal_id"))
	assert.False(t, strings.Contains(contentStr, "temp_flag"))
}

// TestTransformFieldRemoveNoFields tests that empty fields list returns original content.
func TestTransformFieldRemoveNoFields(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age
John,30
Jane,25`)

	files := map[string][]byte{
		"test.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:      irminmodels.TransformOpFieldRemove,
		Mode:           "all",
		FieldsToRemove: []string{}, // Empty list
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["test.csv"]
	assert.True(t, exists)
	assert.Equal(t, fileContent, content)
}

// =============================================================================
// File Rename Operation Tests
// =============================================================================

// TestTransformFileRenameBasic tests renaming a file without modifying content.
func TestTransformFileRenameBasic(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age
John,30
Jane,25`)

	files := map[string][]byte{
		"old_name.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFileRename,
		Mode:       "single",
		TargetName: "old_name.csv",
		OutputName: "new_name.csv",
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	// Old name should not exist
	_, oldExists := result["old_name.csv"]
	assert.False(t, oldExists)

	// New name should exist with same content
	content, newExists := result["new_name.csv"]
	assert.True(t, newExists)
	assert.Equal(t, fileContent, content)
}

// TestTransformFileRenameMissingOutputName tests that missing output name returns error.
func TestTransformFileRenameMissingOutputName(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age
John,30`)

	files := map[string][]byte{
		"test.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFileRename,
		Mode:       "single",
		TargetName: "test.csv",
		OutputName: "", // Missing output name
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "output_name is required"))
}

// =============================================================================
// File Remove Operation Tests
// =============================================================================

// TestTransformFileRemoveBasic tests removing a file from the pipeline.
func TestTransformFileRemoveBasic(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"to_remove.csv": []byte(`name,age
John,30`),
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFileRemove,
		Mode:       "single",
		TargetName: "to_remove.csv",
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, len(result)) // File should be removed
}

// TestTransformFileRemoveWithPassThrough tests that pass-through files remain.
func TestTransformFileRemoveWithPassThrough(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	keepContent := []byte(`id,value
1,100`)

	files := map[string][]byte{
		"to_remove.csv": []byte(`name,age
John,30`),
		"keep_this.csv": keepContent,
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFileRemove,
		Mode:       "single",
		TargetName: "to_remove.csv",
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	// Removed file should not exist
	_, removedExists := result["to_remove.csv"]
	assert.False(t, removedExists)

	// Kept file should exist unchanged
	content, keepExists := result["keep_this.csv"]
	assert.True(t, keepExists)
	assert.Equal(t, keepContent, content)
}

// =============================================================================
// Format Convert Operation Tests
// =============================================================================

// TestTransformFormatConvertCSVToJSON tests converting CSV to JSON format.
func TestTransformFormatConvertCSVToJSON(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age,city
John,30,New York
Jane,25,Boston`)

	files := map[string][]byte{
		"data.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormatJSON,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	// Original CSV file should not exist
	_, csvExists := result["data.csv"]
	assert.False(t, csvExists)

	// JSON file should exist
	content, jsonExists := result["data.json"]
	assert.True(t, jsonExists)
	assert.True(t, len(content) > 0)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "John"))
	assert.True(t, strings.Contains(contentStr, "Jane"))
	assert.True(t, strings.Contains(contentStr, "New York"))
}

// TestTransformFormatConvertCSVToParquet tests converting CSV to Parquet format.
func TestTransformFormatConvertCSVToParquet(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`id,name,value
1,Product A,100
2,Product B,200`)

	files := map[string][]byte{
		"products.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormatParquet,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	// Original CSV file should not exist
	_, csvExists := result["products.csv"]
	assert.False(t, csvExists)

	// Parquet file should exist
	content, parquetExists := result["products.parquet"]
	assert.True(t, parquetExists)
	assert.True(t, len(content) > 0)
}

// TestTransformFormatConvertJSONToCSV tests converting JSON to CSV format.
func TestTransformFormatConvertJSONToCSV(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`[
{"name": "John", "age": 30},
{"name": "Jane", "age": 25}
]`)

	files := map[string][]byte{
		"users.json": fileContent,
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormatCSV,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	// Original JSON file should not exist
	_, jsonExists := result["users.json"]
	assert.False(t, jsonExists)

	// CSV file should exist
	content, csvExists := result["users.csv"]
	assert.True(t, csvExists)
	assert.True(t, len(content) > 0)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "name"))
	assert.True(t, strings.Contains(contentStr, "age"))
	assert.True(t, strings.Contains(contentStr, "John"))
	assert.True(t, strings.Contains(contentStr, "Jane"))
}

// TestTransformFormatConvertUnsupportedFormat tests that unsupported format returns error.
func TestTransformFormatConvertUnsupportedFormat(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	fileContent := []byte(`name,age
John,30`)

	files := map[string][]byte{
		"data.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormat("xml"), // Unsupported format
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "unsupported output format"))
}

// =============================================================================
// Mode Tests
// =============================================================================

// TestTransformModeSingle tests that single mode only transforms target file.
func TestTransformModeSingle(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	targetContent := []byte(`name,age
John,30`)

	otherContent := []byte(`id,value
1,100`)

	files := map[string][]byte{
		"target.csv": targetContent,
		"other.csv":  otherContent,
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFieldRename,
		Mode:       "single",
		TargetName: "target.csv",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "name", NewName: "full_name"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, len(result))

	// Target file should be transformed
	targetResult, targetExists := result["target.csv"]
	assert.True(t, targetExists)
	targetStr := string(targetResult)
	assert.True(t, strings.Contains(targetStr, "full_name"))
	// Check that original "name" header is no longer present (not just "name," which is inside "full_name,")
	assert.False(t, strings.HasPrefix(targetStr, "name,") || strings.Contains(targetStr, "\nname,"))

	// Other file should be unchanged
	otherResult, otherExists := result["other.csv"]
	assert.True(t, otherExists)
	assert.Equal(t, otherContent, otherResult)
}

// TestTransformModeAll tests that all mode transforms all files.
func TestTransformModeAll(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"file1.csv": []byte(`name,age
John,30`),
		"file2.csv": []byte(`name,salary
Jane,65000`),
	}

	config := engine.TransformConfig{
		Operation: irminmodels.TransformOpFieldRename,
		Mode:      "all",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "name", NewName: "full_name"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, len(result))

	// Both files should be transformed
	file1Result, file1Exists := result["file1.csv"]
	assert.True(t, file1Exists)
	assert.True(t, strings.Contains(string(file1Result), "full_name"))

	file2Result, file2Exists := result["file2.csv"]
	assert.True(t, file2Exists)
	assert.True(t, strings.Contains(string(file2Result), "full_name"))
}

// TestTransformModeSingleMissingTarget tests that missing target returns error.
func TestTransformModeSingleMissingTarget(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"existing.csv": []byte(`name,age
John,30`),
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFieldRename,
		Mode:       "single",
		TargetName: "nonexistent.csv",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "name", NewName: "full_name"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "target file"))
	assert.True(t, strings.Contains(err.Error(), "not found"))
}

// TestTransformModeSingleMissingTargetName tests that missing target name in single mode returns error.
func TestTransformModeSingleMissingTargetName(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"data.csv": []byte(`name,age
John,30`),
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFieldRename,
		Mode:       "single",
		TargetName: "", // Missing target name
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "name", NewName: "full_name"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "target_name is required"))
}

// =============================================================================
// Edge Case Tests
// =============================================================================

// TestTransformEmptyFile tests empty file handling for different operations.
func TestTransformEmptyFile(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	// Test format convert with empty file
	files := map[string][]byte{
		"empty.csv": {},
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormatJSON,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	// Empty file should have changed extension
	_, jsonExists := result["empty.json"]
	assert.True(t, jsonExists)
}

// TestTransformEmptyFileRemove tests file remove with empty file.
func TestTransformEmptyFileRemove(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"empty.csv": {},
	}

	config := engine.TransformConfig{
		Operation:  irminmodels.TransformOpFileRemove,
		Mode:       "single",
		TargetName: "empty.csv",
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, len(result)) // Empty file should be removed
}

// TestTransformFilenameCollision tests that multiple files transforming to same name returns error.
func TestTransformFilenameCollision(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	// Two files that would have the same name after format conversion
	files := map[string][]byte{
		"data.csv": []byte(`name,age
John,30`),
		"data.json": []byte(`[{"name": "Jane", "age": 25}]`),
	}

	// Convert CSV to JSON - would collide with existing data.json
	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "single",
		TargetName:   "data.csv",
		OutputFormat: irminmodels.OutputFormatJSON,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "filename collision"))
}

// TestTransformUnsupportedInputFormat tests unsupported input format returns error.
func TestTransformUnsupportedInputFormat(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"document.txt": []byte("This is a plain text file."),
	}

	config := engine.TransformConfig{
		Operation: irminmodels.TransformOpFieldRename,
		Mode:      "all",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "field", NewName: "new_field"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "only supports structured data formats"))
}

// TestTransformUnsupportedInputFormatConvert tests format convert with unsupported input format.
func TestTransformUnsupportedInputFormatConvert(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	files := map[string][]byte{
		"document.xml": []byte("<root><item>value</item></root>"),
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormatJSON,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "only supports structured data formats"))
}

// =============================================================================
// Performance Test
// =============================================================================

// TestTransformPerformance tests performance with larger dataset.
func TestTransformPerformance(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	// Create a larger CSV dataset
	var csvBuilder strings.Builder
	csvBuilder.WriteString("id,name,email,department,salary\n")

	for i := 1; i <= 1000; i++ {
		csvBuilder.WriteString(fmt.Sprintf("%d,User%d,user%d@example.com,Dept%d,%d\n",
			i, i, i, i%10, 50000+i))
	}

	fileContent := []byte(csvBuilder.String())

	files := map[string][]byte{
		"large_dataset.csv": fileContent,
	}

	config := engine.TransformConfig{
		Operation: irminmodels.TransformOpFieldRename,
		Mode:      "all",
		FieldRenames: []irminmodels.FieldRename{
			{OldName: "id", NewName: "employee_id"},
			{OldName: "name", NewName: "full_name"},
			{OldName: "email", NewName: "contact_email"},
		},
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["large_dataset.csv"]
	assert.True(t, exists)
	assert.True(t, len(content) > 0)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "employee_id"))
	assert.True(t, strings.Contains(contentStr, "full_name"))
	assert.True(t, strings.Contains(contentStr, "contact_email"))
	assert.True(t, strings.Contains(contentStr, "User1"))
	assert.True(t, strings.Contains(contentStr, "User1000"))
}

// TestTransformPerformanceFormatConvert tests format conversion performance with larger dataset.
func TestTransformPerformanceFormatConvert(t *testing.T) {
	suite := setupApplyTransformationsTestSuite(t)

	// Create a larger CSV dataset
	var csvBuilder strings.Builder
	csvBuilder.WriteString("id,name,value\n")

	for i := 1; i <= 1000; i++ {
		csvBuilder.WriteString(fmt.Sprintf("%d,Item%d,%d\n", i, i, i*100))
	}

	files := map[string][]byte{
		"large_data.csv": []byte(csvBuilder.String()),
	}

	config := engine.TransformConfig{
		Operation:    irminmodels.TransformOpFormatConvert,
		Mode:         "all",
		OutputFormat: irminmodels.OutputFormatJSON,
	}

	result, err := suite.engineClient.ProcessTransformations(t.Context(), files, config)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["large_data.json"]
	assert.True(t, exists)
	assert.True(t, len(content) > 0)

	contentStr := string(content)
	assert.True(t, strings.Contains(contentStr, "Item1"))
	assert.True(t, strings.Contains(contentStr, "Item1000"))
}
