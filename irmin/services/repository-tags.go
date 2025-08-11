package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (api *APIServices) GetRepositoryTag(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	tagName string,
) (*irminmodels.GitTag, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryTag,
		&repository.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get repository tag",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"tagName",
			tagName,
		)
		return nil, ErrAccessDenied
	}

	// Check if the tag name is provided
	if tagName == "" {
		api.Logger.ErrorContext(c, "No tag selected")
		return nil, ErrInvalidRequest
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the tag from the data engine.
	dataEngineTag, err := dataEngine.GetTag(workspace.Slug, repository.Slug, tagName)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving tag from Data Engine", "error", err)
		return nil, err
	}

	return dataEngineTag, nil
}

func (api *APIServices) ListRepositoryTags(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
) ([]irminmodels.GitTag, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryTag,
		&repository.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list repository tags",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, createDataEngineClientErr
	}

	// Get the tags from the data engine
	tags, listTagsErr := dataEngine.ListTags(workspace.Slug, repository.Slug)
	if listTagsErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving tags from Data Engine", "error", listTagsErr)
		return nil, listTagsErr
	}

	return tags, nil
}

func (api *APIServices) CreateRepositoryTag(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.CreateRepositoryTagRequest,
) (*irminmodels.GitTag, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryTag,
		&repository.ID,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create repository tag",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"tagName",
			req.Name,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, createDataEngineClientErr
	}

	// Create the tag in the data engine
	tag, createTagErr := dataEngine.CreateTag(
		workspace.Slug,
		repository.Slug,
		req.Name,
		req.Ref,
	)
	if createTagErr != nil {
		api.Logger.ErrorContext(c, "Error creating tag in Data Engine", "error", createTagErr)
		return nil, createTagErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Tag %s created pointing to %s", tag.Name, req.Ref),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	return tag, nil
}

func (api *APIServices) DeleteRepositoryTag(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	tag *irminmodels.GitTag,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryTag,
		&repository.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete repository tag",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"tagName",
			tag.Name,
		)
		return ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return createDataEngineClientErr
	}

	// Delete the tag from the data engine
	if deleteTagErr := dataEngine.DeleteTag(workspace.Slug, repository.Slug, tag.Name); deleteTagErr != nil {
		api.Logger.ErrorContext(c, "Error deleting tag in Data Engine", "error", deleteTagErr)
		return deleteTagErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Tag %s deleted", tag.Name),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	return nil
}
