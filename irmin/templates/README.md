# Email Templates

This directory contains email templates used throughout the Irmin application. The templates are embedded directly into the Go binary using `go:embed` for better performance and deployment simplicity.

## Directory Structure

```
templates/
├── email/
│   └── invitations/
│       ├── workspace-invitation.html
│       └── workspace-invitation.txt
├── embedded.go
└── README.md
```

## Template Categories

### Email Templates (`email/`)

#### Invitations (`email/invitations/`)
- **workspace-invitation**: Template for workspace invitation emails sent when users are invited to join a workspace

## Template Embedding

Templates are embedded at compile time using Go's `embed` package:

```go
//go:embed email/invitations/workspace-invitation.html
var WorkspaceInvitationHTML []byte

//go:embed email/invitations/workspace-invitation.txt
var WorkspaceInvitationTXT []byte
```

This approach provides several benefits:
- **No runtime file dependencies** - Templates are part of the binary
- **Faster startup** - No file I/O operations needed
- **Simpler deployment** - Single binary contains everything
- **No "file not found" errors** - Templates guaranteed to exist

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

// Load a specific template (now uses embedded data)
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
// Get list of available templates (returns embedded template names)
templates, err := templateManager.GetAvailableTemplates()

// Templates are automatically available at startup
// No preloading needed since they're embedded

// Clear template cache (for development/testing)
templateManager.ClearCache()

// Get currently loaded templates
loaded := templateManager.GetLoadedTemplates()
```

## Adding New Templates

To add a new email template:

1. Create both `.html` and `.txt` files in the appropriate category folder
2. Add corresponding `//go:embed` directives in `embedded.go`
3. Update the template loading logic in `utils/emailTemplates.go` to handle the new template
4. Use Go template syntax for variables (e.g., `{{.VariableName}}`)
5. Ensure both versions contain the same information for consistency
6. Test the template using the provided test utilities

### Example: Adding a new template

1. Create files:
   - `email/notifications/password-reset.html`
   - `email/notifications/password-reset.txt`

2. Add to `embedded.go`:
   ```go
   //go:embed email/notifications/password-reset.html
   var PasswordResetHTML []byte
   
   //go:embed email/notifications/password-reset.txt
   var PasswordResetTXT []byte
   ```

3. Update template loading logic in `utils/emailTemplates.go`:
   ```go
   switch templateName {
   case "workspace-invitation":
       htmlContent = templates.WorkspaceInvitationHTML
       textContent = templates.WorkspaceInvitationTXT
   case "password-reset":
       htmlContent = templates.PasswordResetHTML
       textContent = templates.PasswordResetTXT
   default:
       return nil, fmt.Errorf("template %s not found", templateName)
   }
   ```

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

- Templates are embedded at compile time and cannot be modified at runtime
- Template data should be properly sanitized before rendering
- Avoid including sensitive information in template files
- All templates are part of the binary and cannot be externally modified

## Performance Considerations

- **Compile-time embedding**: Templates are loaded once during compilation
- **Zero runtime I/O**: No file system operations needed
- **Instant availability**: Templates ready immediately at startup
- **Memory efficient**: Templates loaded only when first accessed
- **No cache warming needed**: Templates available instantly

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

1. **Template not found**: Verify the template is added to `embedded.go` and template loading logic
2. **Rendering errors**: Check template syntax and variable names
3. **Missing variables**: Ensure all template variables are provided in the data struct
4. **Build errors**: Verify `//go:embed` paths are correct relative to `embedded.go`

### Debug Information

Enable debug logging to see template loading and rendering details:

```go
logger.Debug("Loading embedded template", "name", templateName)
logger.Debug("Template rendered", "size", len(content))
```