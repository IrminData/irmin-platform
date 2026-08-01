package lib

import (
	"context"
	"irmin-api/db"
	repositoryObjectCache "irmin-api/lib/repository-object-cache"
	"irmin-api/utils"
	"log/slog"
	"strings"
)

// GetObject gets an object from the data engine and caches it in the database.
// It returns the object from the database if it is found, otherwise it gets it from the data engine and caches it in the database.
func GetObject(
	ctx context.Context,
	locale string,
	d *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	workspace *db.Workspace,
	repository *db.Repository,
	path, ref string,
	ignoreCache bool,
) (*db.RepositoryObject, error) {
	// Create cache manager
	cacheManager := repositoryObjectCache.NewManager(d, logger, env)

	// Trim the first slash from the path.
	path = strings.TrimPrefix(path, "/")

	// Check if the object is in the cache.
	repositoryObjectDB, err := d.FindObject(&path, &repository.ID, &ref)
	if err != nil {
		logger.WarnContext(ctx, "Error finding object in cache", "error", err)
	}

	// Check if we need to refresh the cache
	if cacheManager.ShouldRefreshCache(repositoryObjectDB, ignoreCache) {
		refreshedObject, refreshErr := cacheManager.RefreshObjectFromDataEngine(
			ctx, locale, workspace, repository, path, ref, repositoryObjectDB,
		)
		if refreshErr != nil {
			return nil, refreshErr
		}
		repositoryObjectDB = refreshedObject
	}

	return repositoryObjectDB, nil
}
