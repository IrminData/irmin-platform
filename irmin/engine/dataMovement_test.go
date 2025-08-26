package engine_test

import (
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/utils"
	"strings"
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// DataMovementIntegrationTestSuite provides test setup for data movement integration tests.
type DataMovementIntegrationTestSuite struct {
	*lib.TestSuite
	engineClient *engine.Client
}

// setupDataMovementIntegrationTestSuite initializes the test suite with DuckDB and engine clients.
func setupDataMovementIntegrationTestSuite(t *testing.T) *DataMovementIntegrationTestSuite {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	// Initialize engine client with proper fields
	engineClient, err := engine.NewClient(t.Context(), "env", testSuite.Logger, testSuite.Env)
	if err != nil {
		t.Fatalf("Failed to create engine client: %v", err)
	}

	return &DataMovementIntegrationTestSuite{
		TestSuite:    testSuite,
		engineClient: engineClient,
	}
}

// TestApplyFieldMappingsDirectly tests the ApplyFieldMappings method directly.
func TestApplyFieldMappingsDirectly(t *testing.T) {
	suite := setupDataMovementIntegrationTestSuite(t)

	// Simulate employee data that needs to be split across multiple files
	employeeData := []byte(`employee_id,full_name,age,department,salary,manager,email,phone
1,John Doe,30,Engineering,75000,Alice Johnson,john.doe@company.com,555-0101
2,Jane Smith,25,Marketing,65000,Bob Wilson,jane.smith@company.com,555-0102
3,Bob Johnson,35,Sales,70000,Charlie Brown,bob.johnson@company.com,555-0103`)

	// Define field mappings to split data across multiple destinations
	idField := "employee_id"
	nameField := "full_name"
	ageField := "age"
	emailField := "email"
	phoneField := "phone"

	fieldMappings := []irminmodels.FieldMapping{
		// Personal information -> people.csv
		{
			SourcePath:       "employees.csv",
			SourceField:      &idField,
			DestinationPath:  "people.csv",
			DestinationField: &idField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &nameField,
			DestinationPath:  "people.csv",
			DestinationField: utils.StringPtr("name"),
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &ageField,
			DestinationPath:  "people.csv",
			DestinationField: &ageField,
		},
		// Contact information -> contacts.csv
		{
			SourcePath:       "employees.csv",
			SourceField:      &idField,
			DestinationPath:  "contacts.csv",
			DestinationField: &idField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &emailField,
			DestinationPath:  "contacts.csv",
			DestinationField: &emailField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &phoneField,
			DestinationPath:  "contacts.csv",
			DestinationField: &phoneField,
		},
	}

	// Apply field mappings
	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		employeeData,
		"employees.csv",
		fieldMappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Should have 3 destinations: people.csv, contacts.csv, employees.csv (remainder)
	assert.Equal(t, 3, len(result))

	// Verify people.csv
	peopleContent, exists := result["people.csv"]
	assert.True(t, exists)
	assert.True(t, len(peopleContent) > 0)

	peopleStr := string(peopleContent)
	assert.True(t, strings.Contains(peopleStr, "employee_id"))
	assert.True(t, strings.Contains(peopleStr, "name"))
	assert.True(t, strings.Contains(peopleStr, "age"))
	assert.True(t, strings.Contains(peopleStr, "John Doe"))
	assert.True(t, strings.Contains(peopleStr, "Jane Smith"))

	// Verify contacts.csv
	contactContent, exists := result["contacts.csv"]
	assert.True(t, exists)
	assert.True(t, len(contactContent) > 0)

	contactStr := string(contactContent)
	assert.True(t, strings.Contains(contactStr, "employee_id"))
	assert.True(t, strings.Contains(contactStr, "email"))
	assert.True(t, strings.Contains(contactStr, "phone"))
	assert.True(t, strings.Contains(contactStr, "john.doe@company.com"))

	// Verify remainder file with unmapped salary field
	remainderContent, exists := result["employees.csv"]
	assert.True(t, exists)
	remainderStr := string(remainderContent)
	assert.True(t, strings.Contains(remainderStr, "salary"))
	assert.True(t, strings.Contains(remainderStr, "75000"))
}

// TestMergeFilesDirectly tests the MergeFiles functionality directly.
func TestMergeFilesDirectly(t *testing.T) {
	suite := setupDataMovementIntegrationTestSuite(t)

	// Multiple source files with sales data
	q1SalesData := []byte(`month,region,product,sales
January,North,Widget A,10000
February,North,Widget B,15000`)

	q2SalesData := []byte(`month,region,product,sales
April,South,Widget A,8000
May,South,Widget B,11000`)

	sourceFiles := map[string][]byte{
		"q1_sales.csv": q1SalesData,
		"q2_sales.csv": q2SalesData,
	}

	// Test merge functionality
	result, err := suite.DuckDBClient.MergeFiles(
		t.Context(),
		sourceFiles,
		"annual_sales.csv",
		duckdb.MergeStrategyUnionDistinct,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// Verify merged content contains data from both sources
	mergedContent := string(result.Content)
	assert.True(t, strings.Contains(mergedContent, "January")) // From Q1
	assert.True(t, strings.Contains(mergedContent, "April"))   // From Q2
	assert.True(t, strings.Contains(mergedContent, "North"))   // From Q1
	assert.True(t, strings.Contains(mergedContent, "South"))   // From Q2
	assert.True(t, strings.Contains(mergedContent, "10000"))   // From Q1
	assert.True(t, strings.Contains(mergedContent, "8000"))    // From Q2
}

// TestCrossFormatFieldMapping tests mapping between different file formats.
func TestCrossFormatFieldMapping(t *testing.T) {
	suite := setupDataMovementIntegrationTestSuite(t)

	// CSV input mapped to JSON output
	csvData := []byte(`user_id,username,status
1,johndoe,active
2,janedoe,inactive`)

	// Map CSV to JSON output
	idField := "user_id"
	usernameField := "username"
	statusField := "status"

	fieldMappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "users.csv",
			SourceField:      &idField,
			DestinationPath:  "users.json",
			DestinationField: &idField,
		},
		{
			SourcePath:       "users.csv",
			SourceField:      &usernameField,
			DestinationPath:  "users.json",
			DestinationField: &usernameField,
		},
		{
			SourcePath:       "users.csv",
			SourceField:      &statusField,
			DestinationPath:  "users.json",
			DestinationField: &statusField,
		},
	}

	// Apply field mappings
	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		csvData,
		"users.csv",
		fieldMappings,
	)

	assert.NoError(t, err)
	assert.True(t, len(result) > 0)

	// Verify JSON format output
	usersContent, exists := result["users.json"]
	assert.True(t, exists)
	assert.True(t, len(usersContent) > 0)

	// Should contain user data (exact format depends on DuckDB JSON output)
	usersStr := string(usersContent)
	assert.True(t, strings.Contains(usersStr, "johndoe") || strings.Contains(usersStr, "1"))
}

