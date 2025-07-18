package engine

import (
	"context"
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListBranches(ctx context.Context, workspace, repository string) ([]irminmodels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Run the LakeFS calls concurrently.
	repoFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Repository, error) {
		return c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	})
	branchesFuture := utils.AsyncWithContext(ctx, func() ([]lakefs.Branch, error) {
		return c.LakeFSClient.ListAllBranches(lakeFSRepositoryName, "", false)
	})
	rulesFuture := utils.AsyncWithContext(ctx, func() ([]lakefs.BranchProtectionRule, error) {
		return c.LakeFSClient.GetBranchProtectionRules(lakeFSRepositoryName)
	})

	// Await results.
	lakeFSRepository, getRepositoryErr := repoFuture.Await()
	if getRepositoryErr != nil {
		return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
	}
	if lakeFSRepository == nil {
		return nil, fmt.Errorf("repository not found: %s", lakeFSRepositoryName)
	}

	lakeFSBranches, listBranchesErr := branchesFuture.Await()
	if listBranchesErr != nil {
		return nil, fmt.Errorf("failed to list branches: %w", listBranchesErr)
	}
	branchProtectionRules, getRulesErr := rulesFuture.Await()
	if getRulesErr != nil {
		return nil, fmt.Errorf("failed to get branch protection rules: %w", getRulesErr)
	}

	// Build lookup map for branch protection rules.
	ruleMap := make(map[string]bool, len(branchProtectionRules))
	for _, rule := range branchProtectionRules {
		ruleMap[rule.Pattern] = true
	}

	// Convert LakeFS branches to Irmin branches.
	irminBranches := make([]irminmodels.Branch, len(lakeFSBranches))
	for i, lakeFSBranch := range lakeFSBranches {
		irminBranches[i] = irminmodels.Branch{
			Name:        lakeFSBranch.ID,
			Default:     lakeFSRepository.DefaultBranch == lakeFSBranch.ID,
			IsImmutable: ruleMap[lakeFSBranch.ID],
		}
	}

	return irminBranches, nil
}

func (c *Client) GetBranch(ctx context.Context, workspace, repository, branch string) (*irminmodels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Run LakeFS calls concurrently.
	repoFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Repository, error) {
		return c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	})
	branchFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Branch, error) {
		return c.LakeFSClient.GetBranch(lakeFSRepositoryName, branch)
	})
	rulesFuture := utils.AsyncWithContext(ctx, func() ([]lakefs.BranchProtectionRule, error) {
		return c.LakeFSClient.GetBranchProtectionRules(lakeFSRepositoryName)
	})

	// Await results.
	lakeFSRepository, getRepositoryErr := repoFuture.Await()
	if getRepositoryErr != nil {
		return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
	}
	if lakeFSRepository == nil {
		return nil, fmt.Errorf("repository not found: %s", lakeFSRepositoryName)
	}
	lakeFSBranch, getBranchErr := branchFuture.Await()
	if getBranchErr != nil {
		return nil, fmt.Errorf("failed to get branch: %w", getBranchErr)
	}
	branchProtectionRules, getRulesErr := rulesFuture.Await()
	if getRulesErr != nil {
		return nil, fmt.Errorf("failed to get branch protection rules: %w", getRulesErr)
	}

	// Build lookup map for branch protection rules.
	ruleMap := make(map[string]bool, len(branchProtectionRules))
	for _, rule := range branchProtectionRules {
		ruleMap[rule.Pattern] = true
	}

	// Convert LakeFS branch to Irmin branch.
	irminBranch := irminmodels.Branch{
		Name:        lakeFSBranch.ID,
		Default:     lakeFSRepository.DefaultBranch == lakeFSBranch.ID,
		IsImmutable: ruleMap[lakeFSBranch.ID],
	}

	return &irminBranch, nil
}

