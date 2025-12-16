package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/permissions"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	"gorm.io/gorm"
)

func (api *APIServices) GetRepositoryBySlug(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repositorySlug string,
) (*db.Repository, error) {
	// Make sure the repository slug is provided
	if repositorySlug == "" {
		api.Logger.ErrorContext(c, "No repository selected")
		return nil, ErrInvalidRequest
	}

	// Get the repository by its slug and workspace ID.
	repository, err := lib.GetRepository(
		c,
		locale,
		api.DB,
		api.Logger,
		api.Env,
		workspace,
		repositorySlug,
		false,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving repository", "error", err)
		return nil, NewInternalErrorf("error retrieving repository: %w", err)
	}

	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repositorySlug,
		)
		return nil, ErrAccessDenied
	}

	return repository, nil
}

func (api *APIServices) ListRepositories(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.Repository, error) {
	// Get all repositories in the workspace.
	repositories, getRepositoriesErr := api.DB.GetRepositoriesInWorkspace(workspace.ID)
	if getRepositoriesErr != nil {
		api.Logger.ErrorContext(c, "Error fetching repositories", "error", getRepositoriesErr)
		return nil, NewInternalErrorf("error fetching repositories: %w", getRepositoriesErr)
	}

	// Filter repositories based on user permissions
	filteredRepositories, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceRepository,
		db.PolicyActionRead,
		repositories,
		func(r db.Repository) uint { return r.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering repositories by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering repositories by permissions: %w", err)
	}

	return filteredRepositories, nil
}

func (api *APIServices) createRepositoryInTransaction(
	ctx context.Context,
	dataEngine *engine.Client,
	repositorySlug string,
	req irmincore.CreateRepositoryRequest,
	gcSettings *utils.GarbageCollectionSettings,
	workspace *db.Workspace,
	user *db.User,
) (*db.Repository, *engine.Repository, error) {
	// Acquire session-scoped advisory lock before starting transaction
	// Use workspace slug for consistency with engine layer
	lockKey := fmt.Sprintf("repository:create:%s:%s", workspace.Slug, repositorySlug)
	locked, lockErr := db.TryLockKey(api.DB.DB, lockKey)
	if lockErr != nil {
		api.Logger.ErrorContext(ctx, "Error acquiring lock for repository creation", "error", lockErr)
		return nil, nil, NewInternalErrorf("error acquiring lock for repository creation: %w", lockErr)
	}
	if !locked {
		// Another instance is creating this repository
		api.Logger.InfoContext(
			ctx,
			"Repository creation already in progress by another instance",
			"repository",
			repositorySlug,
		)
		return nil, nil, ErrRepositoryAlreadyExists
	}
	defer func() {
		if unlockErr := db.UnlockKey(api.DB.DB, lockKey); unlockErr != nil {
			api.Logger.ErrorContext(ctx, "Error releasing repository creation lock", "error", unlockErr)
		}
	}()

	// Double-check if repository exists after acquiring lock
	if api.DB.CheckIfRepositoryExists(repositorySlug, workspace.ID) {
		return nil, nil, ErrRepositoryAlreadyExists
	}

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
			api.Logger.ErrorContext(ctx, "Error creating repository in database", "error", createRepositoryErr)
			return NewInternalErrorf("error creating repository in database: %w", createRepositoryErr)
		}

		var err error
		dataEngineRepository, err = api.createAndSyncDataEngineRepository(
			ctx,
			tx,
			dataEngine,
			repository,
			req,
			gcSettings,
			workspace.Slug,
			repositorySlug,
		)
		if err != nil {
			return NewInternalErrorf("error creating and syncing data engine repository: %w", err)
		}

		// Add tags
		if addTagsErr := api.addRepositoryTags(tx, repository, req.Tags, workspace.ID); addTagsErr != nil {
			return NewInternalErrorf("error adding repository tags: %w", addTagsErr)
		}

		return nil
	})

	if transactionErr != nil {
		return repository, dataEngineRepository, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}
	return repository, dataEngineRepository, nil
}

