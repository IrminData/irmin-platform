package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// embeddingLocalParams holds the common parameters needed for embedding operations.
type embeddingLocalParams struct {
	locale     string
	dict       locales.Dictionary
	user       *db.User
	repository *db.Repository
	workspace  *db.Workspace
}

// validateEmbeddingParams validates the common parameters needed for embedding operations.
func (api *APIControllers) validateEmbeddingParams(c fiber.Ctx) (*embeddingLocalParams, error) {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk || !dictOk || !userOk || !repositoryOk || !workspaceOk {
		return nil, errors.New("missing required context parameters")
	}

	return &embeddingLocalParams{
		locale:     locale,
		dict:       dict,
		user:       user,
		repository: repository,
		workspace:  workspace,
	}, nil
}

// VectorizeObjects godoc
// @Summary Vectorize repository objects
// @Description Create embeddings from one or more repository objects and store them at the specified path
// @Tags embeddings
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param body body irmincore.VectorizeObjectsRequest true "Vectorization request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EmbeddingFile} "Embeddings created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings/vectorize [post]
func (api *APIControllers) VectorizeObjects(c fiber.Ctx) error {
	params, err := api.validateEmbeddingParams(c)
	if err != nil {
		api.Logger.Error("Error validating embedding parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate request body
	var req irmincore.VectorizeObjectsRequest
	if bindErr := api.validateAndBindRequestWithResponse(c, &req, params.dict); bindErr != nil {
		return bindErr
	}

	// Call service to vectorize objects
	embeddingFile, err := api.Services.VectorizeObjects(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Error vectorizing objects", err, params.dict)
	}

	// Invalidate objects listing cache for this repository (embeddings are stored as objects)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Also invalidate embeddings listing cache
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/embeddings", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating embeddings cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "embeddings_created"),
		Data:    embeddingFile,
	})
}

// SearchEmbeddings godoc
// @Summary Search embeddings
// @Description Perform vector similarity search on an embedding file
// @Tags embeddings
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param body body irmincore.SearchEmbeddingsRequest true "Search request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EmbeddingSearchResponse} "Search completed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Embedding file not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings/search [post]
func (api *APIControllers) SearchEmbeddings(c fiber.Ctx) error {
	params, err := api.validateEmbeddingParams(c)
	if err != nil {
		api.Logger.Error("Error validating embedding parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate request body
	var req irmincore.SearchEmbeddingsRequest
	if bindErr := api.validateAndBindRequestWithResponse(c, &req, params.dict); bindErr != nil {
		return bindErr
	}

	// Call service to search embeddings
	searchResponse, err := api.Services.SearchEmbeddings(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Error searching embeddings", err, params.dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: searchResponse,
	})
}

// ListEmbeddings godoc
// @Summary List embedding files
// @Description List embedding files in a repository path
// @Tags embeddings
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param prefix query string false "Optional prefix to filter embedding files"
// @Param ref query string false "Repository reference (branch/tag/commit)" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.EmbeddingFile} "Embedding files listed successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings [get]
func (api *APIControllers) ListEmbeddings(c fiber.Ctx) error {
	params, err := api.validateEmbeddingParams(c)
	if err != nil {
		api.Logger.Error("Error validating embedding parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get query parameters
	prefix := c.Query("prefix", "")
	ref := c.Query("ref", "")

	// Call service to list embedding files
	embeddingFiles, err := api.Services.ListEmbeddingFiles(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		prefix,
		ref,
	)
	if err != nil {
		return api.handleServiceError(c, "Error listing embedding files", err, params.dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: embeddingFiles,
	})
}

// GetEmbeddingInfo godoc
// @Summary Get embedding file info
// @Description Get metadata about an embedding file
// @Tags embeddings
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param embedding_path query string true "Path to the embedding file"
// @Param ref query string false "Repository reference (branch/tag/commit)" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.EmbeddingFile} "Embedding file info retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Embedding file not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/embeddings/info [get]
func (api *APIControllers) GetEmbeddingInfo(c fiber.Ctx) error {
	params, err := api.validateEmbeddingParams(c)
	if err != nil {
		api.Logger.Error("Error validating embedding parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get query parameters
	embeddingPath := c.Query("embedding_path")
	if embeddingPath == "" {
		return api.handleServiceError(c, "Missing embedding_path", services.ErrInvalidRequest, params.dict)
	}
	ref := c.Query("ref", "")

	// Call service to get embedding file info
	embeddingFile, err := api.Services.GetEmbeddingFileInfo(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		embeddingPath,
		ref,
	)
	if err != nil {
		return api.handleServiceError(c, "Error getting embedding file info", err, params.dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: embeddingFile,
	})
}
