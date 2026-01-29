package mcp

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// WriteAuditInfo contains write-specific audit information.
type WriteAuditInfo struct {
	Operation      string // "upload", "update", "patch", "commit"
	TargetPath     string // Unified path that was written to
	CommitID       string // Commit ID if changes were committed
	PendingWriteID *uint  // Link to pending write if approval required
}

// logToolCall creates an audit log entry for a tool call.
func logToolCall(
	ctx context.Context,
	apiServices *services.APIServices,
	aiApp *db.AIApplication,
	toolName string,
	toolType string,
	inputs any,
	startTime time.Time,
	result *sdkmcp.CallToolResult,
) {
	logToolCallWithWriteInfo(ctx, apiServices, aiApp, toolName, toolType, inputs, startTime, result, nil)
}

// logToolCallWithWriteInfo creates an audit log entry for a tool call with optional write audit info.
func logToolCallWithWriteInfo(
	ctx context.Context,
	apiServices *services.APIServices,
	aiApp *db.AIApplication,
	toolName string,
	toolType string,
	inputs any,
	startTime time.Time,
	result *sdkmcp.CallToolResult,
	writeInfo *WriteAuditInfo,
) {
	// Get request metadata from context
	metadata, _ := requestMetadataFromContext(ctx)
	if metadata == nil {
		metadata = &RequestMetadata{}
	}

	// Calculate duration
	durationMs := time.Since(startTime).Milliseconds()

	// Serialize inputs to JSON
	inputsJSON := "{}"
	if inputs != nil {
		if jsonBytes, err := json.Marshal(inputs); err == nil {
			inputsJSON = string(jsonBytes)
		}
	}

	// Determine success and error message
	success := result == nil || !result.IsError
	errorMsg := ""
	if result != nil && result.IsError && len(result.Content) > 0 {
		if textContent, ok := result.Content[0].(*sdkmcp.TextContent); ok {
			errorMsg = textContent.Text
		}
	}

	// Create the audit log entry
	log := &db.AIApplicationToolLog{
		AIApplicationID: aiApp.ID,
		ToolName:        toolName,
		ToolType:        toolType,
		InputsJSON:      inputsJSON,
		Protocol:        db.ToolLogProtocolMCP,
		RequestIP:       metadata.IP,
		UserAgent:       metadata.UserAgent,
		Origin:          metadata.Origin,
		ContentType:     metadata.ContentType,
		DurationMs:      durationMs,
		Success:         success,
		ErrorMsg:        errorMsg,
	}

	// Add write-specific audit fields if provided
	if writeInfo != nil {
		log.WriteOperation = writeInfo.Operation
		log.WriteTargetPath = writeInfo.TargetPath
		log.CommitID = writeInfo.CommitID
		log.PendingWriteID = writeInfo.PendingWriteID
	}

	// Create log entry asynchronously to not block the response
	go func() {
		if err := apiServices.DB.CreateAIApplicationToolLog(log); err != nil {
			apiServices.Logger.Error("Failed to create AI app tool audit log",
				"error", err,
				"tool_name", toolName,
				"ai_app_id", aiApp.ID)
		}
	}()
}

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

		// Add AI Application and request metadata to context
		aiAppCtx := withAIAppInContext(ctx, aiApp)
		reqMetadata := ExtractRequestMetadata(r)
		aiAppCtx = withRequestMetadataInContext(aiAppCtx, reqMetadata)

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

	// Register write tools if enabled
	if config.WriteEnabled && config.WriteConfig != nil {
		writeConfig := config.WriteConfig
		if writeConfig.FileUploadEnabled || writeConfig.FileUpdateEnabled {
			registerAIAppWriteFileTool(server, aiApp, apiServices)
		}
		if writeConfig.PatchEnabled {
			registerAIAppPatchFileTool(server, aiApp, apiServices)
		}
		// Register commit tool if not using auto-commit
		if !writeConfig.AutoCommit {
			registerAIAppCommitTool(server, aiApp, apiServices)
		}
	}

	// Register custom tools
	registerAIAppCustomTools(server, aiApp, apiServices)

	// Always register the info tool
	registerAIAppInfoTool(server, aiApp, apiServices)
}

// Tool argument structs - Simplified with unified paths (format: /repo-slug/ref/path)

