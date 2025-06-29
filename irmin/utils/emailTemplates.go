package utils

import (
	"bytes"
	"fmt"
	"os"
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

	// Construct template paths
	htmlPath := filepath.Join(etm.templatesPath, "email", "invitations", fmt.Sprintf("%s.html", templateName))
	textPath := filepath.Join(etm.templatesPath, "email", "invitations", fmt.Sprintf("%s.txt", templateName))

	// Load HTML template
	htmlContent, err := os.ReadFile(htmlPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read HTML template %s: %w", htmlPath, err)
	}

	htmlTemplate, err := template.New(fmt.Sprintf("%s.html", templateName)).Parse(string(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML template %s: %w", templateName, err)
	}

	// Load text template
	textContent, err := os.ReadFile(textPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read text template %s: %w", textPath, err)
	}

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

// GetAvailableTemplates returns a list of available email templates in the templates directory.
func (etm *EmailTemplateManager) GetAvailableTemplates() ([]string, error) {
	invitationTemplatesPath := filepath.Join(etm.templatesPath, "email", "invitations")

	files, err := os.ReadDir(invitationTemplatesPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read templates directory: %w", err)
	}

	var templates []string
	templateSet := make(map[string]bool)

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		name := file.Name()
		ext := filepath.Ext(name)

		if ext == ".html" || ext == ".txt" {
			templateName := name[:len(name)-len(ext)]
			if !templateSet[templateName] {
				templates = append(templates, templateName)
				templateSet[templateName] = true
			}
		}
	}

	return templates, nil
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
