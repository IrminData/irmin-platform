package controllers

import (
	"encoding/base64"
	"errors"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"
	"net/http"
	"strconv"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

// AIAppAPIInfo godoc
// @Summary Get AI Application API info
// @Description Get information about the AI Application and its capabilities
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse "AI Application info"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Router /ai-app/info [get]
func (api *APIControllers) AIAppAPIInfo(c fiber.Ctx) error {
	// Get the AI Application from locals (set by middleware)
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Create tool executor
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)

	// Return info about the AI Application with unified data sources
	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"name":         aiApp.Name,
			"description":  aiApp.Description,
			"workspace":    aiApp.Workspace.Slug,
			"tools":        executor.GetToolConfig(),
			"data_sources": executor.ListDataSourcesUnified(),
		},
	})
}

// AIAppAPIQuery godoc
// @Summary Execute SQL query
// @Description Execute a SQL query within the AI Application's data scope
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param body body object true "SQL query request with 'sql' field"
// @Success 200 {object} irminmodels.IrminAPIResponse "Query results"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid SQL"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - query tool not enabled, path not in data sources, or path traversal detected"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/query [post]
func (api *APIControllers) AIAppAPIQuery(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Parse request body
	var req struct {
		SQL string `json:"sql"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid request body",
		})
	}

	if req.SQL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "SQL query is required",
		})
	}

	// Create tool executor and execute query
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	result, err := executor.ExecuteSQL(c.Context(), req.SQL, true)
	if err != nil {
		if errors.Is(err, services.ErrToolNotEnabled) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Query tool is not enabled for this AI Application",
			})
		}
		if errors.Is(err, services.ErrPathNotInDataSources) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "SQL query references paths outside configured data sources",
			})
		}
		if errors.Is(err, services.ErrPathTraversalDetected) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "SQL query contains invalid path traversal sequences",
			})
		}
		api.Logger.Error("AI App API query error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Query execution failed",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// AIAppAPIListObjects godoc
// @Summary List objects
// @Description List objects within the AI Application's data sources. Use unified path format: /{repository-slug}/{ref}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param path query string false "Unified path (e.g., /repo-slug/main/folder). If empty, lists all data source roots."
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Objects"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - tool not enabled or path not allowed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/objects [get]
func (api *APIControllers) AIAppAPIListObjects(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Get unified path from query params
	unifiedPath := c.Query("path", "")

	// Create tool executor and list objects using unified path
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	object, err := executor.ListObjectsByPath(c.Context(), unifiedPath)
	if err != nil {
		if errors.Is(err, services.ErrToolNotEnabled) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "List objects tool is not enabled for this AI Application",
			})
		}
		if errors.Is(err, services.ErrPathNotInDataSources) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Path is not within configured data sources",
			})
		}
		if errors.Is(err, services.ErrInvalidUnifiedPath) {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "Invalid path format. Use /{repository-slug}/{ref}/{path}",
			})
		}
		api.Logger.Error("AI App API list objects error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to list objects",
		})
	}

	// Format the response
	objectResponse, err := formatter.FormatRepositoryObjectResponse(object, api.SQIDManager)
	if err != nil {
		api.Logger.Error("AI App API format error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to format response",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: objectResponse,
	})
}

// AIAppAPIGetObject godoc
// @Summary Get object content
// @Description Get the content of an object using unified path format: /{repository-slug}/{ref}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param path query string true "Unified path to object (e.g., /repo-slug/main/data/file.json)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Object content"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - tool not enabled or path not allowed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/content [get]
func (api *APIControllers) AIAppAPIGetObject(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Get unified path from query params
	unifiedPath := c.Query("path")

	if unifiedPath == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Path is required. Use unified format: /{repository-slug}/{ref}/{path}",
		})
	}

	// Create tool executor and get content using unified path
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	content, err := executor.GetContentByPath(c.Context(), unifiedPath, true)
	if err != nil {
		if errors.Is(err, services.ErrToolNotEnabled) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Get content tool is not enabled for this AI Application",
			})
		}
		if errors.Is(err, services.ErrPathNotInDataSources) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Path is not within configured data sources",
			})
		}
		if errors.Is(err, services.ErrInvalidUnifiedPath) {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "Invalid path format. Use /{repository-slug}/{ref}/{path}",
			})
		}
		api.Logger.Error("AI App API get content error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to get object content",
		})
	}

	// Detect content type and return appropriately
	mimeType := http.DetectContentType(content)
	if strings.HasPrefix(mimeType, "text/") || strings.HasPrefix(mimeType, "application/json") {
		return c.JSON(irminmodels.IrminAPIResponse{
			Data: fiber.Map{
				"content":   string(content),
				"mime_type": mimeType,
			},
		})
	}

	// For non-text content, return base64 encoded
	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"content_base64": base64.StdEncoding.EncodeToString(content),
			"mime_type":      mimeType,
		},
	})
}

// AIAppAPIGetSchema godoc
// @Summary Get object schema
// @Description Get the schema of an object using unified path format: /{repository-slug}/{ref}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param path query string true "Unified path to object (e.g., /repo-slug/main/data/file.json)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ObjectSchema} "Object schema"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing path"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - tool not enabled or path not allowed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/schema [get]
func (api *APIControllers) AIAppAPIGetSchema(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Get unified path from query params
	unifiedPath := c.Query("path")

	if unifiedPath == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Path is required. Use unified format: /{repository-slug}/{ref}/{path}",
		})
	}

	// Create tool executor and get schema using unified path
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	schema, err := executor.GetSchemaByPath(c.Context(), unifiedPath)
	if err != nil {
		if errors.Is(err, services.ErrToolNotEnabled) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Schema tool is not enabled for this AI Application",
			})
		}
		if errors.Is(err, services.ErrPathNotInDataSources) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Path is not within configured data sources",
			})
		}
		if errors.Is(err, services.ErrInvalidUnifiedPath) {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "Invalid path format. Use /{repository-slug}/{ref}/{path}",
			})
		}
		api.Logger.Error("AI App API get schema error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to get object schema",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: schema,
	})
}

// AIAppAPISystemPrompt godoc
// @Summary Get system prompt
// @Description Get the recommended system prompt for this AI Application
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse "System prompt"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Router /ai-app/system-prompt [get]
func (api *APIControllers) AIAppAPISystemPrompt(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Generate system prompt
	systemPrompt := api.Services.GenerateAIApplicationSystemPrompt(aiApp)

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"system_prompt": systemPrompt,
		},
	})
}

// AIAppAPISearchEmbeddings godoc
// @Summary Search embeddings
// @Description Perform vector similarity search. If path is empty, searches all embedding files in data sources.
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param body body object true "Search request with query (required), path (optional), top_k (optional), filter (optional)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EmbeddingSearchResponse} "Search results"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing query"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - tool not enabled or path not allowed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/embeddings/search [post]
func (api *APIControllers) AIAppAPISearchEmbeddings(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Parse request body with simplified parameters
	var req struct {
		Query  string            `json:"query"`
		Path   string            `json:"path"`   // Optional: unified path to specific embedding file
		TopK   int               `json:"top_k"`  // Optional: defaults to 10
		Filter map[string]string `json:"filter"` // Optional: metadata filter
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid request body",
		})
	}

	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Query is required",
		})
	}

	// Default top_k
	if req.TopK <= 0 {
		req.TopK = 10
	}

	// Create tool executor and search embeddings using unified path
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	results, err := executor.SearchEmbeddingsByPath(
		c.Context(),
		req.Query,
		req.TopK,
		req.Path,
		req.Filter,
	)
	if err != nil {
		if errors.Is(err, services.ErrToolNotEnabled) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Vector search tool is not enabled for this AI Application",
			})
		}
		if errors.Is(err, services.ErrPathNotInDataSources) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Embedding path is not within configured data sources",
			})
		}
		if errors.Is(err, services.ErrInvalidUnifiedPath) {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "Invalid path format. Use /{repository-slug}/{ref}/{path}",
			})
		}
		api.Logger.Error("AI App API search embeddings error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Embedding search failed",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: results,
	})
}

// AIAppAPIExecuteCustomTool godoc
// @Summary Execute custom tool
// @Description Execute a custom tool defined for this AI Application
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param tool_name path string true "Name of the custom tool to execute"
// @Param body body object false "Request body with optional 'query' field for embedding_search tools"
// @Success 200 {object} irminmodels.IrminAPIResponse "Tool execution result"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing query for embedding search"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - tool not found or disabled"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/tools/{tool_name}/execute [post]
func (api *APIControllers) AIAppAPIExecuteCustomTool(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Get tool name from path params
	toolName := c.Params("tool_name")
	if toolName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Tool name is required",
		})
	}

	// Parse optional request body (for embedding_search tools)
	var req struct {
		Query string `json:"query"`
	}
	// Ignore parse errors - body is optional
	_ = c.Bind().JSON(&req)

	// Create tool executor and execute custom tool
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	result, err := executor.ExecuteCustomTool(c.Context(), toolName, req.Query)
	if err != nil {
		if errors.Is(err, services.ErrCustomToolNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
				Message: "Custom tool not found",
			})
		}
		if errors.Is(err, services.ErrCustomToolDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Custom tool is disabled",
			})
		}
		if errors.Is(err, services.ErrPathNotInDataSources) {
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: "Tool references paths outside configured data sources",
			})
		}
		if errors.Is(err, services.ErrQueryRequired) {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "Query is required for this tool",
			})
		}
		api.Logger.Error("AI App API execute custom tool error", "error", err, "tool", toolName)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Custom tool execution failed",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// AIAppAPIListCustomTools godoc
// @Summary List custom tools
// @Description List all enabled custom tools for this AI Application
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse "List of custom tools"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Router /ai-app/tools [get]
func (api *APIControllers) AIAppAPIListCustomTools(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Create tool executor and get enabled custom tools
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	tools := executor.GetEnabledCustomTools()

	// Format tools for response
	toolsResponse := []fiber.Map{}
	for _, tool := range tools {
		toolSqid, encodeErr := api.SQIDManager.Encode("ai_application_custom_tools", uint64(tool.ID))
		if encodeErr != nil {
			api.Logger.Error("Failed to encode custom tool ID", "error", encodeErr, "tool_id", tool.ID)
			return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
				Message: "Failed to format custom tools",
			})
		}
		toolResponse := fiber.Map{
			"id":          toolSqid,
			"name":        tool.Name,
			"description": tool.Description,
			"type":        tool.Type,
		}

		// Add type-specific fields
		switch tool.Type {
		case db.CustomToolTypeEmbeddingSearch:
			toolResponse["requires_query"] = true
		case db.CustomToolTypeStoredQuery, db.CustomToolTypeWorkflow:
			// No additional fields required for these types
		}

		toolsResponse = append(toolsResponse, toolResponse)
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"tools": toolsResponse,
		},
	})
}

// === Write Operation Endpoints ===

// AIAppAPIWriteFile godoc
// @Summary Write or update a file
// @Description Write or update a file at the specified path. Use unified path format: /{repository-slug}/{ref}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param body body object true "Write request with path (required), content (required), commit_message (optional), auto_commit (optional)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Write result"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing required fields"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - write not enabled or path not allowed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/write [post]
func (api *APIControllers) AIAppAPIWriteFile(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Parse request body
	var req struct {
		Path          string `json:"path"`
		Content       string `json:"content"`
		ContentBase64 string `json:"content_base64"`
		CommitMessage string `json:"commit_message"`
		AutoCommit    bool   `json:"auto_commit"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid request body",
		})
	}

	if req.Path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Path is required",
		})
	}

	// Decode content
	var content []byte
	switch {
	case req.ContentBase64 != "":
		var decodeErr error
		content, decodeErr = base64.StdEncoding.DecodeString(req.ContentBase64)
		if decodeErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "Invalid base64 content",
			})
		}
	case req.Content != "":
		content = []byte(req.Content)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Content or content_base64 is required",
		})
	}

	// Create tool executor and write file
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	result, err := executor.WriteFile(c.Context(), req.Path, content, req.CommitMessage, req.AutoCommit)
	if err != nil {
		return api.handleWriteError(c, err)
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// AIAppAPIPatchFile godoc
// @Summary Patch a file with JSON Patch operations
// @Description Apply JSON Patch operations to a file at the specified path. Use unified path format: /{repository-slug}/{ref}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param body body object true "Patch request with path (required), operations (required), commit_message (optional), auto_commit (optional)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Patch result"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing required fields"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - patch not enabled or path not allowed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/patch [post]
func (api *APIControllers) AIAppAPIPatchFile(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Parse request body
	var req struct {
		Path          string                       `json:"path"`
		Operations    []irminmodels.PatchOperation `json:"operations"`
		CommitMessage string                       `json:"commit_message"`
		AutoCommit    bool                         `json:"auto_commit"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid request body",
		})
	}

	if req.Path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Path is required",
		})
	}

	if len(req.Operations) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Operations are required",
		})
	}

	// Create tool executor and patch file
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	result, err := executor.PatchFile(c.Context(), req.Path, req.Operations, req.CommitMessage, req.AutoCommit)
	if err != nil {
		return api.handleWriteError(c, err)
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// AIAppAPICommit godoc
// @Summary Commit staged changes
// @Description Commit all staged changes on the specified branch
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param body body object true "Commit request with message (required), path (optional)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Commit result"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing commit message"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - write not enabled"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/commit [post]
func (api *APIControllers) AIAppAPICommit(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Parse request body
	var req struct {
		Path    string `json:"path"`
		Message string `json:"message"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid request body",
		})
	}

	if req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Commit message is required",
		})
	}

	// Create tool executor
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)

	// Parse the path to get repo and ref
	var repoSlug, ref string
	if req.Path != "" {
		resolved, err := executor.ResolvePath(req.Path)
		if err != nil {
			return api.handleWriteError(c, err)
		}
		repoSlug = resolved.Repository.Slug
		ref = resolved.Ref
	} else {
		// Default to first data source
		dataSources := executor.ListDataSourcesUnified()
		if len(dataSources) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: "No data sources configured",
			})
		}
		resolved, err := executor.ResolvePath(dataSources[0].Path)
		if err != nil {
			return api.handleWriteError(c, err)
		}
		repoSlug = resolved.Repository.Slug
		ref = resolved.Ref
	}

	commit, err := executor.CommitStagedChanges(c.Context(), repoSlug, ref, req.Message)
	if err != nil {
		return api.handleWriteError(c, err)
	}

	// Use the actual repository/ref that was committed to, not the potentially empty req.Path
	resultPath := req.Path
	if resultPath == "" {
		resultPath = services.BuildUnifiedPath(repoSlug, ref, "")
	}

	result := &services.WriteResult{
		Path:      resultPath,
		Operation: "commit",
		Committed: true,
	}
	if commit != nil {
		result.CommitID = &commit.Hash
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// AIAppAPIListPendingWrites godoc
// @Summary List pending writes
// @Description List all pending write operations awaiting approval
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param limit query int false "Number of results per page (default 50)"
// @Param offset query int false "Offset for pagination (default 0)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Pending writes list"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/pending-writes [get]
func (api *APIControllers) AIAppAPIListPendingWrites(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	// Clamp limit and offset to reasonable bounds
	const (
		defaultLimit = 50
		maxLimit     = 200
	)
	if limit <= 0 {
		limit = defaultLimit
	} else if limit > maxLimit {
		limit = maxLimit
	}
	if offset < 0 {
		offset = 0
	}

	// Get pending writes (only pending status)
	status := db.PendingWriteStatusPending
	pendingWrites, total, err := api.DB.GetPendingWritesByAIApplicationID(aiApp.ID, &status, limit, offset)
	if err != nil {
		api.Logger.Error("Failed to get pending writes", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to retrieve pending writes",
		})
	}

	// Format response
	formattedWrites := make([]fiber.Map, len(pendingWrites))
	for i, pw := range pendingWrites {
		pwSqid, encodeErr := api.SQIDManager.Encode("ai_application_pending_writes", uint64(pw.ID))
		if encodeErr != nil {
			api.Logger.Error("Failed to encode pending write ID", "error", encodeErr, "pending_write_id", pw.ID)
			return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
				Message: "Failed to format pending writes",
			})
		}
		formattedWrites[i] = fiber.Map{
			"id":              pwSqid,
			"repository":      pw.Repository.Slug,
			"path":            pw.Path,
			"ref":             pw.Ref,
			"operation":       pw.Operation,
			"content_preview": pw.ContentPreview,
			"patch_json":      pw.PatchJSON,
			"commit_message":  pw.CommitMessage,
			"status":          pw.Status,
			"created_at":      pw.CreatedAt,
		}
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"pending_writes": formattedWrites,
			"total":          total,
			"limit":          limit,
			"offset":         offset,
		},
	})
}

