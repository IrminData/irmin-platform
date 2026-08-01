package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

type repositoryLocalParams struct {
	locale     string
	dict       locales.Dictionary
	user       *db.User
	repository *db.Repository
	workspace  *db.Workspace
}

// validateRepositoryParams validates the common parameters needed for repository operations.
// Returns locale, dict, user, repository, workspace, and an error.
func (api *APIControllers) validateRepositoryParams(c fiber.Ctx) (
	*repositoryLocalParams,
	error,
) {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk {
		return nil, errors.New("locale not found in context")
	}
	if !dictOk {
		return nil, errors.New("dictionary not found in context")
	}
	if !userOk {
		return nil, errors.New("user not found in context")
	}
	if !repositoryOk {
		return nil, errors.New("repository not found in context")
	}
	if !workspaceOk {
		return nil, errors.New("workspace not found in context")
	}
	return &repositoryLocalParams{
		locale:     locale,
		dict:       dict,
		user:       user,
		repository: repository,
		workspace:  workspace,
	}, nil
}

// RepositoriesIndex godoc
// @Summary List repositories
// @Description Get all repositories in the workspace that the user has permission to read
// @Tags repositories
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Repository} "Repositories retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories [get]
func (api *APIControllers) RepositoriesIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error validating workspace repository parameters",
			services.NewInternalError(err.Error()),
			dict,
		)
	}

	// Get all repositories in the workspace.
	repositories, err := api.Services.ListRepositories(c, user, workspace)
	if err != nil {
		return api.handleServiceError(c, "Error listing repositories", err, dict)
	}

	// Structure the response.
	repositoriesResponse, formatErr := formatter.FormatIndexResponse(
		repositories,
		formatter.FormatRepositoryResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting repositories",
			services.NewInternalErrorf("error formatting repositories: %v", formatErr),
			dict,
		)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoriesResponse,
	})
}

// RepositoriesStore godoc
// @Summary Create repository
// @Description Create a new repository in the workspace
// @Tags repositories
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.CreateRepositoryRequest true "Repository creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Repository} "Repository created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or repository already exists"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories [post]
func (api *APIControllers) RepositoriesStore(c fiber.Ctx) error {
	locale, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace repository parameters", err, dict)
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateRepositoryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the repository
	repository, err := api.Services.CreateRepository(c, locale, user, workspace, req)
	if err != nil {
		return api.handleServiceError(c, "Error creating repository", err, dict)
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository",
			services.NewInternalErrorf("error formatting repository: %v", formatRepositoryResponseErr),
			dict,
		)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories", workspace.Slug),
	); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "repository_created"),
		Data:    *repositoryResponse,
	})
}

// RepositoriesShow godoc
// @Summary Get repository details
// @Description Get details of a specific repository by its slug
// @Tags repositories
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Repository} "Repository retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug} [get]
func (api *APIControllers) RepositoriesShow(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repositoryLocalParams.repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository",
			services.NewInternalErrorf("error formatting repository: %v", formatRepositoryResponseErr),
			repositoryLocalParams.dict,
		)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: *repositoryResponse,
	})
}

// RepositoriesDestroy godoc
// @Summary Delete repository
// @Description Delete an existing repository and all its data from the workspace
// @Tags repositories
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Success 200 {object} irminmodels.IrminAPIResponse "Repository deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug} [delete]
func (api *APIControllers) RepositoriesDestroy(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the repository
	err = api.Services.DeleteRepository(
		c,
		repositoryLocalParams.locale,
		repositoryLocalParams.user,
		repositoryLocalParams.workspace,
		repositoryLocalParams.repository,
	)
	if err != nil {
		return api.handleServiceError(c, "Error deleting repository", err, repositoryLocalParams.dict)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories", repositoryLocalParams.workspace.Slug),
	); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(repositoryLocalParams.dict, "repository_deleted"),
	})
}

// RepositoriesUpdate godoc
// @Summary Update repository
// @Description Update an existing repository's properties and settings
// @Tags repositories
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param request body irmincore.UpdateRepositoryRequest true "Repository update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Repository} "Repository updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug} [patch]
func (api *APIControllers) RepositoriesUpdate(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}
	repository := repositoryLocalParams.repository

	// Parse and validate the JSON request body
	var req irmincore.UpdateRepositoryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, repositoryLocalParams.dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Update the repository
	repository, err = api.Services.UpdateRepository(
		c,
		repositoryLocalParams.locale,
		repositoryLocalParams.user,
		repositoryLocalParams.workspace,
		repository,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Error updating repository", err, repositoryLocalParams.dict)
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository",
			services.NewInternalErrorf("error formatting repository: %v", formatRepositoryResponseErr),
			repositoryLocalParams.dict,
		)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories", repositoryLocalParams.workspace.Slug),
	); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(repositoryLocalParams.dict, "repository_updated"),
		Data:    *repositoryResponse,
	})
}

// TransferRepositoryOwnership godoc
// @Summary Transfer repository ownership
// @Description Transfer ownership of a repository to another user in the workspace
// @Tags repositories
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param request body irmincore.TransferRepositoryOwnershipRequest true "Ownership transfer parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Repository} "Repository ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or new owner"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/transfer-ownership [post]
func (api *APIControllers) TransferRepositoryOwnership(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.TransferRepositoryOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, repositoryLocalParams.dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Transfer the repository ownership
	repository, err := api.Services.TransferRepositoryOwnership(
		c,
		repositoryLocalParams.user,
		repositoryLocalParams.workspace,
		repositoryLocalParams.repository,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Error transferring repository ownership", err, repositoryLocalParams.dict)
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository",
			services.NewInternalErrorf("error formatting repository: %v", formatRepositoryResponseErr),
			repositoryLocalParams.dict,
		)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories", repositoryLocalParams.workspace.Slug),
	); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(repositoryLocalParams.dict, "repository_ownership_transferred"),
		Data:    *repositoryResponse,
	})
}
