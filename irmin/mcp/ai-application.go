package mcp

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"

	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	// AIAppMCPServerName is the name of the AI Application MCP server
	AIAppMCPServerName = "irmin-ai-app-mcp"
	// AIAppMCPServerTitle is the title of the AI Application MCP server
	AIAppMCPServerTitle = "Irmin AI Application MCP"
	// AIAppMCPServerVersion is the version of the AI Application MCP server
	AIAppMCPServerVersion = "1.0.0"
)

// RegisterAIAppMCP mounts the AI Application MCP endpoint.
// This endpoint is authenticated by AI Application API keys instead of user tokens.
func RegisterAIAppMCP(app *fiber.App, apiServices *services.APIServices) {
	cfg := &authConfig{apiServices: apiServices}

	// Mount at /api/v1/ai-app/mcp
	path := "/api/v1/ai-app/mcp"

	// Create a dynamic handler that creates a server per-request based on the AI Application config
	dynamicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create a timeout context for the entire request
		ctx, cancel := context.WithTimeout(r.Context(), MCPAttachTimeout)
		defer cancel()

		// Authenticate and get AI Application
		authHeader := r.Header.Get("Authorization")
		_, aiApp, err := validateAuthAndGetUserOrAIApp(cfg, authHeader)
		if err != nil || aiApp == nil {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Unauthorized - valid AI Application API key required"))
			return
		}

		// Create a new MCP server for this AI Application
		server := sdkmcp.NewServer(&sdkmcp.Implementation{
			Name:    AIAppMCPServerName,
			Title:   AIAppMCPServerTitle,
			Version: AIAppMCPServerVersion,
		}, nil)

		// Register tools based on AI Application config
		registerAIAppTools(server, aiApp, apiServices)

		// Create the streamable HTTP handler
		handler := sdkmcp.NewStreamableHTTPHandler(func(*http.Request) *sdkmcp.Server { return server }, nil)

		// Add AI Application to context
		aiAppCtx := withAIAppInContext(ctx, aiApp)

		apiServices.Logger.Debug("AI App MCP request",
			"path", r.URL.Path,
			"method", r.Method,
			"ai_app_id", aiApp.ID,
			"ai_app_name", aiApp.Name)

		handler.ServeHTTP(w, r.WithContext(aiAppCtx))
	})

	// Mount both the main path and the attach endpoint
	app.All(path, adaptor.HTTPHandler(dynamicHandler))
	app.Get(path+"/attach", adaptor.HTTPHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Rewrite path for attach endpoint
		r.URL.Path = path
		r.URL.RawPath = ""
		if r.Header.Get("Accept") == "" {
			r.Header.Set("Accept", "text/event-stream")
		}
		dynamicHandler.ServeHTTP(w, r)
	})))
}

// registerAIAppTools registers MCP tools based on the AI Application's tool configuration.
func registerAIAppTools(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	config := aiApp.ParseToolConfig()

	if config.QueryEnabled {
		registerAIAppQueryTool(server, aiApp, apiServices)
	}
	if config.SchemaEnabled {
		registerAIAppSchemaTool(server, aiApp, apiServices)
	}
	if config.ListObjectsEnabled {
		registerAIAppListObjectsTool(server, aiApp, apiServices)
	}
	if config.GetContentEnabled {
		registerAIAppGetContentTool(server, aiApp, apiServices)
	}
	if config.VectorSearchEnabled {
		registerAIAppEmbeddingSearchTool(server, aiApp, apiServices)
	}
	if config.DocsEnabled {
		registerAIAppDocsTool(server, aiApp, apiServices)
	}

	// Always register the info tool
	registerAIAppInfoTool(server, aiApp, apiServices)
}

// Tool argument structs - Simplified with unified paths

type aiAppQueryArgs struct {
	SQL string `json:"sql" jsonschema:"required,The SQL query to execute"`
}

type aiAppSchemaArgs struct {
	Path string `json:"path" jsonschema:"required,Unified path to the object (e.g. /repo-slug/data/file.json)"`
}

type aiAppListObjectsArgs struct {
	Path string `json:"path" jsonschema:"optional,Unified path (e.g. /repo-slug/folder). If empty lists all data sources."`
}

type aiAppGetContentArgs struct {
	Path string `json:"path" jsonschema:"required,Unified path to the object (e.g. /repo-slug/data/file.json)"`
}

type aiAppEmbeddingSearchArgs struct {
	Query  string            `json:"query"  jsonschema:"required,The search query"`
	Path   string            `json:"path"   jsonschema:"optional,Unified path to specific embedding file. If empty searches all embeddings."`
	TopK   int               `json:"top_k"  jsonschema:"optional,Number of results to return (default 10)"`
	Filter map[string]string `json:"filter" jsonschema:"optional,Metadata filter for search results"`
}

