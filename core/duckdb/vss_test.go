package duckdb_test

import (
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/lib"
	"math"
	"os"
	"strings"
	"testing"

	"github.com/zeebo/assert"
)

// VSSTestSuite provides test setup for VSS extension functionality.
type VSSTestSuite struct {
	*lib.TestSuite
}

// setupVSSTestSuite initializes the test suite with DuckDB client.
func setupVSSTestSuite(t *testing.T) *VSSTestSuite {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	return &VSSTestSuite{
		TestSuite: testSuite,
	}
}

// TestVSSExtensionInstallation verifies that the VSS extension can be installed and loaded.
func TestVSSExtensionInstallation(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Try to install and load the VSS extension
	_, err := suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")
	if err != nil {
		// Check if it's already installed
		if !strings.Contains(err.Error(), "already exists") {
			t.Fatalf("Failed to install/load VSS extension: %v", err)
		}
	}

	// Verify the extension is loaded by checking for VSS functions
	query := `
		SELECT function_name 
		FROM duckdb_functions() 
		WHERE function_name LIKE '%cosine%' OR function_name LIKE '%distance%'
		ORDER BY function_name
	`
	rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), query)
	assert.NoError(t, err)
	defer rows.Close()

	var functionNames []string
	for rows.Next() {
		var name string
		err = rows.Scan(&name)
		assert.NoError(t, err)
		functionNames = append(functionNames, name)
	}

	// VSS extension should provide array_cosine_distance and similar functions
	if len(functionNames) == 0 {
		t.Fatal("VSS extension functions not found")
	}

	t.Logf("Found VSS-related functions: %v", functionNames)
}

// TestVSSArrayCosineSimilarity tests the array_cosine_similarity function.
func TestVSSArrayCosineSimilarity(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	tests := []struct {
		name     string
		vector1  string
		vector2  string
		expected float64
		delta    float64
	}{
		{
			name:     "identical vectors",
			vector1:  "[1.0, 2.0, 3.0]",
			vector2:  "[1.0, 2.0, 3.0]",
			expected: 1.0,
			delta:    0.0001,
		},
		{
			name:     "orthogonal vectors",
			vector1:  "[1.0, 0.0, 0.0]",
			vector2:  "[0.0, 1.0, 0.0]",
			expected: 0.0,
			delta:    0.0001,
		},
		{
			name:     "opposite vectors",
			vector1:  "[1.0, 0.0, 0.0]",
			vector2:  "[-1.0, 0.0, 0.0]",
			expected: -1.0,
			delta:    0.0001,
		},
		{
			name:     "similar vectors",
			vector1:  "[1.0, 2.0, 3.0, 4.0]",
			vector2:  "[1.1, 2.1, 2.9, 4.0]",
			expected: 0.999,
			delta:    0.01,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := fmt.Sprintf(`
				SELECT array_cosine_similarity(%s::FLOAT[%d], %s::FLOAT[%d])
			`, tt.vector1, len(strings.Split(tt.vector1[1:len(tt.vector1)-1], ",")),
				tt.vector2, len(strings.Split(tt.vector2[1:len(tt.vector2)-1], ",")))

			rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), query)
			assert.NoError(t, err)
			defer rows.Close()

			assert.True(t, rows.Next())
			var similarity float64
			err = rows.Scan(&similarity)
			assert.NoError(t, err)

			if math.Abs(similarity-tt.expected) > tt.delta {
				t.Fatalf("Expected similarity ~%.4f, got %.4f", tt.expected, similarity)
			}

			t.Logf("Cosine similarity: %.6f", similarity)
		})
	}
}

// TestVSSArrayCosineDistance tests the array_cosine_distance function.
func TestVSSArrayCosineDistance(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	tests := []struct {
		name     string
		vector1  string
		vector2  string
		expected float64
		delta    float64
	}{
		{
			name:     "identical vectors - zero distance",
			vector1:  "[1.0, 2.0, 3.0]",
			vector2:  "[1.0, 2.0, 3.0]",
			expected: 0.0,
			delta:    0.0001,
		},
		{
			name:     "orthogonal vectors - distance of 1",
			vector1:  "[1.0, 0.0, 0.0]",
			vector2:  "[0.0, 1.0, 0.0]",
			expected: 1.0,
			delta:    0.0001,
		},
		{
			name:     "opposite vectors - max distance of 2",
			vector1:  "[1.0, 0.0, 0.0]",
			vector2:  "[-1.0, 0.0, 0.0]",
			expected: 2.0,
			delta:    0.0001,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query := fmt.Sprintf(`
				SELECT array_cosine_distance(%s::FLOAT[%d], %s::FLOAT[%d])
			`, tt.vector1, len(strings.Split(tt.vector1[1:len(tt.vector1)-1], ",")),
				tt.vector2, len(strings.Split(tt.vector2[1:len(tt.vector2)-1], ",")))

			rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), query)
			assert.NoError(t, err)
			defer rows.Close()

			assert.True(t, rows.Next())
			var distance float64
			err = rows.Scan(&distance)
			assert.NoError(t, err)

			if math.Abs(distance-tt.expected) > tt.delta {
				t.Fatalf("Expected distance ~%.4f, got %.4f", tt.expected, distance)
			}

			t.Logf("Cosine distance: %.6f", distance)
		})
	}
}

