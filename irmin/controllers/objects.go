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

func ObjectsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	object := c.Locals("object").(*irminModels.Object)

	if object == nil {
		log.Printf("Error retrieving object from Data Engine")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: object,
	})
}

func UploadObject(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Parse the file from the form data
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("Error parsing form data: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		log.Printf("No file found in form data")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}
	file, err := form.File["file"][0].Open()
	if err != nil {
		log.Printf("Error opening file: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}
	defer file.Close()

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Upload the object to the path in the repository at ref
	newObject, err := DataEngine.UploadObject(workspace.Slug, repository.Slug, object_path, object_ref, file)
	if err != nil {
		log.Printf("Error uploading object to Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Object %s uploaded to branch %s", newObject.Path, object_ref),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("object_uploaded"),
		Data:    newObject,
	})
}

func MoveObject(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Parse the new path from the form data
	fields, err := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form data: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Move the object to the new path in the repository at ref
	newObject, err := DataEngine.MoveObject(workspace.Slug, repository.Slug, object_path, object_ref, fields["new_path"])
	if err != nil {
		log.Printf("Error moving object in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Object %s moved to %s on branch %s", object_path, newObject.Path, object_ref),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("object_moved"),
		Data:    newObject,
	})
}

func CopyObject(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Parse the new path from the form data
	fields, err := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form data: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Move the object to the new path in the repository at ref
	newObject, err := DataEngine.CopyObject(workspace.Slug, repository.Slug, object_path, object_ref, fields["new_path"])
	if err != nil {
		log.Printf("Error copying object in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeUpdate,
		Description:  fmt.Sprintf("Object %s copied to %s on branch %s", object_path, newObject.Path, object_ref),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("object_copied"),
		Data:    newObject,
	})
}

func ObjectsDestroy(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Delete the object from the repository at ref
	err := DataEngine.DeleteObject(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error deleting object from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(&db.LogEvent{
		Type:         db.LogEventTypeDelete,
		Description:  fmt.Sprintf("Object %s deleted from branch %s", object_path, object_ref),
		UserID:       &user.ID,
		WorkspaceID:  &workspace.ID,
		RepositoryID: &repository.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("object_deleted"),
	})
}

func ObjectsContent(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Get the content of the object in the repository at ref
	object, content, err := DataEngine.GetObjectContent(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error retrieving object content from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Write the file content as a download response
	return utils.WriteFileDownloadResponse(c, fiber.StatusOK, object.Name, object.ContentType, content)
}

func ObjectsHistory(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Get the commit history of the object in the repository at ref
	commits, err := DataEngine.GetObjectChanges(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error retrieving object history from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: commits,
	})
}

func ObjectsSchema(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Get the schema of the object in the repository at ref
	schema, err := DataEngine.GenerateObjectSchema(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error retrieving object schema from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: schema,
	})
}
