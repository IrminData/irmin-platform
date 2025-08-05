package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type objectLocalParams struct {
	locale     string
	dict       locales.Dictionary
	user       *db.User
	repository *db.Repository
	workspace  *db.Workspace
	object     *db.RepositoryObject
	objectRef  string
}

// validateObjectParams validates the common parameters needed for object operations.
// Returns locale, dict, user, repository, workspace, object, objectRef, and an error.
func (api *APIControllers) validateObjectParams(c fiber.Ctx) (
	*objectLocalParams,
	error,
) {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	objectRef, objectRefOk := c.Locals("object_ref").(string)

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
	if !objectOk {
		return nil, errors.New("object not found in context")
	}
	if !objectRefOk {
		return nil, errors.New("object ref not found in context")
	}

	return &objectLocalParams{
		locale:     locale,
		dict:       dict,
		user:       user,
		repository: repository,
		workspace:  workspace,
		object:     object,
		objectRef:  objectRef,
	}, nil
}

// RepositoryObjectsIndex godoc
// @Summary Get repository object
// @Description Get details of a specific object or directory in a repository at a given reference
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to get object from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path} [get]
func (api *APIControllers) RepositoryObjectsIndex(c fiber.Ctx) error {
	params, err := api.validateObjectParams(c)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(params.dict, "invalid_request")},
		})
	}

	// Get the object from the data engine
	object, err := lib.GetObject(
		c,
		params.locale,
		api.DB,
		api.Logger,
		api.Env,
		params.workspace,
		params.repository,
		params.object.Path,
		params.objectRef,
		false,
	)
	if err != nil {
		api.Logger.Error("Error getting object", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(params.dict, "error_occurred")},
		})
	}

	// Check if object is a group
	if object.Type == irminmodels.ObjectTypeGroup {
		// Check that the user has read access to the object
		allowed, allowedErr := api.permissionService.IsAllowed(
			params.user,
			params.workspace,
			db.PolicyResourceRepositoryObject,
			&object.RepositoryID,
			db.PolicyActionRead,
		)
		if allowedErr != nil {
			api.Logger.Error("Error checking if user has read access to object", "error", allowedErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(params.dict, "error_occurred")},
			})
		}
		if !allowed {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(params.dict, "not_allowed")},
			})
		}
	} else {
		// It is a group, so we need to check if the user has read access to the object
		// Filter objects based on user permissions
		filteredObjectChildren, filterErr := lib.IsAllowedFilter(
			api.permissionService,
			params.user,
			params.workspace,
			db.PolicyResourceRepositoryObject,
			db.PolicyActionRead,
			object.Children,
			func(o db.RepositoryObject) uint { return o.RepositoryID },
		)
		if filterErr != nil {
			api.Logger.Error("Error filtering objects by permissions", "error", filterErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(params.dict, "error_occurred")},
			})
		}

		object.Children = filteredObjectChildren
	}

	// Structure the response
	objectResponse, formatErr := formatter.FormatRepositoryObjectResponse(object, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting objects", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(params.dict, "error_occurred")},
		})
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: objectResponse,
	})
}

