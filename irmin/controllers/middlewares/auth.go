package middlewares

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"
	"strings"
	"sync"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

const (
	// UserDetailsCacheMaxAge is the maximum age of a user details cache entry.
	UserDetailsCacheMaxAge = 5 * time.Minute

	// NovuSubscriberTimeout is the timeout for ensuring a Novu subscriber.
	NovuSubscriberTimeout = 30 * time.Second

	// AuthCacheTTL is how long to cache auth results.
	AuthCacheTTL = 5 * time.Minute
)

// AuthCacheEntry represents a cached authentication result.
type AuthCacheEntry struct {
	User      *db.User
	ExpiresAt time.Time
}

// AuthCache provides thread-safe caching for authentication results.
type AuthCache struct {
	cache map[string]*AuthCacheEntry
	mu    sync.RWMutex
}

// getCachedAuth retrieves a cached authentication result.
func (api *APIMiddlewares) getCachedAuth(token string) *db.User {
	api.authCache.mu.RLock()
	entry, exists := api.authCache.cache[token]
	if !exists {
		api.authCache.mu.RUnlock()
		return nil
	}

	if time.Now().Before(entry.ExpiresAt) {
		user := entry.User
		api.authCache.mu.RUnlock()
		return user
	}
	api.authCache.mu.RUnlock()

	// Clean expired entry with write lock - double check after acquiring write lock
	api.authCache.mu.Lock()
	defer api.authCache.mu.Unlock()
	entry, exists = api.authCache.cache[token]
	if exists && time.Now().After(entry.ExpiresAt) {
		delete(api.authCache.cache, token)
	}
	return nil
}

// setCachedAuth stores an authentication result in cache.
func (api *APIMiddlewares) setCachedAuth(token string, user *db.User) {
	api.authCache.mu.Lock()
	defer api.authCache.mu.Unlock()

	api.authCache.cache[token] = &AuthCacheEntry{
		User:      user,
		ExpiresAt: time.Now().Add(AuthCacheTTL),
	}
}

// AuthMiddleware handles the user authentication for the API, tokens and user details syncing with Clerk.
func (api *APIMiddlewares) AuthMiddleware(c fiber.Ctx) error {
	// Get the locale from the context
	locale, localeOk := c.Locals("locale").(string)
	if !localeOk {
		locale = "en"
	}

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

	// Validate token first (this ensures token hasn't expired)
	irminUser, clerkID, err := api.validateAndGetUserFromToken(token)
	if err != nil {
		api.Logger.Error("Token validation failed", "error", err)
		// Remove from cache if it exists since token is invalid
		api.authCache.mu.Lock()
		delete(api.authCache.cache, token)
		api.authCache.mu.Unlock()
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	// Check cache after validation for performance optimization
	if cachedUser := api.getCachedAuth(token); cachedUser != nil {
		c.Locals("user", cachedUser)
		c.Locals("is_system", false)
		return c.Next()
	}

	// Sync user with Clerk and Novu (atomic, under lock)
	irminUser, err = api.syncUserWithClerkAndNovu(c, irminUser, clerkID, locale)
	if err != nil {
		api.Logger.Error("Error syncing user with Clerk/Novu", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Cache the authenticated user
	api.setCachedAuth(token, irminUser)

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

// syncUserWithClerkAndNovu synchronizes user data with Clerk and Novu atomically under a lock.
func (api *APIMiddlewares) syncUserWithClerkAndNovu(
	c fiber.Ctx,
	irminUser *db.User,
	clerkID string,
	locale string,
) (*db.User, error) {
	// Get the user details from Clerk
	clerkUser, primaryEmail, primaryPhone, err := api.getUserFromClerk(c, clerkID)
	if err != nil {
		return nil, fmt.Errorf("error getting user details from Clerk: %w", err)
	}

	api.userMutex.Lock()
	defer api.userMutex.Unlock()

	// If user exists and cache is expired, update user fields
	if irminUser != nil && irminUser.ID != 0 && irminUser.UpdatedAt.Before(time.Now().Add(-UserDetailsCacheMaxAge)) {
		irminUser.FirstName = *clerkUser.FirstName
		irminUser.LastName = *clerkUser.LastName
		irminUser.Email = primaryEmail
		irminUser.Phone = primaryPhone
		irminUser.ProfilePicture = *clerkUser.ImageURL
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

	// Ensure the user is a subscriber in Novu (if not already)
	if irminUser.NovuSubscriberID == "" {
		novuCtx, cancel := context.WithTimeout(context.Background(), NovuSubscriberTimeout)
		defer cancel()
		subscriber, novuErr := lib.EnsureNovuSubscriber(novuCtx, api.SQIDManager, api.Env, locale, irminUser)
		switch {
		case novuErr != nil:
			api.Logger.ErrorContext(c, "Error ensuring Novu subscriber", "error", novuErr)
		case subscriber != nil && subscriber.ID != nil:
			irminUser.NovuSubscriberID = *subscriber.ID
		case subscriber != nil && subscriber.ID == nil:
			api.Logger.ErrorContext(c, "Novu subscriber created but ID is nil", "subscriber", subscriber)
		}
	}

	// Save the user after all updates
	if saveErr := api.DB.Save(&irminUser).Error; saveErr != nil {
		return nil, fmt.Errorf("error saving user: %w", saveErr)
	}

	return irminUser, nil
}

// getUserFromClerk gets the user from Clerk and returns the user, primary email and primary phone number.
func (api *APIMiddlewares) getUserFromClerk(c fiber.Ctx, clerkID string) (*clerk.User, string, string, error) {
	// Set the API key with your Clerk Secret Key.
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get the user details from Clerk.
	clerkUser, getUserFromClerkErr := user.Get(c, clerkID)
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
