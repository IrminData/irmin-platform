package templates

import (
	"bytes"
	"fmt"
	"text/template"
)

// ConnectorDetailsData represents the data structure for connector detail templates.
type ConnectorDetailsData struct {
	Title                     string
	Description               string
	LogoPath                  string
	LogoAlt                   string
	EventListeningDescription string
	DocsPath                  string
}

// ConnectorTemplate represents a loaded template.
type ConnectorTemplate struct {
	Template *template.Template
	Name     string
}

// ConnectorTemplateManager handles loading and rendering of connector templates.
type ConnectorTemplateManager struct {
	templates map[string]*ConnectorTemplate
}

// NewConnectorTemplateManager creates a new connector template manager.
func NewConnectorTemplateManager() *ConnectorTemplateManager {
	return &ConnectorTemplateManager{
		templates: make(map[string]*ConnectorTemplate),
	}
}

// LoadTemplate loads a connector template by name.
func (ctm *ConnectorTemplateManager) LoadTemplate(templateName string) (*ConnectorTemplate, error) {
	// Check if template is already loaded
	if template, exists := ctm.templates[templateName]; exists {
		return template, nil
	}

	var htmlContent []byte

	// Use embedded templates
	switch templateName {
	case "http":
		htmlContent = HTTPDetailsHTML
	case "mysql":
		htmlContent = MySQLDetailsHTML
	case "postgres":
		htmlContent = PostgresDetailsHTML
	case "sftp":
		htmlContent = SFTPDetailsHTML
	default:
		return nil, fmt.Errorf("template %s not found", templateName)
	}

	// Parse HTML template
	tmpl, err := template.New(fmt.Sprintf("%s.html", templateName)).Parse(string(htmlContent))
	if err != nil {
		return nil, fmt.Errorf("failed to parse template %s: %w", templateName, err)
	}

	// Create and cache template
	connectorTemplate := &ConnectorTemplate{
		Template: tmpl,
		Name:     templateName,
	}

	ctm.templates[templateName] = connectorTemplate
	return connectorTemplate, nil
}

// RenderHTML renders the template with the provided data.
func (ct *ConnectorTemplate) RenderHTML(data ConnectorDetailsData) (string, error) {
	var buffer bytes.Buffer
	err := ct.Template.Execute(&buffer, data)
	if err != nil {
		return "", fmt.Errorf("failed to render template %s: %w", ct.Name, err)
	}
	return buffer.String(), nil
}

// GetAvailableTemplates returns a list of available connector templates.
func (ctm *ConnectorTemplateManager) GetAvailableTemplates() []string {
	return []string{"http", "mysql", "postgres", "sftp"}
}

// ClearCache clears the template cache.
func (ctm *ConnectorTemplateManager) ClearCache() {
	ctm.templates = make(map[string]*ConnectorTemplate)
}
