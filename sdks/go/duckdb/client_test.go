package duckdb_test

import (
	"fmt"
	"log/slog"
	"testing"

	"github.com/IrminData/irmin-sdk-go/duckdb"
)

func TestNewInMemoryClient(t *testing.T) {
	logger := slog.Default()

	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()
}

func TestCreateTableFromData(t *testing.T) {
	logger := slog.Default()
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()

	// Test data
	data := []map[string]any{
		{"id": 1, "name": "John", "age": 30, "active": true},
		{"id": 2, "name": "Jane", "age": 25, "active": false},
	}

	err = client.CreateTableFromData("test_users", data)
	if err != nil {
		t.Fatalf("Failed to create table from data: %v", err)
	}

	// Verify the table was created and has data
	rows, err := client.ExecuteQuery("SELECT COUNT(*) FROM test_users")
	if err != nil {
		t.Fatalf("Failed to query table: %v", err)
	}
	if rows.Err() != nil {
		t.Fatalf("Failed to query table: %v", rows.Err())
	}
	defer rows.Close()

	if !rows.Next() {
		t.Fatal("Expected at least one row")
	}

	var count int
	if scanErr := rows.Scan(&count); scanErr != nil {
		t.Fatalf("Failed to scan count: %v", scanErr)
	}

	if count != 2 {
		t.Errorf("Expected 2 rows, got %d", count)
	}
}

func TestQueryToMap(t *testing.T) {
	logger := slog.Default()
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()

	// Create test data
	data := []map[string]any{
		{"id": 1, "name": "John", "age": 30},
		{"id": 2, "name": "Jane", "age": 25},
	}

	err = client.CreateTableFromData("test_users", data)
	if err != nil {
		t.Fatalf("Failed to create table from data: %v", err)
	}

	// Query and convert to map
	results, err := client.QueryToMap("SELECT * FROM test_users ORDER BY id")
	if err != nil {
		t.Fatalf("Failed to query to map: %v", err)
	}

	if len(results) != 2 {
		t.Errorf("Expected 2 results, got %d", len(results))
	}

	// Check first row
	first := results[0]
	if first["name"] != "John" {
		t.Errorf("Expected name 'John', got %v", first["name"])
	}
}

func TestMergeDataSources(t *testing.T) {
	logger := slog.Default()
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()

	// Create test data sources
	dataSources := map[string][]map[string]any{
		"source1": {
			{"id": 1, "name": "John", "age": 30},
			{"id": 2, "name": "Jane", "age": 25},
		},
		"source2": {
			{"id": 3, "name": "Bob", "age": 35},
			{"id": 4, "name": "Alice", "age": 28},
		},
	}

	result, err := client.MergeDataSources(dataSources, "merged_users", duckdb.MergeStrategyUnion)
	if err != nil {
		t.Fatalf("Failed to merge data sources: %v", err)
	}

	if result.TableName != "merged_users" {
		t.Errorf("Expected table name 'merged_users', got %s", result.TableName)
	}

	if result.RowCount != 4 {
		t.Errorf("Expected 4 rows, got %d", result.RowCount)
	}

	if len(result.SourceNames) != 2 {
		t.Errorf("Expected 2 source names, got %d", len(result.SourceNames))
	}

	// Verify the merged data
	rows, err := client.QueryToMap("SELECT COUNT(*) as count FROM merged_users")
	if err != nil {
		t.Fatalf("Failed to query merged table: %v", err)
	}

	if len(rows) != 1 {
		t.Errorf("Expected 1 row in count query, got %d", len(rows))
	}
}