// TestSchemaConflictHandling tests handling conflicts when working with different schemas.
func TestSchemaConflictHandling(t *testing.T) {
	suite := setupDataMovementIntegrationTestSuite(t)

	// Files with different schemas but some common fields
	file1Data := []byte(`id,name,age
1,John,30
2,Jane,25`)

	file2Data := []byte(`id,name,department
3,Bob,Engineering
4,Alice,Marketing`)

	sourceFiles := map[string][]byte{
		"employees1.csv": file1Data,
		"employees2.csv": file2Data,
	}

	// Test merge with schema differences
	result, err := suite.DuckDBClient.MergeFiles(
		t.Context(),
		sourceFiles,
		"unified_employees.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// Verify unified file contains data from all sources
	unifiedContent := string(result.Content)
	assert.True(t, strings.Contains(unifiedContent, "John")) // From file1
	assert.True(t, strings.Contains(unifiedContent, "Bob"))  // From file2

	// Should handle schema differences gracefully with common fields
	assert.True(t, strings.Contains(unifiedContent, "id"))
	assert.True(t, strings.Contains(unifiedContent, "name"))
}

// TestLargeDatasetHandling tests performance with larger datasets.
func TestLargeDatasetHandling(t *testing.T) {
	suite := setupDataMovementIntegrationTestSuite(t)

	// Create larger test datasets
	var file1Builder strings.Builder
	var file2Builder strings.Builder

	file1Builder.WriteString("id,name,department\n")
	file2Builder.WriteString("id,name,location\n")

	for i := 1; i <= 500; i++ { // Reduced size for test performance
		file1Builder.WriteString(fmt.Sprintf("%d,Employee%d,Dept%d\n", i, i, i%10))
		file2Builder.WriteString(fmt.Sprintf("%d,Employee%d,Location%d\n", i+500, i+500, i%5))
	}

	sourceFiles := map[string][]byte{
		"employees1.csv": []byte(file1Builder.String()),
		"employees2.csv": []byte(file2Builder.String()),
	}

	// Test merge with larger datasets
	result, err := suite.DuckDBClient.MergeFiles(
		t.Context(),
		sourceFiles,
		"all_employees.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// Verify large dataset was processed correctly
	consolidatedContent := string(result.Content)
	assert.True(t, strings.Contains(consolidatedContent, "Employee1"))   // From file1
	assert.True(t, strings.Contains(consolidatedContent, "Employee501")) // From file2
	assert.True(t, len(consolidatedContent) > 1000)                      // Should be substantial content
}

// TestFieldMappingWithMerging tests the complete flow of field mapping followed by merging.
func TestFieldMappingWithMerging(t *testing.T) {
	suite := setupDataMovementIntegrationTestSuite(t)

	// Test data that will be mapped to the same destination
	salesData := []byte(`product,region,quarter,sales
Widget A,North,Q1,10000
Widget B,North,Q1,15000`)

	// Map fields to a common destination
	productField := "product"
	salesField := "sales"

	fieldMappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "sales.csv",
			SourceField:      &productField,
			DestinationPath:  "summary.csv",
			DestinationField: &productField,
		},
		{
			SourcePath:       "sales.csv",
			SourceField:      &salesField,
			DestinationPath:  "summary.csv",
			DestinationField: &salesField,
		},
	}

	// Apply field mappings
	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		salesData,
		"sales.csv",
		fieldMappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Should have summary.csv and sales.csv (remainder)
	assert.Equal(t, 2, len(result))

	// Verify summary.csv
	summaryContent, exists := result["summary.csv"]
	assert.True(t, exists)
	assert.True(t, len(summaryContent) > 0)

	summaryStr := string(summaryContent)
	assert.True(t, strings.Contains(summaryStr, "product"))
	assert.True(t, strings.Contains(summaryStr, "sales"))
	assert.True(t, strings.Contains(summaryStr, "Widget A"))
	assert.True(t, strings.Contains(summaryStr, "10000"))
}
