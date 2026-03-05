package controllers

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"
	"strings"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

const (
	// signedURLDefaultExpiryHours is the default expiry when none is specified.
	signedURLDefaultExpiryHours = 24
	// signedURLNeverExpiryHours is used when expires_in_hours is 0 (never expires ≈ 100 years).
	signedURLNeverExpiryHours = 876000
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

// RepositoryObjectsCreateSignedURL godoc
// @Summary Create a signed download URL for a repository object
// @Description Generate a time-limited signed URL that allows downloading a repository object without authentication.
// @Description Permissions are checked at URL creation time. The URL can be shared with external users.
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param body body irmincore.CreateSignedURLRequest true "Signed URL request parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irmincore.SignedURLResponse} "Signed URL created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found at the specified path and ref"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/signed-url [post]
func (api *APIControllers) RepositoryObjectsCreateSignedURL(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	repository, repositoryOk := c.Locals("repository").(*db.Repository)

	if !dictOk || !userOk || !workspaceOk || !repositoryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Missing required context"},
		})
	}

	// Parse and validate the request body
	var req irmincore.CreateSignedURLRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Normalize path once — other object flows trim the leading slash and the rest
	// of this handler (ObjectExists, token payload, checkObjectPermission) must all
	// operate on the same canonical value.
	req.Path = strings.TrimPrefix(req.Path, "/")

	// Block system paths and pointer files before any engine calls
	if engine.IsSystemPath(req.Path) {
		return api.handleServiceError(c, "Invalid path", services.ErrInvalidPath, dict)
	}
	if engine.IsPointerPath(req.Path) {
		return api.handleServiceError(
			c,
			"Signed downloads of pointer files are not supported",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Default ref to repository default branch
	ref := req.Ref
	if ref == "" {
		ref = repository.DefaultBranch
	}

	// Determine expiry: nil = default 24h, 0 = never expires, >0 = custom
	expiresInHours := signedURLDefaultExpiryHours
	if req.ExpiresInHours != nil {
		if *req.ExpiresInHours == 0 {
			expiresInHours = signedURLNeverExpiryHours
		} else if *req.ExpiresInHours > 0 {
			expiresInHours = *req.ExpiresInHours
		}
	}

	// Verify the object exists by looking it up via the data engine
	dataEngine, engineErr := engine.NewClient(c.Context(), "en", api.Logger, api.Env, api.DB)
	if engineErr != nil {
		api.Logger.Error("Error creating data engine client for signed URL", "error", engineErr)
		return api.handleServiceError(
			c,
			"Error creating data engine client",
			services.NewInternalErrorf("engine client error: %w", engineErr),
			dict,
		)
	}

	exists, existsErr := dataEngine.ObjectExists(workspace.Slug, repository.Slug, req.Path, ref)
	if existsErr != nil {
		return api.handleServiceError(
			c,
			"Error checking object existence",
			services.NewInternalErrorf("object existence check error: %w", existsErr),
			dict,
		)
	}
	if !exists {
		return api.handleServiceError(c, "Object not found", services.ErrNotFound, dict)
	}

	// Check object-level permissions against the specific object to enforce deny policies
	if permErr := api.checkObjectPermission(user, workspace, repository, req.Path, ref); permErr != nil {
		return api.handleServiceError(c, "Error checking permissions", permErr, dict)
	}

	// Require a dedicated signing secret — never fall back to ClerkSigningKey
	// which may be public JWT verification material in asymmetric setups.
	secret := api.Env.SignedURLSecret
	if secret == "" {
		api.Logger.Error("SIGNED_URL_SECRET is not configured, cannot create signed URLs")
		return api.handleServiceError(
			c,
			"Signed URLs are not configured",
			services.NewInternalErrorf("SIGNED_URL_SECRET not set"),
			dict,
		)
	}

	// Generate signed token
	expiresAt := time.Now().Add(time.Duration(expiresInHours) * time.Hour).Unix()
	payload := utils.SignedURLPayload{
		Workspace: workspace.Slug,
		Repo:      repository.Slug,
		Path:      req.Path,
		Ref:       ref,
		ExpiresAt: expiresAt,
	}

	token, tokenErr := utils.GenerateSignedToken([]byte(secret), payload)
	if tokenErr != nil {
		api.Logger.Error("Error generating signed token", "error", tokenErr)
		return api.handleServiceError(
			c,
			"Error generating signed URL",
			services.NewInternalErrorf("token generation error: %w", tokenErr),
			dict,
		)
	}

	// Build the full URL
	signedURL := fmt.Sprintf("%s/api/v1/signed/download?token=%s", api.Env.URL, token)

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: irmincore.SignedURLResponse{
			URL:       signedURL,
			ExpiresAt: time.Unix(expiresAt, 0).UTC().Format(time.RFC3339),
		},
	})
}

