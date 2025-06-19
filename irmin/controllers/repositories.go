package controllers

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

type repositoryLocalParams struct {
	locale     string
	dict       locales.Dictionary
	user       *db.User
	repository *db.Repository
	workspace  *db.Workspace
}

// validateRepositoryParams validates the common parameters needed for repository operations.
// Returns locale, dict, user, repository, workspace, and an error.
func (api *APIControllers) validateRepositoryParams(c fiber.Ctx) (
	*repositoryLocalParams,
	error,
) {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk {
		return nil, errors.New("locale not found in context")
	}
	if !dictOk {
		return nil, errors.New("dictionary not found in context")
	}
	if !userOk {
		return nil, errors.New("user not found in context")
	}
	if !repositoryOk {
		return nil, errors.New("repository not found in context")
	}
	if !workspaceOk {
		return nil, errors.New("workspace not found in context")
	}
	return &repositoryLocalParams{
		locale:     locale,
		dict:       dict,
		user:       user,
		repository: repository,
		workspace:  workspace,
	}, nil
}

//nolint:dupl // This is not a duplicate of anything, it's just similar to other index endpoints
func (api *APIControllers) RepositoriesIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace repository parameters", "error", err)
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

	// Filter repositories based on user permissions
	filteredRepositories, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceRepository,
		db.PolicyActionRead,
		repositories,
		func(r db.Repository) uint { return r.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering repositories by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	repositoriesResponse, formatErr := formatter.FormatIndexResponse(
		filteredRepositories,
		formatter.FormatRepositoryResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting repositories", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoriesResponse,
	})
}

func (api *APIControllers) RepositoriesStore(c fiber.Ctx) error {
	locale, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateRepositoryRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request body", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.Name == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Format the slug from the name
	repositorySlug := utils.Slugify(req.Name)

	// Make sure such repository does not exist
	if api.DB.CheckIfRepositoryExists(repositorySlug, workspace.ID) {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "repository_already_exists")},
		})
	}

	// Determine the default branch
	defaultBranch := "main"
	if req.DefaultBranch != "" {
		defaultBranch = req.DefaultBranch
	}

	// Get the immutable flag
	isImmutable := req.IsImmutable

	// Create garbage collection settings struct
	gcSettings := utils.GarbageCollectionSettings{
		DefaultRetentionDays:       req.GarbageDefaultRetentionDays,
		DefaultBranchRetentionDays: req.GarbageDefaultBranchRetentionDays,
	}

	if gcValidateErr := utils.ValidateGarbageCollectionSettings(&gcSettings); gcValidateErr != nil {
		api.Logger.Error("Invalid garbage collection settings", "error", gcValidateErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create the repository in the database
	repository := &db.Repository{
		Name:          req.Name,
		Slug:          repositorySlug,
		Description:   req.Description,
		Documentation: req.Documentation,
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
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c.Context(),
		locale,
		api.Logger,
		api.Env,
	)
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
	repository.LakeFSRepoID = dataEngineRepository.ID
	repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
	repository.IsImmutable = dataEngineRepository.IsImmutable
	repository.DefaultBranch = dataEngineRepository.DefaultBranch
	repository.StorageNamespace = dataEngineRepository.StorageNamespace
	go func() {
		if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.Error("Error updating LakeFS repository ID", "error", updateRepositoryErr)
		}
	}()

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
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
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repositoryLocalParams.repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: *repositoryResponse,
	})
}

func (api *APIControllers) RepositoriesDestroy(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the repository from the database
	if deleteDatabaseRepositoryErr := api.DB.DeleteRepository(repositoryLocalParams.repository.ID); deleteDatabaseRepositoryErr != nil {
		api.Logger.Error("Error deleting repository", "error", deleteDatabaseRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Delete the repository from the Data Engine asynchronously
	go func() {
		// Initialize Data Engine client
		dataEngine, createDataEngineClientErr := engine.NewClient(
			c.Context(),
			repositoryLocalParams.locale,
			api.Logger,
			api.Env,
		)
		if createDataEngineClientErr != nil {
			api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
			return
		}

		// Delete the repository from the Data Engine
		if deleteDataEngineRepositoryErr := dataEngine.DeleteRepository(c.Context(), repositoryLocalParams.workspace.Slug, repositoryLocalParams.repository.Slug, false); deleteDataEngineRepositoryErr != nil {
			api.Logger.Error("Error deleting repository in Data Engine", "error", deleteDataEngineRepositoryErr)
			return
		}
	}()

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Repository %s deleted", repositoryLocalParams.repository.Slug),
		UserID:       &repositoryLocalParams.user.ID,
		WorkspaceID:  &repositoryLocalParams.workspace.ID,
		RepositoryID: &repositoryLocalParams.repository.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(repositoryLocalParams.dict, "repository_deleted"),
	})
}