// registerAIAppInfoTool registers a tool to get info about the AI Application.
func registerAIAppInfoTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_ai_app_info",
			Description: "Get information about this AI Application, including enabled tools and available data sources.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args struct{}) (*sdkmcp.CallToolResult, struct{}, error) {
			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			config := executor.GetToolConfig()

			// Use unified data sources format
			dataSources := executor.ListDataSourcesUnified()

			info := map[string]any{
				"name":         aiApp.Name,
				"description":  aiApp.Description,
				"workspace":    aiApp.Workspace.Slug,
				"tools":        config,
				"data_sources": dataSources,
			}

			jsonData, _ := json.MarshalIndent(info, "", "  ")
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}, struct{}{}, nil
		},
	)
}

// registerAIAppQueryTool registers the SQL query tool.
func registerAIAppQueryTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_execute_sql",
			Description: "Execute a SQL query on the workspace data. Query any repository object as a table using path-based syntax (e.g., SELECT * FROM 'repo/branch/path/file.json'). Returns query results as JSON.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppQueryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			result, err := executor.ExecuteSQL(ctx, args.SQL, true)
			if err != nil {
				return mcpError(err.Error()), struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(result, "", "  ")
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}, struct{}{}, nil
		},
	)
}

// registerAIAppSchemaTool registers the object schema tool.
func registerAIAppSchemaTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_get_object_schema",
			Description: "Get the data schema for a data object, showing column names, data types, and descriptions. Essential for writing SQL queries. Use unified path format: /repo-slug/path/to/file.json",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppSchemaArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			schema, err := executor.GetSchemaByPath(ctx, args.Path)
			if err != nil {
				return mcpError(err.Error()), struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(schema, "", "  ")
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}, struct{}{}, nil
		},
	)
}

// registerAIAppListObjectsTool registers the list objects tool.
func registerAIAppListObjectsTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_list_objects",
			Description: "List data objects (files and folders) at a path. Use unified path format: /repo-slug/folder. If path is empty, lists all available data sources.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppListObjectsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			object, err := executor.ListObjectsByPath(ctx, args.Path)
			if err != nil {
				return mcpError(err.Error()), struct{}{}, nil
			}

			// Format the object
			formatted, formatErr := formatter.FormatRepositoryObjectResponse(object, apiServices.SQIDManager)
			if formatErr != nil {
				//nolint:nilerr // Error is communicated via mcpError result with IsError: true
				return mcpError("Failed to format response"), struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(formatted, "", "  ")
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}, struct{}{}, nil
		},
	)
}

// registerAIAppGetContentTool registers the get content tool.
func registerAIAppGetContentTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_get_object_content",
			Description: "Get the content of a data object. Use unified path format: /repo-slug/path/to/file.json. Supports JSON, CSV, YAML, XML, and text files.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppGetContentArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			content, err := executor.GetContentByPath(ctx, args.Path, true)
			if err != nil {
				return mcpError(err.Error()), struct{}{}, nil
			}

			// Detect content type
			mimeType := http.DetectContentType(content)

			// Only return text content
			if !strings.HasPrefix(mimeType, "text/") && !strings.HasPrefix(mimeType, "application/json") {
				return mcpError("Content is not a supported text format"), struct{}{}, nil
			}

			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{
						Text: string(content),
						Meta: sdkmcp.Meta{
							"mimeType": mimeType,
							"path":     args.Path,
						},
					},
				},
			}, struct{}{}, nil
		},
	)
}

// registerAIAppEmbeddingSearchTool registers the embedding search tool.
func registerAIAppEmbeddingSearchTool(
	server *sdkmcp.Server,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_search_embeddings",
			Description: "Search for semantically similar content using natural language queries. If path is empty, searches all available embedding files. Use unified path format to filter: /repo-slug/embeddings/file.parquet",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppEmbeddingSearchArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			topK := args.TopK
			if topK <= 0 {
				topK = 10
			}

			results, err := executor.SearchEmbeddingsByPath(
				ctx,
				args.Query,
				topK,
				args.Path,
				args.Filter,
			)
			if err != nil {
				return mcpError(err.Error()), struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(results, "", "  ")
			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}, struct{}{}, nil
		},
	)
}

// registerAIAppDocsTool registers the documentation tool.
func registerAIAppDocsTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_get_documentation",
			Description: "Get documentation for this AI Application, including SQL syntax guide, tool usage instructions, and any custom documentation provided by the workspace administrator.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args struct{}) (*sdkmcp.CallToolResult, struct{}, error) {
			// Generate the system prompt which contains comprehensive documentation
			systemPrompt := apiServices.GenerateAIApplicationSystemPrompt(aiApp)

			// If there's custom documentation, append it
			var fullDocs string
			if aiApp.Documentation != "" {
				fullDocs = systemPrompt + "\n\n---\n\n## Custom Documentation\n\n" + aiApp.Documentation
			} else {
				fullDocs = systemPrompt
			}

			return &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: fullDocs},
				},
			}, struct{}{}, nil
		},
	)
}

// mcpError creates an MCP error result.
func mcpError(message string) *sdkmcp.CallToolResult {
	return &sdkmcp.CallToolResult{
		Content: []sdkmcp.Content{
			&sdkmcp.TextContent{Text: "Error: " + message},
		},
		IsError: true,
	}
}
