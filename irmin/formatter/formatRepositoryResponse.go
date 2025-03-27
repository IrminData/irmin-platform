package formatter

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func FormatRepositoryResponse(repository *db.Repository, dataEngineRepository *engine.Repository) (*irminModels.Repository, error) {
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
		GarbageCollectionRules: dataEngineRepository.GarbageCollectionRules,
		CreatedAt:              repository.CreatedAt,
		UpdatedAt:              repository.UpdatedAt,
	}

	return repositoryResponse, nil
}
