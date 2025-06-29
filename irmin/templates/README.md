# Email Templates

This directory contains email templates used throughout the Irmin application. The templates are organized by category and provide both HTML and text versions for better email client compatibility.

## Directory Structure

```
templates/
├── email/
│   └── invitations/
│       ├── workspace-invitation.html
│       └── workspace-invitation.txt
└── README.md
```

## Template Categories

### Email Templates (`email/`)

#### Invitations (`email/invitations/`)
- **workspace-invitation**: Template for workspace invitation emails sent when users are invited to join a workspace

## Template Format

Each email template should have both HTML and text versions:
- `.html` - Rich HTML version with styling for modern email clients
- `.txt` - Plain text version for compatibility and accessibility

### Template Variables

All email templates use Go's `text/template` syntax. The following variables are available for invitation templates:

- `{{.WorkspaceName}}` - Name of the workspace being invited to
- `{{.InvitedByName}}` - Full name of the person sending the invitation
- `{{.InvitedByEmail}}` - Email address of the person sending the invitation
- `{{.RoleName}}` - Role being assigned to the invited user
- `{{.InviteAcceptanceURL}}` - URL for accepting the invitation
- `{{.InviteExpiresAt}}` - Formatted expiration date of the invitation

## Usage in Code

### Loading Templates

```go
// Initialize template manager
templateManager := utils.NewEmailTemplateManager("")

// Load a specific template
template, err := templateManager.LoadTemplate("workspace-invitation")
if err != nil {
    // Handle error
}

// Prepare template data
data := utils.EmailTemplateData{
    WorkspaceName:       "My Workspace",
    InvitedByName:       "John Doe",
    InvitedByEmail:      "john@example.com",
    RoleName:            "Admin",
    InviteAcceptanceURL: "https://app.irmin.co/invite/abc123",
    InviteExpiresAt:     "January 15, 2025",
}

// Render HTML version
htmlContent, err := template.RenderHTML(data)

// Render text version
textContent, err := template.RenderText(data)
```

### Template Management

```go
// Get list of available templates
templates, err := templateManager.GetAvailableTemplates()

// Preload all templates for better performance
err := templateManager.PreloadAllTemplates()

// Clear template cache (useful for development)
templateManager.ClearCache()

// Get currently loaded templates
loaded := templateManager.GetLoadedTemplates()
```

## Adding New Templates

To add a new email template:

1. Create both `.html` and `.txt` files in the appropriate category folder
2. Use Go template syntax for variables (e.g., `{{.VariableName}}`)
3. Ensure both versions contain the same information for consistency
4. Test the template using the provided test utilities

### HTML Template Guidelines

- Use inline CSS for better email client compatibility
- Include a mobile-responsive design
- Use semantic HTML structure
- Include alt text for images
- Test across different email clients

### Text Template Guidelines

- Keep formatting simple and readable
- Use ASCII characters for visual elements (e.g., `---` for dividers)
- Ensure all important links are included
- Maintain proper line length (typically 70-80 characters)

## Testing Templates

Run the template tests to verify functionality:

```bash
go test ./utils/ -v -run TestEmailTemplate
```

## Template Security

- Templates are loaded from the filesystem at runtime
- Template data should be properly sanitized before rendering
- Avoid including sensitive information in template files
- Use environment-specific template directories when needed

## Performance Considerations

- Templates are cached after first load for better performance
- Use `PreloadAllTemplates()` during application startup for production
- Clear cache during development to see template changes immediately
- Consider template compilation for high-volume email sending

## Examples

### Workspace Invitation Email
Located at: `email/invitations/workspace-invitation.html`

Features:
- Professional design with gradient header
- Clear call-to-action button
- Alternative text link for accessibility
- Expiration notice
- Mobile-responsive layout
- Branded footer

The text version provides the same information in a clean, readable format for text-only email clients.

## Troubleshooting

### Common Issues

1. **Template not found**: Verify the template files exist and have correct naming
2. **Rendering errors**: Check template syntax and variable names
3. **Missing variables**: Ensure all template variables are provided in the data struct
4. **File permissions**: Verify the application has read access to template files

### Debug Information

Enable debug logging to see template loading and rendering details:

```go
logger.Debug("Loading template", "name", templateName)
logger.Debug("Template rendered", "size", len(content))
```