type aiAppQueryArgs struct {
	SQL string `json:"sql" jsonschema:"required,The SQL query to execute"`
}

type aiAppSchemaArgs struct {
	Path string `json:"path" jsonschema:"required,Unified path to the object (e.g. /repo-slug/main/data/file.json)"`
}

type aiAppListObjectsArgs struct {
	Path string `json:"path" jsonschema:"optional,Unified path (e.g. /repo-slug/main/folder). If empty lists all data sources."`
}

type aiAppGetContentArgs struct {
	Path string `json:"path" jsonschema:"required,Unified path to the object (e.g. /repo-slug/main/data/file.json)"`
}

type aiAppEmbeddingSearchArgs struct {
	Query  string            `json:"query"  jsonschema:"required,The search query"`
	Path   string            `json:"path"   jsonschema:"optional,Unified path to specific embedding file (e.g. /repo-slug/main/embeddings/file.parquet). If empty searches all embeddings."`
	TopK   int               `json:"top_k"  jsonschema:"optional,Number of results to return (default 10)"`
	Filter map[string]string `json:"filter" jsonschema:"optional,Metadata filter for search results"`
	Reason string            `json:"reason" jsonschema:"optional,Brief explanation of why search is needed (recorded in audit logs)"`
}

// Write tool argument structs

type aiAppWriteFileArgs struct {
	Path          string `json:"path"           jsonschema:"required,Unified path (e.g. /repo-slug/main/data/file.json)"`
	Content       string `json:"content"        jsonschema:"required,File content (text for text files or base64 for binary)"`
	IsBase64      bool   `json:"is_base64"      jsonschema:"optional,Set to true if content is base64 encoded (for binary files)"`
	CommitMessage string `json:"commit_message" jsonschema:"optional,Commit message describing the change"`
}

type aiAppPatchFileArgs struct {
	Path          string `json:"path"           jsonschema:"required,Unified path to the file to patch (e.g. /repo-slug/main/data/file.json)"`
	Operations    string `json:"operations"     jsonschema:"required,JSON Patch operations as a JSON array string"`
	CommitMessage string `json:"commit_message" jsonschema:"optional,Commit message describing the change"`
}

type aiAppCommitArgs struct {
	Path    string `json:"path"    jsonschema:"optional,Unified path prefix to commit (e.g. /repo-slug/main). If empty commits all staged changes."`
	Message string `json:"message" jsonschema:"required,Commit message describing the changes"`
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
			startTime := time.Now()

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
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_ai_app_info", "builtin", args, startTime, result)
			return result, struct{}{}, nil
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
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			queryResult, err := executor.ExecuteSQL(ctx, args.SQL, true)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_execute_sql", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(queryResult, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_execute_sql", "builtin", args, startTime, result)
			return result, struct{}{}, nil
		},
	)
}

// registerAIAppSchemaTool registers the object schema tool.
func registerAIAppSchemaTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_get_object_schema",
			Description: "Get the data schema for a data object, showing column names, data types, and descriptions. Essential for writing SQL queries. Use unified path format: /repo-slug/ref/path/to/file.json",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppSchemaArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			schema, err := executor.GetSchemaByPath(ctx, args.Path)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_get_object_schema", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(schema, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_get_object_schema", "builtin", args, startTime, result)
			return result, struct{}{}, nil
		},
	)
}

// registerAIAppListObjectsTool registers the list objects tool.
func registerAIAppListObjectsTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_list_objects",
			Description: "List data objects (files and folders) at a path. Use unified path format: /repo-slug/ref/folder. If path is empty, lists all available data sources.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppListObjectsArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			object, err := executor.ListObjectsByPath(ctx, args.Path)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_list_objects", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			// Format the object
			formatted, formatErr := formatter.FormatRepositoryObjectResponse(object, apiServices.SQIDManager)
			if formatErr != nil {
				result := mcpError("Failed to format response")
				logToolCall(ctx, apiServices, aiApp, "irmin_list_objects", "builtin", args, startTime, result)
				//nolint:nilerr // Error is communicated via mcpError result with IsError: true
				return result, struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(formatted, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_list_objects", "builtin", args, startTime, result)
			return result, struct{}{}, nil
		},
	)
}

