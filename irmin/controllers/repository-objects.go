package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

type objectLocalParams struct {
	locale     string
	dict       locales.Dictionary
	user       *db.User
	repository *db.Repository
	workspace  *db.Workspace
	objectPath string
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
	objectPath, objectPathOk := c.Locals("object_path").(string)
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
	if !objectPathOk {
		return nil, errors.New("object path not found in context")
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
		objectPath: objectPath,
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
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to get object from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects [get]
func (api *APIControllers) RepositoryObjectsIndex(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Structure the response
	objectResponse, formatErr := formatter.FormatRepositoryObjectResponse(object, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting objects",
			services.NewInternalErrorf("error formatting repository object: %v", formatErr),
			params.dict,
		)
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
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to upload to" default("main")
// @Param file formData file true "File to upload"
// @Param metadata formData string false "Optional metadata as JSON string"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object uploaded successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid file or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/upload [post]
func (api *APIControllers) RepositoryUploadObject(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the multipart form data
	form, err := c.MultipartForm()
	if err != nil {
		return api.handleServiceError(
			c,
			"Error parsing form data",
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, err),
			params.dict,
		)
	}

	// Validate that a file was provided
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		return api.handleServiceError(
			c,
			"No file found in form data",
			services.ErrInvalidRequest,
			params.dict,
		)
	}

	// Open the uploaded file
	file, err := form.File["file"][0].Open()
	if err != nil {
		return api.handleServiceError(
			c,
			"Error opening file",
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, err),
			params.dict,
		)
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

	// Parse tags from form data
	var tags []string
	if tagsData := form.Value["tags"]; len(tagsData) > 0 {
		// Check if it's a JSON string array (starts with '[')
		if len(tagsData) == 1 && len(tagsData[0]) > 0 && tagsData[0][0] == '[' {
			if unmarshalErr := json.Unmarshal([]byte(tagsData[0]), &tags); unmarshalErr != nil {
				// If unmarshal fails, treat as single tag value
				tags = tagsData
			}
		} else {
			tags = tagsData
		}
	}

	// Upload the object to the path in the repository at ref
	newObject, err := api.Services.UploadRepositoryObject(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		params.objectPath,
		params.objectRef,
		file,
		tags,
	)
	if err != nil {
		return api.handleServiceError(c, "Error uploading object to Data Engine", err, params.dict)
	}

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(newObject, api.SQIDManager)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository object",
			services.NewInternalErrorf("error formatting repository object: %v", err),
			params.dict,
		)
	}

	// Invalidate objects listing for this repository (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the object from the database.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "object_uploaded"),
		Data:    repositoryObjectResponse,
	})
}

