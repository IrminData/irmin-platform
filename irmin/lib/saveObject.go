package lib

import (
	"fmt"
	"irmin-api/db"
	repositoryObjectCache "irmin-api/lib/repository-object-cache"
	"irmin-api/utils"
	"log/slog"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
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
	// Create cache manager
	cacheManager := repositoryObjectCache.NewManager(d, logger, env)

	// Get the flat objects from the database.
	flatObjects, flatObjectsErr := d.GetFlatDBObjects(repositoryID, ref)
	if flatObjectsErr != nil {
		return nil, fmt.Errorf("error getting flat objects from database: %w", flatObjectsErr)
	}

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
		return nil, fmt.Errorf("error processing object: %w", processErr)
	}

	return repositoryObject, nil
}