// AIAppAPIGetPendingWrite godoc
// @Summary Get pending write details
// @Description Get details of a specific pending write
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param id path string true "Pending write ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Pending write details"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Pending write not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /ai-app/pending-writes/{id} [get]
func (api *APIControllers) AIAppAPIGetPendingWrite(c fiber.Ctx) error {
	// Get the AI Application from locals
	aiApp, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}

	// Decode pending write ID
	pendingWriteSqid := c.Params("id")
	pendingWriteID, err := api.SQIDManager.Decode("ai_application_pending_writes", pendingWriteSqid)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid pending write ID",
		})
	}

	// Get pending write
	pendingWrite, err := api.DB.GetAIApplicationPendingWriteByID(uint(pendingWriteID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Pending write not found",
		})
	}

	// Verify it belongs to this AI Application
	if pendingWrite.AIApplicationID != aiApp.ID {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Pending write not found",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"id":              pendingWriteSqid,
			"repository":      pendingWrite.Repository.Slug,
			"path":            pendingWrite.Path,
			"ref":             pendingWrite.Ref,
			"operation":       pendingWrite.Operation,
			"content_preview": pendingWrite.ContentPreview,
			"patch_json":      pendingWrite.PatchJSON,
			"commit_message":  pendingWrite.CommitMessage,
			"status":          pendingWrite.Status,
			"created_at":      pendingWrite.CreatedAt,
		},
	})
}