// registerAIAppGetContentTool registers the get content tool.
func registerAIAppGetContentTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_get_object_content",
			Description: "Get the content of a data object. Use unified path format: /repo-slug/ref/path/to/file.json. Supports JSON, CSV, YAML, XML, text files, PDFs (returns extracted text), and tabular data (CSV, Excel, Parquet - returns as JSON).",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppGetContentArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			content, err := executor.GetContentByPath(ctx, args.Path, true)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_get_object_content", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			// Detect content type
			mimeType := http.DetectContentType(content)

			// Check if this is a format we can transform (binary or tabular text)
			if IsBinaryFormatSupported(args.Path) || IsTabularTextFormat(args.Path) {
				transformed, transformErr := TransformContentForLLM(content, args.Path)
				if transformErr != nil {
					apiServices.Logger.Warn("Failed to transform content, returning error",
						"path", args.Path,
						"error", transformErr)
					result := mcpError(fmt.Sprintf("Failed to transform content: %v", transformErr))
					logToolCall(ctx, apiServices, aiApp, "irmin_get_object_content", "builtin", args, startTime, result)
					return result, struct{}{}, nil
				}

				result := &sdkmcp.CallToolResult{
					Content: []sdkmcp.Content{
						&sdkmcp.TextContent{
							Text: transformed.Content,
							Meta: sdkmcp.Meta{
								"mimeType":       transformed.MimeType,
								"path":           args.Path,
								"originalFormat": mimeType,
								"transformedTo":  transformed.Format,
							},
						},
					},
				}

				logToolCall(ctx, apiServices, aiApp, "irmin_get_object_content", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			// For non-binary files, check if text-based
			if !strings.HasPrefix(mimeType, "text/") && !strings.HasPrefix(mimeType, "application/json") {
				result := mcpError("Content is not a supported text format")
				logToolCall(ctx, apiServices, aiApp, "irmin_get_object_content", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{
						Text: string(content),
						Meta: sdkmcp.Meta{
							"mimeType": mimeType,
							"path":     args.Path,
						},
					},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_get_object_content", "builtin", args, startTime, result)
			return result, struct{}{}, nil
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
			Name: "irmin_search_embeddings",
			Description: `Search for semantically similar content using natural language queries.

Use this tool when:
- You need to find relevant information based on semantic meaning
- The user asks questions about stored data or documents
- You want to retrieve context for answering domain-specific questions

Parameters:
- query: Natural language search query (required)
- path: Unified path to filter (e.g. /repo-slug/ref/embeddings/file.parquet). If empty, searches all embeddings.
- top_k: Number of results to return (default: 10)
- filter: Optional metadata filter for results
- reason: Brief explanation of why search is needed (optional, recorded in audit logs)`,
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppEmbeddingSearchArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

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
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_search_embeddings", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(results, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_search_embeddings", "builtin", args, startTime, result)
			return result, struct{}{}, nil
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
			startTime := time.Now()

			// Generate the system prompt which contains comprehensive documentation
			systemPrompt := apiServices.GenerateAIApplicationSystemPrompt(aiApp)

			// If there's custom documentation, append it
			var fullDocs string
			if aiApp.Documentation != "" {
				fullDocs = systemPrompt + "\n\n---\n\n## Custom Documentation\n\n" + aiApp.Documentation
			} else {
				fullDocs = systemPrompt
			}

			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: fullDocs},
				},
			}

			logToolCall(ctx, apiServices, aiApp, "irmin_get_documentation", "builtin", args, startTime, result)
			return result, struct{}{}, nil
		},
	)
}

