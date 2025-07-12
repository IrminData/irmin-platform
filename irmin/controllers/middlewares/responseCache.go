package middlewares

import (
	"fmt"
	"irmin-api/db"
	"net/http"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
)

// ResponseCacheEntry represents a cached response.
type ResponseCacheEntry struct {
	Data      []byte
	ExpiresAt time.Time
}

// ResponseCache provides thread-safe caching for API responses.
type ResponseCache struct {
	cache map[string]*ResponseCacheEntry
	mu    sync.RWMutex
}

// ResponseCacheMiddleware caches successful GET responses per user/workspace.
// This provides additional performance gains for frequently accessed endpoints.
func (api *APIMiddlewares) ResponseCacheMiddleware(ttl time.Duration) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Only cache GET requests
		if c.Method() != "GET" {
			return c.Next()
		}

		// Skip caching if no user context (public endpoints)
		user, userOk := c.Locals("user").(*db.User)
		if !userOk {
			return c.Next()
		}

		// Generate cache key based on path, user, and workspace
		cacheKey := api.generateResponseCacheKey(c, user)

		// Check cache first
		if cached := api.getCachedResponse(cacheKey); cached != nil {
			c.Set("X-Cache", "HIT")
			return c.Send(cached)
		}

		// Process request
		err := c.Next()
		if err != nil {
			return err
		}

		// Cache successful responses only
		if c.Response().StatusCode() == http.StatusOK {
			responseData := c.Response().Body()
			api.setCachedResponse(cacheKey, responseData, ttl)
			c.Set("X-Cache", "MISS")
		}

		return nil
	}
}

// generateResponseCacheKey creates a unique cache key for the response.
func (api *APIMiddlewares) generateResponseCacheKey(c fiber.Ctx, user *db.User) string {
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	// Include query parameters in cache key
	queryString := string(c.Request().URI().QueryString())

	if workspaceOk {
		return fmt.Sprintf("resp:%s:%s:%d:%d", c.Path(), queryString, user.ID, workspace.ID)
	}

	return fmt.Sprintf("resp:%s:%s:%d", c.Path(), queryString, user.ID)
}

// getCachedResponse retrieves a cached response.
func (api *APIMiddlewares) getCachedResponse(key string) []byte {
	api.responseCache.mu.RLock()
	entry, exists := api.responseCache.cache[key]
	if !exists {
		api.responseCache.mu.RUnlock()
		return nil
	}

	if time.Now().Before(entry.ExpiresAt) {
		data := entry.Data
		api.responseCache.mu.RUnlock()
		return data
	}
	api.responseCache.mu.RUnlock()

	// Clean expired entry with write lock - double check after acquiring write lock
	api.responseCache.mu.Lock()
	defer api.responseCache.mu.Unlock()
	entry, exists = api.responseCache.cache[key]
	if exists && time.Now().After(entry.ExpiresAt) {
		delete(api.responseCache.cache, key)
	}
	return nil
}

// setCachedResponse stores a response in cache.
func (api *APIMiddlewares) setCachedResponse(key string, data []byte, ttl time.Duration) {
	api.responseCache.mu.Lock()
	defer api.responseCache.mu.Unlock()

	// Prevent caching very large responses (>1MB)
	if len(data) > 1024*1024 {
		return
	}

	// Simple cleanup: remove expired entries periodically
	if len(api.responseCache.cache)%100 == 0 {
		api.cleanExpiredResponsesUnsafe()
	}

	api.responseCache.cache[key] = &ResponseCacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// cleanExpiredResponsesUnsafe removes expired response entries (must be called with write lock).
func (api *APIMiddlewares) cleanExpiredResponsesUnsafe() {
	now := time.Now()
	for key, entry := range api.responseCache.cache {
		if now.After(entry.ExpiresAt) {
			delete(api.responseCache.cache, key)
		}
	}
}
