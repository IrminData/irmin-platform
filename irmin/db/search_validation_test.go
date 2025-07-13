package db_test

import (
	"irmin-api/db"
	"testing"
)

func TestValidateSearchToken(t *testing.T) {
	tests := []struct {
		name     string
		token    db.SearchToken
		expected bool
	}{
		{
			name: "Valid word token",
			token: db.SearchToken{
				Value: "hello",
				Type:  db.TokenTypeWord,
			},
			expected: true,
		},
		{
			name: "Valid phrase token",
			token: db.SearchToken{
				Value: "hello world",
				Type:  db.TokenTypePhrase,
			},
			expected: true,
		},
		{
			name: "Valid email search",
			token: db.SearchToken{
				Value: "user@example.com",
				Type:  db.TokenTypeWord,
			},
			expected: true,
		},
		{
			name: "Valid programming language",
			token: db.SearchToken{
				Value: "C++",
				Type:  db.TokenTypeWord,
			},
			expected: true,
		},
		{
			name: "Valid file extension",
			token: db.SearchToken{
				Value: ".json",
				Type:  db.TokenTypeWord,
			},
			expected: true,
		},
		{
			name: "SQL injection attempt",
			token: db.SearchToken{
				Value: "'; DROP TABLE users; --",
				Type:  db.TokenTypeWord,
			},
			expected: false,
		},
		{
			name: "Script injection attempt",
			token: db.SearchToken{
				Value: "<script>alert('xss')</script>",
				Type:  db.TokenTypeWord,
			},
			expected: false,
		},
		{
			name: "Valid filter token",
			token: db.SearchToken{
				Value: "type:workflow",
				Type:  db.TokenTypeFilter,
			},
			expected: true,
		},
		{
			name: "Invalid filter token",
			token: db.SearchToken{
				Value: "malicious:payload",
				Type:  db.TokenTypeFilter,
			},
			expected: false,
		},
		{
			name: "Empty token",
			token: db.SearchToken{
				Value: "",
				Type:  db.TokenTypeWord,
			},
			expected: false,
		},
		{
			name: "Too long token",
			token: db.SearchToken{
				Value: string(make([]byte, db.MaxSearchTokenLength+1)),
				Type:  db.TokenTypeWord,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.ValidateSearchToken(tt.token)
			if result != tt.expected {
				t.Errorf("validateSearchToken(%v) = %v, want %v", tt.token.Value, result, tt.expected)
			}
		})
	}
}

func TestIsValidFieldName(t *testing.T) {
	tests := []struct {
		name      string
		fieldName string
		expected  bool
	}{
		{
			name:      "Valid simple field name",
			fieldName: "name",
			expected:  true,
		},
		{
			name:      "Valid description field",
			fieldName: "description",
			expected:  true,
		},
		{
			name:      "Valid email field",
			fieldName: "email",
			expected:  true,
		},
		{
			name:      "Valid qualified field name",
			fieldName: "users.email",
			expected:  true,
		},
		{
			name:      "Valid repository object field",
			fieldName: "repository_objects.name",
			expected:  true,
		},
		{
			name:      "Invalid field name",
			fieldName: "malicious_field",
			expected:  false,
		},
		{
			name:      "Invalid table name in qualified field",
			fieldName: "malicious_table.name",
			expected:  false,
		},
		{
			name:      "Invalid field name in qualified field",
			fieldName: "users.malicious_field",
			expected:  false,
		},
		{
			name:      "Too many dots",
			fieldName: "database.table.field",
			expected:  false,
		},
		{
			name:      "Empty field name",
			fieldName: "",
			expected:  false,
		},
		{
			name:      "Field name with injection",
			fieldName: "name'; DROP TABLE users; --",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.IsValidFieldName(tt.fieldName)
			if result != tt.expected {
				t.Errorf("IsValidFieldName(%v) = %v, want %v", tt.fieldName, result, tt.expected)
			}
		})
	}
}

func TestIsValidTableName(t *testing.T) {
	tests := []struct {
		name      string
		tableName string
		expected  bool
	}{
		{
			name:      "Valid table name",
			tableName: "users",
			expected:  true,
		},
		{
			name:      "Valid workflows table",
			tableName: "workflows",
			expected:  true,
		},
		{
			name:      "Valid repositories table",
			tableName: "repositories",
			expected:  true,
		},
		{
			name:      "Invalid table name",
			tableName: "malicious_table",
			expected:  false,
		},
		{
			name:      "Table name with injection",
			tableName: "users; DROP TABLE workflows; --",
			expected:  false,
		},
		{
			name:      "Empty table name",
			tableName: "",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.IsValidTableName(tt.tableName)
			if result != tt.expected {
				t.Errorf("IsValidTableName(%v) = %v, want %v", tt.tableName, result, tt.expected)
			}
		})
	}
}

