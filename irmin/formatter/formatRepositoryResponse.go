package formatter

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRepositoryResponse(
	repository *db.Repository,
	sqidManager *utils.SQIDManager,
) (*irminmodels.Repository, error) {
	// Check if the repository is a nil pointer
	if repository == nil {
		return nil, errors.New("repository is nil")
	}

	// Get the sqid of the repository
	repositorySqid, err := sqidManager.Encode("repositories", uint64(repository.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding repository sqid: %w", err)
	}

	// Format the repository owner
	owner, err := FormatUserResponse(&repository.Owner, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting repository owner: %w", err)
	}

	// Format the repository tags
	tags, err := FormatTagsResponse(repository.Tags, sqidManager)
	if err != nil {
		return nil, fmt.Errorf("error formatting repository tags: %w", err)
	}

	// Determine if the repository is immutable
	isImmutable := repository.IsImmutable

	// Determine the garbage collection rules
	var gcRules *irminmodels.GarbageCollectionRules
	if repository.GarbageCollectionRules != nil {
		gcRules = &irminmodels.GarbageCollectionRules{
			DefaultRetentionDays: repository.GarbageCollectionRules.DefaultRetentionDays,
			Branches:             repository.GarbageCollectionRules.Branches,
		}
	} else {
		gcRules = &irminmodels.GarbageCollectionRules{
			DefaultRetentionDays: 0,
			Branches:             nil,
		}
	}

	// Create the repository response
	repositoryResponse := &irminmodels.Repository{
		ID:                     repositorySqid,
		Name:                   repository.Name,
		Slug:                   repository.Slug,
		Description:            repository.Description,
		Documentation:          repository.Documentation,
		IsImmutable:            isImmutable,
		DefaultBranch:          repository.DefaultBranch,
		Owner:                  *owner,
		Tags:                   tags,
		GarbageCollectionRules: gcRules,
		CreatedAt:              repository.CreatedAt,
		UpdatedAt:              repository.UpdatedAt,
	}

	return repositoryResponse, nil
}
