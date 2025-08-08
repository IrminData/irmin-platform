package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
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

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the branch from the data engine.
	branches, err := dataEngine.ListBranches(c, workspace.Slug, repository.Slug)
	if err != nil {
		api.Logger.Error("Error retrieving branches from Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter branches based on user permissions

	filteredBranches, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceRepository,
		db.PolicyActionRead,
		branches,
		func(_ irminmodels.Branch) uint { return repository.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering branches by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		return validationErr
	}

	// Get the immutable flag
	isImmutable := req.IsImmutable

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the branch in the data engine.
	branch, err := dataEngine.CreateBranch(workspace.Slug, repository.Slug, req.Name, req.From, isImmutable)
	if err != nil {
		api.Logger.Error("Error creating branch in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Branch %s created", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

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
		return validationErr
	}

	// Determine if the branch should be immutable
	isImmutable := branch.IsImmutable
	if req.IsImmutable != nil {
		isImmutable = *req.IsImmutable
	}

	// Determine what the new branch name should be
	newBranchName := branch.Name
	if req.Name != "" {
		newBranchName = req.Name
	}

	// Delete the cached objects for the branch
	dbDeleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteObjects(tx, nil, &repository.ID, &branch.Name)
	})
	if dbDeleteErr != nil {
		api.Logger.Error("Error deleting cached objects for branch", "error", dbDeleteErr)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update the branch in the data engine.
	branch, err = dataEngine.UpdateBranch(
		c,
		workspace.Slug,
		repository.Slug,
		branch.Name,
		newBranchName,
		isImmutable,
	)
	if err != nil {
		api.Logger.Error("Error updating branch in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Branch %s updated", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

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

	// Delete the cached objects for the branch
	dbDeleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteObjects(tx, nil, &repository.ID, &branch.Name)
	})
	if dbDeleteErr != nil {
		api.Logger.Error("Error deleting cached objects for branch", "error", dbDeleteErr)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Delete the branch in the data engine.
	err = dataEngine.DeleteBranch(workspace.Slug, repository.Slug, branch.Name)
	if err != nil {
		api.Logger.Error("Error deleting branch in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Branch %s deleted", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

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
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	branch, branchOk := c.Locals("branch").(*irminmodels.Branch)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk || !branchOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Compare the refs
	diff, err := dataEngine.GetUncommittedChanges(workspace.Slug, repository.Slug, branch.Name)
	if err != nil {
		api.Logger.Error("Error getting uncommitted changes", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: diff,
	})
}
