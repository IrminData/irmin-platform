package cache_test

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"irmin-api/cache"

	"github.com/gofiber/fiber/v3"
)

// hashAuth computes SHA256 hash of auth header, matching Fiber v3's internal cache key format.
func hashAuth(auth string) string {
	if auth == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(auth))
	return hex.EncodeToString(sum[:])
}

func makeReq(method, path, auth string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	return req
}

func TestMiddleware_KeyAndIndexing_OnGET(t *testing.T) {
	storage := cache.NewDefaultStorage()
	app := fiber.New()
	app.Use(cache.NewResponseCacheMiddleware(storage, 30*time.Second))

	// Simple handler to produce a body
	app.Get("/api/v1/workspaces/ws1/cachetest", func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	// Make a GET with auth and unsorted query order
	path := "/api/v1/workspaces/ws1/cachetest"
	q := "?z=2&y=1"
	auth := "Bearer A"
	resp, err := app.Test(makeReq(http.MethodGet, path+q, auth))
	if err != nil {
		t.Fatalf("request err: %v", err)
	}
	_, _ = io.ReadAll(resp.Body)
	_ = resp.Body.Close()

	// Expected key must match the middleware generator logic (Fiber adds method suffix + auth hash)
	key := cache.BuildKeyFromParts(path, map[string]string{"y": "1", "z": "2"}, auth) + "_GET_auth_" + hashAuth(auth)

	// Verify per-user and global index include the key at the deepest prefix
	deepestPrefix := path
	userIdx := "idx:" + auth + ":" + deepestPrefix
	if b, _ := storage.Get(userIdx); len(b) == 0 || !containsLine(string(b), key) {
		t.Fatalf("user index missing key; idx=%s val=%q", userIdx, string(b))
	}

	allIdx := "idx:all:" + deepestPrefix
	if b, _ := storage.Get(allIdx); len(b) == 0 || !containsLine(string(b), key) {
		t.Fatalf("all-users index missing key; idx=%s val=%q", allIdx, string(b))
	}

	// We assert via indices that key generation and indexing use expected key
}

func TestMiddleware_DoesNotCachePOST(t *testing.T) {
	storage := cache.NewDefaultStorage()
	app := fiber.New()
	app.Use(cache.NewResponseCacheMiddleware(storage, 30*time.Second))

	app.Post("/api/v1/workspaces/ws1/cachetest", func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	path := "/api/v1/workspaces/ws1/cachetest"
	auth := "Bearer A"
	_, err := app.Test(makeReq(http.MethodPost, path+"?a=1&b=2", auth))
	if err != nil {
		t.Fatalf("request err: %v", err)
	}

	key := cache.BuildKeyFromParts(path, map[string]string{"a": "1", "b": "2"}, auth)
	if b, _ := storage.Get(key); len(b) != 0 {
		t.Fatalf("POST should not be cached, but storage has value for key: %s", key)
	}
	allIdx := "idx:all:" + path
	if b, _ := storage.Get(allIdx); len(b) != 0 {
		t.Fatalf("POST should not create index, but all-users index found: %q", string(b))
	}
}

// containsLine checks if text contains key as a complete line entry (newline-separated list)
func containsLine(text, key string) bool {
	// Fast path exact match
	if text == key {
		return true
	}
	// Ensure boundaries by adding newlines
	wrapped := "\n" + text + "\n"
	needle := "\n" + key + "\n"
	return len(text) > 0 && strings.Contains(wrapped, needle)
}

func TestInvalidatePathForCurrentUser_Behavior(t *testing.T) {
	storage := cache.NewDefaultStorage()
	app := fiber.New()
	app.Use(cache.NewResponseCacheMiddleware(storage, 30*time.Second))

	path := "/api/v1/workspaces/ws1/key"
	var hits int
	app.Get(path, func(c fiber.Ctx) error {
		hits++
		// Set Cache-Control: public to allow caching with Authorization header per RFC 9111
		c.Set("Cache-Control", "public, max-age=30")
		return c.SendString("hit:" + time.Now().Format(time.RFC3339Nano))
	})

	auth := "Bearer A"
	// Warm cache (first GET executes handler)
	resp, err := app.Test(makeReq(http.MethodGet, path+"?a=1&b=2", auth))
	if err != nil {
		t.Fatalf("request err: %v", err)
	}
	body1, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if hits != 1 {
		t.Fatalf("expected 1 hit after first GET, got %d", hits)
	}

	// Second GET is served from cache (no new hit)
	resp, err = app.Test(makeReq(http.MethodGet, path+"?a=1&b=2", auth))
	if err != nil {
		t.Fatal(err)
	}
	bodyCached, _ := io.ReadAll(resp.Body)
	_ = resp.Body.Close()
	if string(bodyCached) != string(body1) {
		t.Fatalf("expected cached response to equal first response")
	}
	if hits != 1 {
		t.Fatalf("expected hits to remain 1 after cached GET, got %d", hits)
	}

	// Invalidate via a route to provide current user's Authorization
	app.Post("/invalidate/key", func(c fiber.Ctx) error {
		if cacheInvalidationErr := cache.InvalidatePathForCurrentUser(c, storage, path, map[string]string{"a": "1", "b": "2"}); cacheInvalidationErr != nil {
			return fiber.NewError(500, cacheInvalidationErr.Error())
		}
		return c.SendStatus(204)
	})
	_, err = app.Test(makeReq(http.MethodPost, "/invalidate/key", auth))
	if err != nil {
		t.Fatalf("invalidate request err: %v", err)
	}

	// Storage-level assertion: the Fiber-stored key (with method + auth hash suffix) should be removed
	fullKey := cache.BuildKeyFromParts(path, map[string]string{"a": "1", "b": "2"}, auth) +
		"_GET_auth_" + hashAuth(auth)
	if b, _ := storage.Get(fullKey); len(b) != 0 {
		t.Fatalf("expected full Fiber cache key to be deleted by InvalidatePathForCurrentUser")
	}

	// Functional assertion: after invalidation, next GET must re-execute the handler
	_, err = app.Test(makeReq(http.MethodGet, path+"?a=1&b=2", auth))
	if err != nil {
		t.Fatal(err)
	}
	if hits != 2 {
		t.Fatalf("expected handler to be re-invoked after invalidation (hits=2), got %d", hits)
	}
}

func TestInvalidatePathsForCurrentUser_RemovesMultiple_Behavior(t *testing.T) {
	storage := cache.NewDefaultStorage()
	app := fiber.New()
	app.Use(cache.NewResponseCacheMiddleware(storage, 30*time.Second))

	p1 := "/api/v1/workspaces/ws1/p1"
	p2 := "/api/v1/workspaces/ws1/p2"
	var hitsP1, hitsP2 int
	app.Get(p1, func(c fiber.Ctx) error {
		hitsP1++
		c.Set("Cache-Control", "public, max-age=30")
		return c.SendString("p1")
	})
	app.Get(p2, func(c fiber.Ctx) error {
		hitsP2++
		c.Set("Cache-Control", "public, max-age=30")
		return c.SendString("p2")
	})

	auth := "Bearer A"
	// Warm cache
	if _, err := app.Test(makeReq(http.MethodGet, p1, auth)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, p2, auth)); err != nil {
		t.Fatal(err)
	}
	if hitsP1 != 1 || hitsP2 != 1 {
		t.Fatalf("expected 1 hit each after warm, got p1=%d p2=%d", hitsP1, hitsP2)
	}

	// Verify cache is active (no new hits)
	if _, err := app.Test(makeReq(http.MethodGet, p1, auth)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, p2, auth)); err != nil {
		t.Fatal(err)
	}
	if hitsP1 != 1 || hitsP2 != 1 {
		t.Fatalf("expected hits to stay at 1 each from cache, got p1=%d p2=%d", hitsP1, hitsP2)
	}

	// Route to call bulk invalidation
	app.Post("/invalidate/paths", func(c fiber.Ctx) error {
		if err := cache.InvalidatePathsForCurrentUser(c, storage, []string{p1, p2}); err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.SendStatus(204)
	})
	if _, err := app.Test(makeReq(http.MethodPost, "/invalidate/paths", auth)); err != nil {
		t.Fatal(err)
	}

	// After invalidation, GETs should cause handler to run again (hits increase)
	if _, err := app.Test(makeReq(http.MethodGet, p1, auth)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, p2, auth)); err != nil {
		t.Fatal(err)
	}
	if hitsP1 != 2 {
		t.Fatalf("expected p1 handler to be re-invoked after invalidation (hits=2), got %d", hitsP1)
	}
	if hitsP2 != 2 {
		t.Fatalf("expected p2 handler to be re-invoked after invalidation (hits=2), got %d", hitsP2)
	}
}