// registerAIAppWriteFileTool registers the write file tool.
func registerAIAppWriteFileTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_write_file",
			Description: "Write or update a file at the specified path. Use unified path format: /repo-slug/ref/path/to/file.json. Supports text content directly, or binary content encoded as base64 (set is_base64 to true).",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppWriteFileArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			// Convert content to bytes, handling base64 if specified
			var content []byte
			if args.IsBase64 {
				decoded, err := base64.StdEncoding.DecodeString(args.Content)
				if err != nil {
					result := mcpError(fmt.Sprintf("Invalid base64 content: %v", err))
					logToolCall(ctx, apiServices, aiApp, "irmin_write_file", "builtin", args, startTime, result)
					return result, struct{}{}, nil
				}
				content = decoded
			} else {
				content = []byte(args.Content)
			}

			writeResult, err := executor.WriteFile(ctx, args.Path, content, args.CommitMessage, false)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_write_file", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			// Prepare write audit info
			writeInfo := &WriteAuditInfo{
				Operation:  writeResult.Operation,
				TargetPath: writeResult.Path,
			}
			if writeResult.CommitID != nil {
				writeInfo.CommitID = *writeResult.CommitID
			}
			if writeResult.PendingID != nil {
				// Decode pending ID to get the uint for audit
				if pendingID, decErr := apiServices.SQIDManager.Decode("ai_application_pending_writes", *writeResult.PendingID); decErr == nil {
					pendingIDUint := uint(pendingID)
					writeInfo.PendingWriteID = &pendingIDUint
				}
			}

			jsonData, _ := json.MarshalIndent(writeResult, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCallWithWriteInfo(
				ctx,
				apiServices,
				aiApp,
				"irmin_write_file",
				"builtin",
				args,
				startTime,
				result,
				writeInfo,
			)
			return result, struct{}{}, nil
		},
	)
}

// registerAIAppPatchFileTool registers the patch file tool.
func registerAIAppPatchFileTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_patch_file",
			Description: "Apply JSON Patch operations to a JSON file. Use unified path format: /repo-slug/ref/path/to/file.json. Operations should be a JSON array of patch operations with 'op', 'path', and optionally 'value' or 'from' fields.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppPatchFileArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			// Parse the operations JSON string
			var operations []irminmodels.PatchOperation
			if err := json.Unmarshal([]byte(args.Operations), &operations); err != nil {
				result := mcpError(fmt.Sprintf("Invalid operations JSON: %v", err))
				logToolCall(ctx, apiServices, aiApp, "irmin_patch_file", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			writeResult, err := executor.PatchFile(ctx, args.Path, operations, args.CommitMessage, false)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_patch_file", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			// Prepare write audit info
			writeInfo := &WriteAuditInfo{
				Operation:  "patch",
				TargetPath: writeResult.Path,
			}
			if writeResult.CommitID != nil {
				writeInfo.CommitID = *writeResult.CommitID
			}
			if writeResult.PendingID != nil {
				if pendingID, decErr := apiServices.SQIDManager.Decode("ai_application_pending_writes", *writeResult.PendingID); decErr == nil {
					pendingIDUint := uint(pendingID)
					writeInfo.PendingWriteID = &pendingIDUint
				}
			}

			jsonData, _ := json.MarshalIndent(writeResult, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCallWithWriteInfo(
				ctx,
				apiServices,
				aiApp,
				"irmin_patch_file",
				"builtin",
				args,
				startTime,
				result,
				writeInfo,
			)
			return result, struct{}{}, nil
		},
	)
}

