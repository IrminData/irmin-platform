package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func (api *APIControllers) RepositoriesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all repositories in the workspace.
	repositories, getRepositoriesErr := api.DB.GetRepositoriesInWorkspace(workspace.ID)
	if getRepositoriesErr != nil {
		api.Logger.Error("Error fetching repositories", "error", getRepositoriesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	var repositoriesResponse []irminmodels.Repository
	for _, repository := range repositories {
		// Format the repository response
		repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
			&repository,
			&engine.Repository{},
			api.SQIDManager,
		)
		if formatRepositoryResponseErr != nil {
			api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		// Append the repository to the response
		repositoriesResponse = append(repositoriesResponse, *repositoryResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoriesResponse,
	})
}

func (api *APIControllers) RepositoriesStore(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !localeOk || !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, parseFormFieldsErr := utils.ParseFormFields(
		c,
		[]string{"name"},
		[]string{
			"description",
			"documentation",
			"default_branch",
			"is_immutable",
			"garbage_default_retention_days",
			"garbage_default_branch_retention_days",
		},
	)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Format the slug from the name
	repositorySlug := utils.Slugify(fields["name"])

	// Make sure such repository does not exist
	if api.DB.CheckIfRepositoryExists(repositorySlug, workspace.ID) {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "repository_already_exists")},
		})
	}

	// Determine the default branch
	defaultBranch := "main"
	if fields["default_branch"] != "" {
		defaultBranch = fields["default_branch"]
	}

	// Determine if the repository should be immutable
	isImmutable := fields["is_immutable"] == trueString

	// Parse garbage collection settings
	gcSettings, gcParseErr := utils.ParseGarbageCollectionSettings(fields)
	if gcParseErr != nil {
		api.Logger.Error("Error parsing garbage collection settings", "error", gcParseErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	if gcValidateErr := utils.ValidateGarbageCollectionSettings(gcSettings); gcValidateErr != nil {
		api.Logger.Error("Invalid garbage collection settings", "error", gcValidateErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create the repository in the database
	repository := &db.Repository{
		Name:          fields["name"],
		Slug:          repositorySlug,
		Description:   fields["description"],
		Documentation: fields["documentation"],
		DefaultBranch: defaultBranch,
		IsImmutable:   isImmutable,
		WorkspaceID:   workspace.ID,
		OwnerID:       user.ID,
	}
	if createRepositoryErr := api.DB.Create(&repository).Error; createRepositoryErr != nil {
		api.Logger.Error("Error creating repository", "error", createRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
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

	// Create the repository in the Data Engine
	dataEngineRepository, createRepositoryInDataEngineErr := dataEngine.CreateRepository(
		workspace.Slug,
		repositorySlug,
		defaultBranch,
		isImmutable,
		&gcSettings.DefaultRetentionDays,
		&gcSettings.DefaultBranchRetentionDays,
	)
	if createRepositoryInDataEngineErr != nil {
		api.Logger.Error("Error creating repository in Data Engine", "error", createRepositoryInDataEngineErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update the repository in the database asynchronously
	go func() {
		updatedRepository := repository
		updatedRepository.LakeFSRepoID = dataEngineRepository.ID
		if updateRepositoryErr := api.DB.Save(&updatedRepository).Error; updateRepositoryErr != nil {
			api.Logger.Error("Error updating LakeFS repository ID", "error", updateRepositoryErr)
		}
	}()

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		dataEngineRepository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeCreate,
		Description:  fmt.Sprintf("Repository %s created", repository.Slug),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "repository_created"),
		Data:    *repositoryResponse,
	})
}

func (api *APIControllers) RepositoriesShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	dataEngineRepository, dataEngineRepositoryOk := c.Locals("data_engine_repository").(*engine.Repository)

	if !dictOk || !repositoryOk || !dataEngineRepositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		dataEngineRepository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: *repositoryResponse,
	})
}

func (api *APIControllers) RepositoriesDestroy(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the repository from the database
	if err := api.DB.DeleteRepository(repository.ID); err != nil {
		api.Logger.Error("Error deleting repository", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
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

	// Delete the repository from the Data Engine
	if err := dataEngine.DeleteRepository(c.Context(), workspace.Slug, repository.Slug, false); err != nil {
		api.Logger.Error("Error deleting repository in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Repository %s deleted", repository.Slug),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "repository_deleted"),
	})
}

func (api *APIControllers) RepositoriesUpdate(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	dataEngineRepository, dataEngineRepositoryOk := c.Locals("data_engine_repository").(*engine.Repository)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk || !dictOk || !userOk || !repositoryOk || !dataEngineRepositoryOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, parseFormFieldsErr := utils.ParseFormFields(
		c,
		[]string{"name"},
		[]string{
			"description",
			"documentation",
			"is_immutable",
			"garbage_default_retention_days",
			"garbage_default_branch_retention_days",
		},
	)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Determine if the repository should be immutable
	isImmutable := repository.IsImmutable
	switch fields["is_immutable"] {
	case trueString:
		isImmutable = true
	case falseString:
		isImmutable = false
	}

	// Update the repository in the database
	repository.Name = fields["name"]
	repository.Description = fields["description"]
	repository.Documentation = fields["documentation"]
	repository.IsImmutable = isImmutable
	if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
		api.Logger.Error("Error updating repository", "error", updateRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
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

	// Parse garbage collection settings
	gcSettings, gcParseErr := utils.ParseGarbageCollectionSettings(fields)
	if gcParseErr != nil {
		api.Logger.Error("Error parsing garbage collection settings", "error", gcParseErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// If no new default branch retention days provided, use existing value
	if gcSettings.DefaultBranchRetentionDays == 0 {
		gcSettings.DefaultBranchRetentionDays = utils.GetDefaultBranchRetentionDays(
			dataEngineRepository.GarbageCollectionRules.Branches,
			repository.DefaultBranch,
		)
	}

	if gcValidateErr := utils.ValidateGarbageCollectionSettings(gcSettings); gcValidateErr != nil {
		api.Logger.Error("Invalid garbage collection settings", "error", gcValidateErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update the repository in the Data Engine
	dataEngineRepository, updateRepositoryInDataEngineErr := dataEngine.UpdateRepository(
		workspace.Slug,
		repository.Slug,
		&gcSettings.DefaultRetentionDays,
		&gcSettings.DefaultBranchRetentionDays,
	)
	if updateRepositoryInDataEngineErr != nil {
		api.Logger.Error("Error updating repository in Data Engine", "error", updateRepositoryInDataEngineErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		dataEngineRepository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s settings updated", repository.Slug),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "repository_updated"),
		Data:    *repositoryResponse,
	})
}

func (api *APIControllers) TransferRepositoryOwnership(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	dataEngineRepository, dataEngineRepositoryOk := c.Locals("data_engine_repository").(*engine.Repository)

	if !dictOk || !userOk || !workspaceOk || !repositoryOk || !dataEngineRepositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse the ID of the new owner from the sqid
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", fields["new_owner_id"])
	if decodeSqidsErr != nil {
		api.Logger.Error("Error decoding new owner sqid", "error", decodeSqidsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.Error("Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}

	// Update the repository in the database
	repository.OwnerID = uint(newOwnerID)
	if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
		api.Logger.Error("Error updating repository", "error", updateRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		dataEngineRepository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s ownership transferred to %s", repository.Slug, repository.Owner.Email),
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &user.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "repository_ownership_transferred"),
		Data:    *repositoryResponse,
	})
}
