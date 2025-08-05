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

// CompareRefs godoc
// @Summary Compare two repository references
// @Description Compare two refs (branches, tags, or commits) in a repository to show differences
// @Tags compare
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param base_ref query string true "Base reference (branch, tag, or commit hash)"
// @Param compare_ref query string true "Compare reference (branch, tag, or commit hash)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Diff} "Comparison result retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/compare [get]
func (api *APIControllers) CompareRefs(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the query parameters
	params, err := utils.ParseQueryParams(c, []string{"base_ref", "compare_ref"}, nil)
	if err != nil {
		api.Logger.Error("Error parsing query parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Get the base and compare refs
	baseRef := params["base_ref"]
	compareRef := params["compare_ref"]

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Compare the refs
	diff, err := dataEngine.CompareRefs(c, workspace.Slug, repository.Slug, baseRef, compareRef)
	if err != nil {
		api.Logger.Error("Error comparing refs", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: diff,
	})
}

// MergeRefs godoc
// @Summary Merge two repository references
// @Description Merge a compare reference into a base reference in a repository
// @Tags compare
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param request body irmincore.MergeRefsRequest true "Merge request parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Commit} "Merge completed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/merge [post]
func (api *APIControllers) MergeRefs(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.MergeRefsRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
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
	dataEngine, err := engine.NewClient(c, locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		api.Logger.Error("Error merging refs", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Delete the cached objects for the target branch
	dbDeleteErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteObjects(tx, nil, &repository.ID, &baseRef)
	})
	if dbDeleteErr != nil {
		api.Logger.Error("Error deleting cached objects for branch", "error", dbDeleteErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Merged %s into %s", compareRef, baseRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "merge_commit_created"),
		Data:    mergeCommit,
	})
}
