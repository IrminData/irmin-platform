package lib

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"
	"log/slog"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	objectCacheMaxAge = 1 * time.Hour
)

// processEngineObject processes an object from the data engine and saves it to the database.
// It returns the object from the database if it is found, otherwise it gets it from the data engine and caches it in the database.
func processEngineObject(
	d *db.Database,
	object *irminmodels.Object,
	flatObjects []db.RepositoryObject,
	ref string,
	repositoryID uint,
	parentID *uint,
) (*db.RepositoryObject, error) {
	// Trim the first slash from the path.
	object.Path = strings.TrimPrefix(object.Path, "/")

	// Format the object based on the available data.
	repositoryObject := &db.RepositoryObject{
		Name:                  object.Name,
		Path:                  object.Path,
		Type:                  object.Type,
		ContentType:           object.ContentType,
		PhysicalAddress:       object.PhysicalAddress,
		PhysicalAddressExpiry: object.PhysicalAddressExpiry,
		SizeBytes:             object.SizeBytes,
		LastModified:          object.LastModified,
		Metadata:              object.Metadata,
		RepositoryRef:         ref,
		RepositoryID:          repositoryID,
		ParentID:              parentID,
	}

	// Check if such object already exists in the database using the flat objects.
	for _, flatObject := range flatObjects {
		if flatObject.Path == object.Path {
			repositoryObject.ID = flatObject.ID
			repositoryObject.ParentID = flatObject.ParentID
			break
		}
	}

	// Save the object to the database.
	// CRITICAL: Must pass pointer to GORM so it can update auto-generated fields like ID
	if err := d.Save(repositoryObject).Error; err != nil {
		return nil, fmt.Errorf("error saving object to database: %w", err)
	}

	// Verify that ID was properly set by GORM (especially important for new objects)
	if repositoryObject.ID == 0 {
		return nil, errors.New(
			"failed to get valid ID after saving object to database - this would break parent-child relationships",
		)
	}

	// Load only the Repository relationship without overwriting the object.
	if err := d.Model(repositoryObject).Association("Repository").Find(&repositoryObject.Repository); err != nil {
		return nil, fmt.Errorf("error loading repository relationship: %w", err)
	}

	// Process the children objects.
	children := make([]db.RepositoryObject, len(object.Children))
	for i, child := range object.Children {
		childObject, err := processEngineObject(d, &child, flatObjects, ref, repositoryID, &repositoryObject.ID)
		if err != nil {
			return nil, fmt.Errorf("error processing child object: %w", err)
		}
		children[i] = *childObject
	}
	repositoryObject.Children = children

	return repositoryObject, nil
}

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
	// Trim the first slash from the path.
	path = strings.TrimPrefix(path, "/")

	// Initialize Data Engine client
	dataEngine, initErr := engine.NewClient(ctx, locale, logger, env)
	if initErr != nil {
		return nil, fmt.Errorf("error creating data engine client: %w", initErr)
	}

	// Check if the object is in the cache.
	repositoryObjectDB, err := d.FindObject(&path, &repository.ID, &ref)
	if err != nil {
		logger.WarnContext(ctx, "Error finding object in cache", "error", err)
	}

	// If the object is not found in the cache, or the cache is stale, get it from the data engine.
	objectCacheLastModified := time.Now().Add(-objectCacheMaxAge)
	if repositoryObjectDB == nil || repositoryObjectDB.UpdatedAt.Before(objectCacheLastModified) || ignoreCache {
		// Get the object from the data engine.
		engineObject, getErr := dataEngine.GetPath(workspace.Slug, repository.Slug, path, ref)
		if getErr != nil {
			return nil, fmt.Errorf("error getting object from data engine: %w", getErr)
		}

		// Get the flat objects from the database.
		flatObjects, flatObjectsErr := d.GetFlatDBObjects(repository.ID, ref)
		if flatObjectsErr != nil {
			logger.ErrorContext(ctx, "Error getting flat objects from database", "error", flatObjectsErr)
		}

		// Process the root object.
		var processErr error
		repositoryObjectDB, processErr = processEngineObject(d, engineObject, flatObjects, ref, repository.ID, nil)
		if processErr != nil {
			return nil, fmt.Errorf("error processing root object: %w", processErr)
		}
	}

	return repositoryObjectDB, nil
}
