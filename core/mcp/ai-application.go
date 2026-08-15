package mcp

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"

	"irmin-api/toolregistry"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
	"github.com/gofiber/fiber/v3"
	adaptor "github.com/gofiber/fiber/v3/middleware/adaptor"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

// WriteAuditInfo contains write-specific audit information.
type WriteAuditInfo struct {
	Operation          string // "upload", "update", "patch", "commit"
	TargetPath         string // Unified path that was written to
	CommitID           string // Commit ID if changes were committed
	PendingOperationID *uint  // Link to pending operation if approval required
}

// auditLogEntry is sent to the audit log worker for durable, non-blocking writes.
type auditLogEntry struct {
	log         *db.AIApplicationToolLog
	apiServices *services.APIServices
}

// auditLogBufferSize is the capacity of the buffered audit log channel.
const auditLogBufferSize = 1000

// AuditLogger buffers tool call audit logs and writes them via a background worker.
type AuditLogger struct {
	ch      chan auditLogEntry
	mu      sync.RWMutex
	closed  bool
	workers sync.WaitGroup
	dropped atomic.Uint64
}

// NewAuditLogger creates an AuditLogger and starts the background drain worker.
func NewAuditLogger() *AuditLogger {
	al := &AuditLogger{ch: make(chan auditLogEntry, auditLogBufferSize)}
	al.workers.Add(1)
	go al.worker()
	return al
}

// Send enqueues an audit log entry. If the buffer is full the entry is dropped and an error is logged.
func (al *AuditLogger) Send(entry auditLogEntry) {
	al.mu.RLock()
	defer al.mu.RUnlock()
	if al.closed {
		al.dropped.Add(1)
		return
	}
	select {
	case al.ch <- entry:
	default:
		al.dropped.Add(1)
		entry.apiServices.Logger.ErrorContext(
			context.Background(),
			"Audit log buffer full, dropping entry",
			"tool_name", entry.log.ToolName,
			"ai_app_id", entry.log.AIApplicationID,
		)
	}
}

func (al *AuditLogger) worker() {
	defer al.workers.Done()
	for entry := range al.ch {
		if err := entry.apiServices.DB.CreateAIApplicationToolLog(entry.log); err != nil {
			entry.apiServices.Logger.Error("Failed to create AI app tool audit log",
				"error", err,
				"tool_name", entry.log.ToolName,
				"ai_app_id", entry.log.AIApplicationID)
		}
	}
}

// Dropped returns the number of audit entries rejected because the buffer was full or closed.
func (al *AuditLogger) Dropped() uint64 { return al.dropped.Load() }

// Close stops accepting entries and waits for the buffered audit log to drain.
func (al *AuditLogger) Close(ctx context.Context) error {
	al.mu.Lock()
	if !al.closed {
		al.closed = true
		close(al.ch)
	}
	al.mu.Unlock()

	drained := make(chan struct{})
	go func() {
		al.workers.Wait()
		close(drained)
	}()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-drained:
		return nil
	}
}

// logToolCall creates an audit log entry for a tool call.
func logToolCall(
	ctx context.Context,
	al *AuditLogger,
	apiServices *services.APIServices,
	aiApp *db.AIApplication,
	toolName string,
	toolType string,
	inputs any,
	startTime time.Time,
	result *sdkmcp.CallToolResult,
) {
	logToolCallWithWriteInfo(ctx, al, apiServices, aiApp, toolName, toolType, inputs, startTime, result, nil)
}