// checkObjectPermission looks up a repository object by path and verifies the user has read access.
// Returns nil if the object isn't indexed yet (record not found) or if access is allowed.
// Returns a service error if the DB lookup fails or if access is denied.
func (api *APIControllers) checkObjectPermission(
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	rawPath string,
	ref string,
) error {
	objectPath := strings.TrimPrefix(rawPath, "/")
	objectDB, objectDBErr := api.DB.FindObject(&objectPath, &repository.ID, &ref)
	if objectDBErr != nil {
		if errors.Is(objectDBErr, gorm.ErrRecordNotFound) {
			// Object exists in storage but isn't indexed yet — deny policies can't be
			// verified, so refuse to issue a signed URL until the object is indexed.
			return services.ErrNotFound
		}
		api.Logger.Error("Error looking up object for permission check", "error", objectDBErr)
		return services.NewInternalErrorf("object lookup error: %w", objectDBErr)
	}
	if objectDB == nil {
		return services.ErrNotFound
	}

	isAllowed, permErr := api.Services.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&objectDB.ID,
		db.PolicyActionRead,
	)
	if permErr != nil {
		api.Logger.Error("Error checking object-level permissions for signed URL", "error", permErr)
		return services.NewInternalErrorf("permission check error: %w", permErr)
	}
	if !isAllowed {
		return services.ErrNotFound // Return not-found to avoid leaking object existence
	}
	return nil
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
	if staleErr := api.Services.DB.MarkObjectCacheStale(params.repository.ID, params.objectRef); staleErr != nil {
		api.Logger.Error("Error marking object cache stale", "error", staleErr)
	}

	// Return the object from the database.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, "object_uploaded"),
		Data:    repositoryObjectResponse,
	})
}

// formatAndCacheInvalidateObject is a helper function that formats an object response and invalidates the cache.
func (api *APIControllers) formatAndCacheInvalidateObject(
	c fiber.Ctx,
	params *objectLocalParams,
	newObject *db.RepositoryObject,
	successMessageKey string,
) error {
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
	if staleErr := api.Services.DB.MarkObjectCacheStale(params.repository.ID, params.objectRef); staleErr != nil {
		api.Logger.Error("Error marking object cache stale", "error", staleErr)
	}

	// Return the object from the database.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(params.dict, successMessageKey),
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

	return api.formatAndCacheInvalidateObject(c, params, newObject, "object_uploaded")
}

