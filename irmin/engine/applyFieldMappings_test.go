package engine_test

import (
	"fmt"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/utils"
	"strings"
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// ApplyFieldMappingsTestSuite provides test setup for field mappings functionality.
type ApplyFieldMappingsTestSuite struct {
	*lib.TestSuite
	engineClient *engine.Client
}

// setupApplyFieldMappingsTestSuite initializes the test suite with DuckDB and engine clients.
func setupApplyFieldMappingsTestSuite(t *testing.T) *ApplyFieldMappingsTestSuite {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	// Initialize engine client with proper fields
	engineClient, err := engine.NewClient(t.Context(), "env", testSuite.Logger, testSuite.Env)
	if err != nil {
		t.Fatalf("Failed to create engine client: %v", err)
	}

	return &ApplyFieldMappingsTestSuite{
		TestSuite:    testSuite,
		engineClient: engineClient,
	}
}

// TestApplyFieldMappingsInputValidation tests input validation.
func TestApplyFieldMappingsInputValidation(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// Test nil duckDBClient
	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		nil,
		[]byte("test"),
		"test.csv",
		nil,
	)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "duckDBClient cannot be nil", err.Error())

	// Test empty fileContent
	result, err = suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		[]byte{},
		"test.csv",
		nil,
	)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "fileContent cannot be empty", err.Error())

	// Test empty originalFilePath
	result, err = suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		[]byte("test"),
		"",
		nil,
	)
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "originalFilePath cannot be empty", err.Error())
}

// TestApplyFieldMappingsNoMappings tests behavior when no mappings are provided.
func TestApplyFieldMappingsNoMappings(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`name,age
John,30
Jane,25`)

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"employees.csv",
		nil,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["employees.csv"]
	assert.True(t, exists)
	assert.Equal(t, fileContent, content)
}

// TestApplyFieldMappingsSimpleMapping tests basic field mapping functionality.
func TestApplyFieldMappingsSimpleMapping(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`name,age,department
John,30,Engineering
Jane,25,Marketing`)

	nameField := "name"
	ageField := "age"
	deptField := "department"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "employees.csv",
			SourceField:      &nameField,
			DestinationPath:  "people.csv",
			DestinationField: &nameField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &ageField,
			DestinationPath:  "people.csv",
			DestinationField: &ageField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &deptField,
			DestinationPath:  "departments.csv",
			DestinationField: &deptField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"employees.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Should have two destination files: people.csv and departments.csv
	assert.Equal(t, 2, len(result))

	// Verify people.csv contains name and age
	peopleContent, exists := result["people.csv"]
	assert.True(t, exists)
	assert.True(t, len(peopleContent) > 0)

	peopleStr := string(peopleContent)
	assert.True(t, strings.Contains(peopleStr, "name"))
	assert.True(t, strings.Contains(peopleStr, "age"))
	assert.True(t, strings.Contains(peopleStr, "John"))
	assert.True(t, strings.Contains(peopleStr, "Jane"))

	// Verify departments.csv contains department
	deptContent, exists := result["departments.csv"]
	assert.True(t, exists)
	assert.True(t, len(deptContent) > 0)

	deptStr := string(deptContent)
	assert.True(t, strings.Contains(deptStr, "department"))
	assert.True(t, strings.Contains(deptStr, "Engineering"))
	assert.True(t, strings.Contains(deptStr, "Marketing"))
}

// TestApplyFieldMappingsComplexScenario tests complex field mapping scenarios.
func TestApplyFieldMappingsComplexScenario(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`employee_id,full_name,age,dept,salary,manager
1,John Doe,30,Engineering,75000,Alice
2,Jane Smith,25,Marketing,65000,Bob
3,Bob Johnson,35,Sales,70000,Charlie`)

	idField := "employee_id"
	nameField := "full_name"
	ageField := "age"
	deptField := "dept"
	managerField := "manager"

	// Map to multiple destinations with field renaming
	mappings := []irminmodels.FieldMapping{
		// Personal info to people.csv
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
			DestinationField: utils.StringPtr("name"), // Rename field
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &ageField,
			DestinationPath:  "people.csv",
			DestinationField: &ageField,
		},
		// Org info to organization.csv
		{
			SourcePath:       "employees.csv",
			SourceField:      &idField,
			DestinationPath:  "organization.csv",
			DestinationField: &idField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &deptField,
			DestinationPath:  "organization.csv",
			DestinationField: utils.StringPtr("department"), // Rename field
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &managerField,
			DestinationPath:  "organization.csv",
			DestinationField: &managerField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"employees.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Should have 3 files: people.csv, organization.csv, and employees.csv (remainder)
	assert.Equal(t, 3, len(result))

	// Verify people.csv
	peopleContent, exists := result["people.csv"]
	assert.True(t, exists)
	peopleStr := string(peopleContent)
	assert.True(t, strings.Contains(peopleStr, "employee_id"))
	assert.True(t, strings.Contains(peopleStr, "name")) // Renamed field
	assert.True(t, strings.Contains(peopleStr, "age"))
	assert.True(t, strings.Contains(peopleStr, "John Doe"))

	// Verify organization.csv
	orgContent, exists := result["organization.csv"]
	assert.True(t, exists)
	orgStr := string(orgContent)
	assert.True(t, strings.Contains(orgStr, "employee_id"))
	assert.True(t, strings.Contains(orgStr, "department")) // Renamed field
	assert.True(t, strings.Contains(orgStr, "manager"))
	assert.True(t, strings.Contains(orgStr, "Engineering"))
	assert.True(t, strings.Contains(orgStr, "Alice"))

	// Verify employees.csv (remainder with unmapped fields)
	remainderContent, exists := result["employees.csv"]
	assert.True(t, exists)
	remainderStr := string(remainderContent)
	assert.True(t, strings.Contains(remainderStr, "salary")) // Unmapped field
}

