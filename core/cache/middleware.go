package cache

import (
	"net/http"
	"sort"
	"time"

	"github.com/gofiber/fiber/v3"
	fibercache "github.com/gofiber/fiber/v3/middleware/cache"
)

const (
	// DefaultExpiration is the default cache TTL for app-level caching.
	DefaultExpiration = 5 * time.Minute
)

// keyFromRequest builds a deterministic cache key from the request path, sorted query params, and Authorization header.
func keyFromRequest(c fiber.Ctx) string {
	queriesMap := c.Queries()
	var keys []string
	for key := range queriesMap {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	queries := ""
	for _, key := range keys {
		value := queriesMap[key]
		if queries == "" {
			queries = key + "=" + value
		} else {
			queries += "&" + key + "=" + value
		}
	}
	return c.Path() + queries + c.Get("authorization")
}

// NewAppCacheMiddleware returns the global cache middleware configured with the provided storage.
func NewAppCacheMiddleware(storage fiber.Storage) fiber.Handler {
	return NewResponseCacheMiddleware(storage, DefaultExpiration)
}

// NewResponseCacheMiddleware returns a route-level cache middleware with a custom TTL.
func NewResponseCacheMiddleware(storage fiber.Storage, ttl time.Duration) fiber.Handler {
	return fibercache.New(fibercache.Config{
		Expiration: ttl,
		Methods: []string{
			http.MethodGet,
			http.MethodHead,
			http.MethodOptions,
		},
		Storage: storage,
		KeyGenerator: func(c fiber.Ctx) string {
			k := keyFromRequest(c)
			TrackKeyForRequest(c, storage, k)
			return k
		},
	})
}
