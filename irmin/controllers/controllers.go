package controllers

import (
	"encoding/json"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"log/slog"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	irminvalidator "github.com/IrminData/irmin-sdk-go/validator"
	"github.com/gofiber/fiber/v3"
)

type APIControllers struct {
	DB                *db.Database
	Logger            *slog.Logger
	Env               *utils.CoreAPIEnv
	Orchestrator      *orchestrator.Orchestrator
	SQIDManager       *irminsqids.SQIDManager
	lm                *locales.LocaleManager
	permissionService *lib.PermissionService
	validator         *irminvalidator.Validator
	cacheStorage      fiber.Storage
}

func NewAPIControllers(
	db *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	orchestrator *orchestrator.Orchestrator,
	sqidManager *irminsqids.SQIDManager,
	localeManager *locales.LocaleManager,
	permissionService *lib.PermissionService,
	cacheStorage fiber.Storage,
) *APIControllers {
	return &APIControllers{
		DB:                db,
		Logger:            logger,
		Env:               env,
		Orchestrator:      orchestrator,
		SQIDManager:       sqidManager,
		lm:                localeManager,
		permissionService: permissionService,
		validator:         irminvalidator.NewValidator(sqidManager),
		cacheStorage:      cacheStorage,
	}
}

// validateAndBindRequestWithResponse validates and binds JSON request data to a struct,
// returning a properly formatted error response if validation fails.
func (api *APIControllers) validateAndBindRequestWithResponse(c fiber.Ctx, req any, dict locales.Dictionary) error {
	// Parse JSON request body
	if err := c.Bind().JSON(req); err != nil {
		api.Logger.Error("Error parsing JSON request", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate the request using the validator
	if validationErr := api.validator.ValidateEnhanced(req); validationErr.HasErrors() {
		api.Logger.Error("Request validation failed", "errors", validationErr.GetFieldErrors())
		errors := []string{}
		for field, errMessage := range validationErr.GetFieldErrors() {
			errors = append(errors, fmt.Sprintf("%s: %s", field, errMessage))
		}
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: validationErr.GetUserMessage(),
			Errors:  errors,
		})
	}

	return nil
}

// validateAndWriteResponse validates response data and writes it to the client.
// This is done only for debugging purposes, even if the response is invalid, it will be written to the client.
func (api *APIControllers) validateAndWriteResponse(
	c fiber.Ctx,
	statusCode int,
	response irminmodels.IrminAPIResponse,
) error {
	// Run the validation in a seperate goroutine, since it has no affect on the response
	go func() {
		// Validate the response data if it exists using dynamic validation
		invalidResponse := false
		if response.Data != nil {
			if dataValidationErr := api.validator.ValidateDynamic(response.Data); dataValidationErr.HasErrors() {
				api.Logger.Error("Response data validation failed", "errors", dataValidationErr.GetFieldErrors())
				// Log the response data as JSON for debugging
				jsonData, marshalErr := json.Marshal(response.Data)
				if marshalErr != nil {
					api.Logger.Error("Error marshalling response data", "error", marshalErr)
				}
				api.Logger.Info("Invalid response data", "data", string(jsonData))
				invalidResponse = true
			}
		}

		// Validate the response object itself, if the data is not invalid
		if !invalidResponse {
			if responseValidationErr := api.validator.ValidateEnhanced(response); responseValidationErr.HasErrors() {
				api.Logger.Error("Response validation failed", "errors", responseValidationErr.RawErrors)
				// Log the response as JSON for debugging
				jsonData, marshalErr := json.Marshal(response)
				if marshalErr != nil {
					api.Logger.Error("Error marshalling response data", "error", marshalErr)
				}
				api.Logger.Info("Invalid response", "data", string(jsonData))
			}
		}
	}()

	// Write the response even if it is invalid
	return utils.WriteResponse(c, statusCode, response)
}
