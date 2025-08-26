package tools

import (
	"context"
	"fmt"
	"strings"

	"irmin-api/mcp/helpers"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type DocsCategory string

const (
	DocsCategoryIndex        DocsCategory = "index"
	DocsCategorySQL          DocsCategory = "sql"
	DocsCategoryScripting    DocsCategory = "scripting"
	DocsCategoryConcepts     DocsCategory = "concepts"
	DocsCategoryConnections  DocsCategory = "connections"
	DocsCategoryWorkflows    DocsCategory = "workflows"
	DocsCategoryObjectSchema DocsCategory = "object-schema"
)

// GetDocsInput defines the input parameters for the get_docs tool
type GetDocsInput struct {
	Category string `json:"category" jsonschema:"required,The category of documentation to retrieve. Can be one of: index, sql, scripting, concepts, connections, workflows, object-schema"`
}

// RegisterDocsTools registers the tools for documentation access.
func (mcpTools *MCPTools) RegisterDocsTools() {
	mcpTools.registerGetDocsTool()
	mcpTools.registerListDocsTool()
}

// registerGetDocsTool registers the get_docs tool for retrieving specific documentation
func (mcpTools *MCPTools) registerGetDocsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "get_docs",
			Description: "Retrieve specific documentation content. Use 'list_docs' to see available documentation categories.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args GetDocsInput) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			_, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the category from parameters
			category := DocsCategory(args.Category)
			if category == "" {
				return helpers.MCPError(
					"Category parameter is required. Use 'list_docs' to see available categories.",
				), struct{}{}, nil
			}

			// Validate the category parameter
			switch category {
			case DocsCategoryIndex:
				// Valid category
			case DocsCategorySQL:
				// Valid category
			case DocsCategoryScripting:
				// Valid category
			case DocsCategoryConcepts:
				// Valid category
			case DocsCategoryConnections:
				// Valid category
			case DocsCategoryWorkflows:
			// Valid category
			case DocsCategoryObjectSchema:
				// Valid category
			default:
				return helpers.MCPError(
					fmt.Sprintf(
						"Unknown documentation category: %s. Use 'list_docs' to see available categories.",
						category,
					),
				), struct{}{}, nil
			}

			// Return a text response with the resource URI information
			// The MCP client expects content with a type field, not ResourceLink objects
			resourceURI := fmt.Sprintf("irmin://docs/%s", category)
			message := fmt.Sprintf("Documentation for %s is available at: %s", category, resourceURI)

			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{
					Text: message,
					Meta: sdkmcp.Meta{
						"resource_uri": resourceURI,
						"mime_type":    "text/markdown",
						"category":     string(category),
					},
				}},
			}, struct{}{}, nil
		},
	)
}

// registerListDocsTool registers the list_docs tool for listing available documentation
func (mcpTools *MCPTools) registerListDocsTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "list_docs",
			Description: "List available documentation categories and their descriptions.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			_, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Define available documentation categories
			categories := []map[string]string{
				{
					"category":       "index",
					"name":           "Documentation Index",
					"description":    "Main documentation index with links to all categories",
					"uri":            "irmin://docs",
					"tool_parameter": "index",
				},
				{
					"category":       "sql",
					"name":           "Querying and SQL",
					"description":    "SQL queries, DuckDB, and syntax",
					"uri":            "irmin://docs/sql",
					"tool_parameter": "sql",
				},
				{
					"category":       "scripting",
					"name":           "Scripting",
					"description":    "Scripting, compute sandbox",
					"uri":            "irmin://docs/scripting",
					"tool_parameter": "scripting",
				},
				{
					"category":       "concepts",
					"name":           "Core Concepts",
					"description":    "Core concepts, workspaces, repositories, objects, data versioning, and more",
					"uri":            "irmin://docs/concepts",
					"tool_parameter": "concepts",
				},
				{
					"category":       "connections",
					"name":           "Data Connections",
					"description":    "Data source connections, connectors, and integrations",
					"uri":            "irmin://docs/connections",
					"tool_parameter": "connections",
				},
				{
					"category":       "workflows",
					"name":           "Workflow Orchestration",
					"description":    "Workflow orchestration, pipeline management, and scheduling",
					"uri":            "irmin://docs/workflows",
					"tool_parameter": "workflows",
				},
				{
					"category":       "object-schema",
					"name":           "Object Schema",
					"description":    "Object schema, including connection and repository object schemas",
					"uri":            "irmin://docs/object-schema",
					"tool_parameter": "object-schema",
				},
			}

			// Build a formatted text response listing all documentation categories
			var responseText strings.Builder
			responseText.WriteString("Available Documentation Categories:\n\n")

			// Add the main docs index
			responseText.WriteString("• Documentation Index (irmin://docs)\n")
			responseText.WriteString("  Main documentation index with links to all categories\n\n")

			// Add each category
			for _, cat := range categories {
				responseText.WriteString(fmt.Sprintf("• %s (%s)\n", cat["name"], cat["uri"]))
				responseText.WriteString(fmt.Sprintf("  %s\n", cat["description"]))
				responseText.WriteString(fmt.Sprintf("  Use parameter: %s\n\n", cat["tool_parameter"]))
			}

			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{&sdkmcp.TextContent{
					Text: responseText.String(),
					Meta: sdkmcp.Meta{
						"mime_type":  "text/plain",
						"categories": categories,
					},
				}},
			}, struct{}{}, nil
		},
	)
}
