package engine

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"strings"
	"time"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// Repository represents a returned by the data engine.
type Repository struct {
	// Repository ID
	ID string `json:"id"`
	// Name of the Repository
	Name string `json:"name"`
	// Workspace the Repository belongs to
	Workspace string `json:"workspace"`
	// Storage path of the Repository
	StorageNamespace string `json:"storage_namespace"`
	// If the Repository is immutable, it cannot be changed or updated
	IsImmutable bool `json:"is_immutable"`
	// Default branch of the Repository
	DefaultBranch string `json:"default_branch"`
	// Timestamp of the creation of the Repository
	CreatedAt string `json:"created_at"`
	// Garbage collection rules for the Repository
	GarbageCollectionRules *irminModels.GarbageCollectionRules `json:"garbage_collection_rules,omitempty"`
}

func (c *Client) ListRepositories(workspace string) ([]Repository, error) {
	// Construct repository prefix.
	lakeFSRepositoryPrefix := utils.GetLakeFSRepositoryPrefix(workspace)

	// Fetch repositories with the given prefix.
	lakefsRepositories, err := c.LakeFSClient.ListAllRepositories(lakeFSRepositoryPrefix, "")
	if err != nil {
		return nil, fmt.Errorf("failed to list repositories: %w", err)
	}

	// Convert LakeFS repositories to Irmin repositories.
	irminRepositories := make([]Repository, len(lakefsRepositories))
	for i, lakefsRepository := range lakefsRepositories {
		irminRepositories[i] = Repository{
			ID:                     lakefsRepository.ID,
			Name:                   strings.ReplaceAll(lakefsRepository.ID, lakeFSRepositoryPrefix, ""),
			Workspace:              workspace,
			StorageNamespace:       lakefsRepository.StorageNamespace,
			IsImmutable:            lakefsRepository.ReadOnly,
			DefaultBranch:          lakefsRepository.DefaultBranch,
			CreatedAt:              time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
			GarbageCollectionRules: nil,
		}
	}

	return irminRepositories, nil
}

func (c *Client) GetRepository(ctx context.Context, workspace, repository string) (*Repository, error) {

	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Run LakeFS calls concurrently.
	repoFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Repository, error) {
		return c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	})
	gcRulesFuture := utils.AsyncWithContext(ctx, func() (*lakefs.GarbageCollectionRules, error) {
		return c.LakeFSClient.GetGarbageCollectionRules(lakeFSRepositoryName)
	})

	// Get repository details.
	lakefsRepository, err := repoFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get repository details: %w", err)
	}

	// Get repository garbage collection rules.
	lakefsGarbageCollectionRules, err := gcRulesFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get repository garbage collection rules: %w", err)
	}

	// Construct repository prefix.
	lakeFSRepositoryPrefix := utils.GetLakeFSRepositoryPrefix(workspace)

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:               lakefsRepository.ID,
		Name:             strings.ReplaceAll(lakefsRepository.ID, lakeFSRepositoryPrefix, ""),
		Workspace:        workspace,
		StorageNamespace: lakefsRepository.StorageNamespace,
		IsImmutable:      lakefsRepository.ReadOnly,
		DefaultBranch:    lakefsRepository.DefaultBranch,
		CreatedAt:        time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: &irminModels.GarbageCollectionRules{
			DefaultRetentionDays: lakefsGarbageCollectionRules.DefaultRetentionDays,
			Branches: func() []irminModels.BranchGarbageCollectionRules {
				var branches []irminModels.BranchGarbageCollectionRules
				for _, branch := range lakefsGarbageCollectionRules.Branches {
					branches = append(branches, irminModels.BranchGarbageCollectionRules{
						BranchID:      branch.BranchID,
						RetentionDays: branch.RetentionDays,
					})
				}
				return branches
			}(),
		},
	}

	return &irminRepository, nil
}

func (c *Client) CreateRepository(workspace, name, defaultBranch string, isImmutable bool, gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int) (*Repository, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, name)

	// Construct repository storage namespace.
	lakeFSRepositoryStorageNamespace := utils.GetLakeFSRepositoryStorageNamespace(workspace, name)

	// Select default branch.
	if defaultBranch == "" {
		defaultBranch = "main"
	}

	// Create repository.
	repositoryCreateRequest := lakefs.RepositoryCreateRequest{
		Name:             lakeFSRepositoryName,
		StorageNamespace: lakeFSRepositoryStorageNamespace,
		DefaultBranch:    defaultBranch,
		ReadOnly:         isImmutable,
	}
	lakefsRepository, err := c.LakeFSClient.CreateRepository(false, repositoryCreateRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create repository: %w", err)
	}

	// Create garbage collection rules.
	garbageCollectionRules := lakefs.GarbageCollectionRules{}
	if *gcDefaultRetentionDays > 0 {
		garbageCollectionRules.DefaultRetentionDays = *gcDefaultRetentionDays
	}
	if *gcDefaultBranchRetentionDays > 0 {
		garbageCollectionRules.Branches = []lakefs.BranchGarbageCollectionRules{
			{
				BranchID:      defaultBranch,
				RetentionDays: *gcDefaultBranchRetentionDays,
			},
		}
	}
	if *gcDefaultBranchRetentionDays > 0 && *gcDefaultRetentionDays > 0 {
		err = c.LakeFSClient.SetGarbageCollectionRules(lakeFSRepositoryName, garbageCollectionRules)
		if err != nil {
			return nil, fmt.Errorf("failed to set garbage collection rules: %w", err)
		}
	}

	// Construct repository prefix.
	lakeFSRepositoryPrefix := utils.GetLakeFSRepositoryPrefix(workspace)

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:               lakefsRepository.ID,
		Name:             strings.ReplaceAll(lakefsRepository.ID, lakeFSRepositoryPrefix, ""),
		Workspace:        workspace,
		StorageNamespace: lakefsRepository.StorageNamespace,
		IsImmutable:      lakefsRepository.ReadOnly,
		DefaultBranch:    lakefsRepository.DefaultBranch,
		CreatedAt:        time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: &irminModels.GarbageCollectionRules{
			DefaultRetentionDays: garbageCollectionRules.DefaultRetentionDays,
			Branches: func() []irminModels.BranchGarbageCollectionRules {
				var branches []irminModels.BranchGarbageCollectionRules
				for _, branch := range garbageCollectionRules.Branches {
					branches = append(branches, irminModels.BranchGarbageCollectionRules{
						BranchID:      branch.BranchID,
						RetentionDays: branch.RetentionDays,
					})
				}
				return branches
			}(),
		},
	}

	return &irminRepository, nil
}

