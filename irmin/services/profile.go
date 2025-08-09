package services

import (
	"context"
	"errors"
	"irmin-api/db"
	"mime/multipart"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
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
	if req.FirstName != "" {
		au.FirstName = req.FirstName
	}
	if req.LastName != "" {
		au.LastName = req.LastName
	}
	if req.Email != "" {
		au.Email = req.Email
	}
	if req.Phone != "" {
		au.Phone = req.Phone
	}
	if req.Company != "" {
		au.Company = req.Company
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
		return err
	}
	defer src.Close()

	clerkUser, err := user.UpdateProfileImage(c, irminUser.ClerkID, &user.UpdateProfileImageParams{File: src})
	if err != nil {
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
	_, err = user.Update(c, irminUser.ClerkID, &user.UpdateParams{
		FirstName:             &irminUser.FirstName,
		LastName:              &irminUser.LastName,
		PrimaryEmailAddressID: &primaryEmailID,
		PrimaryPhoneNumberID:  &primaryPhoneID,
	})
	return err
}

// ensureClerkEmail ensures the email exists in Clerk and returns the primary email ID.
func (api *APIServices) ensureClerkEmail(c context.Context, clerkUser *clerk.User, irminUser *db.User) (string, error) {
	for _, email := range clerkUser.EmailAddresses {
		if email.EmailAddress == irminUser.Email {
			return email.ID, nil
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
	for _, phone := range clerkUser.PhoneNumbers {
		if phone.PhoneNumber == irminUser.Phone {
			return phone.ID, nil
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