// RepositoryCreatePointer godoc
// @Summary Create pointer to object in another repository
// @Description Create a pointer file that references an object in another repository within the same workspace
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param ref query string false "Reference (branch) to create pointer in" default("main")
// @Param path query string true "Path for the pointer file (will be prefixed with _ptr. if not already)"
// @Param body body irmincore.CreatePointerRequest true "Pointer target information"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object} "Pointer created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Target repository or object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/pointer [post]
func (api *APIControllers) RepositoryCreatePointer(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating repository object localparameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreatePointerRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return api.handleServiceError(c, "Error parsing JSON request body", services.ErrInvalidRequest, params.dict)
	}

	// Create the pointer
	newObject, err := api.Services.CreatePointer(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		params.objectPath,
		params.objectRef,
		req.TargetWorkspace,
		req.TargetRepository,
		req.TargetPath,
		req.TargetRef,
	)
	if err != nil {
		return api.handleServiceError(c, "Error creating pointer", err, params.dict)
	}

	return api.formatAndCacheInvalidateObject(c, params, newObject, "pointer_created")
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
	if staleErr := api.Services.DB.MarkObjectCacheStale(params.repository.ID, params.objectRef); staleErr != nil {
		api.Logger.Error("Error marking object cache stale", "error", staleErr)
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
	if staleErr := api.Services.DB.MarkObjectCacheStale(params.repository.ID, params.objectRef); staleErr != nil {
		api.Logger.Error("Error marking object cache stale", "error", staleErr)
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
	if staleErr := api.Services.DB.MarkObjectCacheStale(params.repository.ID, params.objectRef); staleErr != nil {
		api.Logger.Error("Error marking object cache stale", "error", staleErr)
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
// @Success 302 "Redirect to presigned URL for large files"
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

	// Check for limit-response query parameter (used for in-browser preview with size limits)
	limitResponse := c.Query("limit-response") == queryParamValueTrue

	// When limit-response is set, use the existing in-memory path with size limits
	// This is used by the console for inline file preview, not for downloads
	if limitResponse {
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

		return utils.WriteFileInlineResponse(c, fiber.StatusOK, object.Name, object.ContentType, content)
	}

	// For downloads, use size-tiered routing: in-memory, stream, or presigned URL redirect
	result, downloadErr := api.Services.GetRepositoryObjectDownload(
		c, params.locale, params.user, params.workspace, params.repository, object,
	)
	if downloadErr != nil {
		return api.handleServiceError(
			c, "Error retrieving object content", downloadErr, params.dict,
		)
	}

	switch result.Tier {
	case utils.FileSizeTierInMemory:
		return utils.WriteFileDownloadResponse(
			c, fiber.StatusOK, object.Name, result.ContentType, result.Content,
		)

	case utils.FileSizeTierStream:
		// Do not defer result.Stream.Close() here — fasthttp reads from the
		// stream after the handler returns and closes it automatically via
		// Response.closeBodyStream() for readers that implement io.Closer.
		return utils.WriteStreamDownloadResponse(
			c, fiber.StatusOK, object.Name, result.ContentType, result.Stream, result.ContentLen,
		)

	case utils.FileSizeTierRedirect, utils.FileSizeTierAsync:
		return c.Redirect().Status(fiber.StatusFound).To(result.RedirectURL)
	}

	// Defensive close: if a future tier is added and opens a stream without a
	// matching case above, ensure the connection is not leaked.
	if result.Stream != nil {
		_ = result.Stream.Close()
	}

	return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
		Errors: []string{"unexpected download tier"},
	})
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

	// Determine total size to decide between in-memory and streaming zip.
	// For single files, use the known size directly (no DB traversal needed).
	// For directories, recursively calculate the total. On error, fall through
	// to the streaming path which is safe for any size.
	maxInMemoryBytes := int64(api.Env.MaxInMemorySizeMB) * int64(utils.BytesPerMB)
	var totalSize int64
	var sizeErr error
	if object.Type == irminmodels.ObjectTypeGroup {
		totalSize, sizeErr = services.CalculateObjectTotalSize(api.DB, object)
	} else {
		totalSize = object.SizeBytes
	}

	// For small objects/directories, use the existing in-memory zip approach.
	// Note: for directories this traverses children again to fetch content,
	// but the in-memory path is only taken for small totals so the overhead is bounded.
	if sizeErr == nil && totalSize <= maxInMemoryBytes {
		zipContent, zipName, zipErr := api.Services.ZipRepositoryObject(
			c, params.locale, params.user, params.workspace, params.repository, object,
		)
		if zipErr != nil {
			return api.handleServiceError(c, "Error zipping object", zipErr, params.dict)
		}
		return utils.WriteFileDownloadResponse(c, fiber.StatusOK, zipName, "application/zip", zipContent)
	}

	// For larger directories, stream the zip directly to the response.
	// Generate zip name here since StreamZipRepositoryObject doesn't return one.
	timestamp := time.Now().UnixMilli()
	zipName := fmt.Sprintf(
		"%s-%s-%s-%s-%d.zip",
		params.workspace.Slug, params.repository.Slug,
		object.Name, object.RepositoryRef, timestamp,
	)
	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, zipName))
	c.Status(fiber.StatusOK)

	return c.SendStreamWriter(func(w *bufio.Writer) {
		streamErr := api.Services.StreamZipRepositoryObject(
			c, params.locale, params.user, params.workspace, params.repository, object, w,
		)
		if streamErr != nil {
			api.Logger.Error("Error streaming zip", "error", streamErr)
		}
		_ = w.Flush()
	})
}