// logToolCallWithWriteInfo creates an audit log entry for a tool call with optional write audit info.
func logToolCallWithWriteInfo(
	ctx context.Context,
	al *AuditLogger,
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
		redaction := toolregistry.AuditRedactionFor(toolName)
		redactedInputs := toolregistry.RedactForAudit(inputs, redaction)
		if jsonBytes, err := json.Marshal(redactedInputs); err == nil {
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
		log.PendingOperationID = writeInfo.PendingOperationID
	}

	// Send to the buffered audit log worker instead of fire-and-forget goroutine
	al.Send(auditLogEntry{log: log, apiServices: apiServices})
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
func RegisterAIAppMCP(app *fiber.App, apiServices *services.APIServices) *AuditLogger {
	cfg := &authConfig{apiServices: apiServices}
	al := NewAuditLogger()

	// Mount at /api/v1/ai-app/mcp
	path := "/api/v1/ai-app/mcp"

	// Create a single long-lived StreamableHTTPHandler so sessions persist across requests.
	// The per-request callback reads the cached auth result from context (set by dynamicHandler)
	// to avoid a redundant second database lookup.
	handler := sdkmcp.NewStreamableHTTPHandler(func(r *http.Request) *sdkmcp.Server {
		// Read cached auth from context (set by dynamicHandler before calling handler.ServeHTTP)
		aiApp, ok := aiAppAuthCacheFromContext(r.Context())
		if !ok || aiApp == nil {
			// This should never happen since dynamicHandler pre-validates auth.
			apiServices.Logger.Error("AI App MCP callback: no cached auth in context — this is a bug")
			return nil
		}

		// Create a new MCP server for this AI Application
		server := sdkmcp.NewServer(&sdkmcp.Implementation{
			Name:    AIAppMCPServerName,
			Title:   AIAppMCPServerTitle,
			Version: AIAppMCPServerVersion,
		}, nil)

		// Register tools based on AI Application config
		registry := toolregistry.New()
		registerAIAppTools(server, registry, aiApp, apiServices, al)

		return server
	}, nil)

	// Wrap with auth validation, context enrichment, billing, and timeout
	dynamicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Create a timeout context for the entire request
		ctx, cancel := context.WithTimeout(r.Context(), MCPAttachTimeout)
		defer cancel()

		// Authenticate and validate — this is the single auth call per request
		authHeader := r.Header.Get("Authorization")
		_, aiApp, err := validateAuthAndGetUserOrAIApp(ctx, cfg, authHeader)
		if err != nil || aiApp == nil {
			apiServices.Logger.Warn("AI App MCP auth failed",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method)
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte("Unauthorized - valid AI Application API key required"))
			return
		}

		if !OriginAllowed(r.Header.Get("Origin"), aiApp.AllowedOrigins) {
			apiServices.Logger.Warn("AI App MCP origin rejected",
				"origin", r.Header.Get("Origin"),
				"path", r.URL.Path,
				"ai_app_id", aiApp.ID)
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte("Forbidden origin"))
			return
		}

		// Track API request for billing (per-request, not per-session)
		if apiServices.UsageTracker != nil {
			apiServices.UsageTracker.Track(aiApp.Workspace.ID, db.UsageDimensionAPIRequests, 1)
		}

		// Enrich context with auth cache, AI app, and request metadata
		enrichedCtx := withAIAppAuthCache(ctx, aiApp)
		enrichedCtx = withAIAppInContext(enrichedCtx, aiApp)
		reqMetadata := ExtractRequestMetadata(r, apiServices.Env.MCPTrustedProxyCIDRs)
		enrichedCtx = withRequestMetadataInContext(enrichedCtx, reqMetadata)

		apiServices.Logger.Debug("AI App MCP request",
			"path", r.URL.Path,
			"method", r.Method,
			"ai_app_id", aiApp.ID,
			"ai_app_name", aiApp.Name)

		handler.ServeHTTP(w, r.WithContext(enrichedCtx))
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

	return al
}

