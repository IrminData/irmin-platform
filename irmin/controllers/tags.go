package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

const (
	operationAdd    = "add"
	operationRemove = "remove"
)

// TagsIndex retrieves all available tags.
func (api *APIControllers) TagsIndex(c fiber.Ctx) error {
	_, dict, _, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all tags from the workspace
	tags, err := api.DB.GetTagsByWorkspace(workspace.ID)
	if err != nil {
		api.Logger.Error("Error retrieving tags", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the tags
	formattedTags, err := formatter.FormatTagsResponse(tags, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting tags", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTags,
	})
}

// TagsStore creates a new tag.
func (api *APIControllers) TagsStore(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate request fields
	fields, err := utils.ParseFormFields(c, []string{"name"}, []string{"color", "description"})
	if err != nil {
		api.Logger.Error("Error parsing form fields", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create the tag
	tag := &db.Tag{
		Name:        fields["name"],
		Color:       fields["color"],
		Description: fields["description"],
		WorkspaceID: workspace.ID,
	}
	if createErr := api.DB.Create(&tag); createErr.Error != nil {
		api.Logger.Error("Error creating tag", "error", createErr.Error)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	formattedTag, err := formatter.FormatTagResponse(tag, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Tag %s created", tag.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedTag,
	})
}

// TagsShow retrieves a specific tag.
func (api *APIControllers) TagsShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsShow")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the tag with assets
	formattedTagWithAssets, err := formatter.FormatTagWithAssetsResponse(tagWithAssets, api.SQIDManager, api.DB)
	if err != nil {
		api.Logger.Error("Error formatting tag with assets", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTagWithAssets,
	})
}

// TagsUpdate updates a tag.
func (api *APIControllers) TagsUpdate(c fiber.Ctx) error {
	_, dict, user, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsUpdate")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate request fields
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "color", "description"})
	if err != nil {
		api.Logger.Error("Error parsing form fields", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the tag fields
	if fields["name"] != "" {
		tagWithAssets.Tag.Name = fields["name"]
	}
	if fields["color"] != "" {
		tagWithAssets.Tag.Color = fields["color"]
	}
	if fields["description"] != "" {
		tagWithAssets.Tag.Description = fields["description"]
	}

	// Save the updated tag
	if updateErr := api.DB.Save(&tagWithAssets.Tag); updateErr.Error != nil {
		api.Logger.Error("Error updating tag", "error", updateErr.Error)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response
	formattedTag, err := formatter.FormatTagResponse(&tagWithAssets.Tag, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting tag", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s updated", tagWithAssets.Tag.Name),
		UserID:      &user.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedTag,
	})
}

// TagsDestroy deletes a tag.
func (api *APIControllers) TagsDestroy(c fiber.Ctx) error {
	_, dict, user, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the tag from locals
	tagWithAssets, tagOk := c.Locals("tag").(*db.TagWithAssets)
	if !tagOk {
		api.Logger.Error("Error getting locals for TagsDestroy")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the tag
	if deleteTagErr := api.DB.DeleteTag(tagWithAssets.Tag.ID); deleteTagErr != nil {
		api.Logger.Error("Error deleting tag", "error", deleteTagErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Tag %s deleted", tagWithAssets.Tag.Name),
		UserID:      &user.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "tag_deleted"),
	})
}

// performEntityOperation handles the actual database operation for a specific entity type.
func (api *APIControllers) performEntityOperation(
	entityType string,
	entityID uint,
	tagID uint,
	operation string,
) error {
	switch entityType {
	case "repositories":
		if operation == operationAdd {
			return api.DB.AddTagToRepository(entityID, tagID)
		}
		return api.DB.RemoveTagFromRepository(entityID, tagID)
	case "queries":
		if operation == operationAdd {
			return api.DB.AddTagToQuery(entityID, tagID)
		}
		return api.DB.RemoveTagFromQuery(entityID, tagID)
	case "workflows":
		if operation == operationAdd {
			return api.DB.AddTagToWorkflow(entityID, tagID)
		}
		return api.DB.RemoveTagFromWorkflow(entityID, tagID)
	case "connections":
		if operation == operationAdd {
			return api.DB.AddTagToConnection(entityID, tagID)
		}
		return api.DB.RemoveTagFromConnection(entityID, tagID)
	case "objects":
		if operation == operationAdd {
			return api.DB.AddTagToRepositoryObject(entityID, tagID)
		}
		return api.DB.RemoveTagFromRepositoryObject(entityID, tagID)
	default:
		return fmt.Errorf("invalid entity type: %s", entityType)
	}
}

// handleTagEntityOperation is a helper function that handles common logic for adding/removing tags from entities.
func (api *APIControllers) handleTagEntityOperation(c fiber.Ctx, operation string) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	tag, tagOk := c.Locals("tag").(*db.TagWithAssets)

	if !dictOk || !userOk || !tagOk || !workspaceOk {
		api.Logger.Error("Error getting locals for handleTagEntityOperation",
			"dictOk", dictOk,
			"userOk", userOk,
			"tagOk", tagOk,
			"workspaceOk", workspaceOk,
			"operation", operation)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure the tag is from the same workspace
	if tag.Tag.WorkspaceID != workspace.ID {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Get entity type and ID from context
	entityType := c.Params("entity_type")
	entityID := c.Params("entity_id")

	// Decode entity ID
	entityIDUint, err := api.SQIDManager.Decode(entityType, entityID)
	if err != nil {
		api.Logger.Error("Error decoding entity ID", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Perform operation based on entity type
	operationErr := api.performEntityOperation(entityType, uint(entityIDUint), tag.Tag.ID, operation)
	if operationErr != nil {
		if operationErr.Error() == fmt.Sprintf("invalid entity type: %s", entityType) {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_entity_type")},
			})
		}
		api.Logger.Error(fmt.Sprintf("Error %sing tag to entity", operation), "error", operationErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	action := "added to"
	if operation == operationRemove {
		action = "removed from"
	}
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Tag %s %s", action, entityType),
		UserID:      &user.ID,
	})

	messageKey := "tag_added"
	if operation == operationRemove {
		messageKey = "tag_removed"
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, messageKey),
	})
}

// AddTagToEntity adds a tag to a specific entity.
func (api *APIControllers) AddTagToEntity(c fiber.Ctx) error {
	return api.handleTagEntityOperation(c, operationAdd)
}

// RemoveTagFromEntity removes a tag from a specific entity.
func (api *APIControllers) RemoveTagFromEntity(c fiber.Ctx) error {
	return api.handleTagEntityOperation(c, operationRemove)
}