func TestInvalidatePathPrefixForCurrentUser_RemovesOnlyThisUser_Behavior(t *testing.T) {
	storage := cache.NewDefaultStorage()
	app := fiber.New()
	app.Use(cache.NewResponseCacheMiddleware(storage, 30*time.Second))

	base := "/api/v1/ws/foo"
	var hitsBase int
	var hitsBaseA int
	app.Get(base, func(c fiber.Ctx) error {
		hitsBase++
		// Set Cache-Control: public to allow caching with Authorization header per RFC 9111
		c.Set("Cache-Control", "public, max-age=30")
		return c.SendString("base")
	})
	app.Get(base+"/a", func(c fiber.Ctx) error {
		hitsBaseA++
		// Set Cache-Control: public to allow caching with Authorization header per RFC 9111
		c.Set("Cache-Control", "public, max-age=30")
		return c.SendString("base-a")
	})

	// Use different Authorization headers to differentiate users
	authA := "Bearer UserA"
	authB := "Bearer UserB"

	// Warm caches for A and B (first requests compute and cache)
	if _, err := app.Test(makeReq(http.MethodGet, base, authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base+"/a", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base, authB)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base+"/a", authB)); err != nil {
		t.Fatal(err)
	}

	// Second requests should be served from cache (no additional hits)
	if _, err := app.Test(makeReq(http.MethodGet, base, authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base+"/a", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base, authB)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base+"/a", authB)); err != nil {
		t.Fatal(err)
	}
	if hitsBase != 2 {
		t.Fatalf("expected hitsBase to be 2 after warm-and-cache, got %d", hitsBase)
	}
	if hitsBaseA != 2 {
		t.Fatalf("expected hitsBaseA to be 2 after warm-and-cache, got %d", hitsBaseA)
	}

	// Invalidate prefix for current user (A)
	app.Post("/invalidate/prefix", func(c fiber.Ctx) error {
		if err := cache.InvalidatePathPrefixForCurrentUser(c, storage, base); err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.SendStatus(204)
	})
	if _, err := app.Test(makeReq(http.MethodPost, "/invalidate/prefix", authA)); err != nil {
		t.Fatal(err)
	}

	// After invalidation, A's next requests should be recomputed (hits increase),
	// while B's are still cached (no hit increase)
	if _, err := app.Test(makeReq(http.MethodGet, base, authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base+"/a", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base, authB)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeReq(http.MethodGet, base+"/a", authB)); err != nil {
		t.Fatal(err)
	}

	// Warmed once per user initially (2 hits), then invalidation for A triggers recomputation for A only (+1 each)
	// B's entries remain cached, so no additional hits for B
	if hitsBase != 3 {
		t.Fatalf("expected hitsBase to be 3 after A-only invalidation, got %d", hitsBase)
	}
	if hitsBaseA != 3 {
		t.Fatalf("expected hitsBaseA to be 3 after A-only invalidation, got %d", hitsBaseA)
	}
}

