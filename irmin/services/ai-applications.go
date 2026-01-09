package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// GetAIApplication gets an AI application by its SQID.
//
//nolint:dupl // Each resource type needs its own service method following similar patterns.
func (api *APIServices) GetAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplicationSqid string,
) (*db.AIApplication, error) {
	// Decode the ID
	aiApplicationID, err := api.SQIDManager.Decode("ai_applications", aiApplicationSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding AI application SQID", "error", err)
		return nil, NewInternalErrorf("error decoding AI application SQID: %w", err)
	}

	// Make sure this is allowed
	resourceID := uint(aiApplicationID)
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&resourceID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Get the AI application
	aiApplication, err := api.DB.GetAIApplicationByID(uint(aiApplicationID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting AI application", "error", err)
		return nil, NewInternalErrorf("error getting AI application: %w", err)
	}

	return aiApplication, nil
}

// ListAIApplications lists AI applications in a workspace.
func (api *APIServices) ListAIApplications(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.AIApplication, error) {
	// Get all AI applications for the workspace
	aiApplications, err := api.DB.GetAIApplicationsByWorkspaceID(workspace.ID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving AI applications", "error", err)
		return nil, NewInternalErrorf("error retrieving AI applications: %w", err)
	}

	// Filter AI applications based on user permissions
	filteredAIApplications, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceAIApplication,
		db.PolicyActionRead,
		aiApplications,
		func(a db.AIApplication) uint { return a.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering AI applications by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering AI applications by permissions: %w", err)
	}

	return filteredAIApplications, nil
}

// CreateAIApplication creates a new AI application.
func (api *APIServices) CreateAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.CreateAIApplicationRequest,
) (*db.AIApplication, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
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
			"User is not allowed to create AI application",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	var aiApplication db.AIApplication

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Wrap tx in a Database struct so all DB operations use the transaction
		txDB := &db.Database{DB: tx}

		// Process data sources
		dataSources, dsErr := api.processAIApplicationDataSources(txDB, workspace, req.DataSources)
		if dsErr != nil {
			return dsErr
		}

		// Create AI application record
		aiApplication = db.AIApplication{
			Name:           req.Name,
			Description:    req.Description,
			Documentation:  req.Documentation,
			AllowedOrigins: req.AllowedOrigins,
			WorkspaceID:    workspace.ID,
			OwnerID:        user.ID,
		}

		if createErr := tx.Create(&aiApplication).Error; createErr != nil {
			return NewInternalErrorf("error creating AI application: %w", createErr)
		}

		// Explicitly create data sources (to match Update pattern and ensure persistence)
		if len(dataSources) > 0 {
			for i := range dataSources {
				dataSources[i].AIApplicationID = aiApplication.ID
				if createErr := tx.Create(&dataSources[i]).Error; createErr != nil {
					return NewInternalErrorf("error creating data source: %w", createErr)
				}
			}
			aiApplication.DataSources = dataSources
		}

		// Add tags
		if addTagsErr := api.addAIApplicationTags(tx, &aiApplication, req.Tags, workspace.ID); addTagsErr != nil {
			return NewInternalErrorf("error adding AI application tags: %w", addTagsErr)
		}

		// Fetch the full AI application object with all relations
		return tx.Preload("Owner").
			Preload("DataSources").
			Preload("DataSources.Repository").
			Preload("Tags").
			First(&aiApplication, aiApplication.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error creating AI application", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeCreate,
		Description:     "AI application created",
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return &aiApplication, nil
}

// UpdateAIApplication updates an AI application.
//
//nolint:gocognit // Complex update logic with multiple optional fields and nested operations.
func (api *APIServices) UpdateAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	req irmincore.UpdateAIApplicationRequest,
) (*db.AIApplication, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&aiApplication.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update AI application",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"ai_application",
			aiApplication.Name,
		)
		return nil, ErrAccessDenied
	}

	// Start a transaction
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Wrap tx in a Database struct
		txDB := &db.Database{DB: tx}

		// Update AI application fields
		if req.Name != nil && len(*req.Name) > 0 {
			aiApplication.Name = *req.Name
		}
		if req.Description != nil {
			aiApplication.Description = *req.Description
		}
		if req.Documentation != nil {
			aiApplication.Documentation = *req.Documentation
		}
		if req.AllowedOrigins != nil {
			aiApplication.AllowedOrigins = req.AllowedOrigins
		}

		// Save the AI application
		if saveErr := tx.Save(aiApplication).Error; saveErr != nil {
			return NewInternalErrorf("error updating AI application: %w", saveErr)
		}

		// Update data sources if provided
		if req.DataSources != nil {
			if dsErr := api.updateAIApplicationDataSources(tx, txDB, workspace, aiApplication, req.DataSources); dsErr != nil {
				return dsErr
			}
		}

		// Update tags if provided
		if req.Tags != nil {
			// Clear existing tags
			if clearTagsErr := tx.Where(&db.AIApplicationTag{AIApplicationID: aiApplication.ID}).
				Delete(&db.AIApplicationTag{}).Error; clearTagsErr != nil {
				return NewInternalErrorf("error clearing existing tags: %w", clearTagsErr)
			}

			// Add new tags
			if addTagsErr := api.addAIApplicationTags(tx, aiApplication, req.Tags, workspace.ID); addTagsErr != nil {
				return NewInternalErrorf("error adding AI application tags: %w", addTagsErr)
			}
		}

		// Fetch the full AI application object with all relations
		return tx.Preload("Owner").
			Preload("DataSources").
			Preload("DataSources.Repository").
			Preload("Tags").
			First(aiApplication, aiApplication.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error updating AI application", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeUpdate,
		Description:     fmt.Sprintf("AI application %s updated", aiApplication.Name),
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return aiApplication, nil
}