func (api *APIControllers) RepositoriesUpdate(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}
	repository := repositoryLocalParams.repository

	// Parse JSON request body
	var req irmincore.UpdateRepositoryRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Only update fields that were provided
	if req.Name != "" {
		repository.Name = req.Name
	}
	if req.Description != "" {
		repository.Description = req.Description
	}
	if req.Documentation != "" {
		repository.Documentation = req.Documentation
	}

	// Handle is_immutable with pointer type for optional boolean
	if req.IsImmutable != nil {
		repository.IsImmutable = *req.IsImmutable
	}

	// Update the repository in the database
	if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
		api.Logger.Error("Error updating repository", "error", updateRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(
		c.Context(),
		repositoryLocalParams.locale,
		api.Logger,
		api.Env,
	)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Create garbage collection settings from request
	gcSettings := &utils.GarbageCollectionSettings{
		DefaultRetentionDays:       req.GarbageDefaultRetentionDays,
		DefaultBranchRetentionDays: req.GarbageDefaultBranchRetentionDays,
	}

	// If no new default branch retention days provided, use existing value
	if gcSettings.DefaultBranchRetentionDays == 0 {
		gcSettings.DefaultBranchRetentionDays = utils.GetDefaultBranchRetentionDays(
			repository.GarbageCollectionRules.Branches,
			repository.DefaultBranch,
		)
	}

	if gcValidateErr := utils.ValidateGarbageCollectionSettings(gcSettings); gcValidateErr != nil {
		api.Logger.Error("Invalid garbage collection settings", "error", gcValidateErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Update the repository in the Data Engine
	dataEngineRepository, updateRepositoryInDataEngineErr := dataEngine.UpdateRepository(
		repositoryLocalParams.workspace.Slug,
		repository.Slug,
		&gcSettings.DefaultRetentionDays,
		&gcSettings.DefaultBranchRetentionDays,
	)
	if updateRepositoryInDataEngineErr != nil {
		api.Logger.Error("Error updating repository in Data Engine", "error", updateRepositoryInDataEngineErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Update the repository in the database
	repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
	go func() {
		if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
			api.Logger.Error("Error updating LakeFS repository ID", "error", updateRepositoryErr)
		}
	}()

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s settings updated", repository.Slug),
		WorkspaceID:  &repositoryLocalParams.workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &repositoryLocalParams.user.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(repositoryLocalParams.dict, "repository_updated"),
		Data:    *repositoryResponse,
	})
}

func (api *APIControllers) TransferRepositoryOwnership(c fiber.Ctx) error {
	repositoryLocalParams, err := api.validateRepositoryParams(c)
	if err != nil {
		api.Logger.Error("Error validating repository parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	repository := repositoryLocalParams.repository

	// Parse JSON request body
	var req irmincore.TransferRepositoryOwnershipRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.NewOwnerID == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Parse the ID of the new owner from the sqid
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", req.NewOwnerID)
	if decodeSqidsErr != nil {
		api.Logger.Error("Error decoding new owner sqid", "error", decodeSqidsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), repositoryLocalParams.workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.Error("Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "new_owner_invalid")},
		})
	}

	// Update the repository in the database
	repository.OwnerID = uint(newOwnerID)
	if updateRepositoryErr := api.DB.Save(&repository).Error; updateRepositoryErr != nil {
		api.Logger.Error("Error updating repository", "error", updateRepositoryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Format the repository response
	repositoryResponse, formatRepositoryResponseErr := formatter.FormatRepositoryResponse(
		repository,
		api.SQIDManager,
	)
	if formatRepositoryResponseErr != nil {
		api.Logger.Error("Error formatting repository", "error", formatRepositoryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(repositoryLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Repository %s ownership transferred to %s", repository.Slug, repository.Owner.Email),
		WorkspaceID:  &repositoryLocalParams.workspace.ID,
		RepositoryID: &repository.ID,
		UserID:       &repositoryLocalParams.user.ID,
	})

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(repositoryLocalParams.dict, "repository_ownership_transferred"),
		Data:    *repositoryResponse,
	})
}
