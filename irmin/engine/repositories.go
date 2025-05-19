package engine

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"os"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// Repository represents a returned by the data engine.
type Repository struct {
	// Repository ID
	ID string `json:"id"`
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
	GarbageCollectionRules *irminmodels.GarbageCollectionRules `json:"garbage_collection_rules,omitempty"`
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
	lakefsRepository, getRepositoryErr := repoFuture.Await()
	if getRepositoryErr != nil {
		return nil, fmt.Errorf("failed to get repository details: %w", getRepositoryErr)
	}

	// Get repository garbage collection rules.
	lakefsGarbageCollectionRules, getGarbageCollectionRulesErr := gcRulesFuture.Await()
	if getGarbageCollectionRulesErr != nil {
		return nil, fmt.Errorf("failed to get repository garbage collection rules: %w", getGarbageCollectionRulesErr)
	}

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:               lakefsRepository.ID,
		Workspace:        workspace,
		StorageNamespace: lakefsRepository.StorageNamespace,
		IsImmutable:      lakefsRepository.ReadOnly,
		DefaultBranch:    lakefsRepository.DefaultBranch,
		CreatedAt:        time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: &irminmodels.GarbageCollectionRules{
			DefaultRetentionDays: lakefsGarbageCollectionRules.DefaultRetentionDays,
			Branches: func() []irminmodels.BranchGarbageCollectionRules {
				var branches []irminmodels.BranchGarbageCollectionRules
				for _, branch := range lakefsGarbageCollectionRules.Branches {
					branches = append(branches, irminmodels.BranchGarbageCollectionRules{
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

func (c *Client) CreateRepository(
	workspace, name, defaultBranch string,
	isImmutable bool,
	gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int,
) (*Repository, error) {
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
	lakefsRepository, createRepositoryErr := c.LakeFSClient.CreateRepository(false, repositoryCreateRequest)
	if createRepositoryErr != nil {
		return nil, fmt.Errorf("failed to create repository: %w", createRepositoryErr)
	}

	// Create the default lakefs actions
	_, configureRepositoryWebhookNotificationsErr := c.ConfigureRepositoryWebhookNotifications(lakefsRepository)
	if configureRepositoryWebhookNotificationsErr != nil {
		return nil, fmt.Errorf(
			"failed to configure repository webhook notifications: %w",
			configureRepositoryWebhookNotificationsErr,
		)
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
		setGarbageCollectionRulesErr := c.LakeFSClient.SetGarbageCollectionRules(
			lakeFSRepositoryName,
			garbageCollectionRules,
		)
		if setGarbageCollectionRulesErr != nil {
			return nil, fmt.Errorf("failed to set garbage collection rules: %w", setGarbageCollectionRulesErr)
		}
	}

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:               lakefsRepository.ID,
		Workspace:        workspace,
		StorageNamespace: lakefsRepository.StorageNamespace,
		IsImmutable:      lakefsRepository.ReadOnly,
		DefaultBranch:    lakefsRepository.DefaultBranch,
		CreatedAt:        time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: &irminmodels.GarbageCollectionRules{
			DefaultRetentionDays: garbageCollectionRules.DefaultRetentionDays,
			Branches: func() []irminmodels.BranchGarbageCollectionRules {
				var branches []irminmodels.BranchGarbageCollectionRules
				for _, branch := range garbageCollectionRules.Branches {
					branches = append(branches, irminmodels.BranchGarbageCollectionRules{
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

// ConfigureRepositoryWebhookNotifications configures the webhook notifications for
// the main branch of a repository. This should be called once, right after the repository is created.
func (c *Client) ConfigureRepositoryWebhookNotifications(
	lakefsRepository *lakefs.Repository,
) (*lakefs.ObjectMetadata, error) {
	// Read the default lakefs actions file
	defaultActionsBytes, err := os.ReadFile("engine/default-lakefs-actions.yaml")
	if err != nil {
		return nil, fmt.Errorf("failed to read default lakefs actions file: %w", err)
	}
	defaultActions := string(defaultActionsBytes)

	// Find replace the webhook_url in the default actions
	lakefsWebhookURL := fmt.Sprintf("%s/api/v1/system/webhook?type=lakefs", c.Env.URL)
	defaultActions = strings.ReplaceAll(defaultActions, "{webhook_url}", lakefsWebhookURL)

	// Upload the action file to the repository
	actionFile, uploadObjectErr := c.LakeFSClient.UploadObject(
		lakefsRepository.ID,
		lakefsRepository.DefaultBranch,
		"_lakefs_actions/system-webhook.yaml",
		bytes.NewReader([]byte(defaultActions)),
		false,
	)
	if uploadObjectErr != nil {
		return nil, fmt.Errorf("failed to upload default lakefs actions file: %w", uploadObjectErr)
	}

	// Commit the action file
	_, err = c.LakeFSClient.CreateCommit(
		lakefsRepository.ID,
		lakefsRepository.DefaultBranch,
		"",
		lakefs.CommitCreateRequest{
			Message:    "Configure repository webhook notifications",
			Date:       time.Now().Unix(),
			AllowEmpty: false,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create commit: %w", err)
	}

	return actionFile, nil
}

func (c *Client) UpdateRepository(
	workspace, repository string,
	gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int,
) (*Repository, error) {
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

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:               lakefsRepository.ID,
		Workspace:        workspace,
		StorageNamespace: lakefsRepository.StorageNamespace,
		IsImmutable:      lakefsRepository.ReadOnly,
		DefaultBranch:    lakefsRepository.DefaultBranch,
		CreatedAt:        time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: &irminmodels.GarbageCollectionRules{
			DefaultRetentionDays: garbageCollectionRules.DefaultRetentionDays,
			Branches: func() []irminmodels.BranchGarbageCollectionRules {
				var branches []irminmodels.BranchGarbageCollectionRules
				for _, branch := range garbageCollectionRules.Branches {
					branches = append(branches, irminmodels.BranchGarbageCollectionRules{
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
	lakefsRepository, getRepositoryErr := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	if getRepositoryErr != nil {
		return fmt.Errorf("failed to get repository details: %w", getRepositoryErr)
	}
	if lakefsRepository == nil {
		return errors.New("repository not found")
	}

	// Delete repository.
	deleteRepositoryErr := c.LakeFSClient.DeleteRepository(lakeFSRepositoryName)
	if deleteRepositoryErr != nil {
		return fmt.Errorf("failed to delete repository: %w", deleteRepositoryErr)
	}

	// Delete repository storage namespace if keepObjects is false
	if !keepObjects {
		// Create bucket client
		bucket, createBucketErr := bucket.CreateClient(c.Env)
		if createBucketErr != nil {
			return fmt.Errorf("failed to create bucket client: %w", createBucketErr)
		}
		defer bucket.Close()
		// Construct the repository storage namespace
		folderPath := strings.TrimSuffix(lakefsRepository.StorageNamespace, "/")
		folderPath = strings.TrimPrefix(folderPath, "s3://")
		folderPath = fmt.Sprintf("%s/%s", c.Env.S3Folder, folderPath)
		// Delete repository storage namespace
		deletePathErr := bucket.DeletePath(ctx, folderPath)
		if deletePathErr != nil {
			return fmt.Errorf("failed to delete repository storage namespace: %w", deletePathErr)
		}
	}

	return nil
}
