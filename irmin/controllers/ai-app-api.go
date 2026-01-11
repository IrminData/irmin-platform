package controllers

import (
	"encoding/base64"
	"errors"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"
	"net/http"
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
// @Description List objects within the AI Application's data sources. Use unified path format: /{repository-slug}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param path query string false "Unified path (e.g., /repo-slug/folder). If empty, lists all data source roots."
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
				Message: "Invalid path format. Use /{repository-slug}/{path}",
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
// @Description Get the content of an object using unified path format: /{repository-slug}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param path query string true "Unified path to object (e.g., /repo-slug/data/file.json)"
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
			Message: "Path is required. Use unified format: /{repository-slug}/{path}",
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
				Message: "Invalid path format. Use /{repository-slug}/{path}",
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
// @Description Get the schema of an object using unified path format: /{repository-slug}/{path}
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param path query string true "Unified path to object (e.g., /repo-slug/data/file.json)"
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
			Message: "Path is required. Use unified format: /{repository-slug}/{path}",
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
				Message: "Invalid path format. Use /{repository-slug}/{path}",
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
				Message: "Invalid path format. Use /{repository-slug}/{path}",
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
