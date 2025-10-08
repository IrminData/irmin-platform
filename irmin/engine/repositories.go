package engine

import (
	"bytes"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

//go:embed default-lakefs-actions.yaml
var defaultLakeFSActionsYAML []byte

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
	lakeFSRepositoryPrefix := utils.ConstructLakeFSRepositoryPrefix(workspace)

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

func convertGarbageCollectionRules(
	lakefsGarbageCollectionRules *lakefs.GarbageCollectionRules,
) *irminmodels.GarbageCollectionRules {
	if lakefsGarbageCollectionRules == nil {
		return nil
	}

	irminGarbageCollectionRules := irminmodels.GarbageCollectionRules{
		DefaultRetentionDays: &lakefsGarbageCollectionRules.DefaultRetentionDays,
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
	}
	return &irminGarbageCollectionRules
}

func (c *Client) GetRepository(ctx context.Context, workspace, repository string) (*Repository, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

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
		ID:                     lakefsRepository.ID,
		Workspace:              workspace,
		StorageNamespace:       lakefsRepository.StorageNamespace,
		IsImmutable:            lakefsRepository.ReadOnly,
		DefaultBranch:          lakefsRepository.DefaultBranch,
		CreatedAt:              time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: convertGarbageCollectionRules(lakefsGarbageCollectionRules),
	}

	return &irminRepository, nil
}

func (c *Client) CreateRepository(
	workspace, name, defaultBranch string,
	isImmutable bool,
	gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int,
) (*Repository, error) {
	// Create a lock key based on workspace and repository name to prevent race conditions
	lockKey := fmt.Sprintf("engine:repository_create:%s:%s", workspace, name)

	// Execute the entire operation within a database transaction with advisory lock
	var result *Repository
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent creation of the same repository
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for repository creation %s/%s: %w",
				workspace,
				name,
				lockErr,
			)
		}

		// Process the repository creation
		var processErr error
		result, processErr = c.createRepositoryInternal(
			workspace,
			name,
			defaultBranch,
			isImmutable,
			gcDefaultRetentionDays,
			gcDefaultBranchRetentionDays,
		)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// createRepositoryInternal contains the core repository creation logic, separated for clarity.
func (c *Client) createRepositoryInternal(
	workspace, name, defaultBranch string,
	isImmutable bool,
	gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int,
) (*Repository, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, name)

	// Construct repository storage namespace.
	lakeFSRepositoryStorageNamespace, err := utils.ConstructLakeFSRepositoryStorageNamespace(workspace, name)
	if err != nil {
		return nil, fmt.Errorf("failed to construct repository storage namespace: %w", err)
	}

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

	// Create the default lakefs actions
	_, err = c.ConfigureRepositoryWebhookNotifications(lakefsRepository)
	if err != nil {
		c.Logger.Warn("failed to configure repository webhook notifications", "error", err)
	}

	// Create garbage collection rules.
	garbageCollectionRules := lakefs.GarbageCollectionRules{}
	if gcDefaultRetentionDays != nil && *gcDefaultRetentionDays > 0 {
		garbageCollectionRules.DefaultRetentionDays = *gcDefaultRetentionDays
	}
	if gcDefaultBranchRetentionDays != nil && *gcDefaultBranchRetentionDays > 0 {
		garbageCollectionRules.Branches = []lakefs.BranchGarbageCollectionRules{
			{
				BranchID:      defaultBranch,
				RetentionDays: *gcDefaultBranchRetentionDays,
			},
		}
	}
	if gcDefaultBranchRetentionDays != nil && *gcDefaultBranchRetentionDays > 0 &&
		gcDefaultRetentionDays != nil && *gcDefaultRetentionDays > 0 {
		setGCRulesErr := c.LakeFSClient.SetGarbageCollectionRules(
			lakeFSRepositoryName,
			garbageCollectionRules,
		)
		if setGCRulesErr != nil {
			return nil, fmt.Errorf("failed to set garbage collection rules: %w", setGCRulesErr)
		}
	}

	// Convert LakeFS repository to Irmin repository.
	irminRepository := Repository{
		ID:                     lakefsRepository.ID,
		Workspace:              workspace,
		StorageNamespace:       lakefsRepository.StorageNamespace,
		IsImmutable:            lakefsRepository.ReadOnly,
		DefaultBranch:          lakefsRepository.DefaultBranch,
		CreatedAt:              time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: convertGarbageCollectionRules(&garbageCollectionRules),
	}

	return &irminRepository, nil
}

// ConfigureRepositoryWebhookNotifications configures the webhook notifications for
// the main branch of a repository. This should be called once, right after the repository is created.
func (c *Client) ConfigureRepositoryWebhookNotifications(
	lakefsRepository *lakefs.Repository,
) (*lakefs.ObjectMetadata, error) {
	// Create a lock key based on repository ID to prevent race conditions
	lockKey := fmt.Sprintf("repository_webhook_config:%s", lakefsRepository.ID)

	// Execute the entire operation within a database transaction with advisory lock
	var result *lakefs.ObjectMetadata
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent webhook configuration for the same repository
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for webhook configuration of repository %s: %w",
				lakefsRepository.ID,
				lockErr,
			)
		}

		// Process the webhook configuration
		var processErr error
		result, processErr = c.configureRepositoryWebhookNotificationsInternal(lakefsRepository)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// configureRepositoryWebhookNotificationsInternal contains the core webhook configuration logic, separated for clarity.
