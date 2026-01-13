package formatter

import (
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatRepositoryObjectResponse formats a repository object to an Irmin object.
func FormatRepositoryObjectResponse(
	object *db.RepositoryObject,
	sqidManager *irminsqids.SQIDManager,
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

	// Format the object tags
	tags, err := FormatTagsResponse(object.Tags, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting object tags: %w", err)
	}

	// Construct the sqid of the object
	objectSqid, err := sqidManager.Encode("repository_objects", uint64(object.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding object sqid: %w", err)
	}

	// Get repository slug with defensive check
	repositorySlug := ""
	if object.Repository != nil {
		repositorySlug = object.Repository.Slug
	}

	// Build pointer target if this is a pointer object
	var pointerTarget *irminmodels.PointerTarget
	if object.IsPointer {
		pointerTarget = &irminmodels.PointerTarget{
			Workspace:  object.PointerTargetWorkspace,
			Repository: object.PointerTargetRepository,
			Path:       object.PointerTargetPath,
			Ref:        object.PointerTargetRef,
		}
	}

	// Format the object.
	objectResponse := irminmodels.Object{
		ID:                    objectSqid,
		Name:                  object.Name,
		Path:                  object.Path,
		RepositorySlug:        repositorySlug,
		Ref:                   object.RepositoryRef,
		Type:                  object.Type,
		ContentType:           object.ContentType,
		PhysicalAddress:       object.PhysicalAddress,
		PhysicalAddressExpiry: object.PhysicalAddressExpiry,
		SizeBytes:             object.SizeBytes,
		LastModified:          object.LastModified,
		Metadata:              object.Metadata,
		SQLSelector:           object.SQLSelector,
		S3PathSelector:        object.S3PathSelector,
		Tags:                  tags,
		Children:              children,
		IsPointer:             object.IsPointer,
		PointerTarget:         pointerTarget,
	}

	return &objectResponse, nil
}
