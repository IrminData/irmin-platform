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
	"log/slog"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// validateObjectParams validates the common parameters needed for object operations.
// Returns locale, dict, user, repository, workspace, object, objectRef, and an error.
func (api *APIControllers) validateObjectParams(c fiber.Ctx, logger *slog.Logger) (
	string,
	locales.Dictionary,
	*db.User,
	*db.Repository,
	*db.Workspace,
	*db.RepositoryObject,
	string,
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
		logger.Error("Locale not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("locale not found in context")
	}
	if !dictOk {
		logger.Error("Dictionary not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("dictionary not found in context")
	}
	if !userOk {
		logger.Error("User not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("user not found in context")
	}
	if !repositoryOk {
		logger.Error("Repository not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("repository not found in context")
	}
	if !workspaceOk {
		logger.Error("Workspace not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("workspace not found in context")
	}
	if !objectOk {
		logger.Error("Object not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("object not found in context")
	}
	if !objectRefOk {
		logger.Error("Object ref not found in context")
		return "", nil, nil, nil, nil, nil, "", errors.New("object ref not found in context")
	}

	return locale, dict, user, repository, workspace, object, objectRef, nil
}

// ObjectsIndex handles retrieving an object from a repository.
func (api *APIControllers) ObjectsIndex(c fiber.Ctx) error {
	_, dict, _, _, _, object, _, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	if object == nil {
		api.Logger.Error("Error retrieving object from Data Engine")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the object for the response.
	repositoryObject := formatter.FormatRepositoryObjectResponse(object)

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoryObject,
	})
}

// UploadObject handles uploading an object to a repository.
func (api *APIControllers) UploadObject(c fiber.Ctx) error {
	locale, dict, user, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the file from the form data
	form, err := c.MultipartForm()
	if err != nil {
		api.Logger.Error("Error parsing form data", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		api.Logger.Error("No file found in form data")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}
	file, err := form.File["file"][0].Open()
	if err != nil {
		api.Logger.Error("Error opening file", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}
	defer file.Close()

	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Upload the object to the path in the repository at ref
	newObject, err := dataEngine.UploadObject(workspace.Slug, repository.Slug, object.Path, objectRef, file)
	if err != nil {
		api.Logger.Error("Error uploading object to Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Save the updates to the database
	repositoryObject, err := lib.SaveObject(api.DB, newObject, objectRef, repository.ID)
	if err != nil {
		api.Logger.Error("Error saving object to database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Object %s uploaded to branch %s", newObject.Path, objectRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	// Return the object from the database.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "object_uploaded"),
		Data:    formatter.FormatRepositoryObjectResponse(repositoryObject),
	})
}

// MoveObject handles moving an object to a new path in a repository.
func (api *APIControllers) MoveObject(c fiber.Ctx) error {
	locale, dict, user, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the new path from the form data
	fields, err := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if err != nil {
		api.Logger.Error("Error parsing form data", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Move the object to the new path in the repository at ref
	newObject, err := dataEngine.MoveObject(
		workspace.Slug,
		repository.Slug,
		object.Path,
		objectRef,
		fields["new_path"],
	)
	if err != nil {
		api.Logger.Error("Error moving object in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Save the updates to the database
	repositoryObject, err := lib.SaveObject(api.DB, newObject, objectRef, repository.ID)
	if err != nil {
		api.Logger.Error("Error saving object to database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Object %s moved to %s on branch %s", object.Path, newObject.Path, objectRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "object_moved"),
		Data:    formatter.FormatRepositoryObjectResponse(repositoryObject),
	})
}

// CopyObject handles copying an object to a new path in a repository.
func (api *APIControllers) CopyObject(c fiber.Ctx) error {
	locale, dict, user, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the new path from the form data
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form data", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Move the object to the new path in the repository at ref
	newObject, err := dataEngine.CopyObject(
		workspace.Slug,
		repository.Slug,
		object.Path,
		objectRef,
		fields["new_path"],
	)
	if err != nil {
		api.Logger.Error("Error copying object in Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Save the updates to the database
	repositoryObject, err := lib.SaveObject(api.DB, newObject, objectRef, repository.ID)
	if err != nil {
		api.Logger.Error("Error saving object to database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Object %s copied to %s on branch %s", object.Path, newObject.Path, objectRef),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "object_copied"),
		Data:    formatter.FormatRepositoryObjectResponse(repositoryObject),
	})
}

// ObjectsDestroy handles deleting an object from a repository.
func (api *APIControllers) ObjectsDestroy(c fiber.Ctx) error {
	locale, dict, user, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the object from the database
	err = api.DB.DeleteObjects(&object.Path, &repository.ID, &objectRef)
	if err != nil {
		api.Logger.Error("Error deleting object from database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Delete the object from the repository at ref
	err = dataEngine.DeleteObject(workspace.Slug, repository.Slug, object.Path, objectRef)
	if err != nil {
		api.Logger.Error("Error deleting object from Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Object %s deleted from branch %s", object.Path, objectRef),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "object_deleted"),
	})
}

// ObjectsContent handles retrieving the content of an object.
func (api *APIControllers) ObjectsContent(c fiber.Ctx) error {
	locale, dict, _, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the content of the object in the repository at ref
	content, getObjectContentErr := dataEngine.GetObjectContent(workspace.Slug, repository.Slug, object.Path, objectRef)
	if getObjectContentErr != nil {
		api.Logger.Error("Error retrieving object content from Data Engine", "error", getObjectContentErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Write the file content as a download response
	return utils.WriteFileDownloadResponse(c, fiber.StatusOK, object.Name, object.ContentType, content)
}

// ObjectsDownload handles downloading either a single object or all descendants of a group, zipping them, and sending as a download.
func (api *APIControllers) ObjectsDownload(c fiber.Ctx) error {
	locale, dict, _, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	files := make(map[string][]byte)

	var processErr error
	if object.Type == irminmodels.ObjectTypeGroup {
		processErr = api.processGroupObjectDownload(object, workspace, repository, objectRef, dataEngine, files)
	} else {
		processErr = api.processSingleObjectDownload(object, workspace, repository, objectRef, dataEngine, files)
	}

	if processErr != nil {
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	zipContent, err := irminutils.ZipFiles(files)
	if err != nil {
		api.Logger.Error("Error creating zip file", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	timestamp := time.Now().UnixMilli()
	zipName := fmt.Sprintf(
		"%s-%s-%s-%s-%d.zip",
		workspace.Slug, repository.Slug, object.Name, objectRef, timestamp,
	)
	return utils.WriteFileDownloadResponse(c, fiber.StatusOK, zipName, "application/zip", zipContent)
}

// ObjectsHistory handles retrieving the commit history of an object.
func (api *APIControllers) ObjectsHistory(c fiber.Ctx) error {
	locale, dict, _, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the commit history of the object in the repository at ref
	commits, getObjectChangesErr := dataEngine.GetObjectChanges(workspace.Slug, repository.Slug, object.Path, objectRef)
	if getObjectChangesErr != nil {
		api.Logger.Error("Error retrieving object history from Data Engine", "error", getObjectChangesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: commits,
	})
}

// ObjectsSchema handles retrieving the schema of an object.
func (api *APIControllers) ObjectsSchema(c fiber.Ctx) error {
	locale, dict, _, repository, workspace, object, objectRef, err := api.validateObjectParams(c, api.Logger)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the schema of the object in the repository at ref
	scm := lib.NewSchemaCacheManager(api.Env, api.Logger, api.DB)
	schema, getObjectSchemaErr := scm.GetObjectSchema(
		c.Context(),
		workspace,
		repository,
		object,
		objectRef,
		locale,
	)
	if getObjectSchemaErr != nil {
		api.Logger.Error("Error retrieving object schema", "error", getObjectSchemaErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
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
