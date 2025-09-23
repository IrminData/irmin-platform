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

func (api *APIServices) GetRepositoryBranch(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	branchName string,
) (*irminmodels.Branch, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryBranch,
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
			"User is not allowed to get repository branch",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			branchName,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the branch from the data engine.
	dataEngineBranch, err := dataEngine.GetBranch(c, workspace.Slug, repository.Slug, branchName)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving branch from Data Engine", "error", err)
		return nil, err
	}

	return dataEngineBranch, nil
}

func (api *APIServices) ListRepositoryBranches(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
) ([]irminmodels.Branch, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryBranch,
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
			"User is not allowed to list repository branches",
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
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get the branches from the data engine
	branches, err := dataEngine.ListBranches(c, workspace.Slug, repository.Slug)
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving branches from Data Engine", "error", err)
		return nil, err
	}

	return branches, nil
}

func (api *APIServices) CreateRepositoryBranch(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	req irmincore.CreateBranchRequest,
) (*irminmodels.Branch, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryBranch,
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
			"User is not allowed to create repository branch",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			req.Name,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Determine the branch to create from
	fromBranch := req.From
	if fromBranch == "" {
		fromBranch = repository.DefaultBranch
	}

	// Create the branch in the data engine
	branch, err := dataEngine.CreateBranch(workspace.Slug, repository.Slug, req.Name, fromBranch, req.IsImmutable)
	if err != nil {
		api.Logger.ErrorContext(c, "Error creating branch in Data Engine", "error", err)
		return nil, err
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Branch %s created", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return branch, nil
}

func (api *APIServices) UpdateRepositoryBranch(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	branch *irminmodels.Branch,
	req irmincore.UpdateBranchRequest,
) (*irminmodels.Branch, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryBranch,
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
			"User is not allowed to update repository branch",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			branch.Name,
		)
		return nil, ErrAccessDenied
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
		api.Logger.ErrorContext(c, "Error deleting cached objects for branch", "error", dbDeleteErr)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Update the branch in the data engine
	updatedBranch, err := dataEngine.UpdateBranch(
		c,
		workspace.Slug,
		repository.Slug,
		branch.Name,
		newBranchName,
		isImmutable,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error updating branch in Data Engine", "error", err)
		return nil, err
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Branch %s updated", updatedBranch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return updatedBranch, nil
}

func (api *APIServices) DeleteRepositoryBranch(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	branch *irminmodels.Branch,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryBranch,
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
			"User is not allowed to delete repository branch",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			branch.Name,
		)
		return ErrAccessDenied
	}

	// Delete the cached objects for the branch
	dbDeleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteObjects(tx, nil, &repository.ID, &branch.Name)
	})
	if dbDeleteErr != nil {
		api.Logger.ErrorContext(c, "Error deleting cached objects for branch", "error", dbDeleteErr)
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return err
	}

	// Delete the branch in the data engine
	err = dataEngine.DeleteBranch(workspace.Slug, repository.Slug, branch.Name)
	if err != nil {
		api.Logger.ErrorContext(c, "Error deleting branch in Data Engine", "error", err)
		return err
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Branch %s deleted", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return nil
}

func (api *APIServices) GetRepositoryUncommittedChanges(
	c context.Context,
	locale string,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	branch *irminmodels.Branch,
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
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get repository uncommitted changes",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"repository",
			repository.Slug,
			"branch",
			branch.Name,
		)
		return nil, ErrAccessDenied
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.ErrorContext(c, "error creating data engine client", "error", err)
		return nil, err
	}

	// Get uncommitted changes
	diff, err := dataEngine.GetUncommittedChanges(workspace.Slug, repository.Slug, branch.Name)
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting uncommitted changes", "error", err)
		return nil, err
	}

	return diff, nil
}
