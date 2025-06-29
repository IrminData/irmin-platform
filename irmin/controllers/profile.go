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
	"gorm.io/gorm"
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
	req, form, parseErr := api.parseProfileUpdateRequest(c)
	if parseErr != nil {
		api.Logger.Error("Error parsing request", "error", parseErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Update user in a single atomic transaction that handles both profile picture and fields
	if updateErr := api.updateCompleteProfileInTransaction(ctx, irminUser, req, form); updateErr != nil {
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

// updateCompleteProfileInTransaction handles the atomic update of both profile fields and profile picture.
func (api *APIControllers) updateCompleteProfileInTransaction(
	ctx context.Context,
	irminUser *db.User,
	req *irmincore.UpdateProfileRequest,
	form *multipart.Form,
) error {
	// Use database transaction to ensure atomicity for all profile updates
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Handle profile picture update if it's a multipart form
		if form != nil {
			profilePictureFiles := form.File["profile_picture"]
			if len(profilePictureFiles) > 0 {
				profilePictureFile := profilePictureFiles[0]
				if updateErr := api.updateProfilePictureInClerk(ctx, irminUser, profilePictureFile); updateErr != nil {
					api.Logger.Error("Error updating profile picture in Clerk", "error", updateErr)
					return updateErr
				}
			}
		}

		// Update user fields in memory
		api.updateUserFields(irminUser, req)

		// Update user in database
		if saveErr := tx.Save(&irminUser).Error; saveErr != nil {
			api.Logger.Error("Error updating user in database", "error", saveErr)
			return saveErr
		}

		// Update Clerk user data (email, phone, profile info)
		if updateErr := api.updateClerkUserData(ctx, irminUser); updateErr != nil {
			api.Logger.Error("Error updating user data in Clerk", "error", updateErr)
			return updateErr
		}

		return nil
	})

	return transactionErr
}

// updateProfilePictureInClerk handles updating the user's profile picture in Clerk only (no database transaction).
func (api *APIControllers) updateProfilePictureInClerk(
	ctx context.Context,
	irminUser *db.User,
	newProfilePicture *multipart.FileHeader,
) error {
	newProfilePictureSrc, err := newProfilePicture.Open()
	if err != nil {
		return err
	}
	defer newProfilePictureSrc.Close()

	// Update profile picture in Clerk
	clerkUser, err := user.UpdateProfileImage(ctx, irminUser.ClerkID, &user.UpdateProfileImageParams{
		File: newProfilePictureSrc,
	})
	if err != nil {
		return err
	}

	// Update user in memory (will be saved to database by the calling transaction)
	irminUser.ProfilePicture = *clerkUser.ImageURL

	return nil
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