//nolint:gocognit // test function has multiple phases that are clearer when written sequentially
func TestInvalidatePathPrefixForAllUsers_RemovesAllUsers_Behavior(t *testing.T) {
	storage := cache.NewDefaultStorage()
	app := fiber.New()
	app.Use(cache.NewResponseCacheMiddleware(storage, 30*time.Second))

	base := "/api/v1/ws/bar"
	var hitsBase int
	var hitsBaseA int
	app.Get(base, func(c fiber.Ctx) error {
		hitsBase++
		return c.SendString("base")
	})
	app.Get(base+"/a", func(c fiber.Ctx) error {
		hitsBaseA++
		return c.SendString("base-a")
	})

	// Use different user IDs to differentiate cache entries (via custom header to avoid Authorization issues)
	authA := "UserA"
	authB := "UserB"

	// Helper to create request with X-User-ID header
	makeUserReq := func(method, path, userID string) *http.Request {
		req := httptest.NewRequest(method, path, nil)
		if userID != "" {
			req.Header.Set("X-User-Id", userID)
		}
		return req
	}

	// Warm caches for A and B (first requests compute and cache)
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"?user=A", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"/a?user=A", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"?user=B", authB)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"/a?user=B", authB)); err != nil {
		t.Fatal(err)
	}

	// Second requests should be served from cache (no additional hits)
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"?user=A", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"/a?user=A", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"?user=B", authB)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"/a?user=B", authB)); err != nil {
		t.Fatal(err)
	}
	if hitsBase != 2 {
		t.Fatalf("expected hitsBase to be 2 after warm-and-cache, got %d", hitsBase)
	}
	if hitsBaseA != 2 {
		t.Fatalf("expected hitsBaseA to be 2 after warm-and-cache, got %d", hitsBaseA)
	}

	// Invalidate prefix for all users
	app.Post("/invalidate/prefix/all", func(c fiber.Ctx) error {
		if err := cache.InvalidatePathPrefixForAllUsers(storage, base); err != nil {
			return fiber.NewError(500, err.Error())
		}
		return c.SendStatus(204)
	})
	if _, err := app.Test(makeUserReq(http.MethodPost, "/invalidate/prefix/all", authA)); err != nil {
		t.Fatal(err)
	}

	// After invalidation, both A and B should be recomputed
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"?user=A", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"/a?user=A", authA)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"?user=B", authB)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(makeUserReq(http.MethodGet, base+"/a?user=B", authB)); err != nil {
		t.Fatal(err)
	}

	// Warmed once per user initially (2 hits), then invalidation for all triggers recomputation for both users (+2)
	if hitsBase != 4 {
		t.Fatalf("expected hitsBase to be 4 after all-users invalidation, got %d", hitsBase)
	}
	if hitsBaseA != 4 {
		t.Fatalf("expected hitsBaseA to be 4 after all-users invalidation, got %d", hitsBaseA)
	}
}
