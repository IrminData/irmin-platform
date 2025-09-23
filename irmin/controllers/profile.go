package controllers

import (
	"encoding/json"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"strings"

	"mime/multipart"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ProfileShow godoc
// @Summary Get user profile
// @Description Get the current authenticated user's profile information
// @Tags profile
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User} "User profile retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /profile [get]
func (api *APIControllers) ProfileShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the user response
	userResponse, formatUserResponseErr := formatter.FormatUserResponse(user, api.SQIDManager)
	if formatUserResponseErr != nil {
		api.Logger.Error("Error formatting user response", "error", formatUserResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: userResponse,
	})
}

// parseProfileUpdateRequest handles parsing the request based on content type.
func (api *APIControllers) parseProfileUpdateRequest(
	c fiber.Ctx,
) (*irmincore.UpdateProfileRequest, *multipart.Form, error) {
	var req irmincore.UpdateProfileRequest
	var form *multipart.Form

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		// Handle multipart form data (for file uploads)
		var err error
		form, err = c.MultipartForm()
		if err != nil {
			return nil, nil, err
		}

		// Parse JSON metadata from form field if provided
		jsonData := form.Value["metadata"]
		if len(jsonData) > 0 {
			if unmarshalErr := json.Unmarshal([]byte(jsonData[0]), &req); unmarshalErr != nil {
				return nil, nil, unmarshalErr
			}
		}

		return &req, form, nil
	}

	// Handle pure JSON requests (for metadata-only updates)
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		return nil, nil, bindErr
	}

	return &req, nil, nil
}

// ProfileUpdate godoc
// @Summary Update user profile
// @Description Update the current authenticated user's profile information
// @Tags profile
// @Security ApiKeyAuth
// @Accept multipart/form-data
// @Accept json
// @Produce json
// @Param firstName formData string false "User's first name"
// @Param lastName formData string false "User's last name"
// @Param primaryEmailAddress formData string false "Primary email address"
// @Param primaryPhoneNumber formData string false "Primary phone number"
// @Param avatar formData file false "Profile avatar image"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User} "Profile updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid input data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /profile [patch]
func (api *APIControllers) ProfileUpdate(c fiber.Ctx) error {
	// Get the dictionary and user from the request context
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	irminUser, irminUserOk := c.Locals("user").(*db.User)

	if !dictOk || !irminUserOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request
	req, form, parseErr := api.parseProfileUpdateRequest(c)
	if parseErr != nil {
		api.Logger.Error("Error parsing request", "error", parseErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update user in a single atomic transaction that handles both profile picture and fields
	updatedUser, updateErr := api.Services.UpdateProfile(c, irminUser, req, form)
	if updateErr != nil {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format and return response
	userResponse, formatUserResponseErr := formatter.FormatUserResponse(updatedUser, api.SQIDManager)
	if formatUserResponseErr != nil {
		api.Logger.Error("Error formatting user response", "error", formatUserResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate user-specific profile caches (profile endpoint and any subpaths)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/profile"); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "profile_updated"),
		Data:    userResponse,
	})
}
