package controllers

import (
	"context"
	"encoding/json"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	"mime/multipart"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/emailaddress"
	"github.com/clerk/clerk-sdk-go/v2/phonenumber"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gofiber/fiber/v3"
)

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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: userResponse,
	})
}

// parseProfileUpdateRequest handles parsing the request based on content type.
func (api *APIControllers) parseProfileUpdateRequest(
	c fiber.Ctx,
	irminUser *db.User,
) (*irmincore.UpdateProfileRequest, error) {
	var req irmincore.UpdateProfileRequest

	contentType := c.Get("Content-Type")
	if strings.Contains(contentType, "multipart/form-data") {
		return api.parseMultipartFormRequest(c, irminUser)
	}

	// Handle pure JSON requests (for metadata-only updates)
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		return nil, bindErr
	}

	return &req, nil
}

// parseMultipartFormRequest handles multipart form data parsing.
func (api *APIControllers) parseMultipartFormRequest(
	c fiber.Ctx,
	irminUser *db.User,
) (*irmincore.UpdateProfileRequest, error) {
	ctx := c.Context()
	var req irmincore.UpdateProfileRequest

	// Handle multipart form data (for file uploads)
	form, err := c.MultipartForm()
	if err != nil {
		return nil, err
	}

	// Parse JSON metadata from form field if provided
	if parseErr := api.parseJSONMetadata(form, &req); parseErr != nil {
		return nil, parseErr
	}

	// Handle profile picture update if provided
	if updateErr := api.handleProfilePictureFromForm(ctx, irminUser, form); updateErr != nil {
		return nil, updateErr
	}

	return &req, nil
}

// parseJSONMetadata extracts and parses JSON metadata from multipart form.
func (api *APIControllers) parseJSONMetadata(form *multipart.Form, req *irmincore.UpdateProfileRequest) error {
	jsonData := form.Value["metadata"]
	if len(jsonData) == 0 {
		return nil
	}

	return json.Unmarshal([]byte(jsonData[0]), req)
}

// handleProfilePictureFromForm processes profile picture from multipart form.
func (api *APIControllers) handleProfilePictureFromForm(
	ctx context.Context,
	irminUser *db.User,
	form *multipart.Form,
) error {
	profilePictureFiles := form.File["profile_picture"]
	if len(profilePictureFiles) == 0 {
		return nil
	}

	profilePictureFile := profilePictureFiles[0]
	return api.updateProfilePicture(ctx, irminUser, profilePictureFile)
}

// updateUserFields updates the user fields based on the request.
func (api *APIControllers) updateUserFields(irminUser *db.User, req *irmincore.UpdateProfileRequest) {
	// Only update fields that were provided
	if req.FirstName != "" {
		irminUser.FirstName = req.FirstName
	}
	if req.LastName != "" {
		irminUser.LastName = req.LastName
	}
	if req.Email != "" {
		irminUser.Email = req.Email
	}
	if req.Phone != "" {
		irminUser.Phone = req.Phone
	}
	if req.Company != "" {
		irminUser.Company = req.Company
	}
}

// updateClerkUserData coordinates all Clerk user updates.
func (api *APIControllers) updateClerkUserData(ctx context.Context, irminUser *db.User) error {
	// Set up Clerk client
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get user from Clerk
	clerkUser, getUserErr := user.Get(ctx, irminUser.ClerkID)
	if getUserErr != nil {
		return getUserErr
	}

	// Update email and phone in Clerk
	primaryEmailID, updateEmailErr := api.updateClerkEmail(ctx, clerkUser, irminUser)
	if updateEmailErr != nil {
		return updateEmailErr
	}

	primaryPhoneID, updatePhoneErr := api.updateClerkPhone(ctx, clerkUser, irminUser)
	if updatePhoneErr != nil {
		return updatePhoneErr
	}

	// Update profile in Clerk
	return api.updateClerkProfile(ctx, irminUser, primaryEmailID, primaryPhoneID)
}