func (api *APIServices) updateRepositoryInTransaction(
	ctx context.Context,
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
		if req.Name != nil && len(*req.Name) > 0 {
			repository.Name = *req.Name
		}
		if req.Description != nil {
			repository.Description = *req.Description
		}
		if req.Documentation != nil {
			repository.Documentation = *req.Documentation
		}

		// Handle is_immutable with pointer type for optional boolean
		if req.IsImmutable != nil {
			repository.IsImmutable = *req.IsImmutable
		}

		// Update the repository in the database
		if updateRepositoryErr := tx.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.ErrorContext(ctx, "Error updating repository in database", "error", updateRepositoryErr)
			return NewInternalErrorf("error updating repository in database: %w", updateRepositoryErr)
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
			api.Logger.ErrorContext(
				ctx,
				"Error updating repository in Data Engine",
				"error",
				updateRepositoryInDataEngineErr,
			)
			return NewInternalErrorf("error updating repository in data engine: %w", updateRepositoryInDataEngineErr)
		}

		// Update the repository in the database with Data Engine information
		repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
		if updateRepositoryErr := tx.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.ErrorContext(
				ctx,
				"Error updating repository with Data Engine information",
				"error",
				updateRepositoryErr,
			)
			return NewInternalErrorf("error updating repository with data engine information: %w", updateRepositoryErr)
		}

		return nil
	})

	if transactionErr != nil {
		return dataEngineRepository, NewInternalErrorf("error in database transaction: %w", transactionErr)
	}
	return dataEngineRepository, nil
}

func (api *APIServices) deleteRepositoryInTransaction(
	ctx context.Context,
	dataEngine *engine.Client,
	repository *db.Repository,
	workspace *db.Workspace,
) error {
	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Remove tag associations
		if err := tx.Where(&db.RepositoryTag{RepositoryID: repository.ID}).Delete(&db.RepositoryTag{}).Error; err != nil {
			return NewInternalErrorf("error deleting repository tags: %w", err)
		}

		// Soft delete associated repository objects.
		// We do not delete RepositoryObjectTags to preserve them in case of restoration.
		if err := tx.Where("repository_id = ?", repository.ID).Delete(&db.RepositoryObject{}).Error; err != nil {
			return NewInternalErrorf("error deleting repository objects: %w", err)
		}

		// Delete associated schema caches
		if err := tx.Where(&db.RepositorySchemaCache{RepositoryID: repository.ID}).Delete(&db.RepositorySchemaCache{}).Error; err != nil {
			return NewInternalErrorf("error deleting repository schema caches: %w", err)
		}
		// Delete the repository
		if err := tx.Delete(&db.Repository{}, repository.ID).Error; err != nil {
			return NewInternalErrorf("error deleting repository: %w", err)
		}

		// Delete the repository from the Data Engine after the database is deleted
		if err := dataEngine.DeleteRepository(ctx, workspace.Slug, repository.Slug, false); err != nil {
			api.Logger.ErrorContext(ctx, "Error deleting repository in Data Engine", "error", err)
			return NewInternalErrorf("error deleting repository in data engine: %w", err)
		}

		return nil
	})

	if transactionErr != nil {
		return NewInternalErrorf("error in database transaction: %w", transactionErr)
	}
	return nil
}

func (api *APIServices) CreateRepository(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateRepositoryRequest,
) (*db.Repository, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Format the slug from the name
	repositorySlug := utils.Slugify(req.Name)

	// Early check: fail fast if repository already exists
	if api.DB.CheckIfRepositoryExists(repositorySlug, workspace.ID) {
		return nil, ErrRepositoryAlreadyExists
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
		api.Logger.ErrorContext(c, "Invalid garbage collection settings", "error", gcValidateErr)
		return nil, NewInternalErrorf("error validating garbage collection settings: %w", gcValidateErr)
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c,
		locale,
		api.Logger,
		api.Env,
		api.DB,
	)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, createDataEngineClientErr
	}

	// Use database transaction to ensure atomicity
	repository, dataEngineRepository, transactionErr := api.createRepositoryInTransaction(
		c,
		dataEngine,
		repositorySlug,
		req,
		&gcSettings,
		workspace,
		user,
	)

	// If transaction failed, cleanup Data Engine repository if it was created
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed, cleaning up Data Engine repository", "error", transactionErr)

		// If we have a data engine repository, try to delete it
		if dataEngineRepository != nil {
			go func() {
				if cleanupErr := dataEngine.DeleteRepository(c, workspace.Slug, repositorySlug, false); cleanupErr != nil {
					api.Logger.ErrorContext(
						c,
						"Failed to cleanup Data Engine repository",
						"error",
						cleanupErr,
						"repository",
						repositorySlug,
					)
				} else {
					api.Logger.InfoContext(c, "Successfully cleaned up Data Engine repository", "repository", repositorySlug)
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

		return nil, transactionErr
	}

	// Reload the repository with Owner and Tags relationships preloaded
	if preloadErr := api.DB.Preload("Owner").Preload("Tags").First(&repository, repository.ID).Error; preloadErr != nil {
		api.Logger.ErrorContext(c, "Error preloading repository owner and tags", "error", preloadErr)
		return nil, preloadErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Repository %s created", repository.Slug),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return repository, nil
}

func (api *APIServices) UpdateRepository(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.UpdateRepositoryRequest,
) (*db.Repository, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
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
		api.Logger.ErrorContext(c, "Invalid garbage collection settings", "error", gcValidateErr)
		return nil, gcValidateErr
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c,
		locale,
		api.Logger,
		api.Env,
		api.DB,
	)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, createDataEngineClientErr
	}

	// Use database transaction to ensure atomicity
	_, transactionErr := api.updateRepositoryInTransaction(
		c,
		dataEngine,
		repository,
		req,
		gcSettings,
		workspace,
	)

	// If transaction failed, log the error
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed for repository update", "error", transactionErr)

		// Log the failed event
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Repository %s update failed", repository.Slug),
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})

		return nil, transactionErr
	}

	// Reload the repository with Owner and Tags relationships preloaded
	if preloadErr := api.DB.Preload("Owner").Preload("Tags").First(&repository, repository.ID).Error; preloadErr != nil {
		api.Logger.ErrorContext(c, "Error preloading repository owner and tags", "error", preloadErr)
		return nil, preloadErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s settings updated", repository.Slug),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	return repository, nil
}

