package engine

import (
	"context"
	"fmt"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// removeProtectionRule returns a new slice of branch protection rules without the rule for the given branch.
func removeProtectionRule(rules []lakefs.BranchProtectionRule, branch string) []lakefs.BranchProtectionRule {
	newRules := make([]lakefs.BranchProtectionRule, 0, len(rules))
	for _, rule := range rules {
		if rule.Pattern != branch {
			newRules = append(newRules, rule)
		}
	}
	return newRules
}

func (c *Client) ListBranches(ctx context.Context, workspace, repository string) ([]irminModels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

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
	lakeFSRepository, err := repoFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get repository: %w", err)
	}
	if lakeFSRepository == nil {
		return nil, fmt.Errorf("repository not found: %s", lakeFSRepositoryName)
	}

	lakeFSBranches, err := branchesFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to list branches: %w", err)
	}
	branchProtectionRules, err := rulesFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get branch protection rules: %w", err)
	}

	// Build lookup map for branch protection rules.
	ruleMap := make(map[string]bool, len(branchProtectionRules))
	for _, rule := range branchProtectionRules {
		ruleMap[rule.Pattern] = true
	}

	// Convert LakeFS branches to Irmin branches.
	irminBranches := make([]irminModels.Branch, len(lakeFSBranches))
	for i, lakeFSBranch := range lakeFSBranches {
		irminBranches[i] = irminModels.Branch{
			Name:        lakeFSBranch.ID,
			Default:     lakeFSRepository.DefaultBranch == lakeFSBranch.ID,
			IsImmutable: ruleMap[lakeFSBranch.ID],
		}
	}

	return irminBranches, nil
}

func (c *Client) GetBranch(ctx context.Context, workspace, repository, branch string) (*irminModels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

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
	lakeFSRepository, err := repoFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get repository: %w", err)
	}
	if lakeFSRepository == nil {
		return nil, fmt.Errorf("repository not found: %s", lakeFSRepositoryName)
	}
	lakeFSBranch, err := branchFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get branch: %w", err)
	}
	branchProtectionRules, err := rulesFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get branch protection rules: %w", err)
	}

	// Build lookup map for branch protection rules.
	ruleMap := make(map[string]bool, len(branchProtectionRules))
	for _, rule := range branchProtectionRules {
		ruleMap[rule.Pattern] = true
	}

	// Convert LakeFS branch to Irmin branch.
	irminBranch := irminModels.Branch{
		Name:        lakeFSBranch.ID,
		Default:     lakeFSRepository.DefaultBranch == lakeFSBranch.ID,
		IsImmutable: ruleMap[lakeFSBranch.ID],
	}

	return &irminBranch, nil
}

