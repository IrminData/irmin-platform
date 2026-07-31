package duckdb_test

import (
	"testing"

	"github.com/IrminData/irmin-platform/sdks/go/duckdb"
)

func TestCleanTableName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "starts with number",
			input:    "123data.csv",
			expected: "table_123data",
		},
		{
			name:     "contains special characters",
			input:    "user-data@2024.xlsx",
			expected: "user_data2024",
		},
		{
			name:     "file with path separators",
			input:    "data/reports\\final.txt",
			expected: "data_reports_final",
		},
		{
			name:     "starts with underscore (valid)",
			input:    "_internal_data.csv",
			expected: "_internal_data",
		},
		{
			name:     "starts with letter (valid)",
			input:    "validTable.json",
			expected: "validTable",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "table_default",
		},
		{
			name:     "only special characters",
			input:    "@#$%",
			expected: "table_default",
		},
		{
			name:     "only extension",
			input:    ".csv",
			expected: "table_default",
		},
		{
			name:     "unicode characters",
			input:    "données_été.csv",
			expected: "donnes_t",
		},
		{
			name:     "starts with multiple numbers",
			input:    "2024_01_report.xlsx",
			expected: "table_2024_01_report",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := duckdb.CleanTableName(tt.input)
			if result != tt.expected {
				t.Errorf("cleanTableName(%q) = %q, expected %q", tt.input, result, tt.expected)
			}

			// Verify the result is a valid SQL identifier
			if !isValidSQLIdentifier(result) {
				t.Errorf("cleanTableName(%q) = %q is not a valid SQL identifier", tt.input, result)
			}
		})
	}
}

// isValidSQLIdentifier checks if a string is a valid SQL identifier
// (starts with letter or underscore, contains only alphanumeric and underscore).
func isValidSQLIdentifier(identifier string) bool {
	if len(identifier) == 0 {
		return false
	}

	// Must start with letter or underscore
	first := identifier[0]
	if (first < 'a' || first > 'z') && (first < 'A' || first > 'Z') && first != '_' {
		return false
	}

	// Rest must be alphanumeric or underscore
	for i := 1; i < len(identifier); i++ {
		char := identifier[i]
		if (char < 'a' || char > 'z') && (char < 'A' || char > 'Z') &&
			(char < '0' || char > '9') && char != '_' {
			return false
		}
	}

	return true
}

func TestValidateSQLIdentifier(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expectError bool
		expected    string
	}{
		{
			name:        "valid identifier",
			input:       "validTable",
			expectError: false,
			expected:    `"validTable"`,
		},
		{
			name:        "valid with underscore",
			input:       "_internal_table",
			expectError: false,
			expected:    `"_internal_table"`,
		},
		{
			name:        "starts with number",
			input:       "123invalid",
			expectError: true,
		},
		{
			name:        "contains special characters",
			input:       "table@name",
			expectError: true,
		},
		{
			name:        "contains spaces",
			input:       "table name",
			expectError: true,
		},
		{
			name:        "empty string",
			input:       "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := duckdb.ValidateSQLIdentifier(tt.input)

			if tt.expectError {
				if err == nil {
					t.Errorf("validateSQLIdentifier(%q) expected error but got none", tt.input)
				}
			} else {
				if err != nil {
					t.Errorf("validateSQLIdentifier(%q) unexpected error: %v", tt.input, err)
				}
				if result != tt.expected {
					t.Errorf("validateSQLIdentifier(%q) = %q, expected %q", tt.input, result, tt.expected)
				}
			}
		})
	}
}

func TestEscapeSQLIdentifier(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple identifier",
			input:    "columnName",
			expected: `"columnName"`,
		},
		{
			name:     "contains quotes",
			input:    `column"name`,
			expected: `"column""name"`,
		},
		{
			name:     "multiple quotes",
			input:    `col"umn"name`,
			expected: `"col""umn""name"`,
		},
		{
			name:     "starts with number",
			input:    "123column",
			expected: `"123column"`,
		},
		{
			name:     "special characters",
			input:    "column name@123",
			expected: `"column name@123"`,
		},
		{
			name:     "unicode characters",
			input:    "données",
			expected: `"données"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := duckdb.EscapeSQLIdentifier(tt.input)
			if result != tt.expected {
				t.Errorf("EscapeSQLIdentifier(%q) = %q, expected %q", tt.input, result, tt.expected)
			}
		})
	}
}
