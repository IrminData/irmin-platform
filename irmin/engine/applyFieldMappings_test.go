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
	engineClient, err := engine.NewClient(t.Context(), "en", testSuite.Logger, testSuite.Env, testSuite.DB)
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

	// Test empty fileContent — should pass through as-is (no transformation needed)
	result, err = suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		[]byte{},
		"test.csv",
		nil,
	)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, []byte{}, result["test.csv"])

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

// TestApplyFieldMappingsTypeCast tests TRY_CAST type casting via the cast_type field.
func TestApplyFieldMappingsTypeCast(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// CSV with numeric strings that should be cast to INTEGER
	fileContent := []byte(`id,name,score
1,Alice,95
2,Bob,87
3,Charlie,92`)

	idField := "id"
	nameField := "name"
	scoreField := "score"
	intType := "INTEGER"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "data.csv",
			SourceField:      &idField,
			DestinationPath:  "output.csv",
			DestinationField: &idField,
			CastType:         &intType,
		},
		{
			SourcePath:       "data.csv",
			SourceField:      &nameField,
			DestinationPath:  "output.csv",
			DestinationField: &nameField,
		},
		{
			SourcePath:       "data.csv",
			SourceField:      &scoreField,
			DestinationPath:  "output.csv",
			DestinationField: &scoreField,
			CastType:         &intType,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"data.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result)) // All fields mapped, no remainder

	outputContent, exists := result["output.csv"]
	assert.True(t, exists)
	assert.True(t, len(outputContent) > 0)

	outputStr := string(outputContent)
	assert.True(t, strings.Contains(outputStr, "Alice"))
	assert.True(t, strings.Contains(outputStr, "95"))
}

// TestApplyFieldMappingsInvalidCastType tests that an invalid cast type is gracefully ignored.
func TestApplyFieldMappingsInvalidCastType(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`id,name
1,Alice
2,Bob`)

	idField := "id"
	nameField := "name"
	invalidType := "FAKETYPE"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "data.csv",
			SourceField:      &idField,
			DestinationPath:  "output.csv",
			DestinationField: &idField,
			CastType:         &invalidType, // Invalid — should be ignored with warning
		},
		{
			SourcePath:       "data.csv",
			SourceField:      &nameField,
			DestinationPath:  "output.csv",
			DestinationField: &nameField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"data.csv",
		mappings,
	)

	// Should succeed — invalid cast type is silently ignored (logged as warning)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	outputContent, exists := result["output.csv"]
	assert.True(t, exists)
	outputStr := string(outputContent)
	assert.True(t, strings.Contains(outputStr, "Alice"))
	assert.True(t, strings.Contains(outputStr, "Bob"))
}

// TestApplyFieldMappingsAllFieldsMapped tests that no remainder file is produced when every field is mapped.
func TestApplyFieldMappingsAllFieldsMapped(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`city,country
Berlin,Germany
Paris,France`)

	cityField := "city"
	countryField := "country"

	// Map ALL fields to a new destination — no unmapped fields remain
	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "locations.csv",
			SourceField:      &cityField,
			DestinationPath:  "geo.csv",
			DestinationField: &cityField,
		},
		{
			SourcePath:       "locations.csv",
			SourceField:      &countryField,
			DestinationPath:  "geo.csv",
			DestinationField: &countryField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"locations.csv",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Only 1 file: geo.csv. No remainder file because nothing is unmapped.
	assert.Equal(t, 1, len(result))

	_, geoExists := result["geo.csv"]
	assert.True(t, geoExists)

	_, remainderExists := result["locations.csv"]
	assert.That(t, !remainderExists)
}

// TestApplyFieldMappingsIrrelevantMappings tests that mappings for a different source file are ignored.
func TestApplyFieldMappingsIrrelevantMappings(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	fileContent := []byte(`a,b
1,2
3,4`)

	aField := "a"
	bField := "b"

	// These mappings target "other.csv", not "data.csv"
	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "other.csv",
			SourceField:      &aField,
			DestinationPath:  "dest.csv",
			DestinationField: &aField,
		},
		{
			SourcePath:       "other.csv",
			SourceField:      &bField,
			DestinationPath:  "dest.csv",
			DestinationField: &bField,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"data.csv",
		mappings,
	)

	// Should return original file untouched because no mappings match source path
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["data.csv"]
	assert.True(t, exists)
	assert.Equal(t, fileContent, content)
}

// TestApplyFieldMappingsJSONUnwrap tests JSON unwrapping via source_json_path.
func TestApplyFieldMappingsJSONUnwrap(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// JSON with a wrapper object — the actual data is under "data"
	fileContent := []byte(`{"data": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}`)

	idField := "id"
	nameField := "name"
	jsonPath := "data"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "wrapped.json",
			SourceField:      &idField,
			DestinationPath:  "unwrapped.csv",
			DestinationField: &idField,
			SourceJSONPath:   &jsonPath,
		},
		{
			SourcePath:       "wrapped.json",
			SourceField:      &nameField,
			DestinationPath:  "unwrapped.csv",
			DestinationField: &nameField,
			SourceJSONPath:   &jsonPath,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"wrapped.json",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	unwrappedContent, exists := result["unwrapped.csv"]
	assert.True(t, exists)
	assert.True(t, len(unwrappedContent) > 0)

	unwrappedStr := string(unwrappedContent)
	assert.True(t, strings.Contains(unwrappedStr, "Alice"))
	assert.True(t, strings.Contains(unwrappedStr, "Bob"))
}