// RepositoryObjectsPresignedUpload godoc
// @Summary Generate presigned upload URL
// @Description Generate a presigned URL for direct-to-storage upload. The client uploads directly
// @Description to the storage backend using the returned URL, then calls the associate endpoint.
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param path query string true "Object path within the repository"
// @Param ref query string true "Branch to upload to"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=services.PresignedUploadResult}
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/upload/presigned [post]
func (api *APIControllers) RepositoryObjectsPresignedUpload(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating parameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	result, err := api.Services.GeneratePresignedUploadURL(
		c, params.user, params.workspace, params.repository,
		params.objectPath, params.objectRef,
	)
	if err != nil {
		return api.handleServiceError(c, "Error generating presigned upload URL", err, params.dict)
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// RepositoryObjectsAssociateUpload godoc
// @Summary Associate a staged upload
// @Description Link a previously uploaded object (via presigned URL) with a path in the repository.
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param path query string true "Object path within the repository"
// @Param ref query string true "Branch to associate the upload with"
// @Param body body associateUploadRequest true "Upload metadata"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Object}
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/upload/associate [post]
func (api *APIControllers) RepositoryObjectsAssociateUpload(c fiber.Ctx) error {
	params, validateLocalParamsErr := api.validateObjectParams(c)
	if validateLocalParamsErr != nil {
		api.Logger.Error("Error validating parameters", "error", validateLocalParamsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	var reqBody associateUploadRequest
	if parseErr := c.Bind().JSON(&reqBody); parseErr != nil {
		return api.handleServiceError(
			c, "Error parsing request body",
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, parseErr),
			params.dict,
		)
	}

	if reqBody.PhysicalAddress == "" || reqBody.Checksum == "" || reqBody.SizeBytes <= 0 || reqBody.ContentType == "" {
		return api.handleServiceError(
			c, "Missing required fields",
			fmt.Errorf(
				"%w: physical_address, checksum, content_type must be non-empty and size_bytes must be positive",
				services.ErrInvalidRequest,
			),
			params.dict,
		)
	}

	result, err := api.Services.AssociatePresignedUpload(
		c, params.locale, params.user, params.workspace, params.repository,
		params.objectPath, params.objectRef,
		reqBody.PhysicalAddress, reqBody.Checksum, reqBody.SizeBytes, reqBody.ContentType,
	)
	if err != nil {
		return api.handleServiceError(c, "Error associating upload", err, params.dict)
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: result,
	})
}

// associateUploadRequest is the request body for the associate upload endpoint.
type associateUploadRequest struct {
	PhysicalAddress string `json:"physical_address"`
	Checksum        string `json:"checksum"`
	SizeBytes       int64  `json:"size_bytes"`
	ContentType     string `json:"content_type"`
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

// RepositoryObjectsValidate godoc
// @Summary Validate repository object
// @Description Validate a repository object's data against a provided schema definition
// @Tags repository-objects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param repository_slug path string true "Repository slug"
// @Param path query string true "Object path within the repository"
// @Param ref query string false "Reference (branch, tag, or commit) to validate from" default("main")
// @Param body body irmincore.ValidateObjectRequest true "Validation parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irmincore.ValidateObjectResponse} "Object validated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid parameters or validation failed"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Object not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/repositories/{repository_slug}/objects/validate [post]
func (api *APIControllers) RepositoryObjectsValidate(c fiber.Ctx) error {
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

	// Parse the request body
	var req irmincore.ValidateObjectRequest
	if err := c.Bind().JSON(&req); err != nil {
		return api.handleServiceError(
			c,
			"Error parsing request body",
			services.NewInternalErrorf("error parsing request body: %w", err),
			params.dict,
		)
	}

	// Validate the object
	validationResponse, validateErr := api.Services.ValidateRepositoryObject(
		c,
		params.locale,
		params.user,
		params.workspace,
		params.repository,
		object,
		req.ValidationSchema,
		req.ValidationMode,
	)
	if validateErr != nil {
		return api.handleServiceError(
			c,
			"Error validating repository object",
			validateErr,
			params.dict,
		)
	}

	// Return appropriate status code
	// 200 if validation passed or was permissive
	// 400 if validation failed in strict mode
	statusCode := fiber.StatusOK
	if !validationResponse.Valid {
		// Check strict mode - if strict and failed, return 400
		// We can infer mode from whether Error is set, as ValidateRepositoryObject sets Error only if strict mode fails
		// Or we can check the request mode
		if req.ValidationMode == "strict" || req.ValidationMode == "" {
			statusCode = fiber.StatusBadRequest
		}
	}

	return api.validateAndWriteResponse(c, statusCode, irminmodels.IrminAPIResponse{
		Data: validationResponse,
	})
}
