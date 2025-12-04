package utils_test

import (
	"irmin-api/utils"
	"testing"

	"github.com/zeebo/assert"
)

func TestDetectContext(t *testing.T) {
	tests := []struct {
		name             string
		query            string
		placeholderStart int
		expected         string
	}{
		{
			name:             "Simple SELECT (read)",
			query:            "SELECT * FROM table WHERE x = $",
			placeholderStart: 30, // Position of $
			expected:         "read",
		},
		{
			name:             "Simple INSERT (write)",
			query:            "INSERT INTO table VALUES ($",
			placeholderStart: 26,
			expected:         "write",
		},
		{
			name:             "COPY TO (write)",
			query:            "COPY (SELECT * FROM t) TO $",
			placeholderStart: 26,
			expected:         "write",
		},
		{
			name:             "Identifier with TO (HISTORIAN) - Should be read",
			query:            "SELECT * FROM HISTORIAN_DATA WHERE id = $",
			placeholderStart: 40,
			expected:         "read",
		},
		{
			name:             "Identifier with INTO (INVENTORY) - Should be read",
			query:            "SELECT * FROM INVENTORY WHERE id = $",
			placeholderStart: 35,
			expected:         "read",
		},
		{
			name:             "FROM in identifier (FROMAGE) - Should not confuse logic",
			query:            "SELECT * FROM FROMAGE WHERE id = $",
			placeholderStart: 33,
			expected:         "read",
		},
		{
			name:             "Multiple keywords, last one matters",
			query:            "INSERT INTO t SELECT * FROM s WHERE id = $",
			placeholderStart: 41,
			expected:         "read", // In WHERE clause of SELECT part
		},
		{
			name:             "Multiple keywords, write context",
			query:            "SELECT * FROM s; COPY t TO $",
			placeholderStart: 27,
			expected:         "write",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := utils.DetectContext(tt.query, tt.placeholderStart)
			assert.Equal(t, tt.expected, result)
		})
	}
}
