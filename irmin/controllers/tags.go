package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminModels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

func TagsIndex(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the tag from the data engine.
	tags, err := dataEngine.ListTags(workspace.Slug, repository.Slug)
	if err != nil {
		log.Printf("Error retrieving tags from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: tags,
	})
}

func TagsStore(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "ref"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Create the tag in the data engine.
	tag, err := dataEngine.CreateTag(workspace.Slug, repository.Slug, fields["name"], fields["ref"])
	if err != nil {
		log.Printf("Error creating tag in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Tag %s created to track %s", tag.Name, tag.Ref),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	// Return the created tag
	return utils.WriteResponse(c, fiber.StatusCreated, irminModels.IrminAPIResponse{
		Data: tag,
	})
}

func TagsShow(c fiber.Ctx) error {
	tag := c.Locals("tag").(*irminModels.Tag)

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: tag,
	})
}

func TagsDestroy(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)
	tag := c.Locals("tag").(*irminModels.Tag)

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Delete the tag from the data engine.
	if err := dataEngine.DeleteTag(workspace.Slug, repository.Slug, tag.Name); err != nil {
		log.Printf("Error deleting tag in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Tag %s deleted", tag.Name),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	// Return a success message
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("tag_deleted"),
	})
}
