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

func CompareRefs(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the query parameters
	params, err := utils.ParseQueryParams(c, []string{"base_ref", "compare_ref"}, nil)
	if err != nil {
		log.Printf("Error parsing query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Get the base and compare refs
	baseRef := params["base_ref"]
	compareRef := params["compare_ref"]

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Compare the refs
	diff, err := DataEngine.CompareRefs(c.Context(), workspace.Slug, repository.Slug, baseRef, compareRef)
	if err != nil {
		log.Printf("Error comparing refs: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: diff,
	})
}

func MergeRefs(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the form fields
	fields, err := utils.ParseFormFields(c, []string{"base_ref", "compare_ref"}, []string{"description", "strategy", "squash", "allow_empty"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Get the base and compare refs
	baseRef := fields["base_ref"]
	compareRef := fields["compare_ref"]

	// Get the description and strategy
	description := fields["description"]
	strategy := fields["strategy"]
	if strategy == "default" {
		strategy = ""
	}

	// Determine if squash and allow_empty are true
	squash := fields["squash"] == "true"
	allowEmpty := fields["allow_empty"] == "true"

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Merge the refs
	mergeCommit, err := DataEngine.MergeRefs(workspace.Slug, repository.Slug, baseRef, compareRef, description, user.Email, strategy, squash, allowEmpty)

	if err != nil {
		log.Printf("Error merging refs: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Merged %s into %s", compareRef, baseRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("merge_commit_created"),
		Data:    mergeCommit,
	})
}