func (c *Client) CreateBranch(
	workspace, repository, name, from string,
	isImmutable bool,
) (*irminmodels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Check if "from" is a branch and find the latest commit ID.
	fromBranch, getBranchErr := c.LakeFSClient.GetBranch(lakeFSRepositoryName, from)
	fromRef := from
	if getBranchErr != nil {
		return nil, fmt.Errorf("failed to get branch %s: %w", from, getBranchErr)
	}
	if fromBranch != nil {
		fromRef = fromBranch.CommitID
	}

	// Build branch creation request payload.
	reqData := lakefs.BranchCreateRequest{
		Name:   name,
		Source: fromRef,
		Force:  false,
		Hidden: false,
	}

	// Create the branch.
	if createBranchErr := c.LakeFSClient.CreateBranch(lakeFSRepositoryName, reqData); createBranchErr != nil {
		return nil, fmt.Errorf("failed to create branch: %w", createBranchErr)
	}

	// Handle branch protection if needed
	protectionManager := NewBranchProtectionManager(c.LakeFSClient)
	if ensureBranchProtectionErr := protectionManager.EnsureBranchProtection(lakeFSRepositoryName, reqData.Name, isImmutable); ensureBranchProtectionErr != nil {
		return nil, ensureBranchProtectionErr
	}

	// Fetch the newly created branch details.
	branch, getBranchErr := c.LakeFSClient.GetBranch(lakeFSRepositoryName, reqData.Name)
	if getBranchErr != nil {
		return nil, fmt.Errorf("failed to get branch: %w", getBranchErr)
	}

	// Convert to Irmin branch.
	return &irminmodels.Branch{
		Name:        branch.ID,
		Default:     false,
		IsImmutable: isImmutable,
	}, nil
}

func (c *Client) UpdateBranch(
	ctx context.Context,
	workspace, repository, currentName, name string,
	isImmutable bool,
) (*irminmodels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Run LakeFS calls concurrently.
	branchFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Branch, error) {
		return c.LakeFSClient.GetBranch(lakeFSRepositoryName, currentName)
	})
	repoFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Repository, error) {
		return c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	})

	// Await results.
	currentBranch, getBranchErr := branchFuture.Await()
	if getBranchErr != nil {
		return nil, fmt.Errorf("failed to get branch: %w", getBranchErr)
	}
	if currentBranch == nil {
		return nil, fmt.Errorf("branch not found: %s", currentName)
	}
	lakeFSRepository, getRepositoryErr := repoFuture.Await()
	if getRepositoryErr != nil {
		return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
	}

	// If a new branch name is provided and it's different, perform a rename.
	if currentName != "" && currentName != name {
		protectionManager := NewBranchProtectionManager(c.LakeFSClient)
		return protectionManager.RenameBranch(lakeFSRepositoryName, currentName, name, isImmutable, currentBranch)
	}

	// Otherwise, update immutability without renaming.
	protectionManager := NewBranchProtectionManager(c.LakeFSClient)
	if updateBranchProtectionErr := protectionManager.UpdateBranchProtection(lakeFSRepositoryName, currentName, isImmutable); updateBranchProtectionErr != nil {
		return nil, fmt.Errorf("failed to update branch protection: %w", updateBranchProtectionErr)
	}

	// Return updated branch info.
	return &irminmodels.Branch{
		Name:        currentName,
		Default:     lakeFSRepository.DefaultBranch == currentName,
		IsImmutable: isImmutable,
	}, nil
}

func (c *Client) DeleteBranch(workspace, repository, branch string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Ensure the branch exists.
	_, err := c.LakeFSClient.GetBranch(lakeFSRepositoryName, branch)
	if err != nil {
		return fmt.Errorf("failed to get branch: %w", err)
	}

	// Get the current branch protection rules.
	branchProtectionRules, err := c.LakeFSClient.GetBranchProtectionRules(lakeFSRepositoryName)
	if err != nil {
		return fmt.Errorf("failed to get branch protection rules: %w", err)
	}

	// Remove the branch from the protection rules.
	newRules := make([]lakefs.BranchProtectionRule, 0, len(branchProtectionRules))
	for _, rule := range branchProtectionRules {
		if rule.Pattern != branch {
			newRules = append(newRules, rule)
		}
	}

	// Update branch protection rules if changed.
	if len(newRules) != len(branchProtectionRules) {
		err = c.LakeFSClient.SetBranchProtectionRules(lakeFSRepositoryName, newRules)
		if err != nil {
			return fmt.Errorf("failed to set branch protection rules: %w", err)
		}
	}

	// Delete the branch.
	err = c.LakeFSClient.DeleteBranch(lakeFSRepositoryName, branch)
	if err != nil {
		return fmt.Errorf("failed to delete branch: %w", err)
	}

	return nil
}
