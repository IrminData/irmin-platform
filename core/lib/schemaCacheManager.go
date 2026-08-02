package lib

import (
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
)

// SchemaCacheManager manages schema caching for both connections and objects.
type SchemaCacheManager struct {
	env    *utils.CoreAPIEnv
	logger *slog.Logger
	db     *db.Database
}

// NewSchemaCacheManager creates a new SchemaCacheManager instance.
func NewSchemaCacheManager(env *utils.CoreAPIEnv, logger *slog.Logger, db *db.Database) *SchemaCacheManager {
	return &SchemaCacheManager{
		env:    env,
		logger: logger,
		db:     db,
	}
}