// RepositoryUploadObject godoc
// @Summary Upload object to repository
// @Description Upload a file to a specific path in a repository at a given reference
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept multipart/form-data
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to upload to" default("main")
// @Param file formData file true "File to upload"
// @Param metadata formData string false "Optional metadata as JSON string"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object uploaded successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid file or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/upload [post]
func (api *APIControllers) RepositoryUploadObject(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the multipart form data
	form, err := c.MultipartForm()
	if err != nil {
		api.Logger.Error("Error parsing form data", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Validate that a file was provided
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		api.Logger.Error("No file found in form data")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Open the uploaded file
	file, err := form.File["file"][0].Open()
	if err != nil {
		api.Logger.Error("Error opening file", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}
	defer file.Close()

	// Optional: Parse metadata from form fields if provided
	// This allows clients to send additional metadata alongside the file
	var metadata map[string]string
	if jsonData := form.Value["metadata"]; len(jsonData) > 0 {
		if unmarshalErr := json.Unmarshal([]byte(jsonData[0]), &metadata); unmarshalErr != nil {
			api.Logger.Warn("Invalid metadata JSON provided, ignoring", "error", unmarshalErr)
			// Don't fail the request for invalid metadata, just log and continue
		}
	}

	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Upload the object to the path in the repository at ref
	newObject, err := dataEngine.UploadObject(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
		file,
	)
	if err != nil {
		api.Logger.Error("Error uploading object to Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Save the updates to the database
	repositoryObject, err := lib.SaveObject(
		api.DB,
		newObject,
		objectLocalParams.objectRef,
		objectLocalParams.repository.ID,
	)
	if err != nil {
		api.Logger.Error("Error saving object to database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:               db.LogEventTypeUpdate,
		Description:        fmt.Sprintf("Object %s uploaded to branch %s", newObject.Path, objectLocalParams.objectRef),
		UserID:             &objectLocalParams.user.ID,
		WorkspaceID:        &objectLocalParams.workspace.ID,
		RepositoryID:       &objectLocalParams.repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(repositoryObject, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting repository object", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Return the object from the database.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_uploaded"),
		Data:    repositoryObjectResponse,
	})
}

// RepositoryMoveObject godoc
// @Summary Move repository object
// @Description Move an object to a new path within the same repository at a given reference
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Current object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to move in" default("main")
// @Param body body irmincore.MoveObjectRequest true "Move object request with new path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object moved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new path or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/move [patch]
func (api *APIControllers) RepositoryMoveObject(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.MoveObjectRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request body", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.NewPath == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Move the object to the new path in the repository at ref
	newObject, err := dataEngine.MoveObject(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
		req.NewPath,
	)
	if err != nil {
		api.Logger.Error("Error moving object in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Save the updates to the database
	repositoryObject, err := lib.SaveObject(
		api.DB,
		newObject,
		objectLocalParams.objectRef,
		objectLocalParams.repository.ID,
	)
	if err != nil {
		api.Logger.Error("Error saving object to database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Object %s moved to %s on branch %s",
			objectLocalParams.object.Path,
			newObject.Path,
			objectLocalParams.objectRef,
		),
		UserID:             &objectLocalParams.user.ID,
		WorkspaceID:        &objectLocalParams.workspace.ID,
		RepositoryID:       &objectLocalParams.repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(repositoryObject, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting repository object", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_moved"),
		Data:    repositoryObjectResponse,
	})
}

// RepositoryCopyObject godoc
// @Summary Copy repository object
// @Description Copy an object to a new path within the same repository at a given reference
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Source object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to copy in" default("main")
// @Param body body irmincore.MoveObjectRequest true "Copy object request with new path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object copied successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new path or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/copy [post]
func (api *APIControllers) RepositoryCopyObject(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.MoveObjectRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request body", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.NewPath == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Copy the object to the new path in the repository at ref
	newObject, err := dataEngine.CopyObject(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
		req.NewPath,
	)
	if err != nil {
		api.Logger.Error("Error copying object in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Save the updates to the database
	repositoryObject, err := lib.SaveObject(
		api.DB,
		newObject,
		objectLocalParams.objectRef,
		objectLocalParams.repository.ID,
	)
	if err != nil {
		api.Logger.Error("Error saving object to database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Object %s copied to %s on branch %s",
			objectLocalParams.object.Path,
			newObject.Path,
			objectLocalParams.objectRef,
		),
		UserID:             &objectLocalParams.user.ID,
		WorkspaceID:        &objectLocalParams.workspace.ID,
		RepositoryID:       &objectLocalParams.repository.ID,
		RepositoryObjectID: &repositoryObject.ID,
	})

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(repositoryObject, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting repository object", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_copied"),
		Data:    repositoryObjectResponse,
	})
}

// deleteObjectInTransaction handles the transactional deletion of objects from both Data Engine and database.
func (api *APIControllers) deleteObjectInTransaction(
	c fiber.Ctx,
	objectLocalParams *objectLocalParams,
) error {
	// Initialize Data Engine client outside transaction
	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return err
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Delete the object cache from the database
		deleteDatabaseObjectErr := api.DB.DeleteObjects(tx,
			&objectLocalParams.object.Path,
			&objectLocalParams.repository.ID,
			&objectLocalParams.objectRef,
		)
		if deleteDatabaseObjectErr != nil {
			api.Logger.Error("Error deleting object from database", "error", deleteDatabaseObjectErr)
			return deleteDatabaseObjectErr
		}

		// Delete from the Data Engine
		deleteEngineObjectErr := dataEngine.DeleteObject(
			objectLocalParams.workspace.Slug,
			objectLocalParams.repository.Slug,
			objectLocalParams.object.Path,
			objectLocalParams.objectRef,
		)
		if deleteEngineObjectErr != nil {
			api.Logger.Error("Error deleting object from Data Engine", "error", deleteEngineObjectErr)
			return deleteEngineObjectErr
		}

		return nil
	})

	// If transaction failed, log the error
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Transaction failed for object deletion", "error", transactionErr)
		return transactionErr
	}

	return nil
}

// RepositoryObjectsDestroy godoc
// @Summary Delete repository object
// @Description Delete an object from a repository at a given reference (includes atomic transaction)
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository to delete"
// @Param ref query string false "Reference (branch, tag, or commit) to delete from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse "Object deleted successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path} [delete]
func (api *APIControllers) RepositoryObjectsDestroy(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Use database transaction to ensure atomicity
	transactionErr := api.deleteObjectInTransaction(c, objectLocalParams)
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for object deletion", "error", transactionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeDelete,
		Description: fmt.Sprintf(
			"Object %s deleted from branch %s",
			objectLocalParams.object.Path,
			objectLocalParams.objectRef,
		),
		UserID:             &objectLocalParams.user.ID,
		WorkspaceID:        &objectLocalParams.workspace.ID,
		RepositoryID:       &objectLocalParams.repository.ID,
		RepositoryObjectID: &objectLocalParams.object.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_deleted"),
	})
}

