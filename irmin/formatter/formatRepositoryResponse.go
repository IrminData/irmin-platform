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

	// Get the sqid of the user who owns the repository
	ownerSqid, err := utils.EncodeSqids("users", uint64(repository.OwnerID))
	if err != nil {
		return nil, fmt.Errorf("error encoding repository owner sqid: %w", err)
	}

	// Get the sqid of the workspace the repository belongs to
	workspaceSqid, err := utils.EncodeSqids("workspaces", uint64(repository.WorkspaceID))
	if err != nil {
		return nil, fmt.Errorf("error encoding repository workspace sqid: %w", err)
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
		WorkspaceID:            workspaceSqid,
		OwnerID:                ownerSqid,
		GarbageCollectionRules: dataEngineRepository.GarbageCollectionRules,
		CreatedAt:              repository.CreatedAt,
		UpdatedAt:              repository.UpdatedAt,
	}

	return repositoryResponse, nil
}
