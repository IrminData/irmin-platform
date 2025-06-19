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
)

func (api *APIControllers) RepositoryTagsIndex(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)

	if !localeOk || !dictOk || !workspaceOk || !repositoryOk {
		api.Logger.Error("Error getting locals for RepositoryTagsIndex",
			"localeOk", localeOk,
			"dictOk", dictOk,
			"workspaceOk", workspaceOk,
			"repositoryOk", repositoryOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the tag from the data engine.
	tags, listTagsErr := dataEngine.ListTags(workspace.Slug, repository.Slug)
	if listTagsErr != nil {
		api.Logger.Error("Error retrieving tags from Data Engine", "error", listTagsErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: tags,
	})
}

func (api *APIControllers) RepositoryTagsStore(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		api.Logger.Error("Error getting locals for RepositoryTagsStore",
			"localeOk", localeOk,
			"dictOk", dictOk,
			"userOk", userOk,
			"workspaceOk", workspaceOk,
			"repositoryOk", repositoryOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateRepositoryTagRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.Name == "" || req.Ref == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the tag in the data engine.
	tag, createTagErr := dataEngine.CreateTag(workspace.Slug, repository.Slug, req.Name, req.Ref)
	if createTagErr != nil {
		api.Logger.Error("Error creating tag in Data Engine", "error", createTagErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Tag %s created to track %s", tag.Name, tag.Ref),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	// Return the created tag
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: tag,
	})
}

func (api *APIControllers) RepositoryTagsShow(c fiber.Ctx) error {
	tag, tagOk := c.Locals("tag").(*irminmodels.GitTag)
	if !tagOk {
		api.Logger.Error("Error getting locals for RepositoryTagsShow",
			"tagOk", tagOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: tag,
	})
}

func (api *APIControllers) RepositoryTagsDestroy(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	tag, tagOk := c.Locals("tag").(*irminmodels.GitTag)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk || !tagOk {
		api.Logger.Error("Error getting locals for RepositoryTagsDestroy",
			"localeOk", localeOk,
			"dictOk", dictOk,
			"userOk", userOk,
			"workspaceOk", workspaceOk,
			"repositoryOk", repositoryOk,
			"tagOk", tagOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Delete the tag from the data engine.
	if deleteTagErr := dataEngine.DeleteTag(workspace.Slug, repository.Slug, tag.Name); deleteTagErr != nil {
		api.Logger.Error("Error deleting tag in Data Engine", "error", deleteTagErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Tag %s deleted", tag.Name),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	// Return a success message
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_deleted"),
	})
}
