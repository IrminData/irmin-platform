package controllers

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/emailaddress"
	"github.com/clerk/clerk-sdk-go/v2/phonenumber"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gofiber/fiber/v3"
)

func ProfileShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Create SQID of the user ID
	sqid, err := utils.EncodeSqids("users", uint64(user.ID))
	if err != nil {
		log.Printf("Error creating user SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create the user response
	response := db.UserResponse{
		ID:             sqid,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		Email:          user.Email,
		Phone:          user.Phone,
		Company:        user.Company,
		ProfilePicture: user.ProfilePicture,
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: response,
	})
}

func ProfileUpdate(c fiber.Ctx) error {
	ctx := c.Context()

	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	irminUser := c.Locals("user").(*db.User)

	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		log.Printf("Error loading environment variables: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Retrieve the file from the multipart form with the key "file"
	newProfilePicture, _ := c.FormFile("profile_picture")

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"first_name", "last_name", "email", "phone", "company"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Update the user details in our database.
	updatedUser, err := db.UpdateUser(irminUser.ID, map[string]interface{}{
		"first_name": fields["first_name"],
		"last_name":  fields["last_name"],
		"email":      fields["email"],
		"phone":      fields["phone"],
		"company":    fields["company"],
	})
	if err != nil {
		log.Printf("Error updating user: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Set the clerk key
	clerk.SetKey(env.ClerkSecretKey)

	// Get the user details from Clerk.
	clerkUser, err := user.Get(ctx, irminUser.ClerkID)
	if err != nil {
		log.Printf("Error getting user details from Clerk: %v", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Get the users existing email addresses
	var primaryEmailID string
	for _, email := range clerkUser.EmailAddresses {
		if email.EmailAddress == updatedUser.Email {
			primaryEmailID = email.ID
			break
		}
	}
	if primaryEmailID == "" {
		// If the user's email address was not found, create a new one.
		verified := true // In the future, we need to actually verify the email.
		newClerkEmail, err := emailaddress.Create(ctx, &emailaddress.CreateParams{
			UserID:       &irminUser.ClerkID,
			EmailAddress: &updatedUser.Email,
			Verified:     &verified,
		})
		if err != nil {
			log.Printf("Error creating email address: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		primaryEmailID = newClerkEmail.ID
	}

	// Get the users existing phone numbers
	var primaryPhoneID string
	for _, phone := range clerkUser.PhoneNumbers {
		if phone.PhoneNumber == updatedUser.Phone {
			primaryPhoneID = phone.ID
			break
		}
	}
	if primaryPhoneID == "" {
		// If the user's phone number was not found, create a new one.
		verified := true // In the future, we need to actually verify the phone number.
		newClerkPhone, err := phonenumber.Create(ctx, &phonenumber.CreateParams{
			UserID:      &irminUser.ClerkID,
			PhoneNumber: &updatedUser.Phone,
			Verified:    &verified,
		})
		if err != nil {
			log.Printf("Error creating phone number: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		primaryPhoneID = newClerkPhone.ID
	}

	// Update the user's profile information in Clerk.
	clerkUser, err = user.Update(ctx, irminUser.ClerkID, &user.UpdateParams{
		FirstName:             &updatedUser.FirstName,
		LastName:              &updatedUser.LastName,
		PrimaryEmailAddressID: &primaryEmailID,
		PrimaryPhoneNumberID:  &primaryPhoneID,
	})
	if err != nil {
		log.Printf("Error updating user: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Update the user's profile picture if a new one was provided.
	if newProfilePicture != nil {
		newProfilePictureSrc, err := newProfilePicture.Open()
		if err != nil {
			log.Printf("Error opening profile picture: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		clerkUser, err = user.UpdateProfileImage(ctx, irminUser.ClerkID, &user.UpdateProfileImageParams{
			File: newProfilePictureSrc,
		})
		if err != nil {
			log.Printf("Error updating profile picture: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	}

	// Create user ID SQID
	sqid, err := utils.EncodeSqids("users", uint64(updatedUser.ID))
	if err != nil {
		log.Printf("Error creating user SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Structure the user response
	userResponse := db.UserResponse{
		ID:             sqid,
		FirstName:      updatedUser.FirstName,
		LastName:       updatedUser.LastName,
		Email:          updatedUser.Email,
		Phone:          updatedUser.Phone,
		Company:        updatedUser.Company,
		ProfilePicture: *clerkUser.ImageURL,
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("profile_updated"),
		Data:    userResponse,
	})
}
