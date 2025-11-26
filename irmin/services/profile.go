package services

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"mime/multipart"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/emailaddress"
	"github.com/clerk/clerk-sdk-go/v2/phonenumber"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

// UpdateProfile updates profile fields and optional profile picture in Clerk atomically, then persists user in DB.
func (api *APIServices) UpdateProfile(
	c context.Context,
	au *db.User,
	req *irmincore.UpdateProfileRequest,
	form *multipart.Form,
) (*db.User, error) {
	if au == nil || au.ID == 0 {
		return nil, errors.New("invalid user")
	}

	// Apply provided fields
	if req.FirstName != nil && len(*req.FirstName) > 0 {
		au.FirstName = *req.FirstName
	}
	if req.LastName != nil && len(*req.LastName) > 0 {
		au.LastName = *req.LastName
	}
	if req.Email != nil && len(*req.Email) > 0 {
		au.Email = *req.Email
	}
	if req.Phone != nil && len(*req.Phone) > 0 {
		au.Phone = *req.Phone
	}
	if req.Company != nil && len(*req.Company) > 0 {
		au.Company = *req.Company
	}

	// Reflect changes in Clerk (names, primary email/phone) first
	// Only persist DB changes if Clerk succeeds to avoid inconsistent state
	if err := api.updateClerkUserData(c, au); err != nil {
		return nil, err
	}

	// Profile picture (if present) — perform after main Clerk data updates
	if form != nil {
		files := form.File["profile_picture"]
		if len(files) > 0 {
			if err := api.updateProfilePictureInClerk(c, au, files[0]); err != nil {
				return nil, err
			}
		}
	}

	// Persist to DB after successful Clerk updates
	if err := api.DB.Save(&au).Error; err != nil {
		api.Logger.ErrorContext(c, "Error saving user profile to database", "error", err, "user_id", au.ID)
		return nil, err
	}

	return au, nil
}

// updateProfilePictureInClerk uploads a new avatar to Clerk and updates the local user struct.
func (api *APIServices) updateProfilePictureInClerk(
	c context.Context,
	irminUser *db.User,
	newProfilePicture *multipart.FileHeader,
) error {
	src, err := newProfilePicture.Open()
	if err != nil {
		api.Logger.ErrorContext(c, "Error opening profile picture file", "error", err, "user_id", irminUser.ID)
		return err
	}
	defer src.Close()

	clerkUser, err := user.UpdateProfileImage(c, irminUser.ClerkID, &user.UpdateProfileImageParams{File: src})
	if err != nil {
		api.Logger.ErrorContext(
			c,
			"Error updating profile picture in Clerk",
			"error",
			err,
			"user_id",
			irminUser.ID,
			"clerk_id",
			irminUser.ClerkID,
		)
		return err
	}
	irminUser.ProfilePicture = valueOrDefault(clerkUser.ImageURL)
	return nil
}

// updateClerkUserData updates names, primary email and phone in Clerk for the user.
func (api *APIServices) updateClerkUserData(c context.Context, irminUser *db.User) error {
	clerk.SetKey(api.Env.ClerkSecretKey)
	// Fetch current Clerk user to check presence of email/phone entries
	clerkUser, getUserErr := user.Get(c, irminUser.ClerkID)
	if getUserErr != nil {
		api.Logger.ErrorContext(
			c,
			"Error fetching user from Clerk",
			"error",
			getUserErr,
			"user_id",
			irminUser.ID,
			"clerk_id",
			irminUser.ClerkID,
		)
		return getUserErr
	}

	// Ensure email exists and get ID
	primaryEmailID, err := api.ensureClerkEmail(c, clerkUser, irminUser)
	if err != nil {
		return err
	}

	// Ensure phone exists and get ID
	primaryPhoneID, err := api.ensureClerkPhone(c, clerkUser, irminUser)
	if err != nil {
		return err
	}

	// Update profile basic fields + primary ids
	params := &user.UpdateParams{
		FirstName: &irminUser.FirstName,
		LastName:  &irminUser.LastName,
	}
	if primaryEmailID != "" {
		params.PrimaryEmailAddressID = &primaryEmailID
	}
	if primaryPhoneID != "" {
		params.PrimaryPhoneNumberID = &primaryPhoneID
	}

	_, err = user.Update(c, irminUser.ClerkID, params)
	if err != nil {
		api.Logger.ErrorContext(
			c,
			"Error updating user profile in Clerk",
			"error",
			err,
			"user_id",
			irminUser.ID,
			"clerk_id",
			irminUser.ClerkID,
		)
	}
	return err
}

// ensureClerkEmail ensures the email exists in Clerk and returns the primary email ID.
func (api *APIServices) ensureClerkEmail(c context.Context, clerkUser *clerk.User, irminUser *db.User) (string, error) {
	if irminUser.Email == "" {
		return "", nil
	}
	for _, email := range clerkUser.EmailAddresses {
		if email.EmailAddress == irminUser.Email {
			if email.Verification != nil && email.Verification.Status == "verified" {
				return email.ID, nil
			}
			// If email exists but is not verified, delete it so we can recreate it as verified
			if _, err := emailaddress.Delete(c, email.ID); err != nil {
				return "", fmt.Errorf("failed to delete unverified email: %w", err)
			}
			break
		}
	}
	verified := true
	created, err := emailaddress.Create(c, &emailaddress.CreateParams{
		UserID:       &irminUser.ClerkID,
		EmailAddress: &irminUser.Email,
		Verified:     &verified,
	})
	if err != nil {
		return "", err
	}
	return created.ID, nil
}

// ensureClerkPhone ensures the phone exists in Clerk and returns the primary phone ID.
func (api *APIServices) ensureClerkPhone(c context.Context, clerkUser *clerk.User, irminUser *db.User) (string, error) {
	if irminUser.Phone == "" {
		return "", nil
	}
	for _, phone := range clerkUser.PhoneNumbers {
		if phone.PhoneNumber == irminUser.Phone {
			if phone.Verification != nil && phone.Verification.Status == "verified" {
				return phone.ID, nil
			}
			// If phone exists but is not verified, delete it so we can recreate it as verified
			if _, err := phonenumber.Delete(c, phone.ID); err != nil {
				return "", fmt.Errorf("failed to delete unverified phone number: %w", err)
			}
			break
		}
	}
	verified := true
	created, err := phonenumber.Create(c, &phonenumber.CreateParams{
		UserID:      &irminUser.ClerkID,
		PhoneNumber: &irminUser.Phone,
		Verified:    &verified,
	})
	if err != nil {
		return "", err
	}
	return created.ID, nil
}
