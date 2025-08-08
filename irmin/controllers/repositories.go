package controllers

import (
	"context"
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
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
//
//nolint:dupl // This is not a duplicate of anything, it's just similar to other index endpoints
func (api *APIControllers) RepositoriesIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all repositories in the workspace.
	repositories, getRepositoriesErr := api.DB.GetRepositoriesInWorkspace(workspace.ID)
	if getRepositoriesErr != nil {
		api.Logger.Error("Error fetching repositories", "error", getRepositoriesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter repositories based on user permissions
	filteredRepositories, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceRepository,
		db.PolicyActionRead,
		repositories,
		func(r db.Repository) uint { return r.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering repositories by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	repositoriesResponse, formatErr := formatter.FormatIndexResponse(
		filteredRepositories,
		formatter.FormatRepositoryResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting repositories", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoriesResponse,
	})
}

func (api *APIControllers) createRepositoryInTransaction(
	dataEngine *engine.Client,
	repositorySlug string,
	req irmincore.CreateRepositoryRequest,
	gcSettings *utils.GarbageCollectionSettings,
	workspace *db.Workspace,
	user *db.User,
) (*db.Repository, *engine.Repository, error) {
	var repository *db.Repository
	var dataEngineRepository *engine.Repository

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create the repository in the database
		repository = &db.Repository{
			Name:          req.Name,
			Slug:          repositorySlug,
			Description:   req.Description,
			Documentation: req.Documentation,
			DefaultBranch: req.DefaultBranch,
			IsImmutable:   req.IsImmutable,
			WorkspaceID:   workspace.ID,
			OwnerID:       user.ID,
		}
		if createRepositoryErr := tx.Create(&repository).Error; createRepositoryErr != nil {
			api.Logger.Error("Error creating repository in database", "error", createRepositoryErr)
			return createRepositoryErr
		}

		// Create the repository in the Data Engine
		var createRepositoryInDataEngineErr error
		dataEngineRepository, createRepositoryInDataEngineErr = dataEngine.CreateRepository(
			workspace.Slug,
			repositorySlug,
			req.DefaultBranch,
			req.IsImmutable,
			gcSettings.DefaultRetentionDays,
			gcSettings.DefaultBranchRetentionDays,
		)
		if createRepositoryInDataEngineErr != nil {
			api.Logger.Error("Error creating repository in Data Engine", "error", createRepositoryInDataEngineErr)
			return createRepositoryInDataEngineErr
		}

		// Update the repository in the database with Data Engine information
		repository.LakeFSRepoID = dataEngineRepository.ID
		repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
		repository.IsImmutable = dataEngineRepository.IsImmutable
		repository.DefaultBranch = dataEngineRepository.DefaultBranch
		repository.StorageNamespace = dataEngineRepository.StorageNamespace
		if updateRepositoryErr := tx.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.Error("Error updating repository with Data Engine information", "error", updateRepositoryErr)
			return updateRepositoryErr
		}

		return nil
	})

	return repository, dataEngineRepository, transactionErr
}

func (api *APIControllers) updateRepositoryInTransaction(
	dataEngine *engine.Client,
	repository *db.Repository,
	req irmincore.UpdateRepositoryRequest,
	gcSettings *utils.GarbageCollectionSettings,
	workspace *db.Workspace,
) (*engine.Repository, error) {
	var dataEngineRepository *engine.Repository

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Only update fields that were provided
		if req.Name != "" {
			repository.Name = req.Name
		}
		if req.Description != "" {
			repository.Description = req.Description
		}
		if req.Documentation != "" {
			repository.Documentation = req.Documentation
		}

		// Handle is_immutable with pointer type for optional boolean
		if req.IsImmutable != nil {
			repository.IsImmutable = *req.IsImmutable
		}

		// Update the repository in the database
		if updateRepositoryErr := tx.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.Error("Error updating repository in database", "error", updateRepositoryErr)
			return updateRepositoryErr
		}

		// Update the repository in the Data Engine
		var updateRepositoryInDataEngineErr error
		dataEngineRepository, updateRepositoryInDataEngineErr = dataEngine.UpdateRepository(
			workspace.Slug,
			repository.Slug,
			gcSettings.DefaultRetentionDays,
			gcSettings.DefaultBranchRetentionDays,
		)
		if updateRepositoryInDataEngineErr != nil {
			api.Logger.Error("Error updating repository in Data Engine", "error", updateRepositoryInDataEngineErr)
			return updateRepositoryInDataEngineErr
		}

		// Update the repository in the database with Data Engine information
		repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
		if updateRepositoryErr := tx.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.Error("Error updating repository with Data Engine information", "error", updateRepositoryErr)
			return updateRepositoryErr
		}

		return nil
	})

	return dataEngineRepository, transactionErr
}