// RepositoryObjectsContent godoc
// @Summary Download repository object content
// @Description Download the raw content of an object from a repository at a given reference
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce application/octet-stream
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to download from" default("main")
// @Success 200 {file} file "Object content as file download"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/content [get]
func (api *APIControllers) RepositoryObjectsContent(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Get the content of the object in the repository at ref
	content, getObjectContentErr := dataEngine.GetObjectContent(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
	)
	if getObjectContentErr != nil {
		api.Logger.Error("Error retrieving object content from Data Engine", "error", getObjectContentErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Write the file content as a download response
	return utils.WriteFileDownloadResponse(
		c,
		fiber.StatusOK,
		objectLocalParams.object.Name,
		objectLocalParams.object.ContentType,
		content,
	)
}

// RepositoryObjectsStructuredContent godoc
// @Summary Get structured object content
// @Description Get the parsed structured content of a data file (CSV, JSON, etc.) from a repository
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository (must be structured data file)"
// @Param ref query string false "Reference (branch, tag, or commit) to get content from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Structured content retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - object is not structured data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/structured [get]
func (api *APIControllers) RepositoryObjectsStructuredContent(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure the object is a structured file
	if objectLocalParams.object.Type != irminmodels.ObjectTypeStructured {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Get the content of the object in the repository at ref
	content, getObjectContentErr := dataEngine.GetObjectContent(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
	)
	if getObjectContentErr != nil {
		api.Logger.Error("Error retrieving object content from Data Engine", "error", getObjectContentErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Parse the file content
	parsedResults, parseStructuredFileErr := lib.ParseStructuredFiles(
		c,
		map[string][]byte{objectLocalParams.object.Path: content},
		api.Env,
		api.Logger,
	)
	if parseStructuredFileErr != nil {
		api.Logger.Error("Error parsing structured files", "error", parseStructuredFileErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// If there are no results, return a 404
	if len(parsedResults) == 0 {
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Return the results
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: parsedResults[objectLocalParams.object.Path],
	})
}

// RepositoryObjectsDownload godoc
// @Summary Download repository objects as ZIP
// @Description Download a single object or entire directory structure as a ZIP file from a repository
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce application/zip
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object or directory path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to download from" default("main")
// @Success 200 {file} file "ZIP file containing requested objects"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/download [get]
func (api *APIControllers) RepositoryObjectsDownload(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	files := make(map[string][]byte)

	var processErr error
	if objectLocalParams.object.Type == irminmodels.ObjectTypeGroup {
		processErr = api.processGroupObjectDownload(
			objectLocalParams.object,
			objectLocalParams.workspace,
			objectLocalParams.repository,
			objectLocalParams.objectRef,
			dataEngine,
			files,
		)
	} else {
		processErr = api.processSingleObjectDownload(objectLocalParams.object, objectLocalParams.workspace, objectLocalParams.repository, objectLocalParams.objectRef, dataEngine, files)
	}

	if processErr != nil {
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	zipContent, err := irminutils.ZipFiles(files)
	if err != nil {
		api.Logger.Error("Error creating zip file", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	timestamp := time.Now().UnixMilli()
	zipName := fmt.Sprintf(
		"%s-%s-%s-%s-%d.zip",
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Name,
		objectLocalParams.objectRef,
		timestamp,
	)
	return utils.WriteFileDownloadResponse(c, fiber.StatusOK, zipName, "application/zip", zipContent)
}

// RepositoryObjectsHistory godoc
// @Summary Get object commit history
// @Description Get the commit history for a specific object in a repository
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to get history from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Commit} "Object history retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/history [get]
func (api *APIControllers) RepositoryObjectsHistory(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c, objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Get the commit history of the object in the repository at ref
	commits, getObjectChangesErr := dataEngine.GetObjectChanges(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
	)
	if getObjectChangesErr != nil {
		api.Logger.Error("Error retrieving object history from Data Engine", "error", getObjectChangesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: commits,
	})
}

// RepositoryObjectsSchema godoc
// @Summary Get object schema
// @Description Get the schema definition for a structured data object in a repository
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param object_path path string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to get schema from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Object schema retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/{object_path}/schema [get]
func (api *APIControllers) RepositoryObjectsSchema(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the schema of the object in the repository at ref
	scm := lib.NewSchemaCacheManager(api.Env, api.Logger, api.DB)
	schema, getObjectSchemaErr := scm.GetObjectSchema(
		c,
		objectLocalParams.workspace,
		objectLocalParams.repository,
		objectLocalParams.object,
		objectLocalParams.objectRef,
		objectLocalParams.locale,
		false,
	)
	if getObjectSchemaErr != nil {
		api.Logger.Error("Error retrieving object schema", "error", getObjectSchemaErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: schema,
	})
}

// processGroupObject recursively processes a group object and its children, storing file contents in the provided map.
func (api *APIControllers) processGroupObjectDownload(
	group *db.RepositoryObject,
	workspace *db.Workspace,
	repository *db.Repository,
	objectRef string,
	dataEngine *engine.Client,
	files map[string][]byte,
) error {
	if group == nil {
		return errors.New("group object is nil")
	}
	if group.Type != irminmodels.ObjectTypeGroup {
		return fmt.Errorf("object %q is not a group", group.Name)
	}

	for i := range group.Children {
		child := &group.Children[i]
		if child.Type == irminmodels.ObjectTypeGroup {
			if err := api.processGroupObjectDownload(child, workspace, repository, objectRef, dataEngine, files); err != nil {
				return err
			}
		} else {
			if err := api.processSingleObjectDownload(child, workspace, repository, objectRef, dataEngine, files); err != nil {
				return err
			}
		}
	}
	return nil
}

// processSingleObject fetches and stores the content of a single object.
func (api *APIControllers) processSingleObjectDownload(
	object *db.RepositoryObject,
	workspace *db.Workspace,
	repository *db.Repository,
	objectRef string,
	dataEngine *engine.Client,
	files map[string][]byte,
) error {
	content, err := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, object.Path, objectRef)
	if err != nil {
		api.Logger.Error("Error retrieving object content", "error", err)
		return err
	}
	files[object.Path] = content
	return nil
}
