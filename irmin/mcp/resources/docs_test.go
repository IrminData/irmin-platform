package resources_test

import (
	"irmin-api/mcp/resources"
	"slices"
	"testing"

	"github.com/zeebo/assert"
)

func TestListAvailableDocs(t *testing.T) {
	files, err := resources.ListAvailableDocs()
	assert.NoError(t, err)
	assert.True(t, len(files) > 0)

	// Check that we have the expected documentation files
	expectedFiles := []string{
		"README.md",
		"sql.md",
		"scripting.md",
		"concepts.md",
		"connections.md",
		"workflows.md",
		"object-schema.md",
	}

	for _, expectedFile := range expectedFiles {
		found := slices.Contains(files, expectedFile)
		assert.True(t, found)
	}
}
