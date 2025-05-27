package formatter

import (
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// FormatRepositoryObjectResponse formats a repository object to an Irmin object.
func FormatRepositoryObjectResponse(object *db.RepositoryObject) *irminmodels.Object {
	// Format the children objects.
	children := make([]irminmodels.Object, len(object.Children))
	for i, child := range object.Children {
		children[i] = *FormatRepositoryObjectResponse(&child)
	}

	// Format the object.
	return &irminmodels.Object{
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
}