func (c *Client) configureRepositoryWebhookNotificationsInternal(
	lakefsRepository *lakefs.Repository,
) (*lakefs.ObjectMetadata, error) {
	// Read the default lakefs actions file
	defaultActions := string(defaultLakeFSActionsYAML)

	// Find replace the webhook_url in the default actions
	lakefsWebhookURL := fmt.Sprintf("%s/api/v1/system/webhook?type=lakefs", c.Env.URL)
	defaultActions = strings.ReplaceAll(defaultActions, "{webhook_url}", lakefsWebhookURL)

	// Upload the action file to the repository
	actionFile, uploadObjectErr := c.LakeFSClient.UploadObject(
		lakefsRepository.ID,
		lakefsRepository.DefaultBranch,
		"_lakefs_actions/system-webhook.yaml",
		bytes.NewReader([]byte(defaultActions)),
		true,
	)
	if uploadObjectErr != nil {
		return nil, fmt.Errorf("failed to upload default lakefs actions file: %w", uploadObjectErr)
	}

	// Commit the action file
	_, createCommitErr := c.LakeFSClient.CreateCommit(
		lakefsRepository.ID,
		lakefsRepository.DefaultBranch,
		"",
		lakefs.CommitCreateRequest{
			Message: "Configure repository webhook notifications",
			Metadata: map[string]string{
				"author": "system",
			},
			Date:       time.Now().Unix(),
			AllowEmpty: false,
		},
	)
	if createCommitErr != nil {
		return nil, fmt.Errorf("failed to create commit: %w", createCommitErr)
	}

	return actionFile, nil
}

func (c *Client) UpdateRepository(
	workspace, repository string,
	gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int,
) (*Repository, error) {
	// Create a lock key based on workspace and repository name to prevent race conditions
	lockKey := fmt.Sprintf("repository_update:%s:%s", workspace, repository)

	// Execute the entire operation within a database transaction with advisory lock
	var result *Repository
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent updates of the same repository
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for repository update %s/%s: %w",
				workspace,
				repository,
				lockErr,
			)
		}

		// Process the repository update
		var processErr error
		result, processErr = c.updateRepositoryInternal(
			workspace,
			repository,
			gcDefaultRetentionDays,
			gcDefaultBranchRetentionDays,
		)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// updateRepositoryInternal contains the core repository update logic, separated for clarity.
func (c *Client) updateRepositoryInternal(
	workspace, repository string,
	gcDefaultRetentionDays, gcDefaultBranchRetentionDays *int,
) (*Repository, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Get repository details.
	lakefsRepository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	if err != nil {
		return nil, fmt.Errorf("failed to get repository details: %w", err)
	}

	// Create garbage collection rules.
	garbageCollectionRules := lakefs.GarbageCollectionRules{}
	if gcDefaultRetentionDays != nil && *gcDefaultRetentionDays > 0 {
		garbageCollectionRules.DefaultRetentionDays = *gcDefaultRetentionDays
	}
	if gcDefaultBranchRetentionDays != nil && *gcDefaultBranchRetentionDays > 0 {
		garbageCollectionRules.Branches = []lakefs.BranchGarbageCollectionRules{
			{
				BranchID:      lakefsRepository.DefaultBranch,
				RetentionDays: *gcDefaultBranchRetentionDays,
			},
		}
	}
	if gcDefaultBranchRetentionDays != nil && gcDefaultRetentionDays != nil && *gcDefaultBranchRetentionDays > 0 &&
		*gcDefaultRetentionDays > 0 {
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
		ID:                     lakefsRepository.ID,
		Workspace:              workspace,
		StorageNamespace:       lakefsRepository.StorageNamespace,
		IsImmutable:            lakefsRepository.ReadOnly,
		DefaultBranch:          lakefsRepository.DefaultBranch,
		CreatedAt:              time.Unix(lakefsRepository.CreationDate, 0).Format(time.RFC3339),
		GarbageCollectionRules: convertGarbageCollectionRules(&garbageCollectionRules),
	}

	return &irminRepository, nil
}

func (c *Client) DeleteRepository(ctx context.Context, workspace, repository string, keepObjects bool) error {
	// Create a lock key based on workspace and repository name to prevent race conditions
	lockKey := fmt.Sprintf("repository_delete:%s:%s", workspace, repository)

	// Execute the entire operation within a database transaction with advisory lock
	transactionErr := c.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent deletion of the same repository
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for repository deletion %s/%s: %w",
				workspace,
				repository,
				lockErr,
			)
		}

		// Process the repository deletion
		return c.deleteRepositoryInternal(ctx, tx, workspace, repository, keepObjects)
	})

	return transactionErr
}

// deleteRepositoryInternal contains the core repository deletion logic, separated for clarity.
func (c *Client) deleteRepositoryInternal(
	ctx context.Context,
	tx *gorm.DB,
	workspace, repository string,
	keepObjects bool,
) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

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
		bucket, createBucketErr := bucket.CreateClient(c.Env, c.Env.LakeFSS3Bucket, c.DB)
		if createBucketErr != nil {
			return fmt.Errorf("failed to create bucket client: %w", createBucketErr)
		}
		defer bucket.Close()
		// Construct the repository storage namespace
		lakefsStorageNamespace := strings.TrimPrefix(lakefsRepository.StorageNamespace, "s3://")
		// Delete repository storage namespace, passing the transaction to avoid nested transactions
		deletePathErr := bucket.DeletePath(ctx, lakefsStorageNamespace, tx)
		if deletePathErr != nil {
			return fmt.Errorf("failed to delete repository storage namespace: %w", deletePathErr)
		}
	}

	return nil
}