// TestApplyFieldMappingsNestedJSONUnwrap tests JSON unwrapping at a nested dot-notation path.
func TestApplyFieldMappingsNestedJSONUnwrap(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// Nested JSON: data is under "response"."items"
	fileContent := []byte(`{"response": {"items": [{"code": "A1", "value": 10}, {"code": "B2", "value": 20}]}}`)

	codeField := "code"
	valueField := "value"
	jsonPath := "response.items"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "api.json",
			SourceField:      &codeField,
			DestinationPath:  "flat.csv",
			DestinationField: &codeField,
			SourceJSONPath:   &jsonPath,
		},
		{
			SourcePath:       "api.json",
			SourceField:      &valueField,
			DestinationPath:  "flat.csv",
			DestinationField: &valueField,
			SourceJSONPath:   &jsonPath,
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"api.json",
		mappings,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	flatContent, exists := result["flat.csv"]
	assert.True(t, exists)

	flatStr := string(flatContent)
	assert.True(t, strings.Contains(flatStr, "A1"))
	assert.True(t, strings.Contains(flatStr, "B2"))
	assert.True(t, strings.Contains(flatStr, "10"))
	assert.True(t, strings.Contains(flatStr, "20"))
}

// TestApplyFieldMappingsJSONUnwrapOnNonJSON tests that JSON unwrap fails on non-JSON files.
func TestApplyFieldMappingsJSONUnwrapOnNonJSON(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	// CSV file — not JSON
	fileContent := []byte(`id,name
1,Alice`)

	idField := "id"
	jsonPath := "data"

	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "data.csv",
			SourceField:      &idField,
			DestinationPath:  "out.csv",
			DestinationField: &idField,
			SourceJSONPath:   &jsonPath, // This should fail — CSV can't be unwrapped
		},
	}

	result, err := suite.engineClient.ApplyFieldMappings(
		t.Context(),
		suite.DuckDBClient,
		fileContent,
		"data.csv",
		mappings,
	)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, strings.Contains(err.Error(), "source_json_path is set but file"))
}

// TestProcessFieldMappingsMultiFile tests the top-level ProcessFieldMappings with multiple files.
func TestProcessFieldMappingsMultiFile(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	files := map[string][]byte{
		"users.csv":    []byte("user_id,name,email\n1,Alice,alice@test.com\n2,Bob,bob@test.com"),
		"orders.csv":   []byte("order_id,user_id,total\n100,1,50.00\n101,2,75.00"),
		"metadata.csv": []byte("key,value\nversion,1.0"),
	}

	userIDField := "user_id"
	nameField := "name"
	orderIDField := "order_id"
	totalField := "total"

	// Map fields from users.csv and orders.csv; metadata.csv has no relevant mappings
	mappings := []irminmodels.FieldMapping{
		{
			SourcePath:       "users.csv",
			SourceField:      &userIDField,
			DestinationPath:  "people.csv",
			DestinationField: &userIDField,
		},
		{
			SourcePath:       "users.csv",
			SourceField:      &nameField,
			DestinationPath:  "people.csv",
			DestinationField: &nameField,
		},
		{
			SourcePath:       "orders.csv",
			SourceField:      &orderIDField,
			DestinationPath:  "sales.csv",
			DestinationField: &orderIDField,
		},
		{
			SourcePath:       "orders.csv",
			SourceField:      &totalField,
			DestinationPath:  "sales.csv",
			DestinationField: &totalField,
		},
	}

	result, err := suite.engineClient.ProcessFieldMappings(t.Context(), files, mappings)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Should have: people.csv (from users), sales.csv (from orders),
	// users.csv remainder (email), orders.csv remainder (user_id),
	// metadata.csv (pass-through — no relevant mappings)
	_, peopleExists := result["people.csv"]
	assert.True(t, peopleExists)

	_, salesExists := result["sales.csv"]
	assert.True(t, salesExists)

	// metadata.csv should pass through unchanged (no mappings target it)
	metadataContent, metaExists := result["metadata.csv"]
	assert.True(t, metaExists)
	assert.True(t, strings.Contains(string(metadataContent), "version"))
}

// TestProcessFieldMappingsNoMappings tests ProcessFieldMappings with empty mappings returns files as-is.
func TestProcessFieldMappingsNoMappings(t *testing.T) {
	suite := setupApplyFieldMappingsTestSuite(t)

	files := map[string][]byte{
		"a.csv": []byte("x,y\n1,2"),
	}

	result, err := suite.engineClient.ProcessFieldMappings(t.Context(), files, nil)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))

	content, exists := result["a.csv"]
	assert.True(t, exists)
	assert.Equal(t, files["a.csv"], content)
}
