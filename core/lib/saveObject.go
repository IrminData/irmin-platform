package lib

import (
	"fmt"
	"irmin-api/db"
	repositoryObjectCache "irmin-api/lib/repository-object-cache"
	"irmin-api/utils"
	"log/slog"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
	"gorm.io/gorm"
)

// SaveObject creates or updates an object in the database based on the object from the data engine, ref and repositoryID.
// It returns the object from the database.
func SaveObject(
	d *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	object *irminmodels.Object,
	ref string,
	repositoryID uint,
) (*db.RepositoryObject, error) {
	// Get the path of the parent object based on the object's path.
	parsedObject := irminutils.ParseObjectDetailsFromPath(object.Path)

	// Update the object with the parsed details for consistency.
	object.Name = parsedObject.Name
	object.Path = parsedObject.FullPath
	object.Type = parsedObject.Type
	object.ContentType = parsedObject.ContentType

	// Determine parent path - if object is at root level, parent path should be empty string
	var parentPath *string
	if parsedObject.ParentPath != nil {
		parentPath = parsedObject.ParentPath
	} else {
		// For root-level objects, set parent path to empty string to indicate root parent needed
		emptyPath := ""
		parentPath = &emptyPath
	}

	// Create a lock key based on repository ID, ref, and object path to prevent race conditions
	lockKey := fmt.Sprintf("object_save:%d:%s:%s", repositoryID, ref, object.Path)

	// Execute the object processing within a database transaction with advisory lock
	var result *db.RepositoryObject
	transactionErr := d.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent object processing for the same object
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for object save %s at %d:%s: %w",
				object.Path,
				repositoryID,
				ref,
				lockErr,
			)
		}

		// Create cache manager with transaction
		cacheManager := repositoryObjectCache.NewManager(d, logger, env)

		// Get the flat objects from the database.
		flatObjects, flatObjectsErr := d.GetFlatDBObjects(repositoryID, ref)
		if flatObjectsErr != nil {
			return fmt.Errorf("error getting flat objects from database: %w", flatObjectsErr)
		}

		// Process the object.
		repositoryObject, processErr := cacheManager.ProcessEngineObject(
			object,
			flatObjects,
			ref,
			repositoryID,
			parentPath,
			nil,
		)
		if processErr != nil {
			return fmt.Errorf("error processing object: %w", processErr)
		}

		result = repositoryObject
		return nil
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}
