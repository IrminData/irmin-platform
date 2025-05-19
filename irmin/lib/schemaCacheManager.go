package lib

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
	"sync"
)

// SchemaCacheManager manages schema caching for both connections and objects.
type SchemaCacheManager struct {
	connectionMutex sync.Map
	objectMutex     sync.Map
	env             *utils.CoreAPIEnv
	logger          *slog.Logger
	db              *db.Database
}

// NewSchemaCacheManager creates a new SchemaCacheManager instance.
func NewSchemaCacheManager(env *utils.CoreAPIEnv, logger *slog.Logger, db *db.Database) *SchemaCacheManager {
	return &SchemaCacheManager{
		env:    env,
		logger: logger,
		db:     db,
	}
}

// GetConnectionMutex returns the mutex for a connection schema cache entry.
func (m *SchemaCacheManager) GetConnectionMutex(key string) (bool, func()) {
	_, loaded := m.connectionMutex.LoadOrStore(key, true)
	return !loaded, func() { m.connectionMutex.Delete(key) }
}

// GetObjectMutex returns the mutex for an object schema cache entry.
func (m *SchemaCacheManager) GetObjectMutex(key string) (bool, func()) {
	_, loaded := m.objectMutex.LoadOrStore(key, true)
	return !loaded, func() { m.objectMutex.Delete(key) }
}
