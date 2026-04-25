package repositoryobjectcache

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"
	"log/slog"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	objectCacheMaxAge = 1 * time.Hour
)

// Manager handles repository object caching operations
type Manager struct {
	db     *db.Database
	logger *slog.Logger
	env    *utils.CoreAPIEnv
}

// NewManager creates a new cache manager instance
func NewManager(database *db.Database, logger *slog.Logger, env *utils.CoreAPIEnv) *Manager {
	return &Manager{
		db:     database,
		logger: logger,
		env:    env,
	}
}

// ProcessEngineObject processes an object from the data engine and saves it to the database.
// It returns the object from the database if it is found, otherwise it gets it from the data engine and caches it in the database.
func (m *Manager) ProcessEngineObject(
	object *irminmodels.Object,
	flatObjects []db.RepositoryObject,
	ref string,
	repositoryID uint,
	parentPath *string,
	parentID *uint,
) (*db.RepositoryObject, error) {
	// Normalize and canonicalize object
	normalizedPath, normalizedName := m.normalizeEngineObject(object)

	// Build DB object
	repositoryObject := m.buildRepositoryObject(object, ref, repositoryID, parentID)

	// Check if such object already exists in the database using the flat objects.
	existingObjectFound := m.findExistingObject(flatObjects, object.Path, repositoryObject)

	// Handle parent object relationships
	// Skip parent assignment for root objects (they should have parent_id=null)
	isRootObject := m.isRootObject(normalizedPath, normalizedName)

	if parentPath != nil && !isRootObject {
		if setParentErr := m.setParentFromPath(repositoryObject, *parentPath, repositoryID, ref, &flatObjects); setParentErr != nil {
			return nil, fmt.Errorf("error setting parent from path: %w", setParentErr)
		}
	}

	// Save the object to the database only if it's new or needs updating.
	// CRITICAL: Must pass pointer to GORM so it can update auto-generated fields like ID
	if err := m.saveOrUpdateRepositoryObject(repositoryObject, existingObjectFound, parentID != nil, &flatObjects); err != nil {
		return nil, err
	}

	// Verify that ID was properly set by GORM (especially important for new objects)
	if repositoryObject.ID == 0 {
		return nil, errors.New(
			"failed to get valid ID after saving object to database - this would break parent-child relationships",
		)
	}

	// Load only the Repository relationship without overwriting the object.
	if err := m.db.Model(repositoryObject).Association("Repository").Find(&repositoryObject.Repository); err != nil {
		return nil, fmt.Errorf("error loading repository relationship: %w", err)
	}

	// Process the children objects if the object processed is a directory.
	// First, sync cache with data engine to remove stale objects
	children, childrenErr := m.processObjectChildren(object, flatObjects, ref, repositoryID, repositoryObject)
	if childrenErr != nil {
		return nil, childrenErr
	}
	repositoryObject.Children = children

	// Load Tags for the object to ensure tags are available in responses
	if err := m.db.Model(repositoryObject).Association("Tags").Find(&repositoryObject.Tags); err != nil {
		return nil, fmt.Errorf("error loading object tags: %w", err)
	}

	// Load Tags for all children to ensure tags are available in responses
	for i := range repositoryObject.Children {
		if err := m.db.Model(&repositoryObject.Children[i]).Association("Tags").Find(&repositoryObject.Children[i].Tags); err != nil {
			return nil, fmt.Errorf("error loading child object tags: %w", err)
		}
	}

	return repositoryObject, nil
}

// ShouldRefreshCache determines if the cache needs to be refreshed
func (m *Manager) ShouldRefreshCache(repositoryObjectDB *db.RepositoryObject, ignoreCache bool) bool {
	if ignoreCache {
		return true
	}
	if repositoryObjectDB == nil {
		return true
	}
	objectCacheLastModified := time.Now().Add(-objectCacheMaxAge)
	return repositoryObjectDB.UpdatedAt.Before(objectCacheLastModified)
}

// RefreshObjectFromDataEngine fetches the object from data engine and updates cache
func (m *Manager) RefreshObjectFromDataEngine(
	ctx context.Context,
	locale string,
	workspace *db.Workspace,
	repository *db.Repository,
	path, ref string,
	existingObject *db.RepositoryObject,
) (*db.RepositoryObject, error) {
	// Initialize Data Engine client
	dataEngine, initErr := engine.NewClient(ctx, m.logger, m.env, m.db)
	if initErr != nil {
		return nil, fmt.Errorf("error creating data engine client: %w", initErr)
	}

	// Get the object from the data engine
	engineObject, getErr := dataEngine.GetPath(workspace.Slug, repository.Slug, path, ref)
	if getErr != nil {
		// Handle object not found in data engine
		return nil, m.handleObjectNotFound(ctx, path, ref, repository.ID, existingObject, getErr)
	}

	// Get parent path and flat objects
	parentPath := m.deriveParentPathFromRawPath(path)

	flatObjects, flatObjectsErr := m.db.GetFlatDBObjects(repository.ID, ref)
	if flatObjectsErr != nil {
		m.logger.ErrorContext(ctx, "Error getting flat objects from database", "error", flatObjectsErr)
	}

	// Process the object
	processedObject, processErr := m.ProcessEngineObject(
		engineObject, flatObjects, ref, repository.ID, parentPath, nil,
	)
	if processErr != nil {
		return nil, fmt.Errorf("error processing object: %w", processErr)
	}

	return processedObject, nil
}
