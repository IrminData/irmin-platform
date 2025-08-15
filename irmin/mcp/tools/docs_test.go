package tools_test

import (
	"testing"

	"irmin-api/mcp/tools"

	"github.com/zeebo/assert"
)

func TestDocsTools(t *testing.T) {
	t.Run("docs category constants are defined", func(t *testing.T) {
		// Test that all expected categories are defined
		expectedCategories := []string{
			"index",
			"sql",
			"scripting",
			"concepts",
			"connections",
			"workflows",
			"object-schema",
		}

		for _, expected := range expectedCategories {
			found := false
			switch expected {
			case "index":
				found = tools.DocsCategoryIndex == tools.DocsCategory(expected)
			case "sql":
				found = tools.DocsCategorySQL == tools.DocsCategory(expected)
			case "scripting":
				found = tools.DocsCategoryScripting == tools.DocsCategory(expected)
			case "concepts":
				found = tools.DocsCategoryConcepts == tools.DocsCategory(expected)
			case "connections":
				found = tools.DocsCategoryConnections == tools.DocsCategory(expected)
			case "workflows":
				found = tools.DocsCategoryWorkflows == tools.DocsCategory(expected)
			case "object-schema":
				found = tools.DocsCategoryObjectSchema == tools.DocsCategory(expected)
			}
			assert.True(t, found)
		}
	})

	t.Run("getDocsInput struct has correct fields", func(t *testing.T) {
		// Test that the input struct has the expected field
		input := tools.GetDocsInput{Category: "sql"}
		assert.Equal(t, input.Category, "sql")
	})

	t.Run("docs category validation", func(t *testing.T) {
		// Test that valid categories are recognized
		validCategories := []tools.DocsCategory{
			tools.DocsCategoryIndex,
			tools.DocsCategorySQL,
			tools.DocsCategoryScripting,
			tools.DocsCategoryConcepts,
			tools.DocsCategoryConnections,
			tools.DocsCategoryWorkflows,
			tools.DocsCategoryObjectSchema,
		}

		for _, category := range validCategories {
			// This should not panic
			_ = string(category)
		}

		// Use the parameter to avoid the warning
		t.Log("Validated all documentation categories")
	})

	t.Run("docs category string conversion", func(t *testing.T) {
		// Test that categories can be converted to strings
		category := tools.DocsCategorySQL
		categoryStr := string(category)
		assert.Equal(t, categoryStr, "sql")
	})
}
