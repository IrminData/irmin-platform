package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryBranchesIndex godoc
// @Summary List repository branches
// @Description Get all branches in a specific repository
// @Tags repository-branches
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Branch} "Branches retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/branches [get]
func (api *APIControllers) RepositoryBranchesIndex(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	user, userOk := c.Locals("user").(*db.User)

	if !localeOk || !dictOk || !workspaceOk || !repositoryOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the branches using the service
	filteredBranches, err := api.Services.ListRepositoryBranches(c, locale, user, workspace, repository)
	if err != nil {
		return api.handleServiceError(c, "Error listing repository branches", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: filteredBranches,
	})
}

// RepositoryBranchesStore godoc
// @Summary Create repository branch
// @Description Create a new branch in the repository
// @Tags repository-branches
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param request body irmincore.CreateBranchRequest true "Branch creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Branch} "Branch created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/branches [post]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
func (api *APIControllers) RepositoryBranchesStore(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateBranchRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the branch using the service
	branch, err := api.Services.CreateRepositoryBranch(c, locale, user, workspace, repository, req)
	if err != nil {
		return api.handleServiceError(c, "Error creating repository branch", err, dict)
	}

	// Invalidate branches list and branch details (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/branches", workspace.Slug, repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the created branch
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "branch_created"),
		Data:    branch,
	})
}

// RepositoryBranchesShow godoc
// @Summary Get branch details
// @Description Get details of a specific branch in the repository
// @Tags repository-branches
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param branch_name path string true "Branch name"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Branch} "Branch retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Branch or repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/branches/{branch_name} [get]
func (api *APIControllers) RepositoryBranchesShow(c fiber.Ctx) error {
	branch, branchOk := c.Locals("branch").(*irminmodels.Branch)
	if !branchOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: branch,
	})
}

// RepositoryBranchesUpdate godoc
// @Summary Update branch
// @Description Update an existing branch's properties
// @Tags repository-branches
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param branch_name path string true "Branch name"
// @Param request body irmincore.UpdateBranchRequest true "Branch update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Branch} "Branch updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Branch or repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/branches/{branch_name} [patch]
func (api *APIControllers) RepositoryBranchesUpdate(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	branch, branchOk := c.Locals("branch").(*irminmodels.Branch)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk || !branchOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.UpdateBranchRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Update the branch using the service
	branch, err := api.Services.UpdateRepositoryBranch(c, locale, user, workspace, repository, branch, req)
	if err != nil {
		return api.handleServiceError(c, "Error updating repository branch", err, dict)
	}

	// Invalidate branches list and branch details (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/branches", workspace.Slug, repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the updated branch
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "branch_updated"),
		Data:    branch,
	})
}

// RepositoryBranchesDestroy godoc
// @Summary Delete branch
// @Description Delete an existing branch from the repository
// @Tags repository-branches
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param branch_name path string true "Branch name"
// @Success 200 {object} irminmodels.IrminAPIResponse "Branch deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Branch or repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/branches/{branch_name} [delete]
func (api *APIControllers) RepositoryBranchesDestroy(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	branch, branchOk := c.Locals("branch").(*irminmodels.Branch)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk || !branchOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the branch using the service
	err := api.Services.DeleteRepositoryBranch(c, locale, user, workspace, repository, branch)
	if err != nil {
		return api.handleServiceError(c, "Error deleting repository branch", err, dict)
	}

	// Invalidate branches list and branch details (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/branches", workspace.Slug, repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success message
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "branch_deleted"),
	})
}

// RepositoryGetUncommittedChanges godoc
// @Summary Get uncommitted changes
// @Description Get all uncommitted changes in a specific branch
// @Tags repository-branches
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param branch_name path string true "Branch name"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Diff} "Uncommitted changes retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Branch or repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/branches/{branch_name}/uncommitted-changes [get]
func (api *APIControllers) RepositoryGetUncommittedChanges(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	branch, branchOk := c.Locals("branch").(*irminmodels.Branch)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk || !branchOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get uncommitted changes using the service
	diff, err := api.Services.GetRepositoryUncommittedChanges(c, locale, user, workspace, repository, branch)
	if err != nil {
		return api.handleServiceError(c, "Error getting uncommitted changes", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: diff,
	})
}
