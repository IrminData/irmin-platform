package services

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"
	"sync"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
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

const (
	// UserDetailsCacheMaxAge is the maximum age of a user details cache entry used to decide refresh from Clerk
	UserDetailsCacheMaxAge = 5 * time.Minute

	// NovuSubscriberTimeout is the timeout for ensuring a Novu subscriber.
	NovuSubscriberTimeout = 30 * time.Second

	// AuthCacheTTL is how long to cache auth results.
	AuthCacheTTL = 5 * time.Minute
)

// getCachedAuth retrieves a cached authentication result.
func (api *APIServices) getCachedAuth(token string) *db.User {
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
func (api *APIServices) setCachedAuth(token string, user *db.User) {
	api.authCache.mu.Lock()
	defer api.authCache.mu.Unlock()

	api.authCache.cache[token] = &AuthCacheEntry{
		User:      user,
		ExpiresAt: time.Now().Add(AuthCacheTTL),
	}
}

// invalidateCachedAuth removes a specific token from the cache.
func (api *APIServices) invalidateCachedAuth(token string) {
	api.authCache.mu.Lock()
	defer api.authCache.mu.Unlock()
	delete(api.authCache.cache, token)
}

// IdentifyUserFromToken validates the provided token and returns the associated user.
// It supports system token, credentials token (cred_ prefix), and JWT from Clerk.
// Uses caching to avoid expensive validation and sync operations for recently authenticated tokens.
// Returns: user, isSystem, error
func (api *APIServices) IdentifyUserFromToken(c context.Context, token, locale string) (*db.User, bool, error) {
	if token == "" {
		return nil, false, errors.New("missing token")
	}

	// System token
	if api.validateSystemToken(token) {
		return nil, true, nil
	}

	// Check cache first for performance optimization
	if cachedUser := api.getCachedAuth(token); cachedUser != nil {
		// Return cached user with empty clerkID since we don't store it in cache
		// The clerkID is only needed for initial sync operations
		return cachedUser, false, nil
	}

	// Validate and fetch user information
	irminUser, clerkID, err := api.validateAndGetUserFromToken(token)
	if err != nil {
		// Remove from cache if it exists since token is invalid
		api.invalidateCachedAuth(token)
		return nil, false, err
	}

	// If user not found locally yet, or stale, sync from Clerk/Novu
	if locale == "" {
		locale = "en"
	}
	syncedUser, syncErr := api.SyncUserWithClerkAndNovu(c, irminUser, clerkID, locale)
	if syncErr != nil {
		return nil, false, syncErr
	}

	// Cache the authenticated user for future requests
	api.setCachedAuth(token, syncedUser)

	return syncedUser, false, nil
}

// validateSystemToken checks if token equals configured system token
func (api *APIServices) validateSystemToken(token string) bool {
	return token == api.Env.SystemToken
}

// validateCredentialsToken validates a credentials token and returns the associated user and clerk id
func (api *APIServices) validateCredentialsToken(token string) (*db.User, string, error) {
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

// validateAndGetUserFromToken validates the token and returns the associated user and clerk ID.
func (api *APIServices) validateAndGetUserFromToken(token string) (*db.User, string, error) {
	if len(token) >= 5 && token[:5] == "cred_" {
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

// SyncUserWithClerkAndNovu synchronizes user data with Clerk and Novu under a lock and persists in DB.
func (api *APIServices) SyncUserWithClerkAndNovu(
	c context.Context,
	irminUser *db.User,
	clerkID, locale string,
) (*db.User, error) {
	// Set Clerk API key
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get Clerk user
	clerkUser, primaryEmail, primaryPhone, err := api.getUserFromClerk(c, clerkID)
	if err != nil {
		return nil, fmt.Errorf("error getting user details from Clerk: %w", err)
	}

	api.userSyncMutex.Lock()
	defer api.userSyncMutex.Unlock()

	// Refresh fields periodically if user exists
	if irminUser != nil && irminUser.ID != 0 && irminUser.UpdatedAt.Before(time.Now().Add(-UserDetailsCacheMaxAge)) {
		irminUser.FirstName = valueOrDefault(clerkUser.FirstName)
		irminUser.LastName = valueOrDefault(clerkUser.LastName)
		irminUser.Email = primaryEmail
		irminUser.Phone = primaryPhone
		irminUser.ProfilePicture = valueOrDefault(clerkUser.ImageURL)
	}

	// Create if missing
	if irminUser == nil || irminUser.ID == 0 {
		irminUser = &db.User{
			ClerkID:        clerkID,
			FirstName:      valueOrDefault(clerkUser.FirstName),
			LastName:       valueOrDefault(clerkUser.LastName),
			Email:          primaryEmail,
			Phone:          primaryPhone,
			ProfilePicture: valueOrDefault(clerkUser.ImageURL),
		}
		if createErr := api.DB.Create(&irminUser).Error; createErr != nil {
			api.Logger.ErrorContext(c, "Error creating user in database", "error", createErr, "clerk_id", clerkID)
			return nil, fmt.Errorf("error creating user: %w", createErr)
		}
	}

	// Ensure Novu subscriber
	if irminUser.NovuSubscriberID == "" {
		novuCtx, cancel := context.WithTimeout(context.Background(), NovuSubscriberTimeout)
		defer cancel()
		subscriber, novuErr := lib.EnsureNovuSubscriber(novuCtx, api.SQIDManager, api.Env, locale, irminUser)
		if novuErr != nil {
			api.Logger.ErrorContext(c, "Error ensuring Novu subscriber", "error", novuErr)
		} else if subscriber != nil && subscriber.ID != nil {
			irminUser.NovuSubscriberID = *subscriber.ID
		}
	}

	if saveErr := api.DB.Save(&irminUser).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error saving user to database", "error", saveErr, "user_id", irminUser.ID)
		return nil, fmt.Errorf("error saving user: %w", saveErr)
	}

	return irminUser, nil
}

// getUserFromClerk fetches Clerk user and primary contact info.
func (api *APIServices) getUserFromClerk(c context.Context, clerkID string) (*clerk.User, string, string, error) {
	clerkUser, getUserErr := user.Get(c, clerkID)
	if getUserErr != nil {
		api.Logger.ErrorContext(c, "Error fetching user from Clerk", "error", getUserErr, "clerk_id", clerkID)
		return nil, "", "", getUserErr
	}

	// Primary email
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

	// Primary phone
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

// valueOrDefault dereferences a string pointer or returns empty string when nil.
func valueOrDefault(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}
