package templatefiles

import (
	"embed"
	"fmt"
	"path/filepath"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

//go:embed queries/*.sql
var queriesFS embed.FS

//go:embed scripts/*.go
var scriptsFS embed.FS

// TemplateDefinition represents a parsed template with its metadata.
type TemplateDefinition struct {
	Title        string
	Description  string
	Content      string
	Type         irminmodels.TemplateType
	Language     irminmodels.TemplateLanguage
	Tags         []string
	Placeholders []irminmodels.TemplatePlaceholder
}

// GetAllTemplates returns all embedded templates with parsed metadata.
func GetAllTemplates() ([]TemplateDefinition, error) {
	var templates []TemplateDefinition

	// Load query templates
	queryEntries, err := queriesFS.ReadDir("queries")
	if err != nil {
		return nil, fmt.Errorf("failed to read queries directory: %w", err)
	}

	for _, entry := range queryEntries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".sql" {
			continue
		}

		content, readErr := queriesFS.ReadFile("queries/" + entry.Name())
		if readErr != nil {
			return nil, fmt.Errorf("failed to read query template %s: %w", entry.Name(), readErr)
		}

		template := parseTemplate(string(content), irminmodels.TemplateTypeQuery, irminmodels.TemplateLanguageSQL)
		templates = append(templates, template)
	}

	// Load script templates
	scriptEntries, err := scriptsFS.ReadDir("scripts")
	if err != nil {
		return nil, fmt.Errorf("failed to read scripts directory: %w", err)
	}

	for _, entry := range scriptEntries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".go" {
			continue
		}

		content, readErr := scriptsFS.ReadFile("scripts/" + entry.Name())
		if readErr != nil {
			return nil, fmt.Errorf("failed to read script template %s: %w", entry.Name(), readErr)
		}

		template := parseTemplate(string(content), irminmodels.TemplateTypeScript, irminmodels.TemplateLanguageGo)
		templates = append(templates, template)
	}

	return templates, nil
}

const (
	metadataSeparator = ":"
	placeholderParts  = 2
)

// parsePlaceholders parses placeholder metadata in the format "name1:example1, name2:example2".
func parsePlaceholders(value string) []irminmodels.TemplatePlaceholder {
	if value == "" {
		return []irminmodels.TemplatePlaceholder{}
	}

	var placeholders []irminmodels.TemplatePlaceholder
	items := strings.Split(value, ",")

	for _, item := range items {
		parts := strings.SplitN(strings.TrimSpace(item), metadataSeparator, placeholderParts)
		if len(parts) == placeholderParts {
			placeholders = append(placeholders, irminmodels.TemplatePlaceholder{
				Name:    strings.TrimSpace(parts[0]),
				Example: strings.TrimSpace(parts[1]),
			})
		} else if len(parts) == 1 && strings.TrimSpace(parts[0]) != "" {
			// Support old format without examples
			name := strings.TrimSpace(parts[0])
			placeholders = append(placeholders, irminmodels.TemplatePlaceholder{
				Name:    name,
				Example: name,
			})
		}
	}

	return placeholders
}

// parseTags parses comma-separated tags.
func parseTags(value string) []string {
	if value == "" {
		return []string{}
	}

	var tags []string
	items := strings.Split(value, ",")
	for _, tag := range items {
		tags = append(tags, strings.TrimSpace(tag))
	}
	return tags
}

// shouldSkipLine determines if a line should be skipped during metadata parsing.
func shouldSkipLine(line string, foundMetadata bool) bool {
	// Skip build constraints
	if strings.HasPrefix(line, "//go:build") || strings.HasPrefix(line, "//+build") {
		return true
	}

	// Skip blank lines before we find metadata
	if line == "" && !foundMetadata {
		return true
	}

	return false
}

// parseMetadataLine extracts key-value pairs from a metadata line.
func parseMetadataLine(line, commentPrefix string) (string, string, bool) {
	metadataLine := strings.TrimSpace(strings.TrimPrefix(line, commentPrefix))
	if metadataLine == "" || !strings.Contains(metadataLine, metadataSeparator) {
		return "", "", false
	}

	parts := strings.SplitN(metadataLine, metadataSeparator, placeholderParts)
	return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]), true
}

// parseTemplate extracts metadata from comments at the top of a template file.
// For SQL files, comments start with "--"
// For Go files, comments start with "//"
// Metadata format:
// Title: Template Name
// Description: Template description
// Tags: tag1, tag2, tag3
// Placeholders: name1:example1, name2:example2
//
//nolint:gocognit // This function is complex but it's ok for now.
func parseTemplate(
	content string,
	templateType irminmodels.TemplateType,
	language irminmodels.TemplateLanguage,
) TemplateDefinition {
	lines := strings.Split(content, "\n")

	commentPrefix := "--"
	if language != irminmodels.TemplateLanguageSQL {
		commentPrefix = "//"
	}

	template := TemplateDefinition{
		Type:         templateType,
		Language:     language,
		Content:      content,
		Tags:         []string{},
		Placeholders: []irminmodels.TemplatePlaceholder{},
	}

	foundMetadata := false
	contentStartIndex := 0

	for i, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if shouldSkipLine(trimmedLine, foundMetadata) {
			continue
		}

		// Stop at first non-comment line
		if !strings.HasPrefix(trimmedLine, commentPrefix) {
			if foundMetadata || trimmedLine != "" {
				contentStartIndex = i
				break
			}
			continue
		}

		key, value, ok := parseMetadataLine(trimmedLine, commentPrefix)
		if !ok {
			continue
		}

		foundMetadata = true

		switch key {
		case "Title":
			template.Title = value
		case "Description":
			template.Description = value
		case "Tags":
			template.Tags = parseTags(value)
		case "Placeholders":
			template.Placeholders = parsePlaceholders(value)
		}
	}

	if template.Title == "" {
		template.Title = "Untitled Template"
	}

	// Strip metadata and build constraints from content
	if contentStartIndex > 0 {
		// Skip any blank lines after metadata
		for contentStartIndex < len(lines) && strings.TrimSpace(lines[contentStartIndex]) == "" {
			contentStartIndex++
		}
		if contentStartIndex < len(lines) {
			cleanLines := lines[contentStartIndex:]
			template.Content = strings.Join(cleanLines, "\n")
		}
	}

	return template
}

// ParseTemplateForTest is a test-only export of parseTemplate.
func ParseTemplateForTest(
	content string,
	templateType irminmodels.TemplateType,
	language irminmodels.TemplateLanguage,
) TemplateDefinition {
	return parseTemplate(content, templateType, language)
}