// TestVSSWithEmbeddingsTable tests VSS functions with an actual embeddings table.
func TestVSSWithEmbeddingsTable(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	// Create a test embeddings table
	createTableQuery := `
		CREATE TEMP TABLE test_embeddings (
			id VARCHAR,
			content TEXT,
			embedding FLOAT[3]
		)
	`
	_, err := suite.DuckDBClient.ExecuteNonQuery(t.Context(), createTableQuery)
	assert.NoError(t, err)

	// Insert test data with 3-dimensional vectors
	insertQuery := `
		INSERT INTO test_embeddings (id, content, embedding) VALUES
			('1', 'artificial intelligence', [0.9, 0.1, 0.2]::FLOAT[3]),
			('2', 'machine learning', [0.8, 0.15, 0.25]::FLOAT[3]),
			('3', 'deep learning', [0.85, 0.12, 0.22]::FLOAT[3]),
			('4', 'cooking recipes', [0.1, 0.9, 0.05]::FLOAT[3]),
			('5', 'sports news', [0.2, 0.05, 0.95]::FLOAT[3])
	`
	_, err = suite.DuckDBClient.ExecuteNonQuery(t.Context(), insertQuery)
	assert.NoError(t, err)

	// Query vector for "AI-related content"
	queryVector := "[0.88, 0.12, 0.2]::FLOAT[3]"

	// Search for top 3 most similar embeddings
	searchQuery := fmt.Sprintf(`
		SELECT
			id,
			content,
			array_cosine_distance(embedding, %s) as distance,
			(1 - array_cosine_distance(embedding, %s)) as similarity
		FROM test_embeddings
		ORDER BY distance ASC
		LIMIT 3
	`, queryVector, queryVector)

	rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), searchQuery)
	assert.NoError(t, err)
	defer rows.Close()

	var results []struct {
		ID         string
		Content    string
		Distance   float64
		Similarity float64
	}

	for rows.Next() {
		var r struct {
			ID         string
			Content    string
			Distance   float64
			Similarity float64
		}
		err = rows.Scan(&r.ID, &r.Content, &r.Distance, &r.Similarity)
		assert.NoError(t, err)
		results = append(results, r)
	}

	// Verify we got 3 results
	assert.Equal(t, 3, len(results))

	// First result should be one of the AI-related items (ID 1, 2, or 3)
	if results[0].ID != "1" && results[0].ID != "2" && results[0].ID != "3" {
		t.Fatalf("Most similar item should be AI-related, got ID: %s", results[0].ID)
	}

	// Last result should NOT be ID 5 (sports news - most dissimilar)
	if results[2].ID == "5" {
		t.Fatal("Least similar in top 3 should not be sports news")
	}

	t.Logf("Top 3 similar results:")
	for i, r := range results {
		t.Logf("  %d. [%s] %s - Distance: %.4f, Similarity: %.4f",
			i+1, r.ID, r.Content, r.Distance, r.Similarity)
	}
}

