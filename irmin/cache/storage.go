package cache

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/storage/memory/v2"
)

// NewDefaultStorage returns the default cache storage implementation.
// Currently uses in-memory storage; can be swapped to Redis, Memcached, etc.
func NewDefaultStorage() fiber.Storage {
	return memory.New()
}
