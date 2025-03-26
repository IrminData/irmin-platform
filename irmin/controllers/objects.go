package controllers

import (
	"irmin-api/dataEngine"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
)

func ObjectsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	object := c.Locals("object").(*dataEngine.Object)

	if object == nil {
		log.Printf("Error retrieving object from Data Engine")
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: object,
	})
}

func UploadObject(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Parse the file from the form data
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("Error parsing form data: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}
	file, err := form.File["file"][0].Open()
	if err != nil {
		log.Printf("Error opening file: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}
	defer file.Close()

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Upload the object to the path in the repository at ref
	newObject, err := DataEngine.UploadObject(workspace.Slug, repository.Slug, object_path, object_ref, file)
	if err != nil {
		log.Printf("Error uploading object to Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("object_uploaded"),
		Data:    newObject,
	})
}

func MoveObject(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Parse the new path from the form data
	fields, err := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form data: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Move the object to the new path in the repository at ref
	newObject, err := DataEngine.MoveObject(workspace.Slug, repository.Slug, object_path, object_ref, fields["new_path"])
	if err != nil {
		log.Printf("Error moving object in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("object_moved"),
		Data:    newObject,
	})
}

func CopyObject(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Parse the new path from the form data
	fields, err := utils.ParseFormFields(c, []string{"new_path"}, nil)
	if err != nil {
		log.Printf("Error parsing form data: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Move the object to the new path in the repository at ref
	newObject, err := DataEngine.CopyObject(workspace.Slug, repository.Slug, object_path, object_ref, fields["new_path"])
	if err != nil {
		log.Printf("Error copying object in Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("object_copied"),
		Data:    newObject,
	})
}

func ObjectsDestroy(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Delete the object from the repository at ref
	err := DataEngine.DeleteObject(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error deleting object from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
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
	DataEngine := dataEngine.NewClient(locale)

	// Get the content of the object in the repository at ref
	object, content, err := DataEngine.GetObjectContent(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error retrieving object content from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Write the file content as a download response
	return utils.WriteFileDownloadResponse(c, fiber.StatusOK, object.Name, content)
}

func ObjectsHistory(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	repository := c.Locals("repository").(*db.Repository)
	workspace := c.Locals("workspace").(*db.Workspace)
	object_ref := c.Locals("object_ref").(string)
	object_path := c.Locals("object_path").(string)

	// Initialize Data Engine client
	DataEngine := dataEngine.NewClient(locale)

	// Get the commit history of the object in the repository at ref
	commits, err := DataEngine.GetObjectChanges(workspace.Slug, repository.Slug, object_path, object_ref)
	if err != nil {
		log.Printf("Error retrieving object history from Data Engine: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: commits,
	})
}

func ObjectsSchema(c fiber.Ctx) error {
	// TODO: Implement schema retrieval
	return c.SendString("ObjectsSchema")
}