// TestVSSWithParquetFile tests VSS functions reading from a Parquet file.
func TestVSSWithParquetFile(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	// Create a temporary Parquet file with embeddings
	tempFile, err := os.CreateTemp(t.TempDir(), "test_embeddings_*.parquet")
	assert.NoError(t, err)
	tempPath := tempFile.Name()
	defer os.Remove(tempPath)
	tempFile.Close()

	// Create and export embeddings to Parquet
	createAndExportQuery := fmt.Sprintf(`
		COPY (
			SELECT
				id,
				content,
				embedding
			FROM (
				VALUES
					('doc1', 'machine learning tutorial', [0.8, 0.2, 0.1]::FLOAT[3]),
					('doc2', 'python programming guide', [0.7, 0.25, 0.15]::FLOAT[3]),
					('doc3', 'cooking pasta recipes', [0.1, 0.1, 0.9]::FLOAT[3]),
					('doc4', 'neural networks explained', [0.85, 0.18, 0.12]::FLOAT[3]),
					('doc5', 'gardening tips', [0.05, 0.85, 0.2]::FLOAT[3])
			) AS t(id, content, embedding)
		) TO '%s' (FORMAT PARQUET)
	`, duckdb.EscapeSQLString(tempPath))

	_, err = suite.DuckDBClient.ExecuteNonQuery(t.Context(), createAndExportQuery)
	assert.NoError(t, err)

	// Perform vector similarity search on the Parquet file
	queryVector := "[0.82, 0.19, 0.11]::FLOAT[3]"
	searchQuery := fmt.Sprintf(`
		SELECT
			id,
			content,
			array_cosine_distance(embedding::FLOAT[3], %s) as distance
		FROM read_parquet('%s')
		ORDER BY distance ASC
		LIMIT 2
	`, queryVector, duckdb.EscapeSQLString(tempPath))

	rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), searchQuery)
	assert.NoError(t, err)
	defer rows.Close()

	var results []struct {
		ID       string
		Content  string
		Distance float64
	}

	for rows.Next() {
		var r struct {
			ID       string
			Content  string
			Distance float64
		}
		err = rows.Scan(&r.ID, &r.Content, &r.Distance)
		assert.NoError(t, err)
		results = append(results, r)
	}

	// Verify we got 2 results
	assert.Equal(t, 2, len(results))

	// Results should be machine learning related (doc1 or doc4)
	if results[0].ID != "doc1" && results[0].ID != "doc4" {
		t.Fatalf("Most similar should be ML-related document, got: %s", results[0].ID)
	}

	t.Logf("Top 2 results from Parquet file:")
	for i, r := range results {
		t.Logf("  %d. [%s] %s - Distance: %.4f", i+1, r.ID, r.Content, r.Distance)
	}
}

// TestVSSHighDimensionalVectors tests VSS with higher dimensional vectors (like real embeddings).
func TestVSSHighDimensionalVectors(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	// Test with 128-dimensional vectors (smaller than typical 1536 but sufficient for testing)
	dimensions := 128

	// Generate a base vector
	baseVector := make([]string, dimensions)
	for i := range dimensions {
		baseVector[i] = fmt.Sprintf("%.6f", 0.1*float64(i%10))
	}
	baseVectorStr := "[" + strings.Join(baseVector, ", ") + "]"

	// Generate a similar vector (slight variations)
	similarVector := make([]string, dimensions)
	for i := range dimensions {
		similarVector[i] = fmt.Sprintf("%.6f", 0.1*float64(i%10)+0.001)
	}
	similarVectorStr := "[" + strings.Join(similarVector, ", ") + "]"

	// Generate a different vector (much more different)
	differentVector := make([]string, dimensions)
	for i := range dimensions {
		differentVector[i] = fmt.Sprintf("%.6f", 0.5+0.1*float64((i+50)%10))
	}
	differentVectorStr := "[" + strings.Join(differentVector, ", ") + "]"

	query := fmt.Sprintf(`
		WITH vectors AS (
			SELECT 
				'base' as name,
				%s::FLOAT[%d] as vec
			UNION ALL
			SELECT 
				'similar' as name,
				%s::FLOAT[%d] as vec
			UNION ALL
			SELECT 
				'different' as name,
				%s::FLOAT[%d] as vec
		)
		SELECT
			name,
			array_cosine_distance(vec, %s::FLOAT[%d]) as distance
		FROM vectors
		WHERE name != 'base'
		ORDER BY distance ASC
	`, baseVectorStr, dimensions, similarVectorStr, dimensions,
		differentVectorStr, dimensions, baseVectorStr, dimensions)

	rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), query)
	assert.NoError(t, err)
	defer rows.Close()

	var results []struct {
		Name     string
		Distance float64
	}

	for rows.Next() {
		var r struct {
			Name     string
			Distance float64
		}
		err = rows.Scan(&r.Name, &r.Distance)
		assert.NoError(t, err)
		results = append(results, r)
	}

	assert.Equal(t, 2, len(results))

	// Find which vector is which
	var similarDistance, differentDistance float64
	for _, r := range results {
		switch r.Name {
		case "similar":
			similarDistance = r.Distance
		case "different":
			differentDistance = r.Distance
		}
	}

	// "similar" vector should have smaller distance than "different"
	if similarDistance >= differentDistance {
		t.Fatalf("Similar vector should have smaller distance (%.6f) than different vector (%.6f)",
			similarDistance, differentDistance)
	}

	t.Logf("High-dimensional vector (%d dims) distance comparison:", dimensions)
	for _, r := range results {
		t.Logf("  %s: %.6f", r.Name, r.Distance)
	}
}