// registerAIAppCommitTool registers the commit tool.
func registerAIAppCommitTool(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        "irmin_commit",
			Description: "Commit staged changes. Use when auto-commit is disabled to batch multiple writes into a single commit. Provide a path prefix to commit changes for a specific repository/branch, or leave empty to commit all staged changes.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppCommitArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			// Parse the path to get repo and ref
			var repoSlug, ref string
			if args.Path != "" {
				resolved, err := executor.ResolvePath(args.Path)
				if err != nil {
					result := mcpError(err.Error())
					logToolCall(ctx, apiServices, aiApp, "irmin_commit", "builtin", args, startTime, result)
					return result, struct{}{}, nil
				}
				repoSlug = resolved.Repository.Slug
				ref = resolved.Ref
			} else {
				// Default to first data source
				dataSources := executor.ListDataSourcesUnified()
				if len(dataSources) == 0 {
					result := mcpError("No data sources configured")
					logToolCall(ctx, apiServices, aiApp, "irmin_commit", "builtin", args, startTime, result)
					return result, struct{}{}, nil
				}
				resolved, err := executor.ResolvePath(dataSources[0].Path)
				if err != nil {
					result := mcpError(err.Error())
					logToolCall(ctx, apiServices, aiApp, "irmin_commit", "builtin", args, startTime, result)
					return result, struct{}{}, nil
				}
				repoSlug = resolved.Repository.Slug
				ref = resolved.Ref
			}

			commit, err := executor.CommitStagedChanges(ctx, repoSlug, ref, args.Message)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, "irmin_commit", "builtin", args, startTime, result)
				return result, struct{}{}, nil
			}

			writeResult := &services.WriteResult{
				Path:      args.Path,
				Operation: "commit",
				Committed: true,
				CommitID:  &commit.Hash,
			}

			// Prepare write audit info
			writeInfo := &WriteAuditInfo{
				Operation:  "commit",
				TargetPath: args.Path,
				CommitID:   commit.Hash,
			}

			jsonData, _ := json.MarshalIndent(writeResult, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCallWithWriteInfo(
				ctx,
				apiServices,
				aiApp,
				"irmin_commit",
				"builtin",
				args,
				startTime,
				result,
				writeInfo,
			)
			return result, struct{}{}, nil
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

// registerAIAppCustomTools registers all enabled custom tools for the AI Application.
func registerAIAppCustomTools(server *sdkmcp.Server, aiApp *db.AIApplication, apiServices *services.APIServices) {
	executor := services.NewAIAppToolExecutor(aiApp, apiServices)
	customTools := executor.GetEnabledCustomTools()

	for _, tool := range customTools {
		registerSingleCustomTool(server, aiApp, apiServices, tool)
	}
}

// registerSingleCustomTool registers a single custom tool with the MCP server.
func registerSingleCustomTool(
	server *sdkmcp.Server,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	tool db.AIApplicationCustomTool,
) {
	// Create tool name with prefix to avoid conflicts
	toolName := "irmin_custom_" + tool.Name

	switch tool.Type {
	case db.CustomToolTypeStoredQuery:
		registerCustomNoArgsTool(server, aiApp, apiServices, tool, toolName,
			"Execute a predefined SQL query and return the results.")
	case db.CustomToolTypeWorkflow:
		registerCustomNoArgsTool(
			server,
			aiApp,
			apiServices,
			tool,
			toolName,
			"Trigger a workflow execution and wait for completion. Returns workflow run logs, status, and execution details. May timeout for long-running workflows.",
		)
	case db.CustomToolTypeEmbeddingSearch:
		registerCustomEmbeddingSearchTool(server, aiApp, apiServices, tool, toolName)
	}
}

// registerCustomNoArgsTool registers a custom tool that takes no arguments (stored query or workflow).
func registerCustomNoArgsTool(
	server *sdkmcp.Server,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	tool db.AIApplicationCustomTool,
	toolName string,
	defaultDescription string,
) {
	description := tool.Description
	if description == "" {
		description = defaultDescription
	}

	// Capture tool name for closure
	capturedToolName := tool.Name

	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        toolName,
			Description: description,
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args struct{}) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			execResult, err := executor.ExecuteCustomTool(ctx, capturedToolName, "")
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, toolName, "custom", args, startTime, result)
				return result, struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(execResult.Data, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, toolName, "custom", args, startTime, result)
			return result, struct{}{}, nil
		},
	)
}

// customEmbeddingSearchArgs defines arguments for custom embedding search tools.
type customEmbeddingSearchArgs struct {
	Query  string `json:"query"  jsonschema:"required,The search query"`
	Reason string `json:"reason" jsonschema:"optional,Brief explanation of why search is needed (recorded in audit logs)"`
}

// registerCustomEmbeddingSearchTool registers an embedding search custom tool.
func registerCustomEmbeddingSearchTool(
	server *sdkmcp.Server,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	tool db.AIApplicationCustomTool,
	toolName string,
) {
	description := tool.Description
	if description == "" {
		description = "Search for semantically similar content using natural language queries."
	}

	// Capture tool name for closure
	capturedToolName := tool.Name

	sdkmcp.AddTool(
		server,
		&sdkmcp.Tool{
			Name:        toolName,
			Description: description,
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args customEmbeddingSearchArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			startTime := time.Now()

			if args.Query == "" {
				result := mcpError("Query is required")
				logToolCall(ctx, apiServices, aiApp, toolName, "custom", args, startTime, result)
				return result, struct{}{}, nil
			}

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			execResult, err := executor.ExecuteCustomTool(ctx, capturedToolName, args.Query)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, apiServices, aiApp, toolName, "custom", args, startTime, result)
				return result, struct{}{}, nil
			}

			jsonData, _ := json.MarshalIndent(execResult.Data, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, apiServices, aiApp, toolName, "custom", args, startTime, result)
			return result, struct{}{}, nil
		},
	)
}