func TestGetDuckDBReadOptions(t *testing.T) {
	tests := []struct {
		filename    string
		expectError bool
		readFunc    string
	}{
		{"data.csv", false, "read_csv_auto"},
		{"data.json", false, "read_json_auto"},
		{"data.parquet", false, "read_parquet"},
		{"data.jsonl", false, "read_json_auto"},
		{"data.unknown", true, ""},
	}

	for _, test := range tests {
		t.Run(test.filename, func(t *testing.T) {
			options, err := duckdb.GetDuckDBReadOptions(test.filename)

			if test.expectError {
				if err == nil {
					t.Errorf("Expected error for %s, but got none", test.filename)
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error for %s: %v", test.filename, err)
				return
			}

			if options.ReadFunction != test.readFunc {
				t.Errorf("Expected read function %s for %s, got %s",
					test.readFunc, test.filename, options.ReadFunction)
			}
		})
	}
}

func TestIsFormatSupported(t *testing.T) {
	supportedFormats := []string{
		"data.csv", "data.json", "data.parquet", "data.jsonl",
		"data.tsv", "data.avro", "data.orc",
	}

	unsupportedFormats := []string{
		"data.txt", "data.unknown", "data.exe",
	}

	for _, format := range supportedFormats {
		if !duckdb.IsFormatSupported(format) {
			t.Errorf("Format %s should be supported", format)
		}
	}

	for _, format := range unsupportedFormats {
		if duckdb.IsFormatSupported(format) {
			t.Errorf("Format %s should not be supported", format)
		}
	}
}

func TestLoadFileFromBytes(t *testing.T) {
	logger := slog.Default()
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()

	// Test CSV data
	csvData := []byte(`name,age,city
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`)

	err = client.LoadFileFromBytes(csvData, "users.csv", "users_from_csv")
	if err != nil {
		t.Fatalf("Failed to load CSV from bytes: %v", err)
	}

	// Verify the data was loaded correctly
	results, err := client.QueryToMap("SELECT COUNT(*) as count FROM users_from_csv")
	if err != nil {
		t.Fatalf("Failed to query loaded table: %v", err)
	}

	if len(results) != 1 {
		t.Errorf("Expected 1 row in count query, got %d", len(results))
	}

	count, ok := results[0]["count"]
	if !ok {
		t.Error("Expected count column in result")
	}

	// DuckDB might return different numeric types, so convert to string for comparison
	countStr := fmt.Sprintf("%v", count)
	if countStr != "3" {
		t.Errorf("Expected count of 3, got %s", countStr)
	}

	// Test JSON data
	jsonData := []byte(`[
		{"name": "Alice", "age": 28, "city": "Boston"},
		{"name": "Charlie", "age": 32, "city": "Seattle"}
	]`)

	err = client.LoadFileFromBytes(jsonData, "users.json", "users_from_json")
	if err != nil {
		t.Fatalf("Failed to load JSON from bytes: %v", err)
	}

	// Verify JSON data
	jsonResults, err := client.QueryToMap("SELECT name FROM users_from_json ORDER BY name")
	if err != nil {
		t.Fatalf("Failed to query JSON table: %v", err)
	}

	if len(jsonResults) != 2 {
		t.Errorf("Expected 2 rows from JSON, got %d", len(jsonResults))
	}

	if jsonResults[0]["name"] != "Alice" {
		t.Errorf("Expected first name to be Alice, got %v", jsonResults[0]["name"])
	}
}

func TestCreateTableFromDataWithSpacesInColumnNames(t *testing.T) {
	logger := slog.Default()
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()

	// Test data with column names that contain spaces
	data := []map[string]any{
		{"user id": 1, "first name": "John", "last name": "Doe", "is active": true},
		{"user id": 2, "first name": "Jane", "last name": "Smith", "is active": false},
	}

	err = client.CreateTableFromData("test_users_spaces", data)
	if err != nil {
		t.Fatalf("Failed to create table from data with spaces in column names: %v", err)
	}

	// Verify the table was created and has correct data
	jsonResults, err := client.QueryToMap("SELECT * FROM test_users_spaces ORDER BY \"user id\"")
	if err != nil {
		t.Fatalf("Failed to query table: %v", err)
	}

	if len(jsonResults) != 2 {
		t.Fatalf("Expected 2 rows, got %d", len(jsonResults))
	}

	// Verify first row data
	if jsonResults[0]["user id"] != int32(1) {
		t.Errorf("Expected user id to be 1, got %v", jsonResults[0]["user id"])
	}
	if jsonResults[0]["first name"] != "John" {
		t.Errorf("Expected first name to be John, got %v", jsonResults[0]["first name"])
	}
	if jsonResults[0]["last name"] != "Doe" {
		t.Errorf("Expected last name to be Doe, got %v", jsonResults[0]["last name"])
	}
	if jsonResults[0]["is active"] != true {
		t.Errorf("Expected is active to be true, got %v", jsonResults[0]["is active"])
	}

	// Verify second row data
	if jsonResults[1]["user id"] != int32(2) {
		t.Errorf("Expected user id to be 2, got %v", jsonResults[1]["user id"])
	}
	if jsonResults[1]["first name"] != "Jane" {
		t.Errorf("Expected first name to be Jane, got %v", jsonResults[1]["first name"])
	}
	if jsonResults[1]["last name"] != "Smith" {
		t.Errorf("Expected last name to be Smith, got %v", jsonResults[1]["last name"])
	}
	if jsonResults[1]["is active"] != false {
		t.Errorf("Expected is active to be false, got %v", jsonResults[1]["is active"])
	}
}

func TestCreateTableFromDataWithQuotesAndConsistentOrdering(t *testing.T) {
	logger := slog.Default()
	client, err := duckdb.NewInMemoryClient(logger)
	if err != nil {
		t.Fatalf("Failed to create in-memory client: %v", err)
	}
	defer client.Close()

	// Test data with column names that contain quotes and need consistent ordering
	data := []map[string]any{
		{
			`col"with"quotes`: "value1",
			"zebra_column":    "zebra1",
			"alpha_column":    "alpha1",
		},
		{
			`col"with"quotes`: "value2",
			"zebra_column":    "zebra2",
			"alpha_column":    "alpha2",
		},
	}

	err = client.CreateTableFromData("test_quotes", data)
	if err != nil {
		t.Fatalf("Failed to create table with quoted column names: %v", err)
	}

	// Verify the table was created and has correct data
	rows, err := client.ExecuteQuery("SELECT COUNT(*) FROM test_quotes")
	if err != nil {
		t.Fatalf("Failed to query table: %v", err)
	}
	defer rows.Close()

	if !rows.Next() {
		t.Fatal("No rows returned from count query")
	}

	var count int
	if scanCountErr := rows.Scan(&count); scanCountErr != nil {
		t.Fatalf("Failed to scan count: %v", scanCountErr)
	}

	if count != 2 {
		t.Errorf("Expected 2 rows, got %d", count)
	}

	// Verify data integrity by checking the values are inserted in correct columns
	resultRows, executeQueryErr := client.ExecuteQuery(
		`SELECT "col""with""quotes", "alpha_column", "zebra_column" FROM test_quotes ORDER BY "alpha_column"`,
	)
	if executeQueryErr != nil {
		t.Fatalf("Failed to query table data: %v", executeQueryErr)
	}
	defer resultRows.Close()

	// Check first row
	if !resultRows.Next() {
		t.Fatal("Expected first row but got none")
	}
	var quotedCol, alphaCol, zebraCol string
	if scanResultRowsErr := resultRows.Scan(&quotedCol, &alphaCol, &zebraCol); scanResultRowsErr != nil {
		t.Fatalf("Failed to scan first row: %v", scanResultRowsErr)
	}
	if quotedCol != "value1" || alphaCol != "alpha1" || zebraCol != "zebra1" {
		t.Errorf(
			"First row data mismatch: got (%s, %s, %s), expected (value1, alpha1, zebra1)",
			quotedCol,
			alphaCol,
			zebraCol,
		)
	}

	// Check second row
	if !resultRows.Next() {
		t.Fatal("Expected second row but got none")
	}
	if scanResultRows2Err := resultRows.Scan(&quotedCol, &alphaCol, &zebraCol); scanResultRows2Err != nil {
		t.Fatalf("Failed to scan second row: %v", scanResultRows2Err)
	}
	if quotedCol != "value2" || alphaCol != "alpha2" || zebraCol != "zebra2" {
		t.Errorf(
			"Second row data mismatch: got (%s, %s, %s), expected (value2, alpha2, zebra2)",
			quotedCol,
			alphaCol,
			zebraCol,
		)
	}
}
