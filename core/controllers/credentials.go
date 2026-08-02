package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
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
		return api.handleServiceError(
			c,
			"Error getting locals for CredentialsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the API tokens for the user.
	tokens, err := api.Services.ListAPITokens(c, user)
	if err != nil {
		return api.handleServiceError(c, "Failed to list API tokens", err, dict)
	}

	// Structure the response.
	tokensResponse, formatErr := formatter.FormatIndexResponse(
		tokens,
		formatter.FormatAPITokenResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format API tokens",
			services.NewInternalErrorf("error formatting API tokens: %v", formatErr),
			dict,
		)
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
		return api.handleServiceError(
			c,
			"Error getting locals for CredentialsStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse JSON request body
	var req irmincore.CreateCredentialRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the API token.
	apiToken, err := api.Services.CreateAPIToken(c, user, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to create API token", err, dict)
	}

	// Conver the API token to an API token response.
	sqid, encodeSQIDErr := api.SQIDManager.Encode("api_tokens", uint64(apiToken.ID))
	if encodeSQIDErr != nil {
		return api.handleServiceError(
			c,
			"Failed to encode API token SQID",
			services.NewInternalErrorf("error encoding API token SQID: %v", encodeSQIDErr),
			dict,
		)
	}
	apiTokenResponse := irminmodels.APIToken{
		ID:        sqid,
		CreatedAt: apiToken.CreatedAt,
		UpdatedAt: apiToken.UpdatedAt,
		Name:      apiToken.Name,
		Token:     &apiToken.Token,
		ExpiresAt: apiToken.ExpiresAt,
	}

	// Invalidate user-specific cache for credentials list
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/credentials"); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

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
		return api.handleServiceError(
			c,
			"Error getting locals for CredentialsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the token from the request URL.
	tokenSqid := c.Params("credential")
	if tokenSqid == "" {
		return api.handleServiceError(c, "No token provided", services.ErrInvalidRequest, dict)
	}

	// Decode the SQID to get the token ID.
	id, decodeSQIDErr := api.SQIDManager.Decode("api_tokens", tokenSqid)
	if decodeSQIDErr != nil {
		return api.handleServiceError(
			c,
			"Failed to decode API token SQID",
			fmt.Errorf("%w: %w", services.ErrInvalidRequest, decodeSQIDErr),
			dict,
		)
	}

	// Delete the API token.
	if err := api.Services.DeleteAPIToken(c, user, uint(id)); err != nil {
		return api.handleServiceError(c, "Failed to delete API token", err, dict)
	}

	// Invalidate user-specific cache for credentials list
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/credentials"); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return a success message.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "api_token_deleted"),
	})
}