// registerAIAppTools registers MCP tools based on the AI Application's tool configuration.
func registerAIAppTools(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	config := aiApp.ParseToolConfig()

	if config.QueryEnabled {
		registerAIAppQueryTool(server, registry, aiApp, apiServices, al)
	}
	if config.SchemaEnabled {
		registerAIAppSchemaTool(server, registry, aiApp, apiServices, al)
	}
	if config.ListObjectsEnabled {
		registerAIAppListObjectsTool(server, registry, aiApp, apiServices, al)
	}
	if config.GetContentEnabled {
		registerAIAppGetContentTool(server, registry, aiApp, apiServices, al)
	}
	if config.VectorSearchEnabled {
		registerAIAppEmbeddingSearchTool(server, registry, aiApp, apiServices, al)
	}
	if config.DocsEnabled {
		registerAIAppDocsTool(server, registry, aiApp, apiServices, al)
	}

	// Register write tools if enabled
	if config.WriteEnabled && config.WriteConfig != nil {
		writeConfig := config.WriteConfig
		if writeConfig.FileUploadEnabled || writeConfig.FileUpdateEnabled {
			registerAIAppWriteFileTool(server, registry, aiApp, apiServices, al)
		}
		if writeConfig.PatchEnabled {
			registerAIAppPatchFileTool(server, registry, aiApp, apiServices, al)
		}
		// Register commit tool if not using auto-commit
		if !writeConfig.AutoCommit {
			registerAIAppCommitTool(server, registry, aiApp, apiServices, al)
		}
	}

	// Register custom tools
	registerAIAppCustomTools(server, registry, aiApp, apiServices, al)

	// Always register the info tool
	registerAIAppInfoTool(server, registry, aiApp, apiServices, al)
	registerAIAppCatalogTool(server, registry)
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
	Query          string            `json:"query"           jsonschema:"required,The search query"`
	Path           string            `json:"path"            jsonschema:"optional,Unified path to specific embedding file (e.g. /repo-slug/main/embeddings/file.parquet). If empty searches all embeddings."`
	TopK           int               `json:"top_k"           jsonschema:"optional,Number of results to return (default 10)"`
	Filter         map[string]string `json:"filter"          jsonschema:"optional,Metadata filter for search results"`
	PriorityWeight *float64          `json:"priority_weight" jsonschema:"optional,Priority weighting factor (0-1). When set higher priority embeddings are boosted in results."`
	Reason         string            `json:"reason"          jsonschema:"optional,Brief explanation of why search is needed (recorded in audit logs)"`
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
func registerAIAppInfoTool(
	server *sdkmcp.Server, registry *toolregistry.Registry, aiApp *db.AIApplication,
	apiServices *services.APIServices, al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_application_info_get",
		"Get information about this AI Application, including enabled tools and available data sources.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args struct{}) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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

			logToolCall(ctx, al, apiServices, aiApp, "irmin_application_info_get", "builtin", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppQueryTool registers the SQL query tool.
func registerAIAppQueryTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_query_execute_sql",
		"Execute a SQL query on the workspace data. Query any repository object as a table using path-based syntax (e.g., SELECT * FROM 'repo/branch/path/file.json'). Returns query results as JSON.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppQueryArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			queryResult, err := executor.ExecuteSQL(ctx, args.SQL, true)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, al, apiServices, aiApp, "irmin_query_execute_sql", "builtin", args, startTime, result)
				return result, toolregistry.OutputFromResult(result), nil
			}

			jsonData, _ := json.MarshalIndent(queryResult, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, al, apiServices, aiApp, "irmin_query_execute_sql", "builtin", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppSchemaTool registers the object schema tool.
func registerAIAppSchemaTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_repository_object_schema_get",
		"Get the data schema for a data object, showing column names, data types, and descriptions. Essential for writing SQL queries. Use unified path format: /repo-slug/ref/path/to/file.json",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppSchemaArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			schema, err := executor.GetSchemaByPath(ctx, args.Path)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_schema_get",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			jsonData, _ := json.MarshalIndent(schema, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(
				ctx,
				al,
				apiServices,
				aiApp,
				"irmin_repository_object_schema_get",
				"builtin",
				args,
				startTime,
				result,
			)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppListObjectsTool registers the list objects tool.
func registerAIAppListObjectsTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_repository_object_list",
		"List data objects (files and folders) at a path. Use unified path format: /repo-slug/ref/folder. If path is empty, lists all available data sources.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppListObjectsArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			object, err := executor.ListObjectsByPath(ctx, args.Path)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_list",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			// Format the object
			formatted, formatErr := formatter.FormatRepositoryObjectResponse(object, apiServices.SQIDManager)
			if formatErr != nil {
				result := mcpError("Failed to format response")
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_list",
					"builtin",
					args,
					startTime,
					result,
				)
				//nolint:nilerr // Error is communicated via mcpError result with IsError: true
				return result, toolregistry.OutputFromResult(result), nil
			}

			jsonData, _ := json.MarshalIndent(formatted, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, al, apiServices, aiApp, "irmin_repository_object_list", "builtin", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppGetContentTool registers the get content tool.
func registerAIAppGetContentTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_repository_object_content_get",
		"Get the content of a data object. Use unified path format: /repo-slug/ref/path/to/file.json. Supports JSON, CSV, YAML, XML, text files, PDFs (returns extracted text), and tabular data (CSV, Excel, Parquet - returns as JSON).",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppGetContentArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			content, err := executor.GetContentByPath(ctx, args.Path, true)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_content_get",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			// Detect content type
			mimeType := irminutils.DetectMimeType(content, args.Path)

			// Apply the common input and 16k-token output bounds to every format,
			// including ordinary text, Markdown, JSON, and XML.
			{
				transformed, transformErr := TransformContentForLLM(ctx, content, args.Path)
				if transformErr != nil {
					apiServices.Logger.Warn("Failed to transform content, returning error",
						"path", args.Path,
						"error", transformErr)
					result := mcpError(fmt.Sprintf("Failed to transform content: %v", transformErr))
					logToolCall(
						ctx,
						al,
						apiServices,
						aiApp,
						"irmin_repository_object_content_get",
						"builtin",
						args,
						startTime,
						result,
					)
					return result, toolregistry.OutputFromResult(result), nil
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

				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_content_get",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}
		},
	)
}

// registerAIAppEmbeddingSearchTool registers the embedding search tool.
func registerAIAppEmbeddingSearchTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_embedding_search",
		`Search for semantically similar content using natural language queries.

Use this tool when:
- You need to find relevant information based on semantic meaning
- The user asks questions about stored data or documents
- You want to retrieve context for answering domain-specific questions

Parameters:
- query: Natural language search query (required)
- path: Unified path to filter (e.g. /repo-slug/ref/embeddings/file.parquet). If empty, searches all embeddings.
- top_k: Number of results to return (default: 10)
- filter: Optional metadata filter for results
- priority_weight: Priority weighting factor (0-1). When set, higher priority embeddings are boosted in results.
- reason: Brief explanation of why search is needed (optional, recorded in audit logs)

Results include priority and metadata fields for each embedding chunk.`,

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppEmbeddingSearchArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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
				args.PriorityWeight,
			)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, al, apiServices, aiApp, "irmin_embedding_search", "builtin", args, startTime, result)
				return result, toolregistry.OutputFromResult(result), nil
			}

			jsonData, _ := json.MarshalIndent(results, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, al, apiServices, aiApp, "irmin_embedding_search", "builtin", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppDocsTool registers the documentation tool.
func registerAIAppDocsTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_documentation_retrieve",
		"Get documentation for this AI Application, including SQL syntax guide, tool usage instructions, and any custom documentation provided by the workspace administrator.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args struct{}) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
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

			logToolCall(ctx, al, apiServices, aiApp, "irmin_documentation_retrieve", "builtin", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppWriteFileTool registers the write file tool.
func registerAIAppWriteFileTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_repository_object_write",
		"Write or update a file at the specified path. Use unified path format: /repo-slug/ref/path/to/file.json. Supports text content directly, or binary content encoded as base64 (set is_base64 to true).",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppWriteFileArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			// Convert content to bytes, handling base64 if specified
			var content []byte
			if args.IsBase64 {
				decoded, err := base64.StdEncoding.DecodeString(args.Content)
				if err != nil {
					result := mcpError(fmt.Sprintf("Invalid base64 content: %v", err))
					logToolCall(
						ctx,
						al,
						apiServices,
						aiApp,
						"irmin_repository_object_write",
						"builtin",
						args,
						startTime,
						result,
					)
					return result, toolregistry.OutputFromResult(result), nil
				}
				content = decoded
			} else {
				content = []byte(args.Content)
			}

			writeResult, err := executor.WriteFile(ctx, args.Path, content, args.CommitMessage, false)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_write",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			// Prepare write audit info
			writeInfo := &WriteAuditInfo{
				Operation:  writeResult.Operation,
				TargetPath: writeResult.Path,
			}
			if writeResult.CommitID != nil {
				writeInfo.CommitID = *writeResult.CommitID
			}
			if writeResult.PendingOperationID != nil {
				// Decode pending ID to get the uint for audit
				if pendingID, decErr := apiServices.SQIDManager.Decode("ai_application_pending_operations", *writeResult.PendingOperationID); decErr == nil {
					pendingIDUint := uint(pendingID)
					writeInfo.PendingOperationID = &pendingIDUint
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
				al,
				apiServices,
				aiApp,
				"irmin_repository_object_write",
				"builtin",
				args,
				startTime,
				result,
				writeInfo,
			)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppPatchFileTool registers the patch file tool.
func registerAIAppPatchFileTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_repository_object_patch",
		"Apply JSON Patch operations to a JSON file. Use unified path format: /repo-slug/ref/path/to/file.json. Operations should be a JSON array of patch operations with 'op', 'path', and optionally 'value' or 'from' fields.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppPatchFileArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			// Parse the operations JSON string
			var operations []irminmodels.PatchOperation
			if err := json.Unmarshal([]byte(args.Operations), &operations); err != nil {
				result := mcpError(fmt.Sprintf("Invalid operations JSON: %v", err))
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_patch",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			writeResult, err := executor.PatchFile(ctx, args.Path, operations, args.CommitMessage, false)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_object_patch",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			// Prepare write audit info
			writeInfo := &WriteAuditInfo{
				Operation:  "patch",
				TargetPath: writeResult.Path,
			}
			if writeResult.CommitID != nil {
				writeInfo.CommitID = *writeResult.CommitID
			}
			if writeResult.PendingOperationID != nil {
				if pendingID, decErr := apiServices.SQIDManager.Decode("ai_application_pending_operations", *writeResult.PendingOperationID); decErr == nil {
					pendingIDUint := uint(pendingID)
					writeInfo.PendingOperationID = &pendingIDUint
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
				al,
				apiServices,
				aiApp,
				"irmin_repository_object_patch",
				"builtin",
				args,
				startTime,
				result,
				writeInfo,
			)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}

// registerAIAppCommitTool registers the commit tool.
func registerAIAppCommitTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	toolregistry.Register(
		registry,
		server,

		"irmin_repository_commit_create",
		"Commit staged changes. Use when auto-commit is disabled to batch multiple writes into a single commit. Provide a path prefix to commit changes for a specific repository/branch, or leave empty to commit all staged changes.",

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args aiAppCommitArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)

			// Parse the path to get repo and ref
			var repoSlug, ref string
			if args.Path != "" {
				resolved, err := executor.ResolvePath(args.Path)
				if err != nil {
					result := mcpError(err.Error())
					logToolCall(
						ctx,
						al,
						apiServices,
						aiApp,
						"irmin_repository_commit_create",
						"builtin",
						args,
						startTime,
						result,
					)
					return result, toolregistry.OutputFromResult(result), nil
				}
				repoSlug = resolved.Repository.Slug
				ref = resolved.Ref
			} else {
				// Default to first data source
				dataSources := executor.ListDataSourcesUnified()
				if len(dataSources) == 0 {
					result := mcpError("No data sources configured")
					logToolCall(ctx, al, apiServices, aiApp, "irmin_repository_commit_create", "builtin", args, startTime, result)
					return result, toolregistry.OutputFromResult(result), nil
				}
				resolved, err := executor.ResolvePath(dataSources[0].Path)
				if err != nil {
					result := mcpError(err.Error())
					logToolCall(ctx, al, apiServices, aiApp, "irmin_repository_commit_create", "builtin", args, startTime, result)
					return result, toolregistry.OutputFromResult(result), nil
				}
				repoSlug = resolved.Repository.Slug
				ref = resolved.Ref
			}

			writeResult, err := executor.CommitStagedChangesWithApproval(ctx, repoSlug, ref, args.Message)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(
					ctx,
					al,
					apiServices,
					aiApp,
					"irmin_repository_commit_create",
					"builtin",
					args,
					startTime,
					result,
				)
				return result, toolregistry.OutputFromResult(result), nil
			}

			// Prepare write audit info
			writeInfo := &WriteAuditInfo{
				Operation:  "commit",
				TargetPath: args.Path,
			}
			if writeResult.CommitID != nil {
				writeInfo.CommitID = *writeResult.CommitID
			}
			if writeResult.PendingOperationID != nil {
				if pendingID, decodeErr := apiServices.SQIDManager.Decode(
					"ai_application_pending_operations",
					*writeResult.PendingOperationID,
				); decodeErr == nil {
					pendingIDUint := uint(pendingID)
					writeInfo.PendingOperationID = &pendingIDUint
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
				al,
				apiServices,
				aiApp,
				"irmin_repository_commit_create",
				"builtin",
				args,
				startTime,
				result,
				writeInfo,
			)
			return result, toolregistry.OutputFromResult(result), nil
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
func registerAIAppCustomTools(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	al *AuditLogger,
) {
	executor := services.NewAIAppToolExecutor(aiApp, apiServices)
	customTools := executor.GetEnabledCustomTools()

	for _, tool := range customTools {
		registerSingleCustomTool(server, registry, aiApp, apiServices, tool, al)
	}
}

// registerSingleCustomTool registers a single custom tool with the MCP server.
func registerSingleCustomTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	tool db.AIApplicationCustomTool,
	al *AuditLogger,
) {
	// Create tool name with prefix to avoid conflicts
	toolName := toolregistry.CanonicalCustomName(tool.Name)

	switch tool.Type {
	case db.CustomToolTypeStoredQuery:
		registerCustomNoArgsTool(server, registry, aiApp, apiServices, tool, toolName,
			"Execute a predefined SQL query and return the results.", al)
	case db.CustomToolTypeWorkflow:
		registerCustomNoArgsTool(
			server,
			registry,
			aiApp,
			apiServices,
			tool,
			toolName,
			"Trigger a workflow execution and wait for completion. Returns workflow run logs, status, and execution details. May timeout for long-running workflows.",
			al,
		)
	case db.CustomToolTypeEmbeddingSearch:
		registerCustomEmbeddingSearchTool(server, registry, aiApp, apiServices, tool, toolName, al)
	}
}

func registerAIAppCatalogTool(server *sdkmcp.Server, registry *toolregistry.Registry) {
	toolregistry.Register(
		registry,
		server,
		"irmin_tool_catalog_list",
		"List the versioned tool descriptors available to this AI Application.",
		func(
			_ context.Context,
			_ *sdkmcp.CallToolRequest,
			_ struct{},
		) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			return nil, toolregistry.ToolOutput{Data: registry.List()}, nil
		},
	)
}

// registerCustomNoArgsTool registers a custom tool that takes no arguments (stored query or workflow).
func registerCustomNoArgsTool(
	server *sdkmcp.Server,
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	tool db.AIApplicationCustomTool,
	toolName string,
	defaultDescription string,
	al *AuditLogger,
) {
	description := tool.Description
	if description == "" {
		description = defaultDescription
	}

	// Capture tool name for closure
	capturedToolName := tool.Name
	toolregistry.Register(
		registry,
		server,

		toolName,
		description,

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args struct{}) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			execResult, err := executor.ExecuteCustomTool(ctx, capturedToolName, "")
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, al, apiServices, aiApp, toolName, "custom", args, startTime, result)
				return result, toolregistry.OutputFromResult(result), nil
			}

			jsonData, _ := json.MarshalIndent(execResult.Data, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, al, apiServices, aiApp, toolName, "custom", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
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
	registry *toolregistry.Registry,
	aiApp *db.AIApplication,
	apiServices *services.APIServices,
	tool db.AIApplicationCustomTool,
	toolName string,
	al *AuditLogger,
) {
	description := tool.Description
	if description == "" {
		description = "Search for semantically similar content using natural language queries."
	}

	// Capture tool name for closure
	capturedToolName := tool.Name
	toolregistry.Register(
		registry,
		server,

		toolName,
		description,

		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args customEmbeddingSearchArgs) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			startTime := time.Now()

			if args.Query == "" {
				result := mcpError("Query is required")
				logToolCall(ctx, al, apiServices, aiApp, toolName, "custom", args, startTime, result)
				return result, toolregistry.OutputFromResult(result), nil
			}

			executor := services.NewAIAppToolExecutor(aiApp, apiServices)
			execResult, err := executor.ExecuteCustomTool(ctx, capturedToolName, args.Query)
			if err != nil {
				result := mcpError(err.Error())
				logToolCall(ctx, al, apiServices, aiApp, toolName, "custom", args, startTime, result)
				return result, toolregistry.OutputFromResult(result), nil
			}

			jsonData, _ := json.MarshalIndent(execResult.Data, "", "  ")
			result := &sdkmcp.CallToolResult{
				Content: []sdkmcp.Content{
					&sdkmcp.TextContent{Text: string(jsonData)},
				},
			}

			logToolCall(ctx, al, apiServices, aiApp, toolName, "custom", args, startTime, result)
			return result, toolregistry.OutputFromResult(result), nil
		},
	)
}
