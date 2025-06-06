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
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
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

// ObjectsIndex handles retrieving an object from a repository.
func (api *APIControllers) ObjectsIndex(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	if objectLocalParams.object == nil {
		api.Logger.Error("Error retrieving object from Data Engine")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Format the object for the response.
	repositoryObject, err := formatter.FormatRepositoryObjectResponse(objectLocalParams.object, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting repository object", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: repositoryObject,
	})
}

// UploadObject handles uploading an object to a repository.
func (api *APIControllers) UploadObject(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the file from the form data
	form, err := c.MultipartForm()
	if err != nil {
		api.Logger.Error("Error parsing form data", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		api.Logger.Error("No file found in form data")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}
	file, err := form.File["file"][0].Open()
	if err != nil {
		api.Logger.Error("Error opening file", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}
	defer file.Close()

	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_uploaded"),
		Data:    repositoryObjectResponse,
	})
}

// MoveObject handles moving an object to a new path in a repository.
func (api *APIControllers) MoveObject(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the new path from the form data
	fields, err := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if err != nil {
		api.Logger.Error("Error parsing form data", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
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
		fields["new_path"],
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_moved"),
		Data:    repositoryObjectResponse,
	})
}

// CopyObject handles copying an object to a new path in a repository.
func (api *APIControllers) CopyObject(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the new path from the form data
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form data", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Move the object to the new path in the repository at ref
	newObject, err := dataEngine.CopyObject(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
		fields["new_path"],
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_copied"),
		Data:    repositoryObjectResponse,
	})
}

// ObjectsDestroy handles deleting an object from a repository.
func (api *APIControllers) ObjectsDestroy(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the object from the database
	err = api.DB.DeleteObjects(
		&objectLocalParams.object.Path,
		&objectLocalParams.repository.ID,
		&objectLocalParams.objectRef,
	)
	if err != nil {
		api.Logger.Error("Error deleting object from database", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
	if err != nil {
		api.Logger.Error("error creating data engine client", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(objectLocalParams.dict, "error_occurred")},
		})
	}

	// Delete the object from the repository at ref
	err = dataEngine.DeleteObject(
		objectLocalParams.workspace.Slug,
		objectLocalParams.repository.Slug,
		objectLocalParams.object.Path,
		objectLocalParams.objectRef,
	)
	if err != nil {
		api.Logger.Error("Error deleting object from Data Engine", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(objectLocalParams.dict, "object_deleted"),
	})
}

// ObjectsContent handles retrieving the content of an object.
func (api *APIControllers) ObjectsContent(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
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

// ObjectsDownload handles downloading either a single object or all descendants of a group, zipping them, and sending as a download.
func (api *APIControllers) ObjectsDownload(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
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

// ObjectsHistory handles retrieving the commit history of an object.
func (api *APIControllers) ObjectsHistory(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(c.Context(), objectLocalParams.locale, api.Logger, api.Env)
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

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: commits,
	})
}

// ObjectsSchema handles retrieving the schema of an object.
func (api *APIControllers) ObjectsSchema(c fiber.Ctx) error {
	objectLocalParams, err := api.validateObjectParams(c)
	if err != nil {
		api.Logger.Error("Error validating object parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the schema of the object in the repository at ref
	scm := lib.NewSchemaCacheManager(api.Env, api.Logger, api.DB)
	schema, getObjectSchemaErr := scm.GetObjectSchema(
		c.Context(),
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
