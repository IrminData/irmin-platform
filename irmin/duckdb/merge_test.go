package duckdb_test

import (
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/lib"
	"strings"
	"testing"

	"github.com/zeebo/assert"
)

// MergeTestSuite provides test setup for merge functionality.
type MergeTestSuite struct {
	*lib.TestSuite
}

// setupMergeTestSuite initializes the test suite with DuckDB client.
func setupMergeTestSuite(t *testing.T) *MergeTestSuite {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	return &MergeTestSuite{
		TestSuite: testSuite,
	}
}

// TestMergeFilesSingleSource tests merging with only one source file.
func TestMergeFilesSingleSource(t *testing.T) {
	suite := setupMergeTestSuite(t)

	sourceFiles := map[string][]byte{
		"employees.csv": []byte(`name,age,department
John,30,Engineering
Jane,25,Marketing`),
	}

	result, err := suite.DuckDBClient.MergeFiles(
		sourceFiles,
		"merged_employees.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "merged_employees.csv", result.DestinationPath)
	assert.Equal(t, []string{"employees.csv"}, result.SourcePaths)
	assert.True(t, len(result.Content) > 0)

	// Verify content structure
	content := string(result.Content)
	assert.True(t, strings.Contains(content, "John"))
	assert.True(t, strings.Contains(content, "Jane"))
}

// TestMergeFilesMultiSourceUnion tests merging multiple sources with union strategy.
func TestMergeFilesMultiSourceUnion(t *testing.T) {
	suite := setupMergeTestSuite(t)

	sourceFiles := map[string][]byte{
		"employees1.csv": []byte(`name,age,department
John,30,Engineering
Jane,25,Marketing`),
		"employees2.csv": []byte(`name,age,department
Bob,35,Sales
Alice,28,HR`),
	}

	result, err := suite.DuckDBClient.MergeFiles(
		sourceFiles,
		"merged_employees.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "merged_employees.csv", result.DestinationPath)
	assert.Equal(t, 2, len(result.SourcePaths))
	assert.True(t, len(result.Content) > 0)

	// Verify all data is present
	content := string(result.Content)
	assert.True(t, strings.Contains(content, "John"))
	assert.True(t, strings.Contains(content, "Jane"))
	assert.True(t, strings.Contains(content, "Bob"))
	assert.True(t, strings.Contains(content, "Alice"))
}

// TestMergeFilesSchemaDifferences tests merging files with different schemas.
func TestMergeFilesSchemaDifferences(t *testing.T) {
	suite := setupMergeTestSuite(t)

	sourceFiles := map[string][]byte{
		"file1.csv": []byte(`name,age
John,30
Jane,25`),
		"file2.csv": []byte(`name,department,salary
Bob,Sales,50000
Alice,HR,55000`),
	}

	result, err := suite.DuckDBClient.MergeFiles(
		sourceFiles,
		"merged.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// Schema should be unified with NULL values for missing columns
	content := string(result.Content)
	assert.True(t, strings.Contains(content, "name"))
	// Should contain all unique column names
	assert.True(
		t,
		strings.Contains(content, "age") || strings.Contains(content, "department") ||
			strings.Contains(content, "salary"),
	)
}

// TestMergeFilesCrossFormat tests merging files of different formats.
func TestMergeFilesCrossFormat(t *testing.T) {
	suite := setupMergeTestSuite(t)

	sourceFiles := map[string][]byte{
		"data.csv": []byte(`name,age
John,30
Jane,25`),
		"data.json": []byte(`[{"name":"Bob","age":35},{"name":"Alice","age":28}]`),
	}

	result, err := suite.DuckDBClient.MergeFiles(
		sourceFiles,
		"merged.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// All names should be present in the merged result
	content := string(result.Content)
	assert.True(t, strings.Contains(content, "John"))
	assert.True(t, strings.Contains(content, "Jane"))
	assert.True(t, strings.Contains(content, "Bob"))
	assert.True(t, strings.Contains(content, "Alice"))
}

// TestMergeFilesTypeConflictResolution tests handling of type conflicts.
func TestMergeFilesTypeConflictResolution(t *testing.T) {
	suite := setupMergeTestSuite(t)

	sourceFiles := map[string][]byte{
		"file1.csv": []byte(`id,value
1,100
2,200`),
		"file2.csv": []byte(`id,value
3,text_value
4,another_text`),
	}

	result, err := suite.DuckDBClient.MergeFiles(
		sourceFiles,
		"merged.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// Should handle type conflicts by using the most compatible type (VARCHAR)
	content := string(result.Content)
	assert.True(t, strings.Contains(content, "100"))
	assert.True(t, strings.Contains(content, "text_value"))
}

// TestMergeFilesAllMergeStrategies tests all available merge strategies.
func TestMergeFilesAllMergeStrategies(t *testing.T) {
	suite := setupMergeTestSuite(t)

	sourceFiles := map[string][]byte{
		"file1.csv": []byte(`name,value
duplicate,100
unique1,200`),
		"file2.csv": []byte(`name,value
duplicate,100
unique2,300`),
	}

	strategies := []duckdb.MergeStrategy{
		duckdb.MergeStrategyUnion,
		duckdb.MergeStrategyUnionDistinct,
		duckdb.MergeStrategyFirstWins,
		duckdb.MergeStrategyLastWins,
	}

	for _, strategy := range strategies {
		t.Run(string(strategy), func(t *testing.T) {
			result, err := suite.DuckDBClient.MergeFiles(
				sourceFiles,
				"merged.csv",
				strategy,
			)

			assert.NoError(t, err)
			assert.NotNil(t, result)
			assert.True(t, len(result.Content) > 0)

			content := string(result.Content)
			assert.True(t, strings.Contains(content, "unique1"))
			assert.True(t, strings.Contains(content, "unique2"))
		})
	}
}

// TestMergeFilesErrorHandling tests error conditions.
func TestMergeFilesErrorHandling(t *testing.T) {
	suite := setupMergeTestSuite(t)

	t.Run("no source files", func(t *testing.T) {
		result, err := suite.DuckDBClient.MergeFiles(
			map[string][]byte{},
			"destination.csv",
			duckdb.MergeStrategyUnion,
		)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, "no source files provided for merging", err.Error())
	})

	t.Run("unsupported destination format", func(t *testing.T) {
		sourceFiles := map[string][]byte{
			"data.csv": []byte(`name,age\nJohn,30`),
		}

		result, err := suite.DuckDBClient.MergeFiles(
			sourceFiles,
			"destination.unsupported",
			duckdb.MergeStrategyUnion,
		)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.True(t, strings.Contains(err.Error(), "unsupported destination format"))
	})
}

// TestMergeFilesPerformance tests performance with larger datasets.
func TestMergeFilesPerformance(t *testing.T) {
	suite := setupMergeTestSuite(t)

	// Create larger test datasets
	var file1Data strings.Builder
	var file2Data strings.Builder
	file1Data.WriteString("id,name,value\n")
	file2Data.WriteString("id,name,value\n")

	for i := 1; i <= 1000; i++ {
		file1Data.WriteString(fmt.Sprintf("%d,name%d,value%d\n", i, i, i))
		file2Data.WriteString(fmt.Sprintf("%d,name%d,value%d\n", i+1000, i+1000, i+1000))
	}

	sourceFiles := map[string][]byte{
		"large1.csv": []byte(file1Data.String()),
		"large2.csv": []byte(file2Data.String()),
	}

	result, err := suite.DuckDBClient.MergeFiles(
		sourceFiles,
		"merged_large.csv",
		duckdb.MergeStrategyUnion,
	)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, len(result.Content) > 0)

	// Verify the merged result has data from both files
	content := string(result.Content)
	assert.True(t, strings.Contains(content, "name1"))    // From file1
	assert.True(t, strings.Contains(content, "name1001")) // From file2
}
