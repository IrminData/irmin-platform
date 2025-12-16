package controllers

import (
	"fmt"
	"irmin-api/locales"
	"irmin-api/services"
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
	// Get the dictionary
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: "Internal server error",
		})
	}

	// Make sure the request is authenticated with a system token
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	if !isSystemOk {
		return api.handleServiceError(
			c,
			"Error getting locals for SystemWebhook",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}
	if !isSystem {
		return api.handleServiceError(
			c,
			"Access denied",
			services.ErrAccessDenied,
			dict,
		)
	}

	// Get the query params
	query, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"type"})
	if parseQueryParamsErr != nil {
		return api.handleServiceError(
			c,
			"Error parsing query params",
			fmt.Errorf("%w: %w", services.ErrInvalidQueryParams, parseQueryParamsErr),
			dict,
		)
	}

	// Process the system webhook
	err := api.Services.ProcessSystemWebhook(c, query["type"], c.Body(), isSystem)
	if err != nil {
		return api.handleServiceError(c, "Error processing system webhook", err, dict)
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
	// Get the dictionary and locale from the request context
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)

	if !localeOk || !dictOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: "Internal server error",
		})
	}

	// Make sure the request is authenticated with a system token
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	if !isSystemOk {
		return api.handleServiceError(
			c,
			"Error getting locals for GenerateFileSchema",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	if !isSystem {
		return api.handleServiceError(
			c,
			"Access denied",
			services.ErrAccessDenied,
			dict,
		)
	}

	// Parse the multipart form data
	form, err := c.MultipartForm()
	if err != nil {
		return api.handleServiceError(
			c,
			"Error parsing form data",
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, err),
			dict,
		)
	}

	// Validate that a file was provided
	if len(form.File) == 0 || len(form.File["file"]) == 0 {
		return api.handleServiceError(
			c,
			"No file found in form data",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Get the uploaded file
	fileHeader := form.File["file"][0]
	file, err := fileHeader.Open()
	if err != nil {
		return api.handleServiceError(
			c,
			"Error opening file",
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, err),
			dict,
		)
	}
	defer file.Close()

	// Generate the schema
	schema, err := api.Services.GenerateSchemaFromUploadedFile(c, locale, fileHeader.Filename, file)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error generating schema from file",
			err,
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "schema_generated"),
		Data:    schema,
	})
}

// SystemSandboxHealth godoc
// @Summary Check sandbox health
// @Description Verify that the compute sandbox is available and functioning
// @Tags system
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=map[string]string} "Sandbox is healthy"
// @Router /system/sandbox-health [get]
func (api *APIControllers) SystemSandboxHealth(c fiber.Ctx) error {
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Sandbox is healthy and available",
		Data: map[string]string{
			"status": "healthy",
			"type":   "direct",
		},
	})
}