func (c *Client) CreateBranch(workspace, repository, name, from string, is_immutable bool) (*irminModels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Check if "from" is a branch and find the latest commit ID.
	fromBranch, err := c.LakeFSClient.GetBranch(lakeFSRepositoryName, from)
	fromRef := from
	if err != nil {
		return nil, fmt.Errorf("failed to get branch %s: %w", from, err)
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
	err = c.LakeFSClient.CreateBranch(lakeFSRepositoryName, reqData)
	if err != nil {
		return nil, fmt.Errorf("failed to create branch: %w", err)
	}

	// If immutability is requested, add branch protection.
	if is_immutable {
		branchProtectionRules, err := c.LakeFSClient.GetBranchProtectionRules(lakeFSRepositoryName)
		if err != nil {
			return nil, fmt.Errorf("failed to get branch protection rules: %w", err)
		}
		// Ensure the branch is protected.
		found := false
		for _, rule := range branchProtectionRules {
			if rule.Pattern == reqData.Name {
				found = true
				break
			}
		}
		if !found {
			branchProtectionRules = append(branchProtectionRules, lakefs.BranchProtectionRule{
				Pattern: reqData.Name,
			})
			if err := c.LakeFSClient.SetBranchProtectionRules(lakeFSRepositoryName, branchProtectionRules); err != nil {
				return nil, fmt.Errorf("failed to set branch protection rules: %w", err)
			}
		}
	}

	// Fetch the newly created branch details.
	branch, err := c.LakeFSClient.GetBranch(lakeFSRepositoryName, reqData.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to get branch: %w", err)
	}

	// Convert to Irmin branch.
	newBranch := &irminModels.Branch{
		Name:        branch.ID,
		Default:     false,
		IsImmutable: is_immutable,
	}

	return newBranch, nil
}

func (c *Client) UpdateBranch(ctx context.Context, workspace, repository, currentName, name string, is_immutable bool) (*irminModels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

	// Run LakeFS calls concurrently.
	branchFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Branch, error) {
		return c.LakeFSClient.GetBranch(lakeFSRepositoryName, currentName)
	})
	repoFuture := utils.AsyncWithContext(ctx, func() (*lakefs.Repository, error) {
		return c.LakeFSClient.GetRepository(lakeFSRepositoryName)
	})
	rulesFuture := utils.AsyncWithContext(ctx, func() ([]lakefs.BranchProtectionRule, error) {
		return c.LakeFSClient.GetBranchProtectionRules(lakeFSRepositoryName)
	})

	// Await results.
	currentBranch, err := branchFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get branch: %w", err)
	}
	if currentBranch == nil {
		return nil, fmt.Errorf("branch not found: %s", currentName)
	}
	repo, err := repoFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get repository: %w", err)
	}
	branchProtectionRules, err := rulesFuture.Await()
	if err != nil {
		return nil, fmt.Errorf("failed to get branch protection rules: %w", err)
	}

	// If a new branch name is provided and it's different, perform a rename.
	if currentName != "" && currentName != name {
		// Create new branch from the current branch.
		reqData := lakefs.BranchCreateRequest{
			Name:   name,
			Source: currentBranch.CommitID,
			Force:  false,
			Hidden: false,
		}
		err = c.LakeFSClient.CreateBranch(lakeFSRepositoryName, reqData)
		if err != nil {
			return nil, fmt.Errorf("failed to create branch: %w", err)
		}

		// Fetch the newly created branch.
		branch, err := c.LakeFSClient.GetBranch(lakeFSRepositoryName, reqData.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to get branch: %w", err)
		}

		// Update branch protection rules: remove old branch and add new branch if immutability is desired.
		newRules := removeProtectionRule(branchProtectionRules, currentName)
		if is_immutable {
			newRules = append(newRules, lakefs.BranchProtectionRule{
				Pattern: branch.ID,
			})
		}
		if err := c.LakeFSClient.SetBranchProtectionRules(lakeFSRepositoryName, newRules); err != nil {
			return nil, fmt.Errorf("failed to set branch protection rules: %w", err)
		}

		// Delete the old branch.
		if err := c.LakeFSClient.DeleteBranch(lakeFSRepositoryName, currentName); err != nil {
			return nil, fmt.Errorf("failed to delete branch: %w", err)
		}

		// Prepare and send response with the new branch details.
		irminBranch := &irminModels.Branch{
			Name:        branch.ID,
			Default:     repo.DefaultBranch == branch.ID,
			IsImmutable: is_immutable,
		}

		return irminBranch, nil
	}

	// Otherwise, update immutability without renaming.
	var alreadyImmutable bool
	newRules := []lakefs.BranchProtectionRule{}
	for _, rule := range branchProtectionRules {
		if rule.Pattern == currentName {
			alreadyImmutable = true
			if !is_immutable {
				// Omit rule if immutability is no longer desired.
				continue
			}
		}
		newRules = append(newRules, rule)
	}
	if is_immutable && !alreadyImmutable {
		newRules = append(newRules, lakefs.BranchProtectionRule{
			Pattern: currentName,
		})
	}

	if err := c.LakeFSClient.SetBranchProtectionRules(lakeFSRepositoryName, newRules); err != nil {
		return nil, fmt.Errorf("failed to set branch protection rules: %w", err)
	}

	// Return updated branch info.
	irminBranch := &irminModels.Branch{
		Name:        currentName,
		Default:     repo.DefaultBranch == currentName,
		IsImmutable: is_immutable,
	}

	return irminBranch, nil
}

func (c *Client) DeleteBranch(workspace, repository, branch string) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

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
	newRules := removeProtectionRule(branchProtectionRules, branch)

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
