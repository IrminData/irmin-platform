package permissions

import (
	"sync"
	"time"
)

const (
	// DefaultCacheSize is the maximum number of entries allowed in the permission cache.
	DefaultCacheSize = 10000

	// OwnerPermissionCacheTTL is how long to cache permissions for workspace owners.
	OwnerPermissionCacheTTL = 10 * time.Minute

	// DefaultPermissionCacheTTL is the default TTL for cached permissions.
	DefaultPermissionCacheTTL = 5 * time.Minute

	// CleanupInterval defines how often to clean expired entries.
	CleanupInterval = 1 * time.Minute
)

// CacheEntry represents a cached permission result.
type CacheEntry struct {
	Allowed   bool
	ExpiresAt time.Time
	Key       string // Store key for easier cleanup
}

// cacheNode represents a node in the doubly-linked list for LRU tracking.
type cacheNode struct {
	entry *CacheEntry
	prev  *cacheNode
	next  *cacheNode
}

// Cache provides thread-safe LRU caching with TTL for permission results.
type Cache struct {
	mu          sync.RWMutex
	cache       map[string]*cacheNode
	maxSize     int
	head        *cacheNode // Most recently used
	tail        *cacheNode // Least recently used
	lastCleanup time.Time
}

// NewCache creates a new LRU permission cache with TTL.
func NewCache() *Cache {
	// Create dummy head and tail nodes for the doubly-linked list
	head := &cacheNode{}
	tail := &cacheNode{}
	head.next = tail
	tail.prev = head

	return &Cache{
		cache:       make(map[string]*cacheNode),
		maxSize:     DefaultCacheSize,
		head:        head,
		tail:        tail,
		lastCleanup: time.Now(),
	}
}

// Get retrieves a cached permission result and updates its position in LRU order.
func (pc *Cache) Get(key string) (bool, bool) {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	// Check for periodic cleanup
	pc.cleanupIfNeeded()

	node, exists := pc.cache[key]
	if !exists {
		return false, false
	}

	// Check if entry is expired
	if time.Now().After(node.entry.ExpiresAt) {
		pc.removeNodeUnsafe(node)
		delete(pc.cache, key)
		return false, false
	}

	// Move to front (most recently used)
	pc.moveToFrontUnsafe(node)
	return node.entry.Allowed, true
}

// Set stores a permission result in cache with LRU eviction if necessary.
func (pc *Cache) Set(key string, allowed bool, ttl time.Duration) {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	// Check for periodic cleanup
	pc.cleanupIfNeeded()

	// If key already exists, update it
	if node, exists := pc.cache[key]; exists {
		node.entry.Allowed = allowed
		node.entry.ExpiresAt = time.Now().Add(ttl)
		pc.moveToFrontUnsafe(node)
		return
	}

	// Create new entry
	entry := &CacheEntry{
		Allowed:   allowed,
		ExpiresAt: time.Now().Add(ttl),
		Key:       key,
	}

	// If cache is full, remove LRU entry
	if len(pc.cache) >= pc.maxSize {
		pc.evictLRUUnsafe()
	}

	// Add new entry to front
	node := &cacheNode{entry: entry}
	pc.cache[key] = node
	pc.addToFrontUnsafe(node)
}

// cleanupIfNeeded performs cleanup if enough time has passed since last cleanup.
func (pc *Cache) cleanupIfNeeded() {
	now := time.Now()
	if now.Sub(pc.lastCleanup) >= CleanupInterval {
		pc.cleanExpiredEntriesUnsafe()
		pc.lastCleanup = now
	}
}

// cleanExpiredEntriesUnsafe removes all expired entries (must be called with write lock).
func (pc *Cache) cleanExpiredEntriesUnsafe() {
	now := time.Now()

	// Traverse from tail (oldest) to head to remove expired entries
	current := pc.tail.prev
	for current != pc.head {
		prev := current.prev // Store previous before potential removal

		if now.After(current.entry.ExpiresAt) {
			delete(pc.cache, current.entry.Key)
			pc.removeNodeUnsafe(current)
		}

		current = prev
	}
}

// evictLRUUnsafe removes the least recently used entry (must be called with write lock).
func (pc *Cache) evictLRUUnsafe() {
	if pc.tail.prev == pc.head {
		return // Empty cache
	}

	lru := pc.tail.prev
	delete(pc.cache, lru.entry.Key)
	pc.removeNodeUnsafe(lru)
}

// moveToFrontUnsafe moves a node to the front of the list (must be called with write lock).
func (pc *Cache) moveToFrontUnsafe(node *cacheNode) {
	pc.removeNodeUnsafe(node)
	pc.addToFrontUnsafe(node)
}

// addToFrontUnsafe adds a node to the front of the list (must be called with write lock).
func (pc *Cache) addToFrontUnsafe(node *cacheNode) {
	node.prev = pc.head
	node.next = pc.head.next
	pc.head.next.prev = node
	pc.head.next = node
}

// removeNodeUnsafe removes a node from the list (must be called with write lock).
func (pc *Cache) removeNodeUnsafe(node *cacheNode) {
	node.prev.next = node.next
	node.next.prev = node.prev
}

// Clear removes expired entries from cache.
func (pc *Cache) Clear() {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	pc.cleanExpiredEntriesUnsafe()
}

// Size returns the current number of entries in the cache.
func (pc *Cache) Size() int {
	pc.mu.RLock()
	defer pc.mu.RUnlock()
	return len(pc.cache)
}

// Stats returns cache statistics for monitoring.
type Stats struct {
	Size        int
	MaxSize     int
	LastCleanup time.Time
}

// GetStats returns current cache statistics.
func (pc *Cache) GetStats() Stats {
	pc.mu.RLock()
	defer pc.mu.RUnlock()

	return Stats{
		Size:        len(pc.cache),
		MaxSize:     pc.maxSize,
		LastCleanup: pc.lastCleanup,
	}
}
