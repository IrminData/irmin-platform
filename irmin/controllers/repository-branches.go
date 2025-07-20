package controllers

import (
	"fmt"
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

	// Return the created branch
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "branch_created"),
		Data:    branch,
	})
}

func (api *APIControllers) RepositoryBranchesShow(c fiber.Ctx) error {
	branch, branchOk := c.Locals("branch").(*irminmodels.Branch)
	if !branchOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: branch,
	})
}

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

	// Return the updated branch
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "branch_updated"),
		Data:    branch,
	})
}

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

	// Return a success message
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "branch_deleted"),
	})
}

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