func TestContainsSQLInjectionPattern(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "Normal search term",
			input:    "hello world",
			expected: false,
		},
		{
			name:     "Email address",
			input:    "user@example.com",
			expected: false,
		},
		{
			name:     "SQL injection with UNION",
			input:    "test' UNION SELECT * FROM users",
			expected: true,
		},
		{
			name:     "SQL injection with DROP",
			input:    "'; DROP TABLE users; --",
			expected: true,
		},
		{
			name:     "Script injection",
			input:    "<script>alert('xss')</script>",
			expected: true,
		},
		{
			name:     "SQL comment injection",
			input:    "test'; --",
			expected: true,
		},
		{
			name:     "System function injection",
			input:    "xp_cmdshell('dir')",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.ContainsSQLInjectionPattern(tt.input)
			if result != tt.expected {
				t.Errorf("ContainsSQLInjectionPattern(%v) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestContainsSuspiciousPatterns(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "Normal search term",
			input:    "hello world",
			expected: false,
		},
		{
			name:     "Email address",
			input:    "user@example.com",
			expected: false,
		},
		{
			name:     "Programming language",
			input:    "C++",
			expected: false,
		},
		{
			name:     "File path",
			input:    "src/main.go",
			expected: false,
		},
		{
			name:     "SQL comment",
			input:    "test--comment",
			expected: true,
		},
		{
			name:     "Script tag",
			input:    "<script>alert('xss')</script>",
			expected: true,
		},
		{
			name:     "JavaScript protocol",
			input:    "javascript:alert('xss')",
			expected: true,
		},
		{
			name:     "Excessive special characters",
			input:    "!@#$%^&*(){}[]|\\:;\"'<>?/~`",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.ContainsSuspiciousPatterns(tt.input)
			if result != tt.expected {
				t.Errorf("ContainsSuspiciousPatterns(%v) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestSanitizeSearchValue(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Normal search term",
			input:    "hello world",
			expected: "hello world",
		},
		{
			name:     "Email address",
			input:    "user@example.com",
			expected: "user@example.com",
		},
		{
			name:     "Text with quotes",
			input:    "hello 'world'",
			expected: "hello world",
		},
		{
			name:     "Text with ILIKE patterns",
			input:    "hello%world_test",
			expected: "hello\\%world\\_test",
		},
		{
			name:     "SQL injection attempt",
			input:    "'; DROP TABLE users; --",
			expected: "",
		},
		{
			name:     "Text with backslashes",
			input:    "path\\to\\file",
			expected: "path\\\\to\\\\file",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.SanitizeSearchValue(tt.input)
			if result != tt.expected {
				t.Errorf("sanitizeSearchValue(%v) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestValidateFieldMappings(t *testing.T) {
	tests := []struct {
		name          string
		fieldMappings map[string]string
		tableName     string
		expected      map[string]string
	}{
		{
			name: "Valid field mappings",
			fieldMappings: map[string]string{
				"name":        "name",
				"description": "description",
				"email":       "email",
			},
			tableName: "users",
			expected: map[string]string{
				"name":        "name",
				"description": "description",
				"email":       "email",
			},
		},
		{
			name: "Mixed valid and invalid field mappings",
			fieldMappings: map[string]string{
				"name":        "name",
				"description": "description",
				"malicious":   "malicious_field",
				"email":       "email",
			},
			tableName: "users",
			expected: map[string]string{
				"name":        "name",
				"description": "description",
				"email":       "email",
			},
		},
		{
			name: "All invalid field mappings",
			fieldMappings: map[string]string{
				"malicious1": "malicious_field1",
				"malicious2": "malicious_field2",
			},
			tableName: "users",
			expected:  map[string]string{},
		},
		{
			name: "Field mapping with SQL injection",
			fieldMappings: map[string]string{
				"name":      "name",
				"malicious": "name'; DROP TABLE users; --",
			},
			tableName: "users",
			expected: map[string]string{
				"name": "name",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := db.ValidateFieldMappings(tt.fieldMappings)
			if len(result) != len(tt.expected) {
				t.Errorf("ValidateFieldMappings() returned %d items, want %d", len(result), len(tt.expected))
			}
			for key, expectedValue := range tt.expected {
				if resultValue, exists := result[key]; !exists || resultValue != expectedValue {
					t.Errorf(
						"ValidateFieldMappings() missing or wrong value for key %s: got %s, want %s",
						key,
						resultValue,
						expectedValue,
					)
				}
			}
		})
	}
}

// TestSearchFieldMappingsUsedInCode tests that all field mappings actually used in the search code are valid.
func TestSearchFieldMappingsUsedInCode(t *testing.T) {
	// Test workflow field mappings
	workflowMappings := map[string]string{
		"name":          "name",
		"description":   "description",
		"documentation": "documentation",
	}
	result := db.ValidateFieldMappings(workflowMappings)
	if len(result) != 3 {
		t.Errorf("Workflow field mappings validation failed: got %d valid mappings, want 3", len(result))
	}

	// Test repository field mappings
	repoMappings := map[string]string{
		"name":          "name",
		"description":   "description",
		"documentation": "documentation",
	}
	result = db.ValidateFieldMappings(repoMappings)
	if len(result) != 3 {
		t.Errorf("Repository field mappings validation failed: got %d valid mappings, want 3", len(result))
	}

	// Test user field mappings
	userMappings := map[string]string{
		"first_name": "first_name",
		"last_name":  "last_name",
		"email":      "email",
		"company":    "company",
	}
	result = db.ValidateFieldMappings(userMappings)
	if len(result) != 4 {
		t.Errorf("User field mappings validation failed: got %d valid mappings, want 4", len(result))
	}

	// Test stored query field mappings
	queryMappings := map[string]string{
		"name":        "name",
		"description": "description",
		"sql":         "sql",
	}
	result = db.ValidateFieldMappings(queryMappings)
	if len(result) != 3 {
		t.Errorf("Stored query field mappings validation failed: got %d valid mappings, want 3", len(result))
	}

	// Test repository object field mappings with qualified names
	repoObjMappings := map[string]string{
		"name":         "name", // This should be valid as a simple field name
		"path":         "path",
		"content_type": "content_type",
	}
	result = db.ValidateFieldMappings(repoObjMappings)
	if len(result) != 3 {
		t.Errorf("Repository object field mappings validation failed: got %d valid mappings, want 3", len(result))
	}
}
