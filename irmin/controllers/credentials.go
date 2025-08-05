package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// CredentialsIndex godoc
// @Summary List API tokens
// @Description Get all API tokens for the current authenticated user
// @Tags credentials
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.APIToken} "API tokens retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /credentials [get]
func (api *APIControllers) CredentialsIndex(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the API tokens for the user.
	tokens, getAPITokensByUserIDErr := api.DB.GetAPITokensByUserID(user.ID)
	if getAPITokensByUserIDErr != nil {
		api.Logger.Error("Error retrieving API tokens", "error", getAPITokensByUserIDErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	tokensResponse, formatErr := formatter.FormatIndexResponse(
		tokens,
		formatter.FormatAPITokenResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting API tokens", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the API tokens.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: tokensResponse,
	})
}

// CredentialsStore godoc
// @Summary Create API token
// @Description Create a new API token for the current authenticated user
// @Tags credentials
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body irmincore.CreateCredentialRequest true "API token creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.APIToken} "API token created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /credentials [post]
func (api *APIControllers) CredentialsStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse JSON request body
	var req irmincore.CreateCredentialRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Generate a random 64-character token.
	token, generateRandomStringErr := utils.GenerateRandomString()
	if generateRandomStringErr != nil {
		api.Logger.Error("Error generating random string", "error", generateRandomStringErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Expiry is seconds until expiry, so add it to the current time.
	expiresAt := time.Now().Add(time.Duration(req.Expiry) * time.Second).UTC()

	// Create the API token.
	apiToken := &db.APIToken{
		Name:      req.Name,
		Token:     fmt.Sprintf("cred_%s", token),
		ExpiresAt: expiresAt,
		UserID:    user.ID,
		Hidden:    false,
	}
	if createAPITokenErr := api.DB.Create(&apiToken).Error; createAPITokenErr != nil {
		api.Logger.Error("Error creating API token", "error", createAPITokenErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Conver the API token to an API token response.
	sqid, _ := api.SQIDManager.Encode("api_tokens", uint64(apiToken.ID))
	apiTokenResponse := irminmodels.APIToken{
		ID:        sqid,
		CreatedAt: apiToken.CreatedAt,
		UpdatedAt: apiToken.UpdatedAt,
		Name:      apiToken.Name,
		Token:     &apiToken.Token,
		ExpiresAt: apiToken.ExpiresAt,
	}

	// Log the event.
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("API token %s created for the user", apiToken.Name),
		UserID:      &user.ID,
	})

	// Return the API token.
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "api_token_created"),
		Data:    apiTokenResponse,
	})
}

// CredentialsDestroy godoc
// @Summary Delete API token
// @Description Delete an API token by its ID
// @Tags credentials
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param credential path string true "API token ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "API token deleted successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid token ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - token does not belong to user or is hidden"
// @Failure 404 {object} irminmodels.IrminAPIResponse "API token not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /credentials/{credential} [delete]
func (api *APIControllers) CredentialsDestroy(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the token from the request URL.
	tokenSqid := c.Params("credential")
	if tokenSqid == "" {
		api.Logger.Error("No token provided")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Decode the SQID to get the token ID.
	id, decodeSQIDErr := api.SQIDManager.Decode("api_tokens", tokenSqid)
	if decodeSQIDErr != nil {
		api.Logger.Error("Error decoding SQID", "error", decodeSQIDErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the API token to ensure it exists and belongs to the user.
	apiToken, getAPITokenErr := api.DB.GetAPIToken(uint(id))
	if getAPITokenErr != nil {
		api.Logger.Error("Error retrieving API token", "error", getAPITokenErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	if apiToken.UserID != user.ID {
		api.Logger.Error("API token does not belong to user")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}
	if apiToken.Hidden {
		api.Logger.Error("API token is hidden")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Delete the API token.
	if deleteAPITokenErr := api.DB.DeleteAPIToken(uint(id)); deleteAPITokenErr != nil {
		api.Logger.Error("Error deleting API token", "error", deleteAPITokenErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event.
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("API token %s deleted", apiToken.Name),
		UserID:      &user.ID,
	})

	// Return a success message.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "api_token_deleted"),
	})
}
