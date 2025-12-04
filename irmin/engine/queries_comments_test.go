package engine_test

import (
	"irmin-api/engine"
	"testing"

	"github.com/zeebo/assert"
)

func TestRemoveSQLComments(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "No comments",
			input:    "SELECT * FROM table",
			expected: "SELECT * FROM table",
		},
		{
			name:     "Line comment",
			input:    "SELECT * FROM table -- comment",
			expected: "SELECT * FROM table  ",
		},
		{
			name:     "Line comment with newline",
			input:    "SELECT * FROM table -- comment\nWHERE x = 1",
			expected: "SELECT * FROM table  \nWHERE x = 1",
		},
		{
			name:     "Block comment",
			input:    "SELECT * /* comment */ FROM table",
			expected: "SELECT *    FROM table",
		},
		{
			name:     "Multiline block comment",
			input:    "SELECT * /* \n comment \n */ FROM table",
			expected: "SELECT *    FROM table",
		},
		{
			name:     "Comment inside single quotes (should be preserved)",
			input:    "SELECT '-- not a comment'",
			expected: "SELECT '-- not a comment'",
		},
		{
			name:     "Comment inside double quotes (should be preserved)",
			input:    `SELECT "-- not a comment"`,
			expected: `SELECT "-- not a comment"`,
		},
		{
			name:     "Nested comments (not supported in SQL, but check behavior)",
			input:    "SELECT /* /* inner */ outer */",
			expected: "SELECT    outer */", // First */ closes the comment
		},
		{
			name:     "Escaped single quotes",
			input:    "SELECT 'It''s a test -- not a comment'",
			expected: "SELECT 'It''s a test -- not a comment'",
		},
		{
			name:     "Escaped double quotes",
			input:    `SELECT "Name""Tag" -- comment`,
			expected: `SELECT "Name""Tag"  `,
		},
		{
			name:     "Mixed comments and quotes",
			input:    "SELECT /* start */ 'text -- keep' -- end",
			expected: "SELECT    'text -- keep'  ",
		},
		{
			name:     "Slash inside string",
			input:    "SELECT 'a / b'",
			expected: "SELECT 'a / b'",
		},
		{
			name:     "Dash inside string",
			input:    "SELECT 'a - b'",
			expected: "SELECT 'a - b'",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := engine.RemoveSQLComments(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
