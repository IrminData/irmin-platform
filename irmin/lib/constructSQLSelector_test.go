package lib_test

import (
	"irmin-api/lib"
	"testing"

	"github.com/zeebo/assert"
)

func TestConstructSQLSelector(t *testing.T) {
	tests := []struct {
		name          string
		workspaceSlug string
		repoSlug      string
		objectPath    string
		ref           string
		expected      string
	}{
		{
			name:          "simple file",
			workspaceSlug: "ws",
			repoSlug:      "repo",
			objectPath:    "file.json",
			ref:           "main",
			expected:      `$["ws;repo;file.json@main"]`,
		},
		{
			name:          "nested file",
			workspaceSlug: "ws",
			repoSlug:      "repo",
			objectPath:    "path/to/file.csv",
			ref:           "dev",
			expected:      `$["ws;repo;path/to/file.csv@dev"]`,
		},
		{
			name:          "group object (folder)",
			workspaceSlug: "my-workspace",
			repoSlug:      "demo-data",
			objectPath:    "orders/archive",
			ref:           "v1",
			expected:      `$["my-workspace;demo-data;orders/archive@v1"]`,
		},
		{
			name:          "deeply nested group object",
			workspaceSlug: "ws",
			repoSlug:      "repo",
			objectPath:    "a/b/c/d",
			ref:           "main",
			expected:      `$["ws;repo;a/b/c/d@main"]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := lib.ConstructSQLSelector(tt.workspaceSlug, tt.repoSlug, tt.objectPath, tt.ref)
			assert.Equal(t, tt.expected, result)
		})
	}
}
