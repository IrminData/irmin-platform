package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

func (api *APIServices) CompareRepositoryRefs(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	baseRef, compareRef string,
) (*irminmodels.Diff, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryCommit,
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
			"User is not allowed to compare repository refs",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"baseRef",
			baseRef,
			"compareRef",
			compareRef,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Compare the refs
	diff, err := dataEngine.CompareRefs(c, workspace.Slug, repository.Slug, baseRef, compareRef)
	if err != nil {
		api.Logger.ErrorContext(c, "Error comparing refs", "error", err)
		return nil, NewInternalErrorf("error comparing refs: %w", err)
	}

	return diff, nil
}

func (api *APIServices) MergeRepositoryRefs(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.MergeRefsRequest,
) (*irminmodels.Commit, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryCommit,
		&repository.ID,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to merge repository refs",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"baseRef",
			req.BaseRef,
			"compareRef",
			req.CompareRef,
		)
		return nil, ErrAccessDenied
	}

	// Get the base and compare refs
	baseRef := req.BaseRef
	compareRef := req.CompareRef

	// Get the description and strategy
	description := req.Description
	strategy := req.Strategy
	if strategy == "default" {
		strategy = ""
	}

	// Get squash and allow_empty flags
	squash := req.Squash
	allowEmpty := req.AllowEmpty

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, NewInternalErrorf("error creating data engine client: %w", err)
	}

	// Merge the refs
	mergeCommit, err := dataEngine.MergeRefs(
		workspace.Slug,
		repository.Slug,
		baseRef,
		compareRef,
		description,
		user.Email,
		strategy,
		squash,
		allowEmpty,
	)

	if err != nil {
		api.Logger.ErrorContext(c, "Error merging refs", "error", err)
		return nil, NewInternalErrorf("error merging refs: %w", err)
	}

	// Delete the cached objects for the target branch
	dbDeleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		if deleteErr := api.DB.DeleteObjects(tx, nil, &repository.ID, &baseRef); deleteErr != nil {
			return NewInternalErrorf("error deleting cached objects: %w", deleteErr)
		}
		return nil
	})
	if dbDeleteErr != nil {
		api.Logger.WarnContext(c, "Error deleting cached objects for branch", "error", dbDeleteErr)
		// Don't fail the merge operation if the cached objects cannot be deleted
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Merged %s into %s", compareRef, baseRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return mergeCommit, nil
}
