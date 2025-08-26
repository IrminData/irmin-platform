package resources

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"path/filepath"
	"strings"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed docs
var docsFS embed.FS

// RegisterDocs registers the docs resource for serving static documentation.
//
//nolint:gocognit // This is a simple static resource, nothing complex here
func (mcpResources *MCPResources) RegisterDocs() {
	// Register the main docs resource
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs",
		Description: "Static documentation resources for Irmin",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		// Return the main README.md content
		content, err := docsFS.ReadFile("docs/README.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read main docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register SQL/Querying documentation
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-sql",
		Description: "SQL and querying documentation for Irmin",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/sql",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		content, err := docsFS.ReadFile("docs/sql.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read SQL docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs/sql", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register Scripting documentation
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-scripting",
		Description: "Scripting and automation documentation for Irmin",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/scripting",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		content, err := docsFS.ReadFile("docs/scripting.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read scripting docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs/scripting", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register Concepts documentation
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-concepts",
		Description: "Core concepts and architecture documentation for Irmin",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/concepts",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		content, err := docsFS.ReadFile("docs/concepts.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read concepts docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs/concepts", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register Connections documentation
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-connections",
		Description: "Data source connections and connector documentation for Irmin",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/connections",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		content, err := docsFS.ReadFile("docs/connections.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read connections docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs/connections", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register Workflows documentation
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-workflows",
		Description: "Workflow orchestration and pipeline management documentation for Irmin",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/workflows",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		content, err := docsFS.ReadFile("docs/workflows.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read workflows docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs/workflows", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register Object Schema documentation
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-object-schema",
		Description: "Object schema documentation for Irmin, including connection and repository object schemas",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/object-schema",
	}, func(_ context.Context, _ *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		content, err := docsFS.ReadFile("docs/object-schema.md")
		if err != nil {
			return nil, fmt.Errorf("failed to read object schema docs: %w", err)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: "irmin://docs/object-schema", MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})

	// Register dynamic documentation resource for serving any markdown file
	mcpResources.server.AddResource(&sdkmcp.Resource{
		Name:        "docs-file",
		Description: "Dynamic documentation file serving",
		MIMEType:    "text/markdown",
		URI:         "irmin://docs/file/*",
	}, func(_ context.Context, req *sdkmcp.ReadResourceRequest) (*sdkmcp.ReadResourceResult, error) {
		if req.Params.URI == "" {
			return nil, errors.New("URI parameter is required")
		}

		// Extract file path from URI
		// URI format: irmin://docs/file/path/to/file.md
		filePath := strings.TrimPrefix(req.Params.URI, "irmin://docs/file/")
		if filePath == "" {
			return nil, errors.New("invalid file path")
		}

		// Ensure the path is within the docs directory
		if strings.Contains(filePath, "..") {
			return nil, errors.New("invalid file path")
		}

		// Try to read the file from embedded filesystem
		content, err := docsFS.ReadFile(filepath.Join("docs", filePath))
		if err != nil {
			return nil, fmt.Errorf("file not found: %s", filePath)
		}

		return &sdkmcp.ReadResourceResult{
			Contents: []*sdkmcp.ResourceContents{
				{URI: req.Params.URI, MIMEType: "text/markdown", Text: string(content)},
			},
		}, nil
	})
}

// ListAvailableDocs returns a list of available documentation files
func ListAvailableDocs() ([]string, error) {
	var files []string

	err := fs.WalkDir(docsFS, "docs", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if !d.IsDir() && strings.HasSuffix(path, ".md") {
			// Remove "docs/" prefix and add to list
			relativePath := strings.TrimPrefix(path, "docs/")
			files = append(files, relativePath)
		}

		return nil
	})

	return files, err
}
