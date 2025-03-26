package controllers

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func RepositoriesIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get all repositories in the workspace.
	repositories, err := db.GetRepositoriesInWorkspace(workspace.ID)
	if err != nil {
		log.Printf("Error fetching repositories: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Structure the response.
	var repositoriesResponse []db.RepositoryResponse
	for _, repository := range repositories {
		// Format the repository response
		repositoryResponse, err := formatter.FormatRepositoryResponse(&repository, &engine.Repository{})
		if err != nil {
			log.Printf("Error formatting repository: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		// Append the repository to the response
		repositoriesResponse = append(repositoriesResponse, *repositoryResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: repositoriesResponse,
	})
}

func RepositoriesStore(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name"}, []string{"description", "documentation", "default_branch", "is_immutable", "garbage_default_retention_days", "garbage_default_branch_retention_days"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Format the slug from the name
	repositorySlug := utils.Slugify(fields["name"])

	// Make sure such repository does not exist
	if db.CheckIfRepositoryExists(repositorySlug, workspace.ID) {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("repository_already_exists")},
		})
	}

	// Determine the default branch
	defaultBranch := "main"
	if fields["default_branch"] != "" {
		defaultBranch = fields["default_branch"]
	}

	// Determine if the repository should be immutable
	isImmutable := false
	if fields["is_immutable"] == "true" {
		isImmutable = true
	}

	// Determine the garbage collection default retention days
	var gcDefaultRetentionDays int
	if fields["garbage_default_retention_days"] != "" {
		gcDefaultRetentionDays, err = strconv.Atoi(fields["garbage_default_retention_days"])
		if err != nil {
			log.Printf("Error parsing garbage_default_retention_days: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
	}

	// Determine the garbage collection default branch retention days
	var gcDefaultBranchRetentionDays int
	if fields["garbage_default_branch_retention_days"] != "" {
		gcDefaultBranchRetentionDays, err = strconv.Atoi(fields["garbage_default_branch_retention_days"])
		if err != nil {
			log.Printf("Error parsing garbage_default_branch_retention_days: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
	}

	// Create the repository in the database
	repository, err := db.CreateRepository(&db.Repository{
		Name:          fields["name"],
		Slug:          repositorySlug,
		Description:   fields["description"],
		Documentation: fields["documentation"],
		DefaultBranch: defaultBranch,
		IsImmutable:   isImmutable,
		WorkspaceID:   workspace.ID,
		OwnerID:       user.ID,
	})
	if err != nil {
		log.Printf("Error creating repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Create the repository in the Data Engine
	dataEngineRepository, err := DataEngine.CreateRepository(workspace.Slug, repositorySlug, defaultBranch, isImmutable, &gcDefaultRetentionDays, &gcDefaultBranchRetentionDays)
	if err != nil {
		log.Printf("Error creating repository in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, err := formatter.FormatRepositoryResponse(repository, dataEngineRepository)
	if err != nil {
		log.Printf("Error formatting repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusCreated, irminModels.IrminAPIResponse{
		Message: dict.T("repository_created"),
		Data:    *repositoryResponse,
	})
}

func RepositoriesShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	dataEngineRepository := c.Locals("data_engine_repository").(*engine.Repository)

	// Format the repository response
	repositoryResponse, err := formatter.FormatRepositoryResponse(repository, dataEngineRepository)
	if err != nil {
		log.Printf("Error formatting repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: *repositoryResponse,
	})
}

func RepositoriesDestroy(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)

	// Delete the repository from the database
	if err := db.DeleteRepository(repository.ID); err != nil {
		log.Printf("Error deleting repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Delete the repository from the Data Engine
	if err := DataEngine.DeleteRepository(c.Context(), workspace.Slug, repository.Slug, false); err != nil {
		log.Printf("Error deleting repository in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("repository_deleted"),
	})
}

func RepositoriesUpdate(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	dataEngineRepository := c.Locals("data_engine_repository").(*engine.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name"}, []string{"description", "documentation", "is_immutable", "garbage_default_retention_days", "garbage_default_branch_retention_days"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Determine if the repository should be immutable
	isImmutable := repository.IsImmutable
	if fields["is_immutable"] == "true" {
		isImmutable = true
	} else if fields["is_immutable"] == "false" {
		isImmutable = false
	}

	// Update the repository in the database
	repository, err = db.UpdateRepository(repository.ID, map[string]any{
		"name":          fields["name"],
		"description":   fields["description"],
		"documentation": fields["documentation"],
		"is_immutable":  isImmutable,
	})
	if err != nil {
		log.Printf("Error updating repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Determine the garbage collection default retention days
	gcDefaultRetentionDays := dataEngineRepository.GarbageCollectionRules.DefaultRetentionDays
	if fields["garbage_default_retention_days"] != "" {
		gcDefaultRetentionDays, err = strconv.Atoi(fields["garbage_default_retention_days"])
		if err != nil {
			log.Printf("Error parsing garbage_default_retention_days: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
	}

	// Determine the garbage collection default branch retention days
	var gcDefaultBranchRetentionDays int
	for _, branchGCRules := range dataEngineRepository.GarbageCollectionRules.Branches {
		if branchGCRules.BranchID == repository.DefaultBranch {
			gcDefaultBranchRetentionDays = branchGCRules.RetentionDays
			break
		}
	}
	if fields["garbage_default_branch_retention_days"] != "" {
		gcDefaultBranchRetentionDays, err = strconv.Atoi(fields["garbage_default_branch_retention_days"])
		if err != nil {
			log.Printf("Error parsing garbage_default_branch_retention_days: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
	}

	// Update the repository in the Data Engine
	dataEngineRepository, err = DataEngine.UpdateRepository(workspace.Slug, repository.Slug, &gcDefaultRetentionDays, &gcDefaultBranchRetentionDays)
	if err != nil {
		log.Printf("Error updating repository in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, err := formatter.FormatRepositoryResponse(repository, dataEngineRepository)
	if err != nil {
		log.Printf("Error formatting repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("repository_updated"),
		Data:    *repositoryResponse,
	})
}

func TransferRepositoryOwnership(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	repository := c.Locals("repository").(*db.Repository)
	dataEngineRepository := c.Locals("data_engine_repository").(*engine.Repository)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse the ID of the new owner from the sqid
	newOwnerSqid := fields["new_owner_id"]
	newOwnerID, err := utils.DecodeSqids("users", newOwnerSqid)
	if err != nil {
		log.Printf("Error decoding new owner sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, err := db.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if err != nil {
		log.Printf("Error checking if user is in workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}

	// Update the repository in the database
	repository, err = db.UpdateRepository(repository.ID, map[string]any{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, err := formatter.FormatRepositoryResponse(repository, dataEngineRepository)
	if err != nil {
		log.Printf("Error formatting repository: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("repository_ownership_transferred"),
		Data:    *repositoryResponse,
	})
}

func DownloadRepository(c fiber.Ctx) error {
	// TODO: Implement download repository
	return c.SendString("Download repository")
}
