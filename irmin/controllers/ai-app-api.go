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

	// Return info about the AI Application
	return c.JSON(irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"name":         aiApp.Name,
			"description":  aiApp.Description,
			"workspace":    aiApp.Workspace.Slug,
			"tools":        executor.GetToolConfig(),
			"data_sources": executor.ListDataSources(),
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
// @Summary List repository objects
// @Description List objects in a repository within the AI Application's data scope
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param repository query string true "Repository slug"
// @Param path query string false "Path within repository"
// @Param ref query string false "Git reference (branch/tag/commit)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Repository objects"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing repository"
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

	// Get query params
	repoSlug := c.Query("repository")
	path := c.Query("path", "")
	ref := c.Query("ref", "")

	if repoSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Repository is required",
		})
	}

	// Create tool executor and list objects
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	object, err := executor.ListRepositoryObjects(c.Context(), repoSlug, path, ref)
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
// @Description Get the content of a repository object within the AI Application's data scope
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param repository query string true "Repository slug"
// @Param path query string true "Path to object"
// @Param ref query string false "Git reference (branch/tag/commit)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Object content"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing parameters"
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

	// Get query params
	repoSlug := c.Query("repository")
	path := c.Query("path")
	ref := c.Query("ref", "")

	if repoSlug == "" || path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Repository and path are required",
		})
	}

	// Create tool executor and get content
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	content, err := executor.GetRepositoryObjectContent(c.Context(), repoSlug, path, ref, true)
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
// @Description Get the schema of a repository object within the AI Application's data scope
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param repository query string true "Repository slug"
// @Param path query string true "Path to object"
// @Param ref query string false "Git reference (branch/tag/commit)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ObjectSchema} "Object schema"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing parameters"
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

	// Get query params
	repoSlug := c.Query("repository")
	path := c.Query("path")
	ref := c.Query("ref", "")

	if repoSlug == "" || path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Repository and path are required",
		})
	}

	// Create tool executor and get schema
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	schema, err := executor.GetRepositoryObjectSchema(c.Context(), repoSlug, path, ref)
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
// @Description Perform vector similarity search on repository-based embeddings
// @Tags ai-app-api
// @Security AIAppAPIKey
// @Accept json
// @Produce json
// @Param body body object true "Search request with repository, embedding_path, query"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EmbeddingSearchResponse} "Search results"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - missing parameters"
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

	// Parse request body
	var req struct {
		Repository    string            `json:"repository"`
		EmbeddingPath string            `json:"embedding_path"`
		Query         string            `json:"query"`
		Ref           string            `json:"ref"`
		TopK          int               `json:"top_k"`
		Filter        map[string]string `json:"filter"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid request body",
		})
	}

	if req.Repository == "" || req.EmbeddingPath == "" || req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Repository, embedding_path, and query are required",
		})
	}

	// Default top_k
	if req.TopK <= 0 {
		req.TopK = 10
	}

	// Create tool executor and search embeddings
	executor := services.NewAIAppToolExecutor(aiApp, api.Services)
	results, err := executor.SearchEmbeddings(
		c.Context(),
		req.Repository,
		req.EmbeddingPath,
		req.Query,
		req.Ref,
		req.TopK,
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
		api.Logger.Error("AI App API search embeddings error", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Embedding search failed",
		})
	}

	return c.JSON(irminmodels.IrminAPIResponse{
		Data: results,
	})
}
