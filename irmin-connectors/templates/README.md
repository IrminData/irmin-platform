# Connector Templates

This directory contains templates used throughout the Irmin Connectors application. The templates are embedded directly into the Go binary using `go:embed` for better performance and deployment simplicity.

## Directory Structure

```
templates/
├── connector-details/
│   ├── mysql.html
│   ├── postgres.html
│   └── sftp.html
├── swagger/
│   └── swagger-ui.html
├── embedded.go
└── templates.go
```

## Template Categories

### Connector Detail Templates (`connector-details/`)

HTML templates for individual connector detail pages:
- **mysql.html**: MySQL connector details and setup information
- **postgres.html**: PostgreSQL connector details and setup information  
- **sftp.html**: SFTP connector details and setup information

### API Documentation Templates (`swagger/`)

#### Swagger UI (`swagger/`)
- **swagger-ui.html**: Template for the Swagger UI interface used to display Connector API documentation

## Template Embedding

Templates are embedded at compile time using Go's `embed` package:

```go
//go:embed connector-details/mysql.html
var MySQLDetailsHTML []byte

//go:embed connector-details/postgres.html
var PostgresDetailsHTML []byte

//go:embed connector-details/sftp.html
var SFTPDetailsHTML []byte

//go:embed swagger/swagger-ui.html
var SwaggerUIHTML []byte
```

This approach provides several benefits:
- **No runtime file dependencies** - Templates are part of the binary
- **Faster startup** - No file I/O operations needed
- **Simpler deployment** - Single binary contains everything
- **No "file not found" errors** - Templates guaranteed to exist

## Template Format

### Connector Detail Templates

Each connector detail template uses Go's `text/template` syntax and should include:
1. Header with title and logo
2. Connector description
3. Connection setup information
4. Available operations
5. Special features
6. Documentation link

### API Documentation Templates

The swagger UI template is a standalone HTML file that provides the Swagger UI interface:
- **swagger-ui.html** - Complete HTML page with embedded CSS and JavaScript for the Swagger UI

## Usage in Code

### Loading Connector Detail Templates

```go
// Initialize and load template
templateManager := templates.NewConnectorTemplateManager()
template, err := templateManager.LoadTemplate("mysql")

// Prepare data
data := templates.ConnectorDetailsData{
    Title:       "IRMIN MySQL Connector - Details",
    Description: "Connector description...",
    LogoPath:    "/public/mysql.png",
    LogoAlt:     "MySQL Logo",
    EventListeningDescription: "Event capabilities...",
    DocsPath:    "/mysql/docs",
}

// Render
htmlContent, err := template.RenderHTML(data)
```

### Loading Swagger UI Template

The Swagger UI template is typically served directly as a static HTML page for API documentation.

## Template Variables

### Connector Detail Templates

All connector detail templates use the `ConnectorDetailsData` structure:

- `{{.Title}}` - Page title
- `{{.Description}}` - Connector description
- `{{.LogoPath}}` - Logo image path
- `{{.LogoAlt}}` - Logo alt text
- `{{.EventListeningDescription}}` - Event capabilities
- `{{.DocsPath}}` - Documentation link

## Adding New Templates

### Adding New Connector Detail Templates

To add a new connector detail template:

1. **Create template file**: `connector-details/your-connector.html`
2. **Add to embedded.go**: 
   ```go
   //go:embed connector-details/your-connector.html
   var YourConnectorDetailsHTML []byte
   ```
3. **Update templates.go**: Add case to `LoadTemplate()` switch statement
4. **Use in controller**: Load template with `templateManager.LoadTemplate("your-connector")`

### Example: Adding a new connector template

1. Create file: `connector-details/mongodb.html`
2. Add to `embedded.go`:
   ```go
   //go:embed connector-details/mongodb.html
   var MongoDBDetailsHTML []byte
   ```
3. Update template loading logic in `templates.go`:
   ```go
   switch templateName {
   case "mysql":
       htmlContent = MySQLDetailsHTML
   case "postgres":
       htmlContent = PostgresDetailsHTML
   case "sftp":
       htmlContent = SFTPDetailsHTML
   case "mongodb":
       htmlContent = MongoDBDetailsHTML
   default:
       return nil, fmt.Errorf("template %s not found", templateName)
   }
   ```

## Template Guidelines

### Connector Detail Template Guidelines

- Use inline CSS for better compatibility
- Include responsive design for mobile/desktop
- Follow semantic HTML structure
- Keep content clear and concise
- Maintain consistent terminology across connectors
- Include proper alt text for images
- Ensure accessibility standards

### API Documentation Template Guidelines

- The Swagger UI template provides a complete interface for API documentation
- Uses external CDN resources for Swagger UI assets
- Includes custom styling for Irmin branding
- Supports full API exploration and testing capabilities

## Performance Considerations

- **Compile-time embedding**: Templates are loaded once during compilation
- **Zero runtime I/O**: No file system operations needed
- **Instant availability**: Templates ready immediately at startup
- **Memory efficient**: Templates loaded only when first accessed
- **No cache warming needed**: Templates available instantly

## Template Security

- Templates are embedded at compile time and cannot be modified at runtime
- Template data should be properly sanitized before rendering
- Avoid including sensitive information in template files
- All templates are part of the binary and cannot be externally modified

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
