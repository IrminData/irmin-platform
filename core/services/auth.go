package services

import (
	"context"
	"crypto/subtle"
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

// TokenType represents the type of authentication token used.
type TokenType string

const (
	// TokenTypeClerk indicates a Clerk JWT session token (console users).
	TokenTypeClerk TokenType = "clerk"

	// TokenTypeCred indicates a credentials API token (cred_ prefix).
	TokenTypeCred TokenType = "cred"

	// TokenTypeSystem indicates the internal system token.
	TokenTypeSystem TokenType = "system"
)

const (
	// UserDetailsCacheMaxAge is the maximum age for cached user details before refresh
	UserDetailsCacheMaxAge = 24 * time.Hour

	// NovuSubscriberTimeout is the timeout for Novu subscriber operations
	NovuSubscriberTimeout = 30 * time.Second

	// BackgroundSyncTimeout is the timeout for background user sync operations
	BackgroundSyncTimeout = 30 * time.Second

	// UserCreationTimeout is the timeout for new user creation operations
	UserCreationTimeout = 10 * time.Second

	// AuthCacheTTL is how long to cache auth results
	AuthCacheTTL = 5 * time.Minute

	// AuthCacheMaxSize is the maximum number of entries in the auth cache before eviction
	AuthCacheMaxSize = 10000
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
// Evicts expired entries and enforces a maximum cache size to prevent unbounded memory growth.
func (api *APIServices) setCachedAuth(token string, user *db.User) {
	api.authCache.mu.Lock()
	defer api.authCache.mu.Unlock()

	// If at capacity, evict expired entries first
	if len(api.authCache.cache) >= AuthCacheMaxSize {
		now := time.Now()
		for k, v := range api.authCache.cache {
			if now.After(v.ExpiresAt) {
				delete(api.authCache.cache, k)
			}
		}
	}

	// If still at capacity after eviction, remove oldest entries
	if len(api.authCache.cache) >= AuthCacheMaxSize {
		var oldestKey string
		var oldestTime time.Time
		first := true
		for k, v := range api.authCache.cache {
			if first || v.ExpiresAt.Before(oldestTime) {
				oldestKey = k
				oldestTime = v.ExpiresAt
				first = false
			}
		}
		if oldestKey != "" {
			delete(api.authCache.cache, oldestKey)
		}
	}

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
// External API operations (Clerk/Novu sync) happen asynchronously in the background.
// Returns: user, tokenType, error
func (api *APIServices) IdentifyUserFromToken(c context.Context, token, locale string) (*db.User, TokenType, error) {
	if token == "" {
		return nil, "", errors.New("missing token")
	}

	// System token
	if api.validateSystemToken(token) {
		return nil, TokenTypeSystem, nil
	}

	// Determine token type from prefix
	tokenType := TokenTypeClerk
	if len(token) >= 5 && token[:5] == "cred_" {
		tokenType = TokenTypeCred
	}

	// Check cache first for performance optimization
	if cachedUser := api.getCachedAuth(token); cachedUser != nil {
		// Schedule background sync if user data is stale (but don't block)
		if api.isUserDataStale(cachedUser) {
			go api.backgroundUserSync(context.Background(), cachedUser, cachedUser.ClerkID, locale, token)
		}
		return cachedUser, tokenType, nil
	}

	// Validate and fetch user information
	irminUser, clerkID, err := api.validateAndGetUserFromToken(token)
	if err != nil {
		// Remove from cache if it exists since token is invalid
		api.invalidateCachedAuth(token)
		return nil, "", err
	}

	// If user exists locally, return immediately and sync in background
	if irminUser != nil && irminUser.ID != 0 {
		// Cache the user for future requests
		api.setCachedAuth(token, irminUser)

		// Schedule background sync if needed (don't block)
		if api.isUserDataStale(irminUser) {
			go api.backgroundUserSync(context.Background(), irminUser, clerkID, locale, token)
		}

		return irminUser, tokenType, nil
	}

	// User doesn't exist locally - we need to create them
	// This is the only case where we need to block (for new users)
	if locale == "" {
		locale = "en"
	}
	newUser, syncErr := api.createUserFromClerk(c, clerkID, locale)
	if syncErr != nil {
		return nil, "", syncErr
	}

	// Cache the newly created user
	api.setCachedAuth(token, newUser)

	return newUser, tokenType, nil
}

// validateSystemToken checks if token equals configured system token using constant-time comparison
func (api *APIServices) validateSystemToken(token string) bool {
	return subtle.ConstantTimeCompare([]byte(token), []byte(api.Env.SystemToken)) == 1
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

// SyncUserWithClerkAndNovu synchronizes user data with Clerk and Novu with per-user locking and persists in DB.
// This function should only be called from background goroutines, never from the main auth path.
func (api *APIServices) SyncUserWithClerkAndNovu(
	c context.Context,
	irminUser *db.User,
	clerkID, locale string,
) (*db.User, error) {
	// Use database advisory lock to prevent duplicate sync operations across instances
	lockKey := fmt.Sprintf("auth:user_sync:%s", clerkID)

	// Try to acquire lock - if already locked, another instance is syncing this user
	locked, lockErr := db.TryLockKey(api.DB.DB, lockKey)
	if lockErr != nil {
		// Lock acquisition failed due to database error - log but continue without lock
		// This maintains resilience if the lock system has transient issues
		api.Logger.WarnContext(
			c,
			"Failed to acquire advisory lock for user sync, continuing without lock protection",
			"error",
			lockErr,
			"clerk_id",
			clerkID,
		)
		locked = false // Proceed without lock
	}

	// Setup defer to release lock only if we acquired it
	lockAcquired := locked
	if lockAcquired {
		defer func() {
			if unlockErr := db.UnlockKey(api.DB.DB, lockKey); unlockErr != nil {
				api.Logger.ErrorContext(c, "Error releasing sync lock", "error", unlockErr, "clerk_id", clerkID)
			}
		}()
	}

	if !locked && lockErr == nil {
		// Lock is held by another instance (not an error) - skip sync
		api.Logger.InfoContext(c, "Skipping user sync - already in progress", "clerk_id", clerkID)
		return irminUser, nil
	}

	// Set Clerk API key
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get Clerk user
	clerkUser, primaryEmail, primaryPhone, err := api.getUserFromClerk(c, clerkID)
	if err != nil {
		return nil, fmt.Errorf("error getting user details from Clerk: %w", err)
	}

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
		} else if subscriber != nil && subscriber.SubscriberID != "" {
			irminUser.NovuSubscriberID = subscriber.SubscriberID
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

// isUserDataStale checks if user data needs to be refreshed from Clerk.
func (api *APIServices) isUserDataStale(user *db.User) bool {
	if user == nil {
		return true
	}
	return user.UpdatedAt.Before(time.Now().Add(-UserDetailsCacheMaxAge))
}

// backgroundUserSync performs user synchronization with Clerk/Novu in the background.
// This runs asynchronously and doesn't block authentication.
func (api *APIServices) backgroundUserSync(ctx context.Context, user *db.User, clerkID, locale, token string) {
	// Use a timeout context to prevent hanging
	syncCtx, cancel := context.WithTimeout(ctx, BackgroundSyncTimeout)
	defer cancel()

	// Perform the sync operation
	syncedUser, err := api.SyncUserWithClerkAndNovu(syncCtx, user, clerkID, locale)
	if err != nil {
		api.Logger.ErrorContext(
			syncCtx,
			"Background user sync failed",
			"error",
			err,
			"user_id",
			user.ID,
			"clerk_id",
			clerkID,
		)
		return
	}

	// Update cache with fresh data
	if syncedUser != nil {
		api.setCachedAuth(token, syncedUser)
	}
}

// createUserFromClerk creates a new user by fetching data from Clerk.
// This is only used for completely new users and uses database locking to prevent duplicates across instances.
func (api *APIServices) createUserFromClerk(ctx context.Context, clerkID, locale string) (*db.User, error) {
	// Use a shorter timeout for new user creation
	createCtx, cancel := context.WithTimeout(ctx, UserCreationTimeout)
	defer cancel()

	// Use database advisory lock to prevent duplicate user creation across instances
	lockKey := fmt.Sprintf("auth:user_creation:%s", clerkID)
	locked, lockErr := db.TryLockKey(api.DB.DB, lockKey)
	if lockErr != nil {
		// Lock acquisition failed due to database error - log but continue without lock
		// This maintains resilience if the lock system has transient issues
		api.Logger.WarnContext(
			createCtx,
			"Failed to acquire advisory lock for user creation, continuing without lock protection",
			"error",
			lockErr,
			"clerk_id",
			clerkID,
		)
		locked = false // Proceed without lock
	}

	// Setup defer to release lock only if we acquired it
	lockAcquired := locked
	if lockAcquired {
		defer func() {
			if unlockErr := db.UnlockKey(api.DB.DB, lockKey); unlockErr != nil {
				api.Logger.ErrorContext(
					createCtx,
					"Error releasing user creation lock",
					"error",
					unlockErr,
					"clerk_id",
					clerkID,
				)
			}
		}()
	}

	if !locked && lockErr == nil {
		// Lock is held by another instance (not an error) - check if user was created
		if existingUser, _ := api.DB.GetUserByClerkID(clerkID); existingUser != nil && existingUser.ID != 0 {
			return existingUser, nil
		}
		// If still not found, return error - avoid waiting
		return nil, fmt.Errorf("user creation in progress for clerk ID: %s", clerkID)
	}

	// Double-check if user was created by another instance
	if existingUser, _ := api.DB.GetUserByClerkID(clerkID); existingUser != nil && existingUser.ID != 0 {
		return existingUser, nil
	}

	// Set Clerk API key
	clerk.SetKey(api.Env.ClerkSecretKey)

	// Get Clerk user data
	clerkUser, primaryEmail, primaryPhone, err := api.getUserFromClerk(createCtx, clerkID)
	if err != nil {
		return nil, fmt.Errorf("error getting user details from Clerk: %w", err)
	}

	newUser := &db.User{
		ClerkID:        clerkID,
		FirstName:      valueOrDefault(clerkUser.FirstName),
		LastName:       valueOrDefault(clerkUser.LastName),
		Email:          primaryEmail,
		Phone:          primaryPhone,
		ProfilePicture: valueOrDefault(clerkUser.ImageURL),
	}

	if createErr := api.DB.Create(&newUser).Error; createErr != nil {
		api.Logger.ErrorContext(createCtx, "Error creating user in database", "error", createErr, "clerk_id", clerkID)
		return nil, fmt.Errorf("error creating user: %w", createErr)
	}

	// Schedule Novu subscriber creation in background (don't block)
	go api.ensureNovuSubscriberAsync(context.Background(), newUser, locale)

	return newUser, nil
}

// ensureNovuSubscriberAsync ensures Novu subscriber exists without blocking.
func (api *APIServices) ensureNovuSubscriberAsync(ctx context.Context, user *db.User, locale string) {
	novuCtx, cancel := context.WithTimeout(ctx, NovuSubscriberTimeout)
	defer cancel()

	subscriber, err := lib.EnsureNovuSubscriber(novuCtx, api.SQIDManager, api.Env, locale, user)
	if err != nil {
		api.Logger.ErrorContext(novuCtx, "Background Novu subscriber creation failed", "error", err, "user_id", user.ID)
		return
	}

	// Update user with Novu subscriber ID if successful
	if subscriber != nil && subscriber.SubscriberID != "" && user.NovuSubscriberID == "" {
		user.NovuSubscriberID = subscriber.SubscriberID
		if saveErr := api.DB.Save(&user).Error; saveErr != nil {
			api.Logger.ErrorContext(novuCtx, "Error saving Novu subscriber ID", "error", saveErr, "user_id", user.ID)
		}
	}
}