// TestApplyFieldMappingsMultipleDestinations tests routing to multiple destinations.
func TestApplyFieldMappingsMultipleDestinations(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`product_id,name,price,category,stock
1,Laptop,999.99,Electronics,50
2,Book,19.99,Education,100`)

	idField := "product_id"
	nameField := "name"
	priceField := "price"
	categoryField := "category"
	stockField := "stock"

	mappings := []irminmodels.FieldMapping{
		// Product catalog
		{
			SourcePath:       "products.csv",
			SourceField:      &idField,
			DestinationPath:  "catalog.csv",
			DestinationField: &idField,
		},
		{
			SourcePath:       "products.csv",
			SourceField:      &nameField,
			DestinationPath:  "catalog.csv",
			DestinationField: &nameField,
		},
		{
			SourcePath:       "products.csv",
			SourceField:      &priceField,
			DestinationPath:  "catalog.csv",
			DestinationField: &priceField,
		},
		// Inventory
		{
			SourcePath:       "products.csv",
			SourceField:      &idField,
			DestinationPath:  "inventory.csv",
			DestinationField: &idField,
		},
		{
			SourcePath:       "products.csv",
			SourceField:      &stockField,
			DestinationPath:  "inventory.csv",
			DestinationField: &stockField,
		},
		// Categories
		{
			SourcePath:       "products.csv",
			SourceField:      &categoryField,
			DestinationPath:  "categories.json",
			DestinationField: &categoryField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"products.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 3, len(result)) // catalog.csv, inventory.csv, categories.json

	// Verify all destinations exist
	_, catalogExists := result["catalog.csv"]
	assert.True(t, catalogExists)

	_, inventoryExists := result["inventory.csv"]
	assert.True(t, inventoryExists)

	_, categoriesExists := result["categories.json"]
	assert.True(t, categoriesExists)
}

// TestApplyFieldMappingsCrossFormatMapping tests mapping between different formats.
func TestApplyFieldMappingsCrossFormatMapping(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// CSV input mapped to JSON output
	fileContent := []byte(`user_id,username,email
1,johndoe,john@example.com
2,janedoe,jane@example.com`)

	idField := "user_id"
	usernameField := "username"
	emailField := "email"

	mappings := []irminmodels.FieldMapping{
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
			SourceField:      &emailField,
			DestinationPath:  "contact.json",
			DestinationField: &emailField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"users.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, len(result)) // users.json, contact.json

	// Verify JSON format outputs
	usersContent, exists := result["users.json"]
	assert.True(t, exists)
	assert.True(t, len(usersContent) > 0)

	contactContent, exists := result["contact.json"]
	assert.True(t, exists)
	assert.True(t, len(contactContent) > 0)
}

// TestApplyFieldMappingsPerformance tests performance with larger datasets.
func TestApplyFieldMappingsPerformance(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// Create a larger CSV dataset
	var csvBuilder strings.Builder
	csvBuilder.WriteString("id,name,email,department,salary\n")

	for i := 1; i <= 1000; i++ {
		csvBuilder.WriteString(fmt.Sprintf("%d,User%d,user%d@example.com,Dept%d,%d\n",
			i, i, i, i%10, 50000+i))
	}

	fileContent := []byte(csvBuilder.String())

	idField := "id"
	nameField := "name"
	emailField := "email"

	mappings := []irminmodels.FieldMapping{
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
			DestinationField: &nameField,
		},
		{
			SourcePath:       "employees.csv",
			SourceField:      &emailField,
			DestinationPath:  "contacts.csv",
			DestinationField: &emailField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"employees.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result) >= 2) // At least people.csv and contacts.csv

	// Verify data was processed correctly
	peopleContent, exists := result["people.csv"]
	assert.True(t, exists)
	assert.True(t, len(peopleContent) > 0)

	peopleStr := string(peopleContent)
	assert.True(t, strings.Contains(peopleStr, "User1"))
	assert.True(t, strings.Contains(peopleStr, "User1000"))
}
