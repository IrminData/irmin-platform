package utils

import (
	"bytes"
	"fmt"
	"irmin-api/templates"
	"path/filepath"
	"text/template"
)

// EmailTemplateData represents the data structure for email templates.
type EmailTemplateData struct {
	WorkspaceName       string
	InvitedByName       string
	InvitedByEmail      string
	RoleName            string
	InviteAcceptanceURL string
	InviteExpiresAt     string
}

// EmailTemplate represents a loaded email template with both HTML and text versions.
type EmailTemplate struct {
	HTMLTemplate *template.Template
	TextTemplate *template.Template
	Name         string
}

// EmailTemplateManager handles loading and rendering of email templates.
type EmailTemplateManager struct {
	templatesPath string
	templates     map[string]*EmailTemplate
}

// NewEmailTemplateManager creates a new email template manager.
func NewEmailTemplateManager(templatesPath string) *EmailTemplateManager {
	if templatesPath == "" {
		// Default to templates folder relative to project root
		projectRoot, err := FindProjectRoot()
		if err != nil {
			templatesPath = "templates"
		} else {
			templatesPath = filepath.Join(projectRoot, "templates")
		}
	}

	return &EmailTemplateManager{
		templatesPath: templatesPath,
		templates:     make(map[string]*EmailTemplate),
	}
}

// LoadTemplate loads an email template by name from the templates directory.
func (etm *EmailTemplateManager) LoadTemplate(templateName string) (*EmailTemplate, error) {
	// Check if template is already loaded
	if template, exists := etm.templates[templateName]; exists {
		return template, nil
	}

	var htmlContent, textContent []byte

	// Use embedded templates for workspace-invitation
	if templateName == "workspace-invitation" {
		htmlContent = templates.WorkspaceInvitationHTML
		textContent = templates.WorkspaceInvitationTXT
	} else {
		return nil, fmt.Errorf("template %s not found", templateName)
	}

	// Parse HTML template
	htmlTemplate, err := template.New(fmt.Sprintf("%s.html", templateName)).Parse(string(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML template %s: %w", templateName, err)
	}

	// Parse text template
	textTemplate, err := template.New(fmt.Sprintf("%s.txt", templateName)).Parse(string(textContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse text template %s: %w", templateName, err)
	}

	// Create and cache template
	emailTemplate := &EmailTemplate{
		HTMLTemplate: htmlTemplate,
		TextTemplate: textTemplate,
		Name:         templateName,
	}

	etm.templates[templateName] = emailTemplate
	return emailTemplate, nil
}

// RenderHTML renders the HTML version of the template with the provided data.
func (et *EmailTemplate) RenderHTML(data any) (string, error) {
	var buffer bytes.Buffer
	err := et.HTMLTemplate.Execute(&buffer, data)
	if err != nil {
		return "", fmt.Errorf("failed to render HTML template %s: %w", et.Name, err)
	}
	return buffer.String(), nil
}

// RenderText renders the text version of the template with the provided data.
func (et *EmailTemplate) RenderText(data any) (string, error) {
	var buffer bytes.Buffer
	err := et.TextTemplate.Execute(&buffer, data)
	if err != nil {
		return "", fmt.Errorf("failed to render text template %s: %w", et.Name, err)
	}
	return buffer.String(), nil
}

// GetAvailableTemplates returns a list of available email templates.
func (etm *EmailTemplateManager) GetAvailableTemplates() ([]string, error) {
	// Return the list of embedded templates
	return []string{"workspace-invitation"}, nil
}

// PreloadAllTemplates loads all available templates into memory for faster access.
func (etm *EmailTemplateManager) PreloadAllTemplates() error {
	templates, err := etm.GetAvailableTemplates()
	if err != nil {
		return fmt.Errorf("failed to get available templates: %w", err)
	}

	for _, templateName := range templates {
		_, loadErr := etm.LoadTemplate(templateName)
		if loadErr != nil {
			return fmt.Errorf("failed to preload template %s: %w", templateName, loadErr)
		}
	}

	return nil
}

// ClearCache clears the template cache, forcing templates to be reloaded on next access.
func (etm *EmailTemplateManager) ClearCache() {
	etm.templates = make(map[string]*EmailTemplate)
}

// GetLoadedTemplates returns the names of currently loaded templates.
func (etm *EmailTemplateManager) GetLoadedTemplates() []string {
	var names []string
	for name := range etm.templates {
		names = append(names, name)
	}
	return names
}