// TestVSSPerformanceWithLargeDataset tests VSS performance with a larger dataset.
func TestVSSPerformanceWithLargeDataset(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	// Create a table with 1000 embeddings
	numEmbeddings := 1000
	dimensions := 64

	createTableQuery := fmt.Sprintf(`
		CREATE TEMP TABLE large_embeddings (
			id INTEGER,
			embedding FLOAT[%d]
		)
	`, dimensions)
	_, err := suite.DuckDBClient.ExecuteNonQuery(t.Context(), createTableQuery)
	assert.NoError(t, err)

	// Generate and insert random embeddings
	t.Logf("Generating %d embeddings with %d dimensions...", numEmbeddings, dimensions)

	for i := range numEmbeddings {
		vector := make([]string, dimensions)
		for j := range dimensions {
			// Generate pseudo-random values
			vector[j] = fmt.Sprintf("%.6f", float64((i*j+j)%100)/100.0)
		}
		vectorStr := "[" + strings.Join(vector, ", ") + "]"

		insertQuery := fmt.Sprintf(`
			INSERT INTO large_embeddings (id, embedding) 
			VALUES (%d, %s::FLOAT[%d])
		`, i, vectorStr, dimensions)

		_, err = suite.DuckDBClient.ExecuteNonQuery(t.Context(), insertQuery)
		assert.NoError(t, err)
	}

	t.Logf("Successfully inserted %d embeddings", numEmbeddings)

	// Create a query vector
	queryVector := make([]string, dimensions)
	for j := range dimensions {
		queryVector[j] = "0.5"
	}
	queryVectorStr := "[" + strings.Join(queryVector, ", ") + "]"

	// Perform search for top 10
	searchQuery := fmt.Sprintf(`
		SELECT
			id,
			array_cosine_distance(embedding, %s::FLOAT[%d]) as distance
		FROM large_embeddings
		ORDER BY distance ASC
		LIMIT 10
	`, queryVectorStr, dimensions)

	rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), searchQuery)
	assert.NoError(t, err)
	defer rows.Close()

	var count int
	for rows.Next() {
		var id int
		var distance float64
		err = rows.Scan(&id, &distance)
		assert.NoError(t, err)
		count++
	}

	if count != 10 {
		t.Fatalf("Should return exactly 10 results, got %d", count)
	}
	t.Logf("Successfully searched %d embeddings and returned top 10 results", numEmbeddings)
}

// TestVSSErrorHandling tests error scenarios with VSS functions.
func TestVSSErrorHandling(t *testing.T) {
	suite := setupVSSTestSuite(t)

	// Ensure VSS is loaded
	_, _ = suite.DuckDBClient.ExecuteNonQuery(t.Context(), "INSTALL vss; LOAD vss;")

	t.Run("mismatched dimensions", func(t *testing.T) {
		query := `
			SELECT array_cosine_distance([1.0, 2.0]::FLOAT[2], [1.0, 2.0, 3.0]::FLOAT[3])
		`
		_, err := suite.DuckDBClient.ExecuteQuery(t.Context(), query)
		if err == nil {
			t.Fatal("Should fail with mismatched dimensions")
		}
		t.Logf("Expected error: %v", err)
	})

	t.Run("null vectors", func(t *testing.T) {
		createTableQuery := `
			CREATE TEMP TABLE null_test (
				id INTEGER,
				embedding FLOAT[3]
			)
		`
		_, err := suite.DuckDBClient.ExecuteNonQuery(t.Context(), createTableQuery)
		assert.NoError(t, err)

		// Insert a row with NULL embedding
		insertQuery := `
			INSERT INTO null_test (id, embedding) VALUES (1, NULL)
		`
		_, err = suite.DuckDBClient.ExecuteNonQuery(t.Context(), insertQuery)
		assert.NoError(t, err)

		// Query with null should be handled gracefully
		searchQuery := `
			SELECT 
				id,
				array_cosine_distance(embedding, [1.0, 2.0, 3.0]::FLOAT[3]) as distance
			FROM null_test
		`
		rows, err := suite.DuckDBClient.ExecuteQuery(t.Context(), searchQuery)
		assert.NoError(t, err)
		defer rows.Close()

		// Should return a row with NULL distance
		assert.True(t, rows.Next())
		var id int
		var distance *float64
		err = rows.Scan(&id, &distance)
		assert.NoError(t, err)
		if distance != nil {
			t.Fatalf("Distance should be NULL for NULL embedding, got: %v", *distance)
		}
	})
}
