package engine

import (
	"fmt"
	"irmin-api/lakefs"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// BranchProtectionManager handles branch protection and renaming operations.
type BranchProtectionManager struct {
	client *lakefs.Client
}

// NewBranchProtectionManager creates a new BranchProtectionManager.
func NewBranchProtectionManager(client *lakefs.Client) *BranchProtectionManager {
	return &BranchProtectionManager{client: client}
}

// EnsureBranchProtection ensures a branch is protected if isImmutable is true.
func (m *BranchProtectionManager) EnsureBranchProtection(repositoryName, branchName string, isImmutable bool) error {
	if !isImmutable {
		return nil
	}

	branchProtectionRules, getBranchProtectionRulesErr := m.client.GetBranchProtectionRules(repositoryName)
	if getBranchProtectionRulesErr != nil {
		return fmt.Errorf("failed to get branch protection rules: %w", getBranchProtectionRulesErr)
	}

	// Check if branch is already protected
	for _, rule := range branchProtectionRules {
		if rule.Pattern == branchName {
			return nil // Branch is already protected
		}
	}

	// Add protection rule for the branch
	branchProtectionRules = append(branchProtectionRules, lakefs.BranchProtectionRule{
		Pattern: branchName,
	})
	if setBranchProtectionRulesErr := m.client.SetBranchProtectionRules(repositoryName, branchProtectionRules); setBranchProtectionRulesErr != nil {
		return fmt.Errorf("failed to set branch protection rules: %w", setBranchProtectionRulesErr)
	}
	return nil
}

// UpdateBranchProtection updates protection rules for a branch.
func (m *BranchProtectionManager) UpdateBranchProtection(repositoryName, branchName string, isImmutable bool) error {
	branchProtectionRules, getBranchProtectionRulesErr := m.client.GetBranchProtectionRules(repositoryName)
	if getBranchProtectionRulesErr != nil {
		return fmt.Errorf("failed to get branch protection rules: %w", getBranchProtectionRulesErr)
	}

	var alreadyImmutable bool
	newRules := []lakefs.BranchProtectionRule{}
	for _, rule := range branchProtectionRules {
		if rule.Pattern == branchName {
			alreadyImmutable = true
			if !isImmutable {
				// Omit rule if immutability is no longer desired
				continue
			}
		}
		newRules = append(newRules, rule)
	}
	if isImmutable && !alreadyImmutable {
		newRules = append(newRules, lakefs.BranchProtectionRule{
			Pattern: branchName,
		})
	}

	return m.client.SetBranchProtectionRules(repositoryName, newRules)
}

// RenameBranch handles the process of renaming a branch, including protection rules management.
func (m *BranchProtectionManager) RenameBranch(
	repositoryName, currentName, newName string,
	isImmutable bool,
	currentBranch *lakefs.Branch,
) (*irminmodels.Branch, error) {
	// Create new branch from the current branch
	reqData := lakefs.BranchCreateRequest{
		Name:   newName,
		Source: currentBranch.CommitID,
		Force:  false,
		Hidden: false,
	}
	if createBranchErr := m.client.CreateBranch(repositoryName, reqData); createBranchErr != nil {
		return nil, fmt.Errorf("failed to create branch: %w", createBranchErr)
	}

	// Fetch the newly created branch
	branch, getBranchErr := m.client.GetBranch(repositoryName, reqData.Name)
	if getBranchErr != nil {
		return nil, fmt.Errorf("failed to get branch: %w", getBranchErr)
	}

	// Update branch protection rules
	if updateBranchProtectionErr := m.UpdateBranchProtection(repositoryName, currentName, false); updateBranchProtectionErr != nil {
		return nil, fmt.Errorf("failed to update protection rules for old branch: %w", updateBranchProtectionErr)
	}
	if ensureBranchProtectionErr := m.EnsureBranchProtection(repositoryName, branch.ID, isImmutable); ensureBranchProtectionErr != nil {
		return nil, fmt.Errorf("failed to update protection rules for new branch: %w", ensureBranchProtectionErr)
	}

	// Delete the old branch
	if deleteBranchErr := m.client.DeleteBranch(repositoryName, currentName); deleteBranchErr != nil {
		return nil, fmt.Errorf("failed to delete branch: %w", deleteBranchErr)
	}

	// Get repository to check if this is the default branch
	lakeFSRepository, getRepositoryErr := m.client.GetRepository(repositoryName)
	if getRepositoryErr != nil {
		return nil, fmt.Errorf("failed to get repository: %w", getRepositoryErr)
	}

	return &irminmodels.Branch{
		Name:        branch.ID,
		Default:     lakeFSRepository.DefaultBranch == branch.ID,
		IsImmutable: isImmutable,
	}, nil
}
