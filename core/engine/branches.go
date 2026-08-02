package engine

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
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
	// Create a lock key based on workspace, repository, and branch name to prevent race conditions
	lockKey := fmt.Sprintf("branch_create:%s:%s:%s", workspace, repository, name)

	// Execute the entire operation within a database transaction with advisory lock
	var result *irminmodels.Branch
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent creation of the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for branch %s: %w", name, lockErr)
		}

		// Process the branch creation
		var processErr error
		result, processErr = c.createBranchInternal(workspace, repository, name, from, isImmutable)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// createBranchInternal contains the core branch creation logic, separated for clarity.
func (c *Client) createBranchInternal(
	workspace, repository, name, from string,
	isImmutable bool,
) (*irminmodels.Branch, error) {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Check if "from" is a branch and find the latest commit ID.
	// If "from" is not a branch (e.g., it's a commit hash), use it directly as the source ref.
	fromRef := from
	fromBranch, getBranchErr := c.LakeFSClient.GetBranch(lakeFSRepositoryName, from)
	if getBranchErr == nil && fromBranch != nil {
		// "from" is a valid branch, use its latest commit
		fromRef = fromBranch.CommitID
	}
	// If getBranchErr is not nil, assume "from" is already a commit ref (hash) and use it directly

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
	// Create a lock key based on workspace, repository, and branch name to prevent race conditions
	// Use the target name if renaming, otherwise use current name
	lockName := name
	if name == "" || name == currentName {
		lockName = currentName
	}
	lockKey := fmt.Sprintf("branch_update:%s:%s:%s", workspace, repository, lockName)

	// Execute the entire operation within a database transaction with advisory lock
	var result *irminmodels.Branch
	transactionErr := c.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent updates of the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for branch %s: %w", lockName, lockErr)
		}

		// Process the branch update
		var processErr error
		result, processErr = c.updateBranchInternal(ctx, workspace, repository, currentName, name, isImmutable)
		return processErr
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return result, nil
}

// updateBranchInternal contains the core branch update logic, separated for clarity.
func (c *Client) updateBranchInternal(
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

func (c *Client) ResetBranchToCommit(workspace, repository, branch, commitRef string, force bool) error {
	// Create a lock key based on workspace, repository, and branch name to prevent race conditions
	lockKey := fmt.Sprintf("branch_reset:%s:%s:%s", workspace, repository, branch)

	// Execute the entire operation within a database transaction with advisory lock
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent reset of the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for branch %s: %w", branch, lockErr)
		}

		// Process the branch reset
		return c.resetBranchToCommitInternal(workspace, repository, branch, commitRef, force)
	})

	return transactionErr
}

// resetBranchToCommitInternal contains the core branch reset logic, separated for clarity.
func (c *Client) resetBranchToCommitInternal(workspace, repository, branch, commitRef string, force bool) error {
	// Construct repository name.
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

	// Ensure the branch exists.
	_, err := c.LakeFSClient.GetBranch(lakeFSRepositoryName, branch)
	if err != nil {
		return fmt.Errorf("failed to get branch: %w", err)
	}

	// Verify the commit exists by attempting to get it
	_, err = c.LakeFSClient.GetCommit(lakeFSRepositoryName, commitRef)
	if err != nil {
		return fmt.Errorf("failed to get commit: %w", err)
	}

	// Perform the hard reset to the specified commit
	err = c.LakeFSClient.HardResetBranch(lakeFSRepositoryName, branch, commitRef, force)
	if err != nil {
		return fmt.Errorf("failed to reset branch to commit: %w", err)
	}

	return nil
}

func (c *Client) DeleteBranch(workspace, repository, branch string) error {
	// Create a lock key based on workspace, repository, and branch name to prevent race conditions
	lockKey := fmt.Sprintf("branch_delete:%s:%s:%s", workspace, repository, branch)

	// Execute the entire operation within a database transaction with advisory lock
	transactionErr := c.DB.Transaction(func(tx *gorm.DB) error {
		// Acquire advisory lock to prevent concurrent deletion of the same branch
		if lockErr := db.LockKeyTx(tx, lockKey); lockErr != nil {
			return fmt.Errorf("failed to acquire advisory lock for branch %s: %w", branch, lockErr)
		}

		// Process the branch deletion
		return c.deleteBranchInternal(workspace, repository, branch)
	})

	return transactionErr
}

// deleteBranchInternal contains the core branch deletion logic, separated for clarity.
func (c *Client) deleteBranchInternal(workspace, repository, branch string) error {
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
