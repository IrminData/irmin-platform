package lib

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// SaveObject creates or updates an object in the database based on the object from the data engine, ref and repositoryID.
// It returns the object from the database.
func SaveObject(
	d *db.Database,
	object *irminmodels.Object,
	ref string,
	repositoryID uint,
) (*db.RepositoryObject, error) {
	// Get the flat objects from the database.
	flatObjects, flatObjectsErr := d.GetFlatDBObjects(repositoryID, ref)
	if flatObjectsErr != nil {
		return nil, fmt.Errorf("error getting flat objects from database: %w", flatObjectsErr)
	}

	// Process the object.
	repositoryObject, processErr := processEngineObject(d, object, flatObjects, ref, repositoryID, nil)
	if processErr != nil {
		return nil, fmt.Errorf("error processing object: %w", processErr)
	}

	return repositoryObject, nil
}