// DeleteAIApplication deletes an AI application.
//
//nolint:dupl // Each resource type needs its own service method following similar patterns.
func (api *APIServices) DeleteAIApplication(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&aiApplication.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete AI application",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"ai_application",
			aiApplication.Name,
		)
		return ErrAccessDenied
	}

	// Delete the AI application and all related records
	deleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteAIApplication(tx, aiApplication.ID)
	})
	if deleteErr != nil {
		api.Logger.ErrorContext(c, "Error deleting AI application", "error", deleteErr)
		return NewInternalErrorf("error deleting AI application: %w", deleteErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeDelete,
		Description:     "AI application deleted",
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return nil
}

// TransferAIApplicationOwnership transfers ownership of an AI application.
func (api *APIServices) TransferAIApplicationOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	req irmincore.TransferAIApplicationOwnershipRequest,
) (*db.AIApplication, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceAIApplication,
		&aiApplication.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer AI application ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"ai_application",
			aiApplication.Name,
		)
		return nil, ErrAccessDenied
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is not the current owner
	if uint(newOwnerID) == aiApplication.OwnerID {
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, NewInternalErrorf("error checking if user is in workspace: %w", isUserInWorkspaceErr)
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, NewInternalErrorf("error fetching new owner information: %w", getNewOwnerErr)
	}

	// Update the AI application record
	aiApplication.OwnerID = uint(newOwnerID)
	aiApplication.Owner = *newOwner
	if updateErr := api.DB.Save(&aiApplication).Error; updateErr != nil {
		api.Logger.ErrorContext(c, "Error updating AI application", "error", updateErr)
		return nil, updateErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:            db.LogEventTypeUpdate,
		Description:     fmt.Sprintf("AI application ownership transferred to %s", newOwner.Email),
		UserID:          &user.ID,
		WorkspaceID:     &workspace.ID,
		AIApplicationID: &aiApplication.ID,
	})

	return aiApplication, nil
}

// Helper functions

// processAIApplicationDataSources processes data sources for an AI application.
func (api *APIServices) processAIApplicationDataSources(
	txDB *db.Database,
	workspace *db.Workspace,
	dataSources []irminmodels.AIApplicationDataSource,
) ([]db.AIApplicationDataSource, error) {
	var processedDataSources []db.AIApplicationDataSource

	for _, ds := range dataSources {
		// Get repository by slug
		repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(ds.Repository, workspace.ID)
		if err != nil {
			return nil, NewInternalErrorf("error getting repository: %w", err)
		}

		// Trim leading slash from path
		path := strings.TrimLeft(ds.Path, "/")

		processedDataSources = append(processedDataSources, db.AIApplicationDataSource{
			RepositoryID: repository.ID,
			Branch:       ds.Branch,
			Path:         path,
		})
	}

	return processedDataSources, nil
}

// addAIApplicationTags adds tags to an AI application.
func (api *APIServices) addAIApplicationTags(
	tx *gorm.DB,
	aiApplication *db.AIApplication,
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
				return err
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			if tagAppendErr := tx.Model(aiApplication).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAppendErr != nil {
				return tagAppendErr
			}
		}
	}
	return nil
}

// updateAIApplicationDataSources updates data sources for an AI application.
func (api *APIServices) updateAIApplicationDataSources(
	tx *gorm.DB,
	txDB *db.Database,
	workspace *db.Workspace,
	aiApplication *db.AIApplication,
	dataSourcesReq []irminmodels.AIApplicationDataSource,
) error {
	// Delete existing data sources
	if deleteErr := tx.Where(&db.AIApplicationDataSource{AIApplicationID: aiApplication.ID}).
		Delete(&db.AIApplicationDataSource{}).Error; deleteErr != nil {
		return NewInternalErrorf("error deleting existing data sources: %w", deleteErr)
	}

	// Process new data sources
	if len(dataSourcesReq) > 0 {
		dataSources, dsErr := api.processAIApplicationDataSources(txDB, workspace, dataSourcesReq)
		if dsErr != nil {
			return dsErr
		}

		// Explicitly create new data sources (GORM Save doesn't persist one-to-many associations)
		for i := range dataSources {
			dataSources[i].AIApplicationID = aiApplication.ID
			if createErr := tx.Create(&dataSources[i]).Error; createErr != nil {
				return NewInternalErrorf("error creating data source: %w", createErr)
			}
		}
		aiApplication.DataSources = dataSources
	} else {
		aiApplication.DataSources = []db.AIApplicationDataSource{}
	}

	return nil
}
