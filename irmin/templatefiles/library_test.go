package templatefiles_test

import (
	"strings"
	"testing"

	"irmin-api/templatefiles"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

func TestGetAllTemplates(t *testing.T) {
	templates, err := templatefiles.GetAllTemplates()
	if err != nil {
		t.Fatalf("Failed to load templates: %v", err)
	}

	if len(templates) == 0 {
		t.Fatal("No templates were loaded")
	}

	t.Logf("Loaded %d templates", len(templates))

	// Verify we have both query and script templates
	hasQuery := false
	hasScript := false

	for _, tmpl := range templates {
		if tmpl.Type == irminmodels.TemplateTypeQuery {
			hasQuery = true
		}
		if tmpl.Type == irminmodels.TemplateTypeScript {
			hasScript = true
		}

		// Verify required fields
		if tmpl.Title == "" {
			t.Errorf("Template has empty title: %+v", tmpl)
		}
		if tmpl.Content == "" {
			t.Errorf("Template %s has empty content", tmpl.Title)
		}
		if tmpl.Type == "" {
			t.Errorf("Template %s has empty type", tmpl.Title)
		}
		if tmpl.Language == "" {
			t.Errorf("Template %s has empty language", tmpl.Title)
		}

		t.Logf("Template: %s (type: %s, language: %s, tags: %d, placeholders: %d)",
			tmpl.Title, tmpl.Type, tmpl.Language, len(tmpl.Tags), len(tmpl.Placeholders))
	}

	if !hasQuery {
		t.Error("No query templates were loaded")
	}
	if !hasScript {
		t.Error("No script templates were loaded")
	}
}

type parseTemplateTest struct {
	name             string
	content          string
	templateType     irminmodels.TemplateType
	language         irminmodels.TemplateLanguage
	wantTitle        string
	wantDesc         string
	wantTags         int
	wantPlaceholders int
	wantContent      string
}

func verifyTemplateResult(t *testing.T, result templatefiles.TemplateDefinition, tt parseTemplateTest) {
	t.Helper()

	if result.Title != tt.wantTitle {
		t.Errorf("Title = %q, want %q", result.Title, tt.wantTitle)
	}
	if result.Description != tt.wantDesc {
		t.Errorf("Description = %q, want %q", result.Description, tt.wantDesc)
	}
	if len(result.Tags) != tt.wantTags {
		t.Errorf("Tags count = %d, want %d", len(result.Tags), tt.wantTags)
	}
	if len(result.Placeholders) != tt.wantPlaceholders {
		t.Errorf("Placeholders count = %d, want %d", len(result.Placeholders), tt.wantPlaceholders)
	}
	if result.Type != tt.templateType {
		t.Errorf("Type = %q, want %q", result.Type, tt.templateType)
	}
	if result.Language != tt.language {
		t.Errorf("Language = %q, want %q", result.Language, tt.language)
	}
	expectedContent := tt.wantContent
	if expectedContent == "" {
		expectedContent = tt.content
	}
	if result.Content != expectedContent {
		t.Errorf("Content mismatch:\nGot:\n%s\n\nWant:\n%s", result.Content, expectedContent)
	}
}

func TestParseTemplate(t *testing.T) {
	tests := []parseTemplateTest{
		{
			name: "SQL template with metadata and examples",
			content: `-- Title: Test Query
-- Description: A test query
-- Tags: test, sample
-- Placeholders: table_name:users, column_name:email

SELECT * FROM {{table_name}} WHERE {{column_name}} = 'value';`,
			templateType:     irminmodels.TemplateTypeQuery,
			language:         irminmodels.TemplateLanguageSQL,
			wantTitle:        "Test Query",
			wantDesc:         "A test query",
			wantTags:         2,
			wantPlaceholders: 2,
			wantContent:      `SELECT * FROM {{table_name}} WHERE {{column_name}} = 'value';`,
		},
		{
			name: "Go script with metadata and examples",
			content: `// Title: Test Script
// Description: A test script
// Tags: test, sample
// Placeholders: repo_slug:my-repo

package main

func main() {
    // Use {{repo_slug}}
}`,
			templateType:     irminmodels.TemplateTypeScript,
			language:         irminmodels.TemplateLanguageGo,
			wantTitle:        "Test Script",
			wantDesc:         "A test script",
			wantTags:         2,
			wantPlaceholders: 1,
			wantContent: `package main

func main() {
    // Use {{repo_slug}}
}`,
		},
		{
			name:             "Template without metadata",
			content:          `SELECT * FROM users;`,
			templateType:     irminmodels.TemplateTypeQuery,
			language:         irminmodels.TemplateLanguageSQL,
			wantTitle:        "Untitled Template",
			wantDesc:         "",
			wantTags:         0,
			wantPlaceholders: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := templatefiles.ParseTemplateForTest(tt.content, tt.templateType, tt.language)
			verifyTemplateResult(t, result, tt)
		})
	}
}

func TestTemplateContentPreservation(t *testing.T) {
	templates, err := templatefiles.GetAllTemplates()
	if err != nil {
		t.Fatalf("Failed to load templates: %v", err)
	}

	for _, tmpl := range templates {
		// Verify content contains placeholders mentioned in metadata
		for _, placeholder := range tmpl.Placeholders {
			expected := "{{" + placeholder.Name + "}}"
			if !strings.Contains(tmpl.Content, expected) {
				t.Errorf("Template %s claims placeholder %s but content doesn't contain %s",
					tmpl.Title, placeholder.Name, expected)
			}

			// Verify placeholder has an example
			if placeholder.Example == "" {
				t.Errorf("Template %s has placeholder %s without an example value",
					tmpl.Title, placeholder.Name)
			}
		}
	}
}
