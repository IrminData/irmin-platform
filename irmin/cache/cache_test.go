package cache_test

import (
	"bytes"
	"slices"
	"strings"
	"testing"
	"time"

	"irmin-api/cache"

	"github.com/gofiber/fiber/v3"
)

func getLines(t *testing.T, s fiber.Storage, key string) []string {
	t.Helper()
	raw, err := s.Get(key)
	if err != nil || len(raw) == 0 {
		return nil
	}
	parts := bytes.Split(bytes.TrimSpace(raw), []byte("\n"))
	lines := make([]string, 0, len(parts))
	for _, p := range parts {
		lines = append(lines, string(p))
	}
	return lines
}

func TestBuildKeyFromParts_SortsQueryAndConcats(t *testing.T) {
	got := cache.BuildKeyFromParts("/p", map[string]string{"b": "2", "a": "1"}, "Bearer A")
	if got != "/pa=1&b=2Bearer A" {
		t.Fatalf("unexpected key: %s", got)
	}
}

func TestPathPrefixes(t *testing.T) {
	p := cache.PathPrefixes("/api/v1/workspaces/ws1/repositories")
	want := []string{
		"/api", "/api/v1", "/api/v1/workspaces", "/api/v1/workspaces/ws1", "/api/v1/workspaces/ws1/repositories",
	}
	if !slices.Equal(p, want) {
		t.Fatalf("unexpected prefixes: %v", p)
	}
}

func TestIndexAndInvalidate_AllUsers(t *testing.T) {
	store := cache.NewDefaultStorage()

	// Simulate two cached keys under the same prefix
	auth := "Bearer A"
	path1 := "/api/v1/workspaces/ws1/repos"
	path2 := "/api/v1/workspaces/ws1/repos/r1"
	key1 := "/api/v1/workspaces/ws1/reposBearer A"
	key2 := "/api/v1/workspaces/ws1/repos/r1Bearer A"

	// Index the keys for both per-user and all-users indices
	cache.TrackKeyForPath(store, auth, path1, key1)
	cache.TrackKeyForPath(store, auth, path2, key2)

	// Also create actual cached entries so we can assert they are deleted
	_ = store.Set(key1, []byte("v1"), 0)
	_ = store.Set(key2, []byte("v2"), 0)

	// All-users index should exist for the deepest prefix
	allIdx := cache.BuildAllIndexKey("/api/v1/workspaces/ws1/repos")
	lines := getLines(t, store, allIdx)
	if len(lines) == 0 || !strings.Contains(strings.Join(lines, ","), key1) ||
		!strings.Contains(strings.Join(lines, ","), key2) {
		t.Fatalf("all-users index missing keys: %v", lines)
	}

	// Invalidate the prefix for all users
	if err := cache.InvalidatePathPrefixForAllUsers(store, "/api/v1/workspaces/ws1/repos"); err != nil {
		t.Fatalf("invalidate all-users err: %v", err)
	}

	// Cached keys should be gone (no value)
	if b, _ := store.Get(key1); len(b) != 0 {
		t.Fatalf("key1 still present")
	}
	if b, _ := store.Get(key2); len(b) != 0 {
		t.Fatalf("key2 still present")
	}
	// Index should be gone
	if newLines := getLines(t, store, allIdx); len(newLines) != 0 {
		t.Fatalf("index still present: %v", newLines)
	}
}

func TestPerUserIndexSeparation(t *testing.T) {
	store := cache.NewDefaultStorage()

	// Track same path for two different users
	path := "/api/v1/workspaces/ws1/items"
	keyA := "/api/v1/workspaces/ws1/itemsBearer A"
	keyB := "/api/v1/workspaces/ws1/itemsBearer B"

	cache.TrackKeyForPath(store, "Bearer A", path, keyA)
	cache.TrackKeyForPath(store, "Bearer B", path, keyB)

	// Per-user indices separate
	idxA := cache.BuildIndexKey("Bearer A", "/api/v1/workspaces/ws1/items")
	idxB := cache.BuildIndexKey("Bearer B", "/api/v1/workspaces/ws1/items")

	linesA := getLines(t, store, idxA)
	linesB := getLines(t, store, idxB)

	if len(linesA) == 0 || linesA[0] != keyA {
		t.Fatalf("per-user A index wrong: %v", linesA)
	}
	if len(linesB) == 0 || linesB[0] != keyB {
		t.Fatalf("per-user B index wrong: %v", linesB)
	}

	// All-users index contains both
	allIdx := cache.BuildAllIndexKey("/api/v1/workspaces/ws1/items")
	allLines := getLines(t, store, allIdx)
	joined := strings.Join(allLines, ",")
	if !strings.Contains(joined, keyA) || !strings.Contains(joined, keyB) {
		t.Fatalf("all-users index missing entries: %v", allLines)
	}
}

func TestIndexDeduplication(t *testing.T) {
	store := cache.NewDefaultStorage()
	auth := "Bearer A"
	p := "/api/v1/workspaces/ws1/x"
	k := "/api/v1/workspaces/ws1/xBearer A"

	// Insert same key twice
	cache.TrackKeyForPath(store, auth, p, k)
	cache.TrackKeyForPath(store, auth, p, k)

	idx := cache.BuildIndexKey(auth, p)
	lines := getLines(t, store, idx)
	if len(lines) != 1 || lines[0] != k {
		t.Fatalf("expected single deduped entry, got %v", lines)
	}
}

func TestInvalidateKey(t *testing.T) {
	store := cache.NewDefaultStorage()
	k := "some-key"
	_ = store.Set(k, []byte("v"), 5*time.Second)
	if err := cache.InvalidateKey(store, k); err != nil {
		t.Fatalf("InvalidateKey err: %v", err)
	}
	if b, _ := store.Get(k); len(b) != 0 {
		t.Fatalf("key still present after InvalidateKey")
	}
}
