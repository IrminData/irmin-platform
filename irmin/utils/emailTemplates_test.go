package utils_test

import (
	"irmin-api/utils"
	"testing"
)

func TestEmailTemplateManager(t *testing.T) {
	// Create template manager
	templateManager := utils.NewEmailTemplateManager("")

	// Test loading a template
	template, err := templateManager.LoadTemplate("workspace-invitation")
	if err != nil {
		t.Fatalf("Failed to load template: %v", err)
	}

	if template == nil {
		t.Fatal("Template is nil")
	}

	if template.Name != "workspace-invitation" {
		t.Errorf("Expected template name 'workspace-invitation', got '%s'", template.Name)
	}

	// Test template data
	testData := utils.EmailTemplateData{
		WorkspaceName:       "Test Workspace",
		InvitedByName:       "John Doe",
		InvitedByEmail:      "john@example.com",
		RoleName:            "Admin",
		InviteAcceptanceURL: "https://example.com/invite/12345",
		InviteExpiresAt:     "January 1, 2025",
	}

	// Test HTML rendering
	htmlContent, err := template.RenderHTML(testData)
	if err != nil {
		t.Fatalf("Failed to render HTML template: %v", err)
	}

	if htmlContent == "" {
		t.Error("HTML content is empty")
	}

	// Check if template variables were replaced
	expectedStrings := []string{
		"Test Workspace",
		"John Doe",
		"john@example.com",
		"Admin",
		"https://example.com/invite/12345",
		"January 1, 2025",
	}

	for _, expected := range expectedStrings {
		if !contains(htmlContent, expected) {
			t.Errorf("HTML content does not contain expected string: %s", expected)
		}
	}

	// Test text rendering
	textContent, err := template.RenderText(testData)
	if err != nil {
		t.Fatalf("Failed to render text template: %v", err)
	}

	if textContent == "" {
		t.Error("Text content is empty")
	}

	// Check if template variables were replaced in text version
	for _, expected := range expectedStrings {
		if !contains(textContent, expected) {
			t.Errorf("Text content does not contain expected string: %s", expected)
		}
	}
}

func TestGetAvailableTemplates(t *testing.T) {
	templateManager := utils.NewEmailTemplateManager("")

	templates, err := templateManager.GetAvailableTemplates()
	if err != nil {
		t.Fatalf("Failed to get available templates: %v", err)
	}

	if len(templates) == 0 {
		t.Error("No templates found")
	}

	// Check if workspace-invitation template is available
	found := false
	for _, template := range templates {
		if template == "workspace-invitation" {
			found = true
			break
		}
	}

	if !found {
		t.Error("workspace-invitation template not found in available templates")
	}
}

func TestPreloadAllTemplates(t *testing.T) {
	templateManager := utils.NewEmailTemplateManager("")

	err := templateManager.PreloadAllTemplates()
	if err != nil {
		t.Fatalf("Failed to preload templates: %v", err)
	}

	loadedTemplates := templateManager.GetLoadedTemplates()
	if len(loadedTemplates) == 0 {
		t.Error("No templates were loaded")
	}

	// Verify workspace-invitation template is loaded
	found := false
	for _, template := range loadedTemplates {
		if template == "workspace-invitation" {
			found = true
			break
		}
	}

	if !found {
		t.Error("workspace-invitation template not loaded")
	}
}

func TestClearCache(t *testing.T) {
	templateManager := utils.NewEmailTemplateManager("")

	// Load a template
	_, err := templateManager.LoadTemplate("workspace-invitation")
	if err != nil {
		t.Fatalf("Failed to load template: %v", err)
	}

	// Verify template is loaded
	loadedTemplates := templateManager.GetLoadedTemplates()
	if len(loadedTemplates) == 0 {
		t.Error("No templates loaded")
	}

	// Clear cache
	templateManager.ClearCache()

	// Verify cache is cleared
	loadedTemplates = templateManager.GetLoadedTemplates()
	if len(loadedTemplates) != 0 {
		t.Error("Cache was not cleared properly")
	}
}

// Helper function to check if a string contains a substring.
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
			containsAt(s, substr))))
}

func containsAt(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