func (api *APIControllers) deleteRepositoryInTransaction(
	ctx context.Context,
	dataEngine *engine.Client,
	repository *db.Repository,
	workspace *db.Workspace,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Remove tag associations
		if err := tx.Where("repository_id = ?", repository.ID).Delete(&db.RepositoryTag{}).Error; err != nil {
			return err
		}
		// Delete associated schema caches
		if err := tx.Where("repository_id = ?", repository.ID).Delete(&db.RepositorySchemaCache{}).Error; err != nil {
			return err
		}
		// Delete the repository
		if err := tx.Delete(&db.Repository{}, repository.ID).Error; err != nil {
			return err
		}

		// Delete the repository from the Data Engine after the database is deleted
		if err := dataEngine.DeleteRepository(ctx, workspace.Slug, repository.Slug, false); err != nil {
			api.Logger.Error("Error deleting repository in Data Engine", "error", err)
			return err
		}

		return nil
	})

	return transactionErr
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
		api.Logger.Error("Error validating workspace repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateRepositoryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Format the slug from the name
	repositorySlug := utils.Slugify(req.Name)

	// Make sure such repository does not exist
	if api.DB.CheckIfRepositoryExists(repositorySlug, workspace.ID) {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "repository_already_exists")},
		})
	}

	// Determine the default branch
	if req.DefaultBranch == "" {
		req.DefaultBranch = "main"
	}

	// Create garbage collection settings struct
	gcSettings := utils.GarbageCollectionSettings{
		DefaultRetentionDays:       req.GarbageDefaultRetentionDays,
		DefaultBranchRetentionDays: req.GarbageDefaultBranchRetentionDays,
	}

	if gcValidateErr := utils.ValidateGarbageCollectionSettings(&gcSettings); gcValidateErr != nil {
		api.Logger.Error("Invalid garbage collection settings", "error", gcValidateErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c,
		locale,
		api.Logger,
		api.Env,
	)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Use database transaction to ensure atomicity
	repository, dataEngineRepository, transactionErr := api.createRepositoryInTransaction(
		dataEngine,
		repositorySlug,
		req,
		&gcSettings,
		workspace,
		user,
	)

	// If transaction failed, cleanup Data Engine repository if it was created
	if transactionErr != nil {
		api.Logger.Error("Transaction failed, cleaning up Data Engine repository", "error", transactionErr)

		// If we have a data engine repository, try to delete it
		if dataEngineRepository != nil {
			go func() {
				if cleanupErr := dataEngine.DeleteRepository(c, workspace.Slug, repositorySlug, false); cleanupErr != nil {
					api.Logger.Error(
						"Failed to cleanup Data Engine repository",
						"error",
						cleanupErr,
						"repository",
						repositorySlug,
					)
				} else {
					api.Logger.Info("Successfully cleaned up Data Engine repository", "repository", repositorySlug)
				}
			}()
		}

		// Log the failed event
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Repository %s creation failed", repository.Slug),
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})

		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Reload the repository with Owner and Tags relationships preloaded
	if preloadErr := api.DB.Preload("Owner").Preload("Tags").First(&repository, repository.ID).Error; preloadErr != nil {
		api.Logger.Error("Error preloading repository owner and tags", "error", preloadErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Repository %s created", repository.Slug),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

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
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
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

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c,
		repositoryLocalParams.locale,
		api.Logger,
		api.Env,
	)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.deleteRepositoryInTransaction(
		c,
		dataEngine,
		repositoryLocalParams.repository,
		repositoryLocalParams.workspace,
	)

	// If transaction failed, log the error
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for repository deletion", "error", transactionErr)

		// Log the failed event
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Repository %s deletion failed", repositoryLocalParams.repository.Slug),
			UserID:      &repositoryLocalParams.user.ID,
			WorkspaceID: &repositoryLocalParams.workspace.ID,
		})

		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Repository %s deleted", repositoryLocalParams.repository.Slug),
		UserID:       &repositoryLocalParams.user.ID,
		WorkspaceID:  &repositoryLocalParams.workspace.ID,
		RepositoryID: &repositoryLocalParams.repository.ID,
	})

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
		return validationErr
	}

	// Create garbage collection settings from request
	gcSettings := &utils.GarbageCollectionSettings{
		DefaultRetentionDays:       req.GarbageDefaultRetentionDays,
		DefaultBranchRetentionDays: req.GarbageDefaultBranchRetentionDays,
	}

	// If no new default branch retention days provided, use existing value
	if gcSettings.DefaultBranchRetentionDays == nil {
		gcSettings.DefaultBranchRetentionDays = utils.GetDefaultBranchRetentionDays(
			repository.GarbageCollectionRules.Branches,
			repository.DefaultBranch,
		)
	}

	if gcValidateErr := utils.ValidateGarbageCollectionSettings(gcSettings); gcValidateErr != nil {
		api.Logger.Error("Invalid garbage collection settings", "error", gcValidateErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c,
		repositoryLocalParams.locale,
		api.Logger,
		api.Env,
	)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Use database transaction to ensure atomicity
	_, transactionErr := api.updateRepositoryInTransaction(
		dataEngine,
		repository,
		req,
		gcSettings,
		repositoryLocalParams.workspace,
	)

	// If transaction failed, log the error
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for repository update", "error", transactionErr)

		// Log the failed event
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Repository %s update failed", repository.Slug),
			UserID:      &repositoryLocalParams.user.ID,
			WorkspaceID: &repositoryLocalParams.workspace.ID,
		})

		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s settings updated", repository.Slug),
		WorkspaceID:  &repositoryLocalParams.workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &repositoryLocalParams.user.ID,
	})

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

	repository := repositoryLocalParams.repository

	// Parse and validate the JSON request body
	var req irmincore.TransferRepositoryOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, repositoryLocalParams.dict); validationErr != nil {
		return validationErr
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.Error("Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), repositoryLocalParams.workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.Error("Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "new_owner_invalid")},
		})
	}

	// Update the repository in the database
	repository.OwnerID = uint(newOwnerID)
	if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
		api.Logger.Error("Error updating repository", "error", updateRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Reload the repository with new Owner and Tags relationships preloaded
	if preloadErr := api.DB.Preload("Owner").Preload("Tags").First(&repository, repository.ID).Error; preloadErr != nil {
		api.Logger.Error("Error preloading repository owner and tags after ownership transfer", "error", preloadErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s ownership transferred to %s", repository.Slug, repository.Owner.Email),
		WorkspaceID:  &repositoryLocalParams.workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &repositoryLocalParams.user.ID,
	})

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
