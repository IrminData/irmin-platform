package lib

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"
	"log/slog"
	"time"
)

const (
	repositoryCacheMaxAge = 24 * time.Hour
)

// refreshRepositoryFromDataEngine attempts to refresh the repository data from the data engine
// and updates the cache if successful.
func refreshRepositoryFromDataEngine(
	ctx context.Context,
	repository *db.Repository,
	workspace *db.Workspace,
	repositorySlug string,
	locale string,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	d *db.Database,
) error {
	logger.InfoContext(
		ctx,
		"Repository not found in cache, refreshing from the data engine",
		"repository",
		repositorySlug,
	)

	// Initialize Data Engine client
	dataEngine, err := engine.NewClient(ctx, locale, logger, env)
	if err != nil {
		logger.ErrorContext(ctx, "error creating data engine client", "error", err)
		return fmt.Errorf("error creating data engine client: %w", err)
	}

	// Get the repository from the data engine.
	dataEngineRepository, err := dataEngine.GetRepository(ctx, workspace.Slug, repositorySlug)
	if err != nil {
		logger.ErrorContext(ctx, "Error retrieving repository from Data Engine", "error", err)
		return err
	}

	// Update the repository in the cache if it was found in the data engine.
	if dataEngineRepository != nil {
		repository.LakeFSRepoID = dataEngineRepository.ID
		repository.GarbageCollectionRules = dataEngineRepository.GarbageCollectionRules
		repository.IsImmutable = dataEngineRepository.IsImmutable
		repository.DefaultBranch = dataEngineRepository.DefaultBranch
		repository.StorageNamespace = dataEngineRepository.StorageNamespace

		// Save the repository to the database in a go routine
		go func() {
			saveErr := d.Save(&repository).Error
			if saveErr != nil {
				logger.ErrorContext(ctx, "Error saving repository to database", "error", err)
			}
		}()
	}

	return nil
}

func GetRepository(
	ctx context.Context,
	locale string,
	d *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	workspace *db.Workspace,
	repositorySlug string,
	ignoreCache bool,
) (*db.Repository, error) {
	// Get the repository by its slug and workspace ID.
	repository, err := d.GetRepositoryBySlugAndWorkspaceID(repositorySlug, workspace.ID)
	if err != nil {
		logger.ErrorContext(ctx, "Error retrieving repository", "error", err)
		return nil, fmt.Errorf("error retrieving repository: %w", err)
	}

	// Make sure that the repository has been found
	if repository == nil {
		return nil, errors.New("repository not found")
	}

	// If the repository is not found in the cache, or the cache is stale, get it from the data engine.
	repositoryCacheLastModified := time.Now().Add(-repositoryCacheMaxAge)
	if repository.UpdatedAt.Before(repositoryCacheLastModified) || ignoreCache {
		if refreshRepositoryErr := refreshRepositoryFromDataEngine(ctx, repository, workspace, repositorySlug, locale, logger, env, d); refreshRepositoryErr != nil {
			// Log the error but continue with the cached repository
			logger.ErrorContext(ctx, "Failed to refresh repository from data engine", "error", refreshRepositoryErr)
		}
	}

	return repository, nil
}
