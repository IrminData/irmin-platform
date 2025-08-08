package cache

import (
	"bytes"
	"fmt"
	"slices"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// BuildKeyFromParts builds a cache key compatible with the cache middleware key generator
// using an explicit path, query parameters, and authorization header value.
func BuildKeyFromParts(path string, queryParams map[string]string, authorization string) string {
	var keys []string
	for key := range queryParams {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	query := ""
	for _, key := range keys {
		value := queryParams[key]
		if query == "" {
			query = fmt.Sprintf("%s=%s", key, value)
		} else {
			query += fmt.Sprintf("&%s=%s", key, value)
		}
	}
	return path + query + authorization
}

// InvalidateKey deletes a specific cache entry key from storage.
func InvalidateKey(storage fiber.Storage, key string) error {
	// Delete exact key and any Fiber cache variants (method and body suffixes)
	var firstErr error
	deleteOne := func(k string) {
		if err := storage.Delete(k); err != nil && firstErr == nil {
			firstErr = err
		}
		// Delete external storage body variant if present
		if err := storage.Delete(k + "_body"); err != nil && firstErr == nil {
			// ignore if not present; keep the first actual error if any
			firstErr = err
		}
	}
	deleteOne(key)
	for _, m := range []string{"GET", "HEAD", "OPTIONS"} {
		deleteOne(key + "_" + m)
	}
	return firstErr
}

// InvalidatePathForCurrentUser computes the cache key for the given path and query using
// the current request's Authorization header, and deletes it from storage.
func InvalidatePathForCurrentUser(
	c fiber.Ctx,
	storage fiber.Storage,
	path string,
	queryParams map[string]string,
) error {
	auth := c.Get("authorization")
	key := BuildKeyFromParts(path, queryParams, auth)
	return InvalidateKey(storage, key)
}

// InvalidatePathsForCurrentUser invalidates multiple paths for the current request's user.
// Returns the first error encountered, if any.
func InvalidatePathsForCurrentUser(c fiber.Ctx, storage fiber.Storage, paths []string) error {
	for _, p := range paths {
		if err := InvalidatePathForCurrentUser(c, storage, p, map[string]string{}); err != nil {
			return err
		}
	}
	return nil
}

// TrackKeyForRequest indexes a generated cache key by all path prefixes for fast prefix invalidation later.
// Keys are indexed per-authorization to avoid cross-tenant invalidations.
func TrackKeyForRequest(c fiber.Ctx, storage fiber.Storage, key string) {
	auth := c.Get("authorization")
	path := c.Path()
	// Track the exact storage key used by Fiber cache (includes method suffix)
	keyWithMethod := key + "_" + c.Method()
	TrackKeyForPath(storage, auth, path, keyWithMethod)
}

// InvalidatePathPrefixForCurrentUser invalidates all cached entries under the given path prefix
// for the current request's Authorization header, including all subpaths and query variations.
func InvalidatePathPrefixForCurrentUser(c fiber.Ctx, storage fiber.Storage, pathPrefix string) error {
	auth := c.Get("authorization")
	indexKey := BuildIndexKey(auth, pathPrefix)
	raw, err := storage.Get(indexKey)
	if err != nil || len(raw) == 0 {
		return err
	}
	keys := bytes.Split(bytes.TrimSpace(raw), []byte("\n"))
	// Delete all keys referenced by this index (including body variants)
	for _, key := range keys {
		k := string(key)
		_ = InvalidateKey(storage, k)
	}
	// Clear the index entry itself
	_ = storage.Delete(indexKey)
	return nil
}

// Internal helpers

func BuildIndexKey(authorization string, pathPrefix string) string {
	return "idx:" + authorization + ":" + pathPrefix
}

func BuildAllIndexKey(pathPrefix string) string {
	return "idx:all:" + pathPrefix
}

func TrackKeyForPath(storage fiber.Storage, authorization string, path string, key string) {
	// Generate all path prefixes for hierarchical invalidation
	for _, prefix := range PathPrefixes(path) {
		// Upsert into per-authorization index and global index
		UpsertIndexEntry(storage, BuildIndexKey(authorization, prefix), key)
		UpsertIndexEntry(storage, BuildAllIndexKey(prefix), key)
	}
}

func PathPrefixes(path string) []string {
	// Normalize and build cumulative prefixes: /a/b/c -> [/a, /a/b, /a/b/c]
	if path == "" || path == "/" {
		return []string{"/"}
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	prefixes := make([]string, 0, len(parts))
	current := ""
	for _, p := range parts {
		current += "/" + p
		prefixes = append(prefixes, current)
	}
	return prefixes
}

func UpsertIndexEntry(storage fiber.Storage, indexKey string, key string) {
	existing, _ := storage.Get(indexKey)
	if len(existing) == 0 {
		_ = storage.Set(indexKey, []byte(key), 0)
		return
	}
	list := strings.Split(string(existing), "\n")
	if slices.Contains(list, key) {
		return
	}
	_ = storage.Set(indexKey, append(existing, []byte("\n"+key)...), 0)
}

// InvalidatePathPrefixForAllUsers invalidates all cached entries under the given path prefix
// regardless of Authorization header.
func InvalidatePathPrefixForAllUsers(storage fiber.Storage, pathPrefix string) error {
	indexKey := BuildAllIndexKey(pathPrefix)
	raw, err := storage.Get(indexKey)
	if err != nil || len(raw) == 0 {
		return err
	}
	keys := bytes.Split(bytes.TrimSpace(raw), []byte("\n"))
	for _, key := range keys {
		k := string(key)
		_ = InvalidateKey(storage, k)
	}
	_ = storage.Delete(indexKey)
	return nil
}