// AIAppAPIApprovePendingWrite godoc
// @Summary Approve pending write (forbidden)
// @Description Approval of pending writes is not allowed via the AI App API. Use the workspace API with user authentication to approve writes. This prevents AI applications from self-approving and preserves RequireApproval human oversight.
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param id path string true "Pending write ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Approval not allowed via AI App API; use workspace API"
// @Router /ai-app/pending-writes/{id}/approve [post]
func (api *APIControllers) AIAppAPIApprovePendingWrite(c fiber.Ctx) error {
	_, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}
	return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
		Message: "Approval of pending writes must be performed via the workspace API with user authentication. The AI App API cannot approve writes.",
	})
}

// AIAppAPIRejectPendingWrite godoc
// @Summary Reject pending write (forbidden)
// @Description Rejection of pending writes is not allowed via the AI App API. Use the workspace API with user authentication to reject writes. This prevents AI applications from self-rejecting and preserves RequireApproval human oversight.
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param id path string true "Pending write ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid API key"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Rejection not allowed via AI App API; use workspace API"
// @Router /ai-app/pending-writes/{id}/reject [post]
func (api *APIControllers) AIAppAPIRejectPendingWrite(c fiber.Ctx) error {
	_, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(irminmodels.IrminAPIResponse{
			Message: "Unauthorized",
		})
	}
	return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
		Message: "Rejection of pending writes must be performed via the workspace API with user authentication. The AI App API cannot reject writes.",
	})
}

// handleWriteError handles write operation errors and returns appropriate HTTP responses.
func (api *APIControllers) handleWriteError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, services.ErrWriteNotEnabled):
		return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
			Message: "Write operations are not enabled for this AI Application",
		})
	case errors.Is(err, services.ErrFileUploadNotEnabled):
		return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
			Message: "File upload is not enabled for this AI Application",
		})
	case errors.Is(err, services.ErrFileUpdateNotEnabled):
		return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
			Message: "File update is not enabled for this AI Application",
		})
	case errors.Is(err, services.ErrPatchNotEnabled):
		return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
			Message: "Patch operations are not enabled for this AI Application",
		})
	case errors.Is(err, services.ErrCommitMessageRequired):
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Commit message is required",
		})
	case errors.Is(err, services.ErrWriteAccessDenied):
		return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
			Message: "Write access denied to this path",
		})
	case errors.Is(err, services.ErrPathNotInDataSources):
		return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
			Message: "Path is not within configured data sources",
		})
	case errors.Is(err, services.ErrInvalidUnifiedPath):
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid path format. Use /{repository-slug}/{ref}/{path}",
		})
	default:
		api.Logger.Error("Write operation error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Write operation failed",
		})
	}
}
