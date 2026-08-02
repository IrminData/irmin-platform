package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/gofiber/fiber/v3"
)

// RepositoryTagsIndex godoc
// @Summary List repository tags
// @Description Get all tags in a specific repository
// @Tags repository-tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.GitTag} "Tags retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/tags [get]
func (api *APIControllers) RepositoryTagsIndex(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return api.handleServiceError(
			c,
			"Error getting locals for RepositoryTagsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the tags from the service
	tags, err := api.Services.ListRepositoryTags(c, locale, user, workspace, repository)
	if err != nil {
		return api.handleServiceError(c, "Error retrieving tags", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: tags,
	})
}

// RepositoryTagsStore godoc
// @Summary Create repository tag
// @Description Create a new tag pointing to a specific commit or branch in a repository
// @Tags repository-tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param body body irmincore.CreateRepositoryTagRequest true "Tag creation request"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.GitTag} "Tag created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid tag data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Repository not found"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Tag name already exists"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/tags [post]
func (api *APIControllers) RepositoryTagsStore(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return api.handleServiceError(
			c,
			"Error getting locals for RepositoryTagsStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.CreateRepositoryTagRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the tag using the service
	tag, err := api.Services.CreateRepositoryTag(c, locale, user, workspace, repository, req)
	if err != nil {
		return api.handleServiceError(c, "Error creating tag", err, dict)
	}

	// Invalidate tags list and tag details (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/tags", workspace.Slug, repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the created tag
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: tag,
	})
}

// RepositoryTagsShow godoc
// @Summary Get repository tag
// @Description Get details of a specific tag in a repository
// @Tags repository-tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param tag_name path string true "Tag name"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.GitTag} "Tag retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/tags/{tag_name} [get]
func (api *APIControllers) RepositoryTagsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	repositoryTag, repositoryTagOk := c.Locals("tag").(*irminmodels.GitTag)
	if !dictOk || !repositoryTagOk {
		return api.handleServiceError(
			c,
			"Error getting locals for RepositoryTagsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoryTag,
	})
}

// RepositoryTagsDestroy godoc
// @Summary Delete repository tag
// @Description Delete a tag from a repository (does not affect the commit it points to)
// @Tags repository-tags
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param tag_name path string true "Tag name to delete"
// @Success 200 {object} irminmodels.IrminAPIResponse "Tag deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Tag not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/tags/{tag_name} [delete]
func (api *APIControllers) RepositoryTagsDestroy(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	repositoryTag, repositoryTagOk := c.Locals("tag").(*irminmodels.GitTag)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk || !repositoryTagOk {
		return api.handleServiceError(
			c,
			"Error getting locals for RepositoryTagsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Delete the tag using the service
	err := api.Services.DeleteRepositoryTag(c, locale, user, workspace, repository, repositoryTag)
	if err != nil {
		return api.handleServiceError(c, "Error deleting tag", err, dict)
	}

	// Invalidate tags list and tag details (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/tags", workspace.Slug, repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success message
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_deleted"),
	})
}