// RepositoryUploadObjectFromURL godoc
// @Summary Upload object to repository from URL
// @Description Upload a file from a URL to a specific path in a repository at a given reference
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to upload to" default("main")
// @Param body body irmincore.UploadObjectFromURLRequest true "Upload object from URL request with URL and headers"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object uploaded successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid URL or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/upload-from-url [post]
func (api *APIControllers) RepositoryUploadObjectFromURL(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.UploadObjectFromURLRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return api.handleServiceError(c, "Error parsing JSON request body", services.ErrInvalidRequest, params.dict)
	}

	// Upload the object from the URL to the path in the repository at ref
	newObject, err := api.Services.UploadRepositoryObjectFromURL(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		params.objectPath,
		params.objectRef,
		req.URL,
		req.Headers,
		req.Tags,
	)
	if err != nil {
		return api.handleServiceError(c, "Error uploading object from URL to Data Engine", err, params.dict)
	}

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(newObject, api.SQIDManager)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository object",
			services.NewInternalErrorf("error formatting repository object: %v", err),
			params.dict,
		)
	}

	// Invalidate objects listing for this repository (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the object from the database.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "object_uploaded"),
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
// @Param ref query string false "Reference (branch, tag, or commit) to move in" default("main")
// @Param path query string true "Current object path within the repository"
// @Param body body irmincore.MoveObjectRequest true "Move object request with new path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object moved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new path or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/move [patch]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
func (api *APIControllers) RepositoryMoveObject(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Parse the JSON request body
	var req irmincore.MoveObjectRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return api.handleServiceError(c, "Error parsing JSON request body", services.ErrInvalidRequest, params.dict)
	}

	// Move the object to the new path in the repository at ref
	newObject, err := api.Services.MoveRepositoryObject(
		c,
		params.workspace.Slug,
		params.user,
		params.workspace,
		params.repository,
		object,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Error moving object in Data Engine", err, params.dict)
	}

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(newObject, api.SQIDManager)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository object",
			services.NewInternalErrorf("error formatting repository object: %v", err),
			params.dict,
		)
	}

	// Invalidate objects listing for this repository (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "object_moved"),
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
// @Param path query string true "Source object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to copy in" default("main")
// @Param body body irmincore.MoveObjectRequest true "Copy object request with new path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Object copied successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new path or parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/copy [post]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
func (api *APIControllers) RepositoryCopyObject(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Parse the JSON request body
	var req irmincore.MoveObjectRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return api.handleServiceError(c, "Error parsing JSON request body", services.ErrInvalidRequest, params.dict)
	}

	// Copy the object to the new path in the repository at ref
	newObject, err := api.Services.CopyRepositoryObject(
		c,
		params.workspace.Slug,
		params.user,
		params.workspace,
		params.repository,
		object,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Error copying object in Data Engine", err, params.dict)
	}

	// Format the object for the response.
	repositoryObjectResponse, err := formatter.FormatRepositoryObjectResponse(newObject, api.SQIDManager)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error formatting repository object",
			services.NewInternalErrorf("error formatting repository object: %v", err),
			params.dict,
		)
	}

	// Invalidate objects listing for this repository (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "object_copied"),
		Data:    repositoryObjectResponse,
	})
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
// @Param path query string true "Object path within the repository to delete"
// @Param ref query string false "Reference (branch, tag, or commit) to delete from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse "Object deleted successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects [delete]
func (api *APIControllers) RepositoryObjectsDestroy(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Delete the object from the repository at ref
	err := api.Services.DeleteRepositoryObject(
		c,
		params.workspace.Slug,
		params.user,
		params.workspace,
		params.repository,
		object,
	)
	if err != nil {
		return api.handleServiceError(c, "Error deleting object in Data Engine", err, params.dict)
	}

	// Invalidate objects listing for this repository (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/repositories/%s/objects", params.workspace.Slug, params.repository.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "object_deleted"),
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
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to download from" default("main")
// @Success 200 {file} file "Object content as file download"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/content [get]
func (api *APIControllers) RepositoryObjectsContent(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Check for limit-response query parameter
	limitResponse := c.Query("limit-response") == queryParamValueTrue

	// Get the content of the object in the repository at ref
	content, getObjectContentErr := api.Services.GetRepositoryObjectContent(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		object,
		limitResponse,
	)
	if getObjectContentErr != nil {
		// Check if error is due to content being too large
		if errors.Is(getObjectContentErr, services.ErrContentTooLarge) {
			return utils.WriteResponse(c, fiber.StatusRequestEntityTooLarge, irminmodels.IrminAPIResponse{
				Errors: []string{fmt.Sprintf(
					"File too large to display (%.2f MB). Maximum size: %.2f MB. Please download the file instead.",
					float64(object.SizeBytes)/utils.BytesPerMB,
					float64(utils.DefaultMaxBinaryResponseSizeBytes)/utils.BytesPerMB,
				)},
			})
		}
		return api.handleServiceError(
			c,
			"Error retrieving object content from Data Engine",
			getObjectContentErr,
			params.dict,
		)
	}

	// Write the file content as a download response
	return utils.WriteFileDownloadResponse(
		c,
		fiber.StatusOK,
		object.Name,
		object.ContentType,
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
// @Param path query string true "Object path within the repository (must be structured data file)"
// @Param ref query string false "Reference (branch, tag, or commit) to get content from" default("main")
// @Param limit-response query string false "Limit response size for large files" default("false")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Structured content retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - object is not structured data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 413 {object} irminmodels.IrminAPIResponse "Content too large - file exceeds maximum size limit"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/content/structured [get]
func (api *APIControllers) RepositoryObjectsStructuredContent(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Check for limit-response query parameter
	limitResponse := c.Query("limit-response") == queryParamValueTrue

	// Get the structured content of the object in the repository at ref
	parsedResults, getObjectStructuredContentErr := api.Services.GetRepositoryObjectStructuredContent(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		object,
		limitResponse,
	)
	if getObjectStructuredContentErr != nil {
		// Check if error is due to content being too large
		if errors.Is(getObjectStructuredContentErr, services.ErrContentTooLarge) {
			return utils.WriteResponse(c, fiber.StatusRequestEntityTooLarge, irminmodels.IrminAPIResponse{
				Errors: []string{fmt.Sprintf(
					"File too large to display (%.2f MB). Maximum size: %.2f MB. Please download the file instead.",
					float64(object.SizeBytes)/utils.BytesPerMB,
					float64(utils.DefaultMaxBinaryResponseSizeBytes)/utils.BytesPerMB,
				)},
			})
		}
		return api.handleServiceError(
			c,
			"Error retrieving object structured content from Data Engine",
			getObjectStructuredContentErr,
			params.dict,
		)
	}

	// Return the results
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: parsedResults[params.objectPath],
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
// @Param path query string true "Object or directory path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to download from" default("main")
// @Success 200 {file} file "ZIP file containing requested objects"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/download [get]
func (api *APIControllers) RepositoryObjectsDownload(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Build the zip file of the object
	zipContent, zipName, err := api.Services.ZipRepositoryObject(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		object,
	)
	if err != nil {
		return api.handleServiceError(c, "Error zipping object", err, params.dict)
	}

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
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to get history from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Commit} "Object history retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/history [get]
func (api *APIControllers) RepositoryObjectsHistory(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Get the commit history of the object in the repository at ref
	commits, getObjectChangesErr := api.Services.GetRepositoryObjectHistory(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		object,
	)
	if getObjectChangesErr != nil {
		return api.handleServiceError(
			c,
			"Error retrieving object history from Data Engine",
			getObjectChangesErr,
			params.dict,
		)
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
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to get schema from" default("main")
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ObjectSchema} "Object schema retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/schema [get]
func (api *APIControllers) RepositoryObjectsSchema(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the object from the state
	object, objectOk := c.Locals("object").(*db.RepositoryObject)
	if !objectOk || object == nil {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, params.dict)
	}

	// Get the schema of the object in the repository at ref
	schema, getObjectSchemaErr := api.Services.GetRepositoryObjectSchema(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		object,
		params.objectRef,
	)
	if getObjectSchemaErr != nil {
		return api.handleServiceError(
			c,
			"Error retrieving object schema from Data Engine",
			getObjectSchemaErr,
			params.dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: schema,
	})
}