func (c *Client) UpdateRepository(workspace, repository string, gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int) (*Repository, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Get repository details.
	lakefsRepository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	if err != nil {
		return nil, fmt.Errorf("failed to get repository details: %w", err)
	}

	// Create garbage collection rules.
	garbageCollectionRules := lakefs.GarbageCollectionRules{}
	if *gcDefaultRetentionDays > 0 {
		garbageCollectionRules.DefaultRetentionDays = *gcDefaultRetentionDays
	}
	if *gcDefaultBranchRetentionDays > 0 {
		garbageCollectionRules.Branches = []lakefs.BranchGarbageCollectionRules{
			{
				BranchID:      lakefsRepository.DefaultBranch,
				RetentionDays: *gcDefaultBranchRetentionDays,
			},
		}
	}
	if *gcDefaultBranchRetentionDays > 0 && *gcDefaultRetentionDays > 0 {
		// Update garbage collection rules.
		err = c.LakeFSClient.SetGarbageCollectionRules(lakeFSRepositoryName, garbageCollectionRules)
		if err != nil {
			return nil, fmt.Errorf("failed to set garbage collection rules: %w", err)
		}
	} else {
		// Delete garbage collection rules.
		err = c.LakeFSClient.DeleteGarbageCollectionRules(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to delete garbage collection rules: %w", err)
		}
	}

	// Construct repository prefix.
	lakeFSRepositoryPrefix := utils.GetLakeFSRepositoryPrefix(workspace)

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:               lakefsRepository.ID,
		Name:             strings.ReplaceAll(lakefsRepository.ID, lakeFSRepositoryPrefix, ""),
		Workspace:        workspace,
		StorageNamespace: lakefsRepository.StorageNamespace,
		IsImmutable:      lakefsRepository.ReadOnly,
		DefaultBranch:    lakefsRepository.DefaultBranch,
		CreatedAt:        time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: &irminModels.GarbageCollectionRules{
			DefaultRetentionDays: garbageCollectionRules.DefaultRetentionDays,
			Branches: func() []irminModels.BranchGarbageCollectionRules {
				var branches []irminModels.BranchGarbageCollectionRules
				for _, branch := range garbageCollectionRules.Branches {
					branches = append(branches, irminModels.BranchGarbageCollectionRules{
						BranchID:      branch.BranchID,
						RetentionDays: branch.RetentionDays,
					})
				}
				return branches
			}(),
		},
	}

	return &irminRepository, nil
}

func (c *Client) DeleteRepository(ctx context.Context, workspace, repository string, keepObjects bool) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Get repository details and check if it exists.
	lakefsRepository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	if err != nil {
		return fmt.Errorf("failed to get repository details: %w", err)
	}
	if lakefsRepository == nil {
		return fmt.Errorf("repository not found")
	}

	// Delete repository.
	err = c.LakeFSClient.DeleteRepository(lakeFSRepositoryName)
	if err != nil {
		return fmt.Errorf("failed to delete repository: %w", err)
	}

	// Delete repository storage namespace if keepObjects is false
	if !keepObjects {
		// Load environment variables
		env, err := utils.LoadEnv()
		if err != nil {
			return fmt.Errorf("failed to load environment variables: %w", err)
		}
		// Create bucket client
		bucket, err := bucket.CreateBucketClient()
		if err != nil {
			return fmt.Errorf("failed to create bucket client: %w", err)
		}
		defer bucket.Close()
		// Construct the repository storage namespace
		folderPath := strings.TrimSuffix(lakefsRepository.StorageNamespace, "/")
		folderPath = strings.TrimPrefix(folderPath, "s3://")
		folderPath = fmt.Sprintf("%s/%s", env.S3Folder, folderPath)
		// Delete repository storage namespace
		err = bucket.DeletePath(ctx, folderPath)
		if err != nil {
			return fmt.Errorf("failed to delete repository storage namespace: %w", err)
		}
	}

	return nil
}