func (api *APIControllers) ProfileUpdate(c fiber.Ctx) error {
	ctx := c.Context()

	// Get the dictionary and user from the request context
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	irminUser, irminUserOk := c.Locals("user").(*db.User)

	if !dictOk || !irminUserOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request
	req, parseErr := api.parseProfileUpdateRequest(c, irminUser)
	if parseErr != nil {
		api.Logger.Error("Error parsing request", "error", parseErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update user fields
	api.updateUserFields(irminUser, req)

	// Update user in database
	if saveErr := api.DB.Save(&irminUser).Error; saveErr != nil {
		api.Logger.Error("Error updating user in database", "error", saveErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update Clerk user data
	if updateErr := api.updateClerkUserData(ctx, irminUser); updateErr != nil {
		api.Logger.Error("Error updating user data in Clerk", "error", updateErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format and return response
	userResponse, formatUserResponseErr := formatter.FormatUserResponse(irminUser, api.SQIDManager)
	if formatUserResponseErr != nil {
		api.Logger.Error("Error formatting user response", "error", formatUserResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "profile_updated"),
		Data:    userResponse,
	})
}

// updateClerkEmail handles updating or creating a user's email in Clerk.
func (api *APIControllers) updateClerkEmail(
	ctx context.Context,
	clerkUser *clerk.User,
	irminUser *db.User,
) (string, error) {
	var primaryEmailID string
	for _, email := range clerkUser.EmailAddresses {
		if email.EmailAddress == irminUser.Email {
			primaryEmailID = email.ID
			break
		}
	}
	if primaryEmailID == "" {
		verified := true // In the future, we need to actually verify the email.
		newClerkEmail, err := emailaddress.Create(ctx, &emailaddress.CreateParams{
			UserID:       &irminUser.ClerkID,
			EmailAddress: &irminUser.Email,
			Verified:     &verified,
		})
		if err != nil {
			return "", err
		}
		primaryEmailID = newClerkEmail.ID
	}
	return primaryEmailID, nil
}

// updateClerkPhone handles updating or creating a user's phone in Clerk.
func (api *APIControllers) updateClerkPhone(
	ctx context.Context,
	clerkUser *clerk.User,
	irminUser *db.User,
) (string, error) {
	var primaryPhoneID string
	for _, phone := range clerkUser.PhoneNumbers {
		if phone.PhoneNumber == irminUser.Phone {
			primaryPhoneID = phone.ID
			break
		}
	}
	if primaryPhoneID == "" {
		verified := true // In the future, we need to actually verify the phone number.
		newClerkPhone, err := phonenumber.Create(ctx, &phonenumber.CreateParams{
			UserID:      &irminUser.ClerkID,
			PhoneNumber: &irminUser.Phone,
			Verified:    &verified,
		})
		if err != nil {
			return "", err
		}
		primaryPhoneID = newClerkPhone.ID
	}
	return primaryPhoneID, nil
}

// updateClerkProfile handles updating the user's profile information in Clerk.
func (api *APIControllers) updateClerkProfile(
	ctx context.Context,
	irminUser *db.User,
	primaryEmailID, primaryPhoneID string,
) error {
	_, err := user.Update(ctx, irminUser.ClerkID, &user.UpdateParams{
		FirstName:             &irminUser.FirstName,
		LastName:              &irminUser.LastName,
		PrimaryEmailAddressID: &primaryEmailID,
		PrimaryPhoneNumberID:  &primaryPhoneID,
	})
	return err
}

// updateProfilePicture handles updating the user's profile picture in both Clerk and database.
func (api *APIControllers) updateProfilePicture(
	ctx context.Context,
	irminUser *db.User,
	newProfilePicture *multipart.FileHeader,
) error {
	newProfilePictureSrc, err := newProfilePicture.Open()
	if err != nil {
		return err
	}
	defer newProfilePictureSrc.Close()

	clerkUser, err := user.UpdateProfileImage(ctx, irminUser.ClerkID, &user.UpdateProfileImageParams{
		File: newProfilePictureSrc,
	})
	if err != nil {
		return err
	}

	irminUser.ProfilePicture = *clerkUser.ImageURL
	return api.DB.Save(&irminUser).Error
}
