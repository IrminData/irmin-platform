package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRepositoryResponse(repository *db.Repository, dataEngineRepository *engine.Repository) (*irminModels.Repository, error) {
	// Check if the repository is a nil pointer
	if repository == nil {
		return nil, fmt.Errorf("repository is nil")
	}

	// Get the sqid of the repository
	repositorySqid, err := utils.EncodeSqids("repositories", uint64(repository.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding repository sqid: %w", err)
	}

	// Format the repository owner
	owner, err := FormatUserResponse(repository.Owner)
	if err != nil {
		return nil, fmt.Errorf("error formatting repository owner: %w", err)
	}

	// Determine if the repository is immutable
	isImmutable := false
	if repository.IsImmutable {
		isImmutable = true
	}
	if dataEngineRepository != nil && dataEngineRepository.IsImmutable {
		isImmutable = true
	}

	// Determine the garbage collection rules
	var gcRules *irminModels.GarbageCollectionRules
	if dataEngineRepository != nil && dataEngineRepository.GarbageCollectionRules != nil {
		gcRules = &irminModels.GarbageCollectionRules{
			DefaultRetentionDays: dataEngineRepository.GarbageCollectionRules.DefaultRetentionDays,
			Branches:             dataEngineRepository.GarbageCollectionRules.Branches,
		}
	} else {
		gcRules = &irminModels.GarbageCollectionRules{
			DefaultRetentionDays: 0,
			Branches:             nil,
		}
	}

	// Create the repository response
	repositoryResponse := &irminModels.Repository{
		ID:                     repositorySqid,
		Name:                   repository.Name,
		Slug:                   repository.Slug,
		Description:            repository.Description,
		Documentation:          repository.Documentation,
		IsImmutable:            isImmutable,
		DefaultBranch:          repository.DefaultBranch,
		Owner:                  *owner,
		GarbageCollectionRules: gcRules,
		CreatedAt:              repository.CreatedAt,
		UpdatedAt:              repository.UpdatedAt,
	}

	return repositoryResponse, nil
}
