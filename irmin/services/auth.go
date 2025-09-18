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

const (
	// UserDetailsCacheMaxAge is the maximum age for cached user details before refresh
	UserDetailsCacheMaxAge = 24 * time.Hour

	// NovuSubscriberTimeout is the timeout for Novu subscriber operations
	NovuSubscriberTimeout = 30 * time.Second

	// BackgroundSyncTimeout is the timeout for background user sync operations
	BackgroundSyncTimeout = 30 * time.Second

	// UserCreationTimeout is the timeout for new user creation operations
	UserCreationTimeout = 10 * time.Second

	// SyncLockTimeout is the timeout for acquiring sync locks
	SyncLockTimeout = 100 * time.Millisecond

	// UserCreationLockTimeout is the timeout for acquiring user creation locks
	UserCreationLockTimeout = 500 * time.Millisecond

	// AuthCacheTTL is how long to cache auth results
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

// PerUserLockManager provides thread-safe per-user locking for sync operations.
type PerUserLockManager struct {
	locks map[string]*sync.Mutex
	mu    sync.RWMutex
}

// LockInfo tracks whether a lock was acquired for a specific key.
type LockInfo struct {
	acquired bool
	mutex    *sync.Mutex
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
// External API operations (Clerk/Novu sync) happen asynchronously in the background.
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
		// Schedule background sync if user data is stale (but don't block)
		if api.isUserDataStale(cachedUser) {
			go api.backgroundUserSync(context.Background(), cachedUser, cachedUser.ClerkID, locale, token)
		}
		return cachedUser, false, nil
	}

	// Validate and fetch user information
	irminUser, clerkID, err := api.validateAndGetUserFromToken(token)
	if err != nil {
		// Remove from cache if it exists since token is invalid
		api.invalidateCachedAuth(token)
		return nil, false, err
	}

	// If user exists locally, return immediately and sync in background
	if irminUser != nil && irminUser.ID != 0 {
		// Cache the user for future requests
		api.setCachedAuth(token, irminUser)

		// Schedule background sync if needed (don't block)
		if api.isUserDataStale(irminUser) {
			go api.backgroundUserSync(context.Background(), irminUser, clerkID, locale, token)
		}

		return irminUser, false, nil
	}

	// User doesn't exist locally - we need to create them
	// This is the only case where we need to block (for new users)
	if locale == "" {
		locale = "en"
	}
	newUser, syncErr := api.createUserFromClerk(c, clerkID, locale)
	if syncErr != nil {
		return nil, false, syncErr
	}

	// Cache the newly created user
	api.setCachedAuth(token, newUser)

	return newUser, false, nil
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

// SyncUserWithClerkAndNovu synchronizes user data with Clerk and Novu with per-user locking and persists in DB.
// This function should only be called from background goroutines, never from the main auth path.
func (api *APIServices) SyncUserWithClerkAndNovu(
	c context.Context,
	irminUser *db.User,
	clerkID, locale string,
) (*db.User, error) {
	// Use per-user locking to prevent duplicate sync operations for the same user
	userLockKey := fmt.Sprintf("user_sync_%s", clerkID)

	// Try to acquire lock with timeout - if we can't get it quickly, skip sync
	lockInfo := api.perUserLocks.TryLock(userLockKey, SyncLockTimeout)
	if !lockInfo.acquired {
		// Another sync is already in progress for this user, skip this one
		api.Logger.InfoContext(c, "Skipping user sync - already in progress", "clerk_id", clerkID)
		return irminUser, nil
	}
	defer api.perUserLocks.UnlockLockInfo(lockInfo)

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
// This is only used for completely new users and uses fast locking to prevent duplicates.
func (api *APIServices) createUserFromClerk(ctx context.Context, clerkID, locale string) (*db.User, error) {
	// Use a shorter timeout for new user creation
	createCtx, cancel := context.WithTimeout(ctx, UserCreationTimeout)
	defer cancel()

	// Use per-user locking for user creation to prevent duplicates
	// But use a very short timeout - if we can't get the lock quickly,
	// assume another request is creating the user and check the DB
	userLockKey := fmt.Sprintf("user_creation_%s", clerkID)
	lockInfo := api.perUserLocks.TryLock(userLockKey, UserCreationLockTimeout)

	if !lockInfo.acquired {
		// Another user creation is in progress, check if user was created
		if existingUser, _ := api.DB.GetUserByClerkID(clerkID); existingUser != nil && existingUser.ID != 0 {
			return existingUser, nil
		}
		// If still not found, return error - avoid waiting
		return nil, fmt.Errorf("user creation in progress for clerk ID: %s", clerkID)
	}
	defer api.perUserLocks.UnlockLockInfo(lockInfo)

	// Double-check if user was created by another goroutine
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
	if subscriber != nil && subscriber.ID != nil && user.NovuSubscriberID == "" {
		user.NovuSubscriberID = *subscriber.ID
		if saveErr := api.DB.Save(&user).Error; saveErr != nil {
			api.Logger.ErrorContext(novuCtx, "Error saving Novu subscriber ID", "error", saveErr, "user_id", user.ID)
		}
	}
}

// Lock acquires a lock for a specific key (e.g., user ID).
func (pm *PerUserLockManager) Lock(key string) {
	pm.mu.Lock()
	if pm.locks == nil {
		pm.locks = make(map[string]*sync.Mutex)
	}
	if _, exists := pm.locks[key]; !exists {
		pm.locks[key] = &sync.Mutex{}
	}
	userMutex := pm.locks[key]
	pm.mu.Unlock()

	// Acquire the per-user lock (only blocks this specific user)
	userMutex.Lock()
}

// TryLock attempts to acquire a lock for a specific key with a timeout.
// Returns LockInfo with acquisition status and the mutex.
func (pm *PerUserLockManager) TryLock(key string, timeout time.Duration) LockInfo {
	pm.mu.Lock()
	if pm.locks == nil {
		pm.locks = make(map[string]*sync.Mutex)
	}
	if _, exists := pm.locks[key]; !exists {
		pm.locks[key] = &sync.Mutex{}
	}
	userMutex := pm.locks[key]
	pm.mu.Unlock()

	// Use a channel to signal lock acquisition
	lockAcquired := make(chan struct{})
	lockFailed := make(chan struct{})

	go func() {
		// Try to acquire the lock
		userMutex.Lock()

		// Signal that we acquired the lock
		select {
		case lockAcquired <- struct{}{}:
			// Successfully signaled acquisition, wait for completion
			<-lockFailed
			userMutex.Unlock()
		case <-lockFailed:
			// Timeout occurred before we could signal, release lock
			userMutex.Unlock()
		}
	}()

	select {
	case <-lockAcquired:
		// Lock was successfully acquired
		close(lockFailed) // Signal goroutine to keep the lock
		return LockInfo{acquired: true, mutex: userMutex}
	case <-time.After(timeout):
		// Timeout occurred
		close(lockFailed) // Signal goroutine to release the lock
		return LockInfo{acquired: false, mutex: userMutex}
	}
}

// Unlock releases the lock for a specific key.
func (pm *PerUserLockManager) Unlock(key string) {
	pm.mu.RLock()
	userMutex := pm.locks[key]
	pm.mu.RUnlock()

	if userMutex != nil {
		userMutex.Unlock()
	}
}

// UnlockLockInfo safely unlocks only if the lock was actually acquired.
func (pm *PerUserLockManager) UnlockLockInfo(lockInfo LockInfo) {
	if lockInfo.acquired && lockInfo.mutex != nil {
		lockInfo.mutex.Unlock()
	}
}
