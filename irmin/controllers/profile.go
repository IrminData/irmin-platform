package controllers

import (
	"context"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	"mime/multipart"

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

func (api *APIControllers) ProfileUpdate(c fiber.Ctx) error {
	ctx := c.Context()

	// Get the dictionary and user from the request context
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	irminUser, irminUserOk := c.Locals("user").(*db.User)

	if !dictOk || !irminUserOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse form fields - all fields are optional during update
	fields, err := utils.ParseFormFields(
		c,
		nil,
		[]string{"first_name", "last_name", "email", "phone", "company"},
	)
	if err != nil {
		api.Logger.Error("Error parsing form fields", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Only update fields that were provided
	if fields["first_name"] != "" {
		irminUser.FirstName = fields["first_name"]
	}
	if fields["last_name"] != "" {
		irminUser.LastName = fields["last_name"]
	}
	if fields["email"] != "" {
		irminUser.Email = fields["email"]
	}
	if fields["phone"] != "" {
		irminUser.Phone = fields["phone"]
	}
	if fields["company"] != "" {
		irminUser.Company = fields["company"]
	}

	// Update user in database
	if saveErr := api.DB.Save(&irminUser).Error; saveErr != nil {
		api.Logger.Error("Error updating user in database", "error", saveErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set up Clerk client
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get user from Clerk
	clerkUser, getUserErr := user.Get(ctx, irminUser.ClerkID)
	if getUserErr != nil {
		api.Logger.Error("Error getting user details from Clerk", "error", getUserErr)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Update email and phone in Clerk
	primaryEmailID, updateEmailErr := api.updateClerkEmail(ctx, clerkUser, irminUser)
	if updateEmailErr != nil {
		api.Logger.Error("Error updating email", "error", updateEmailErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	primaryPhoneID, updatePhoneErr := api.updateClerkPhone(ctx, clerkUser, irminUser)
	if updatePhoneErr != nil {
		api.Logger.Error("Error updating phone", "error", updatePhoneErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update profile in Clerk
	if updateProfileErr := api.updateClerkProfile(ctx, irminUser, primaryEmailID, primaryPhoneID); updateProfileErr != nil {
		api.Logger.Error("Error updating user profile", "error", updateProfileErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Handle profile picture update if provided
	if newProfilePicture, _ := c.FormFile("profile_picture"); newProfilePicture != nil {
		if updateProfilePictureErr := api.updateProfilePicture(ctx, irminUser, newProfilePicture); updateProfilePictureErr != nil {
			api.Logger.Error("Error updating profile picture", "error", updateProfilePictureErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
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
