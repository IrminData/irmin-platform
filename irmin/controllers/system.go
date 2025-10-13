package controllers

import (
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// SystemWebhook godoc
// @Summary System webhook endpoint
// @Description Handle webhook events from internal services (LakeFS, orchestrator dispatch events)
// @Tags system
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param type query string true "Webhook type (lakefs, dispatch)"
// @Param body body object true "Webhook payload (varies by type)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Webhook processed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid webhook type or payload"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid system authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /system/webhook [post]
func (api *APIControllers) SystemWebhook(c fiber.Ctx) error {
	// Make sure the request is authenticated with a system token
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	if !isSystemOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}
	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}

	// Get the query params
	query, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"type"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error parsing query params", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Error parsing query params"},
		})
	}

	// Process the system webhook
	err := api.Services.ProcessSystemWebhook(c, query["type"], c.Body(), isSystem)
	if err != nil {
		api.Logger.Error("Error processing system webhook", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Error processing system webhook"},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Webhook received",
	})
}

// GenerateFileSchema godoc
// @Summary Generate schema from uploaded file
// @Description Upload a file (CSV, JSON, Parquet, etc.) and get its schema structure
// @Tags schema
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "File to analyze (CSV, JSON, Parquet, Excel, Avro, ORC, etc.)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ObjectSchema} "File schema generated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid file or missing file"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid system authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /system/schema-from-file [post]
func (api *APIControllers) GenerateFileSchema(c fiber.Ctx) error {
	// Make sure the request is authenticated with a system token
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	if !isSystemOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}

	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}

	// Get the dictionary and locale from the request context
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)

	if !localeOk || !dictOk {
		api.Logger.Error("Error validating parameters")
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the multipart form data
	form, err := c.MultipartForm()
	if err != nil {
		api.Logger.Error("Error parsing form data", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate that a file was provided
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		api.Logger.Error("No file found in form data")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Get the uploaded file
	fileHeader := form.File["file"][0]
	file, err := fileHeader.Open()
	if err != nil {
		api.Logger.Error("Error opening file", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}
	defer file.Close()

	// Generate the schema
	schema, err := api.Services.GenerateSchemaFromUploadedFile(c, locale, fileHeader.Filename, file)
	if err != nil {
		api.Logger.Error("Error generating schema from file", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "schema_generated"),
		Data:    schema,
	})
}
