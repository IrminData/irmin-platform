package middlewares

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

const (
	// UserDetailsCacheMaxAge is the maximum age of a user details cache entry.
	UserDetailsCacheMaxAge = 5 * time.Minute
)

// AuthMiddleware handles the user authentication for the API, tokens and user details syncing with Clerk.
func (api *APIMiddlewares) AuthMiddleware(c fiber.Ctx) error {
	ctx := c.Context()

	// Parse the Authorization header
	headers, err := utils.ParseHeaders(c, []string{"Authorization"}, nil)
	if err != nil {
		api.Logger.Error("Error parsing headers", "error", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	token := strings.TrimPrefix(headers["Authorization"], "Bearer ")
	if token == "" {
		api.Logger.Error("No token provided")
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	// Handle system token
	if api.validateSystemToken(token) {
		c.Locals("is_system", true)
		return c.Next()
	}

	// Validate token and get user
	irminUser, clerkID, err := api.validateAndGetUserFromToken(token)
	if err != nil {
		api.Logger.Error("Token validation failed", "error", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	// Sync user with Clerk
	irminUser, err = api.syncUserWithClerk(ctx, irminUser, clerkID)
	if err != nil {
		api.Logger.Error("Error syncing user with Clerk", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Set the user in the context for subsequent handlers
	c.Locals("user", irminUser)
	c.Locals("is_system", false)

	return c.Next()
}

// validateCredentialsToken validates a credentials token and returns the associated user if valid.
func (api *APIMiddlewares) validateCredentialsToken(token string) (*db.User, string, error) {
	apiToken, getAPITokenErr := api.DB.GetAPITokenByToken(token)
	if getAPITokenErr != nil {
		return nil, "", fmt.Errorf("error retrieving API token: %w", getAPITokenErr)
	}
	if apiToken == nil {
		return nil, "", errors.New("API token not found")
	}
	if apiToken.ExpiresAt.Before(time.Now()) {
		return nil, "", errors.New("API token expired")
	}
	return &apiToken.User, apiToken.User.ClerkID, nil
}

// validateSystemToken checks if the token is a valid system token.
func (api *APIMiddlewares) validateSystemToken(token string) bool {
	return token == api.Env.SystemToken
}

// validateAndGetUserFromToken validates the token and returns the associated user and clerk ID.
func (api *APIMiddlewares) validateAndGetUserFromToken(token string) (*db.User, string, error) {
	if strings.HasPrefix(token, "cred_") {
		return api.validateCredentialsToken(token)
	}

	// Validate the JWT token
	jwt, err := utils.ValidateJWT(token, []byte(api.Env.ClerkSigningKey), api.Env.ClerkSigningAlgorithm)
	if err != nil {
		return nil, "", fmt.Errorf("error validating JWT: %w", err)
	}

	// Extract the subject (ClerkID) from the JWT
	clerkID, err := jwt.Claims.GetSubject()
	if err != nil {
		return nil, "", fmt.Errorf("error extracting subject from JWT: %w", err)
	}

	// Try to find the user in our database
	irminUser, _ := api.DB.GetUserByClerkID(clerkID)
	return irminUser, clerkID, nil
}

// syncUserWithClerk synchronizes user data with Clerk, either updating existing user or creating new one.
func (api *APIMiddlewares) syncUserWithClerk(
	ctx context.Context,
	irminUser *db.User,
	clerkID string,
) (*db.User, error) {
	// Get the user details from Clerk
	clerkUser, primaryEmail, primaryPhone, err := api.getUserFromClerk(ctx, clerkID)
	if err != nil {
		return nil, fmt.Errorf("error getting user details from Clerk: %w", err)
	}

	// If user exists and cache is expired, update asynchronously
	if irminUser != nil && irminUser.ID != 0 && irminUser.UpdatedAt.Before(time.Now().Add(-UserDetailsCacheMaxAge)) {
		go api.updateUser(irminUser, clerkUser, primaryEmail, primaryPhone)
		return irminUser, nil
	}

	// If user doesn't exist, create synchronously
	if irminUser == nil || irminUser.ID == 0 {
		irminUser = &db.User{
			ClerkID:        clerkID,
			FirstName:      *clerkUser.FirstName,
			LastName:       *clerkUser.LastName,
			Email:          primaryEmail,
			Phone:          primaryPhone,
			ProfilePicture: *clerkUser.ImageURL,
		}
		if createErr := api.DB.Create(&irminUser).Error; createErr != nil {
			return nil, fmt.Errorf("error creating user: %w", createErr)
		}
	}

	return irminUser, nil
}

// updateUser updates user details.
func (api *APIMiddlewares) updateUser(irminUser *db.User, clerkUser *clerk.User, primaryEmail, primaryPhone string) {
	irminUser.FirstName = *clerkUser.FirstName
	irminUser.LastName = *clerkUser.LastName
	irminUser.Email = primaryEmail
	irminUser.Phone = primaryPhone
	irminUser.ProfilePicture = *clerkUser.ImageURL
	if saveErr := api.DB.Save(&irminUser).Error; saveErr != nil {
		api.Logger.Error("Error updating user", "error", saveErr)
	}
}

// getUserFromClerk gets the user from Clerk and returns the user, primary email and primary phone number.
func (api *APIMiddlewares) getUserFromClerk(ctx context.Context, clerkID string) (*clerk.User, string, string, error) {
	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get the user details from Clerk.
	clerkUser, getUserFromClerkErr := user.Get(ctx, clerkID)
	if getUserFromClerkErr != nil {
		return nil, "", "", getUserFromClerkErr
	}

	// Find the user's primary email address.
	var primaryEmail string
	if clerkUser.PrimaryEmailAddressID != nil && len(clerkUser.EmailAddresses) > 0 {
		for _, email := range clerkUser.EmailAddresses {
			if email.ID == *clerkUser.PrimaryEmailAddressID {
				primaryEmail = email.EmailAddress
				break
			}
		}
	}
	if primaryEmail == "" && len(clerkUser.EmailAddresses) > 0 {
		primaryEmail = clerkUser.EmailAddresses[0].EmailAddress
	}

	// Find the user's primary phone number.
	var primaryPhone string
	if clerkUser.PrimaryPhoneNumberID != nil && len(clerkUser.PhoneNumbers) > 0 {
		for _, phone := range clerkUser.PhoneNumbers {
			if phone.ID == *clerkUser.PrimaryPhoneNumberID {
				primaryPhone = phone.PhoneNumber
				break
			}
		}
	}
	if primaryPhone == "" && len(clerkUser.PhoneNumbers) > 0 {
		primaryPhone = clerkUser.PhoneNumbers[0].PhoneNumber
	}

	return clerkUser, primaryEmail, primaryPhone, nil
}
