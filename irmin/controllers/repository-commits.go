package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RepositoryCommitsIndex godoc
// @Summary List repository commits
// @Description Get all commits in a repository with optional filtering and pagination
// @Tags repository-commits
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param ref query string false "Reference (branch, tag, or commit) to list commits from"
// @Param per_page query int false "Number of items per page"
// @Param after query string false "Cursor for pagination (commit ID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Commit,pagination=irminmodels.IrminAPIPaginationMetadata} "Commits retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/commits [get]
func (api *APIControllers) RepositoryCommitsIndex(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	user, userOk := c.Locals("user").(*db.User)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request query
	params, err := utils.ParseQueryParams(c, nil, []string{"ref", "per_page", "after"})
	if err != nil {
		api.Logger.Error("Error parsing query params", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse pagination parameters
	pagination := parseCursorPaginationParams(params)

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the commits from the data engine.
	var commits []irminmodels.Commit
	var lakefsPagination *lakefs.Pagination
	var listCommitsErr error
	commits, lakefsPagination, listCommitsErr = dataEngine.ListCommits(
		workspace.Slug,
		repository.Slug,
		params["ref"],
		pagination.after,
		&pagination.perPage,
	)
	if listCommitsErr != nil {
		api.Logger.Error("Error retrieving commits from Data Engine", "error", listCommitsErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter commits based on user permissions
	filteredCommits, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceRepository,
		db.PolicyActionRead,
		commits,
		func(_ irminmodels.Commit) uint { return repository.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering commits by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the commits with pagination
	if lakefsPagination != nil {
		paginationResponse := buildCursorPaginationResponse(
			lakefsPagination.Results,
			pagination.perPage,
			lakefsPagination.HasMore,
			&lakefsPagination.NextOffset,
		)
		return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
			Pagination: paginationResponse,
			Data:       filteredCommits,
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: filteredCommits,
	})
}

// RepositoryCommitsStore godoc
// @Summary Create commit
// @Description Create a new commit with the current changes in a branch
// @Tags repository-commits
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param request body irmincore.CreateCommitRequest true "Commit creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Commit} "Commit created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/commits [post]
func (api *APIControllers) RepositoryCommitsStore(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateCommitRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Commit the changes in the data engine.
	commit, commitChangesErr := dataEngine.CommitChanges(
		workspace.Slug,
		repository.Slug,
		req.Branch,
		req.Message,
		user.Email,
		true,
	)
	if commitChangesErr != nil {
		api.Logger.Error("Error committing changes in Data Engine", "error", commitChangesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Commit %s created on branch %s", commit.Hash, req.Branch),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the created commit
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "commit_created"),
		Data:    commit,
	})
}

// RepositoryCommitsShow godoc
// @Summary Get commit details
// @Description Get details of a specific commit by its hash
// @Tags repository-commits
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param hash path string true "Commit hash"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Commit} "Commit retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid commit hash"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Commit or repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/commits/{hash} [get]
func (api *APIControllers) RepositoryCommitsShow(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the commit hash from the path
	hash := c.Params("hash")
	if hash == "" {
		api.Logger.Error("Error parsing commit hash from path")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the commit from the data engine.
	commit, getCommitErr := dataEngine.GetCommit(workspace.Slug, repository.Slug, hash)
	if getCommitErr != nil {
		api.Logger.Error("Error retrieving commit from Data Engine", "error", getCommitErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the commit
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: commit,
	})
}

// RepositoryRevertUncommittedChanges godoc
// @Summary Revert uncommitted changes
// @Description Revert uncommitted changes in a specific branch and path
// @Tags repository-commits
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param request body irmincore.RevertUncommittedChangesRequest true "Revert operation parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse "Changes reverted successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/revert-uncommitted-changes [post]
func (api *APIControllers) RepositoryRevertUncommittedChanges(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.RevertUncommittedChangesRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c, locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Revert the uncommitted changes in the data engine.
	revertUncommittedChangesErr := dataEngine.RevertUncommitedChanges(
		workspace.Slug,
		repository.Slug,
		req.Branch,
		req.Path,
		req.PathType,
	)
	if revertUncommittedChangesErr != nil {
		api.Logger.Error("Error reverting uncommitted changes in Data Engine", "error", revertUncommittedChangesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("Uncommitted changes reverted on branch %s", req.Branch),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the created commit
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "changes_reverted_to_previous_commit"),
	})
}
