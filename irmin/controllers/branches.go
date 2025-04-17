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

func BranchesIndex(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Get the branch from the data engine.
	branches, err := DataEngine.ListBranches(c.Context(), workspace.Slug, repository.Slug)
	if err != nil {
		log.Printf("Error retrieving branches from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: branches,
	})
}

func BranchesStore(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "from"}, []string{"is_immutable"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Determine if the branch should be immutable
	isImmutable := false
	if fields["is_immutable"] != "" {
		isImmutable = fields["is_immutable"] == "true"
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Create the branch in the data engine.
	branch, err := DataEngine.CreateBranch(workspace.Slug, repository.Slug, fields["name"], fields["from"], isImmutable)
	if err != nil {
		log.Printf("Error creating branch in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Branch %s created", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the created branch
	return utils.WriteResponse(c, fiber.StatusCreated, irminModels.IrminAPIResponse{
		Message: dict.T("branch_created"),
		Data:    branch,
	})
}

func BranchesShow(c fiber.Ctx) error {
	branch := c.Locals("branch").(*irminModels.Branch)

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: branch,
	})
}

func BranchesUpdate(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)
	branch := c.Locals("branch").(*irminModels.Branch)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "is_immutable"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Determine if the branch should be immutable
	isImmutable := branch.IsImmutable
	if fields["is_immutable"] != "" {
		isImmutable = fields["is_immutable"] == "true"
	}

	// Determine what the new branch name should be
	newBranchName := branch.Name
	if fields["name"] != "" {
		newBranchName = fields["name"]
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Update the branch in the data engine.
	branch, err = DataEngine.UpdateBranch(c.Context(), workspace.Slug, repository.Slug, branch.Name, newBranchName, isImmutable)
	if err != nil {
		log.Printf("Error updating branch in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Branch %s updated", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the updated branch
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("branch_updated"),
		Data:    branch,
	})
}

func BranchesDestroy(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)
	branch := c.Locals("branch").(*irminModels.Branch)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Delete the branch in the data engine.
	err := DataEngine.DeleteBranch(workspace.Slug, repository.Slug, branch.Name)
	if err != nil {
		log.Printf("Error deleting branch in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Branch %s deleted", branch.Name),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return a success message
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("branch_deleted"),
	})
}

func GetUncommittedChanges(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)
	branch := c.Locals("branch").(*irminModels.Branch)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Compare the refs
	diff, err := DataEngine.GetUncommittedChanges(c.Context(), workspace.Slug, repository.Slug, branch.Name)
	if err != nil {
		log.Printf("Error getting uncommitted changes: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: diff,
	})
}
