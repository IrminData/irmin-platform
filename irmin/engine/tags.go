package engine

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

func (c *Client) ListTags(workspace, repository string) ([]irminmodels.GitTag, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Fetch tags
	lakefsTags, err := c.LakeFSClient.ListAllTags(lakeFSRepositoryName, "")
	if err != nil {
		return nil, fmt.Errorf("failed to list tags: %w", err)
	}

	// Convert LakeFS tags to Irmin tags.
	irminTags := make([]irminmodels.GitTag, len(lakefsTags))
	for i, lakefsTag := range lakefsTags {
		irminTags[i] = irminmodels.GitTag{
			Name: lakefsTag.ID,
			Ref:  lakefsTag.CommitID,
		}
	}

	return irminTags, nil
}

func (c *Client) GetTag(workspace, repository, tag string) (*irminmodels.GitTag, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Get tag details.
	lakefsTag, err := c.LakeFSClient.GetTag(lakeFSRepositoryName, tag)
	if err != nil {
		return nil, fmt.Errorf("failed to get tag: %w", err)
	}

	// Convert LakeFS tag to Irmin tag.
	irminTag := irminmodels.GitTag{
		Name: lakefsTag.ID,
		Ref:  lakefsTag.CommitID,
	}

	return &irminTag, nil
}

func (c *Client) CreateTag(workspace, repository, name, ref string) (*irminmodels.GitTag, error) {
	// Create a lock key based on workspace, repository, and tag name to prevent race conditions
	lockKey := fmt.Sprintf("repository_tag_create:%s:%s:%s", workspace, repository, name)

	// Execute the entire operation within a database transaction with advisory lock
	var result *irminmodels.GitTag
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent creation of the same tag
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for tag creation %s in %s/%s: %w",
				name,
				workspace,
				repository,
				lockErr,
			)
		}

		// Process the tag creation
		var processErr error
		result, processErr = c.createTagInternal(workspace, repository, name, ref)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// createTagInternal contains the core tag creation logic, separated for clarity.
func (c *Client) createTagInternal(workspace, repository, name, ref string) (*irminmodels.GitTag, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Create tag.
	tagCreateRequest := lakefs.TagCreateRequest{
		ID:    name,
		Ref:   ref,
		Force: false,
	}
	lakefsTag, err := c.LakeFSClient.CreateTag(lakeFSRepositoryName, tagCreateRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to create tag: %w", err)
	}

	// Convert LakeFS tag to Irmin tag.
	irminTag := irminmodels.GitTag{
		Name: lakefsTag.ID,
		Ref:  lakefsTag.CommitID,
	}

	return &irminTag, nil
}

func (c *Client) DeleteTag(workspace, repository, tag string) error {
	// Create a lock key based on workspace, repository, and tag name to prevent race conditions
	lockKey := fmt.Sprintf("repository_tag_delete:%s:%s:%s", workspace, repository, tag)

	// Execute the entire operation within a database transaction with advisory lock
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent deletion of the same tag
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf(
				"failed to acquire advisory lock for tag deletion %s in %s/%s: %w",
				tag,
				workspace,
				repository,
				lockErr,
			)
		}

		// Process the tag deletion
		return c.deleteTagInternal(workspace, repository, tag)
	})

	return transactionErr
}

// deleteTagInternal contains the core tag deletion logic, separated for clarity.
func (c *Client) deleteTagInternal(workspace, repository, tag string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Delete the tag.
	err := c.LakeFSClient.DeleteTag(lakeFSRepositoryName, tag)
	if err != nil {
		return fmt.Errorf("failed to delete tag: %w", err)
	}

	return nil
}
