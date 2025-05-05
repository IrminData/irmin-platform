package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"math"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func CommitsIndex(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the request query
	params, err := utils.ParseQueryParams(c, nil, []string{"ref", "per_page", "after"})
	if err != nil {
		log.Printf("Error parsing query params: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse pagination parameters
	after := params["after"]
	per_page := 100
	hasPagination := false
	if params["per_page"] != "" {
		parsedPerPage, err := strconv.Atoi(params["per_page"])
		if err == nil {
			per_page = parsedPerPage
			hasPagination = true
		}
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the commits from the data engine.
	var commits []irminModels.Commit
	var lakefsPagination *lakefs.Pagination
	if hasPagination {
		commits, lakefsPagination, err = dataEngine.ListCommits(workspace.Slug, repository.Slug, params["ref"], &after, &per_page)
	} else {
		commits, lakefsPagination, err = dataEngine.ListCommits(workspace.Slug, repository.Slug, params["ref"], nil, nil)
	}
	if err != nil {
		log.Printf("Error retrieving commits from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the commits
	if lakefsPagination != nil {
		totalPages := int(math.Ceil(float64(lakefsPagination.Results) / float64(per_page)))
		return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
			Pagination: &irminModels.IrminAPIPaginationMetadata{
				Total:      lakefsPagination.Results,
				PerPage:    per_page,
				TotalPages: totalPages,
				HasMore:    lakefsPagination.HasMore,
				Next:       &lakefsPagination.NextOffset,
			},
			Data: commits,
		})
	} else {
		return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
			Data: commits,
		})
	}
}

func CommitsStore(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"branch", "message"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Commit the changes in the data engine.
	commit, err := dataEngine.CommitChanges(workspace.Slug, repository.Slug, fields["branch"], fields["message"], user.Email, true)
	if err != nil {
		log.Printf("Error committing changes in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Commit %s created on branch %s", commit.Hash, fields["branch"]),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the created commit
	return utils.WriteResponse(c, fiber.StatusCreated, irminModels.IrminAPIResponse{
		Message: dict.T("commit_created"),
		Data:    commit,
	})
}

func CommitsShow(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the commit hash from the path
	hash := c.Params("hash")
	if hash == "" {
		log.Printf("Error parsing commit hash from path")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Get the commit from the data engine.
	commit, err := dataEngine.GetCommit(workspace.Slug, repository.Slug, hash)
	if err != nil {
		log.Printf("Error retrieving commit from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the commit
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: commit,
	})
}

func RevertUncommittedChanges(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"branch"}, []string{"path", "path_type"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Revert the uncommitted changes in the data engine.
	err = dataEngine.RevertUncommitedChanges(workspace.Slug, repository.Slug, fields["branch"], fields["path"], fields["path_type"])
	if err != nil {
		log.Printf("Error reverting uncommitted changes in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeInfo,
		Description:  fmt.Sprintf("Uncommitted changes reverted on branch %s", fields["branch"]),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the created commit
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("changes_reverted_to_previous_commit"),
	})
}