func (api *APIServices) DeleteRepository(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete repository",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c,
		locale,
		api.Logger,
		api.Env,
		api.DB,
	)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return createDataEngineClientErr
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.deleteRepositoryInTransaction(
		c,
		dataEngine,
		repository,
		workspace,
	)

	// If transaction failed, log the error
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed for repository deletion", "error", transactionErr)

		// Log the failed event
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: fmt.Sprintf("Repository %s deletion failed", repository.Slug),
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})

		return transactionErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Repository %s deleted", repository.Slug),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return nil
}

func (api *APIServices) TransferRepositoryOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.TransferRepositoryOwnershipRequest,
) (*db.Repository, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer repository ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, ErrNewOwnerInvalid
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Update the repository in the database
	repository.OwnerID = uint(newOwnerID)
	if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
		api.Logger.ErrorContext(c, "Error updating repository", "error", updateRepositoryErr)
		return nil, updateRepositoryErr
	}

	// Reload the repository with new Owner and Tags relationships preloaded
	if preloadErr := api.DB.Preload("Owner").Preload("Tags").First(&repository, repository.ID).Error; preloadErr != nil {
		api.Logger.ErrorContext(
			c,
			"Error preloading repository owner and tags after ownership transfer",
			"error",
			preloadErr,
		)
		return nil, preloadErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s ownership transferred to %s", repository.Slug, repository.Owner.Email),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	return repository, nil
}

// ---- Helper functions ----

func (api *APIServices) createAndSyncDataEngineRepository(
	ctx context.Context,
	tx *gorm.DB,
	dataEngine *engine.Client,
	repository *db.Repository,
	req irmincore.CreateRepositoryRequest,
	gcSettings *utils.GarbageCollectionSettings,
	workspaceSlug string,
	repositorySlug string,
) (*engine.Repository, error) {
	// Create the repository in the Data Engine
	dataEngineRepository, err := dataEngine.CreateRepository(
		workspaceSlug,
		repositorySlug,
		req.DefaultBranch,
		req.IsImmutable,
		gcSettings.DefaultRetentionDays,
		gcSettings.DefaultBranchRetentionDays,
	)
	if err != nil {
		api.Logger.ErrorContext(
			ctx,
			"Error creating repository in Data Engine",
			"error",
			err,
		)
		return nil, NewInternalErrorf("error creating repository in data engine: %w", err)
	}

	// Update the repository in the database with Data Engine information
	repository.LakeFSRepoID = dataEngineRepository.ID
	repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
	repository.IsImmutable = dataEngineRepository.IsImmutable
	repository.DefaultBranch = dataEngineRepository.DefaultBranch
	repository.StorageNamespace = dataEngineRepository.StorageNamespace

	if saveErr := tx.Save(repository).Error; saveErr != nil {
		api.Logger.ErrorContext(
			ctx,
			"Error updating repository with Data Engine information",
			"error",
			saveErr,
		)
		return nil, saveErr
	}

	return dataEngineRepository, nil
}

func (api *APIServices) addRepositoryTags(
	tx *gorm.DB,
	repository *db.Repository,
	tags []string,
	workspaceID uint,
) error {
	if len(tags) > 0 {
		for _, tagSqid := range tags {
			tagID, tagDecodeErr := api.SQIDManager.Decode("tags", tagSqid)
			if tagDecodeErr != nil {
				return tagDecodeErr
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if err := tx.First(&tag, uint(tagID)).Error; err != nil {
				return NewInternalErrorf("error fetching tag from database: %w", err)
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			if tagAppendErr := tx.Model(repository).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAppendErr != nil {
				return tagAppendErr
			}
		}
	}
	return nil
}
