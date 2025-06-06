package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatRepositoryObjectResponse formats a repository object to an Irmin object.
func FormatRepositoryObjectResponse(
	object *db.RepositoryObject,
	sqidManager *utils.SQIDManager,
) (*irminmodels.Object, error) {
	// Format the children objects.
	children := make([]irminmodels.Object, len(object.Children))
	for i, child := range object.Children {
		childObject, err := FormatRepositoryObjectResponse(&child, sqidManager)
		if err != nil {
			return nil, err
		}
		children[i] = *childObject
	}

	// Construct the sqid of the object
	objectSqid, err := sqidManager.Encode("repository_objects", uint64(object.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding object sqid: %w", err)
	}

	// Format the object.
	objectResponse := irminmodels.Object{
		ID:                    objectSqid,
		Name:                  object.Name,
		Path:                  object.Path,
		Type:                  object.Type,
		ContentType:           object.ContentType,
		PhysicalAddress:       object.PhysicalAddress,
		PhysicalAddressExpiry: object.PhysicalAddressExpiry,
		SizeBytes:             object.SizeBytes,
		LastModified:          object.LastModified,
		Metadata:              object.Metadata,
		Children:              children,
	}

	return &objectResponse, nil
}
