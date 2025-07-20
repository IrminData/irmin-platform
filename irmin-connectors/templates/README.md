# Connector Templates

HTML templates for connector detail pages, embedded into the Go binary using `go:embed` for better performance and deployment simplicity.

## Directory Structure

```
templates/
├── connector-details/
│   ├── mysql.html
│   ├── postgres.html
│   └── sftp.html
├── embedded.go
└── templates.go
```

## Template System

Templates are embedded at compile time:

```go
//go:embed connector-details/mysql.html
var MySQLDetailsHTML []byte
```

Benefits:
- No runtime file dependencies
- Single binary deployment
- Guaranteed template availability

## Usage

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

## Template Variables

All templates use the `ConnectorDetailsData` structure:

- `{{.Title}}` - Page title
- `{{.Description}}` - Connector description
- `{{.LogoPath}}` - Logo image path
- `{{.LogoAlt}}` - Logo alt text
- `{{.EventListeningDescription}}` - Event capabilities
- `{{.DocsPath}}` - Documentation link

## Adding New Connector Templates

1. **Create template file**: `connector-details/your-connector.html`
2. **Add to embedded.go**: 
   ```go
   //go:embed connector-details/your-connector.html
   var YourConnectorDetailsHTML []byte
   ```
3. **Update templates.go**: Add case to `LoadTemplate()` switch statement
4. **Use in controller**: Load template with `templateManager.LoadTemplate("your-connector")`

## Template Guidelines

- Use inline CSS for compatibility
- Include responsive design
- Follow semantic HTML structure
- Keep content clear and concise
- Maintain consistent terminology

## Template Structure

Each template should include:
1. Header with title and logo
2. Connector description
3. Connection setup information
4. Available operations
5. Special features
6. Documentation link
