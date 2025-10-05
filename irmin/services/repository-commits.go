package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (api *APIServices) ListRepositoryCommits(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	ref string,
	after *string,
	perPage *int,
) ([]irminmodels.Commit, *lakefs.Pagination, error) {
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
		return nil, nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list repository commits",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"ref",
			ref,
		)
		return nil, nil, ErrAccessDenied
	}

	// If the ref is not provided, use the default branch
	if ref == "" {
		ref = repository.DefaultBranch
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, nil, createDataEngineClientErr
	}

	// Get the commits from the data engine
	commits, lakefsPagination, listCommitsErr := dataEngine.ListCommits(
		workspace.Slug,
		repository.Slug,
		ref,
		after,
		perPage,
	)
	if listCommitsErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving commits from Data Engine", "error", listCommitsErr)
		return nil, nil, listCommitsErr
	}

	return commits, lakefsPagination, nil
}

func (api *APIServices) CreateRepositoryCommit(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.CreateCommitRequest,
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
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create repository commit",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			req.Branch,
		)
		return nil, ErrAccessDenied
	}

	// If the branch is not provided, use the default branch
	if req.Branch == "" {
		req.Branch = repository.DefaultBranch
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, createDataEngineClientErr
	}

	// Commit the changes in the data engine
	commit, commitChangesErr := dataEngine.CommitChanges(
		workspace.Slug,
		repository.Slug,
		req.Branch,
		req.Message,
		user.Email,
		true,
	)
	if commitChangesErr != nil {
		api.Logger.ErrorContext(c, "Error committing changes in Data Engine", "error", commitChangesErr)
		return nil, commitChangesErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Commit %s created on branch %s", commit.Hash, req.Branch),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return commit, nil
}

func (api *APIServices) GetRepositoryCommit(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	hash string,
) (*irminmodels.Commit, error) {
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
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get repository commit",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"hash",
			hash,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return nil, createDataEngineClientErr
	}

	// Get the commit from the data engine
	commit, getCommitErr := dataEngine.GetCommit(workspace.Slug, repository.Slug, hash)
	if getCommitErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving commit from Data Engine", "error", getCommitErr)
		return nil, getCommitErr
	}

	return commit, nil
}

func (api *APIServices) RevertRepositoryUncommittedChanges(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.RevertUncommittedChangesRequest,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryCommit,
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
			"User is not allowed to revert repository uncommitted changes",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			req.Branch,
		)
		return ErrAccessDenied
	}

	// If the branch is not provided, use the default branch
	if req.Branch == "" {
		req.Branch = repository.DefaultBranch
	}

	// if the path is not provided, use the root path
	if req.Path == "" {
		req.Path = "/"
	}

	// if the path type is not provided, use the file path type
	if req.PathType == "" {
		req.PathType = "reset"
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env, api.DB)
	if createDataEngineClientErr != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", createDataEngineClientErr)
		return createDataEngineClientErr
	}

	// Revert the uncommitted changes in the data engine
	revertUncommittedChangesErr := dataEngine.RevertUncommitedChanges(
		workspace.Slug,
		repository.Slug,
		req.Branch,
		req.Path,
		req.PathType,
	)
	if revertUncommittedChangesErr != nil {
		api.Logger.ErrorContext(
			c,
			"Error reverting uncommitted changes in Data Engine",
			"error",
			revertUncommittedChangesErr,
		)
		return revertUncommittedChangesErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("Uncommitted changes reverted on branch %s", req.Branch),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return nil
}
