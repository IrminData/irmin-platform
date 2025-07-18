package engine

import (
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Delete the tag.
	err := c.LakeFSClient.DeleteTag(lakeFSRepositoryName, tag)
	if err != nil {
		return fmt.Errorf("failed to delete tag: %w", err)
	}

	return nil
}
