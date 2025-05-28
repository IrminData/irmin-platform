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

// refreshRepositoryFromDataEngine attempts to refresh the repository data from the data engine.
func refreshRepositoryFromDataEngine(
	ctx context.Context,
	dataEngineRepository *engine.Repository,
	repository *db.Repository,
	d *db.Database,
	logger *slog.Logger,
) {
	// Update the repository in the database if it was found in the data engine.
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
				logger.ErrorContext(ctx, "Error saving repository to database", "error", saveErr)
			}
		}()
	}
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
		logger.InfoContext(
			ctx,
			"Repository not found in cache, refreshing from the data engine",
			"repository",
			repositorySlug,
		)

		// Initialize Data Engine client
		dataEngine, createClientErr := engine.NewClient(ctx, locale, logger, env)
		if createClientErr != nil {
			logger.ErrorContext(ctx, "error creating data engine client", "error", createClientErr)
			return nil, fmt.Errorf("error creating data engine client: %w", createClientErr)
		}

		// Get the repository from the data engine.
		dataEngineRepository, getRepositoryErr := dataEngine.GetRepository(ctx, workspace.Slug, repositorySlug)
		if getRepositoryErr != nil {
			logger.ErrorContext(ctx, "Error retrieving repository from Data Engine", "error", getRepositoryErr)
			return nil, fmt.Errorf("error retrieving repository from Data Engine: %w", getRepositoryErr)
		}

		// Refresh the repository in the database
		refreshRepositoryFromDataEngine(ctx, dataEngineRepository, repository, d, logger)
	}

	return repository, nil
}
