package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// PolicyScenarios returns test cases for policy operations.
func PolicyScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Policy_Create_List_Delete",
			Description: "Create a policy, list policies, and delete it",
			Run:         testPolicyLifecycle,
		},
		{
			Name:        "Policy_Update",
			Description: "Create a policy and update it",
			Run:         testPolicyUpdate,
		},
		{
			Name:        "Policy_Check_Permission",
			Description: "Check if user has permission for an action",
			Run:         testPolicyCheckPermission,
		},
		{
			Name:        "Policy_Summary",
			Description: "Get policy summaries for user and roles",
			Run:         testPolicySummary,
		},
		{
			Name:        "Policy_Resource_Options",
			Description: "Get policy resource options for workspace",
			Run:         testPolicyResourceOptions,
		},
	}
}

func testPolicyLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// First get available roles
	roles, _, err := client.ListRoles(ctx)
	if err != nil {
		return fmt.Errorf("failed to list roles: %w", err)
	}

	if len(roles) == 0 {
		return fmt.Errorf("no roles available")
	}

	// Create a policy for a specific repository to avoid conflicts with existing policies
	repoID := cfg.TestRepositoryID
	policy, _, err := client.CreatePolicy(ctx, cfg.Workspace, irmincore.CreatePolicyRequest{
		Effect:     irminmodels.PolicyEffectAllow,
		Action:     irminmodels.PolicyActionRead,
		Resource:   irminmodels.PolicyResourceRepository,
		Principal:  irminmodels.PolicyPrincipalRole,
		RoleID:     &roles[0].ID,
		ResourceID: &repoID,
	})
	if err != nil {
		return fmt.Errorf("failed to create policy: %w", err)
	}

	if policy.ID == "" {
		return fmt.Errorf("policy ID is empty")
	}

	// List policies
	policies, _, err := client.ListPolicies(ctx, cfg.Workspace, irmincore.ListPoliciesParams{})
	if err != nil {
		return fmt.Errorf("failed to list policies: %w", err)
	}

	found := false
	for _, p := range policies {
		if p.ID == policy.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created policy not found in list")
	}

	// Get policy
	fetchedPolicy, _, err := client.GetPolicy(ctx, cfg.Workspace, policy.ID)
	if err != nil {
		return fmt.Errorf("failed to get policy: %w", err)
	}

	if fetchedPolicy.ID != policy.ID {
		return fmt.Errorf("policy ID mismatch")
	}

	// Delete the policy
	if cfg.CleanupAfterTests {
		_, err = client.DeletePolicy(ctx, cfg.Workspace, policy.ID)
		if err != nil {
			return fmt.Errorf("failed to delete policy: %w", err)
		}
	}

	return nil
}

func testPolicyUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get available roles
	roles, _, err := client.ListRoles(ctx)
	if err != nil {
		return fmt.Errorf("failed to list roles: %w", err)
	}

	if len(roles) == 0 {
		return fmt.Errorf("no roles available")
	}

	// Create a policy for a specific repository to avoid conflicts
	// Use a different action (Create) to avoid conflict with lifecycle test (which uses Read)
	repoID := cfg.TestRepositoryID
	policy, _, err := client.CreatePolicy(ctx, cfg.Workspace, irmincore.CreatePolicyRequest{
		Effect:     irminmodels.PolicyEffectAllow,
		Action:     irminmodels.PolicyActionCreate,
		Resource:   irminmodels.PolicyResourceRepository,
		Principal:  irminmodels.PolicyPrincipalRole,
		RoleID:     &roles[0].ID,
		ResourceID: &repoID,
	})
	if err != nil {
		return fmt.Errorf("failed to create policy: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeletePolicy(ctx, cfg.Workspace, policy.ID)
		}
	}()

	// Update the policy
	_, _, err = client.UpdatePolicy(ctx, cfg.Workspace, policy.ID, irmincore.UpdatePolicyRequest{
		Action: irminmodels.PolicyActionUpdate,
	})
	if err != nil {
		return fmt.Errorf("failed to update policy: %w", err)
	}

	// Verify update
	updatedPolicy, _, err := client.GetPolicy(ctx, cfg.Workspace, policy.ID)
	if err != nil {
		return fmt.Errorf("failed to get updated policy: %w", err)
	}

	if updatedPolicy.Action != irminmodels.PolicyActionUpdate {
		return fmt.Errorf("policy action not updated")
	}

	return nil
}

func testPolicyCheckPermission(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Check permission - this may return true or false depending on policies
	_, err := client.CheckPermission(
		ctx,
		cfg.Workspace,
		irminmodels.PolicyResourceRepository,
		irminmodels.PolicyActionRead,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to check permission: %w", err)
	}

	return nil
}

func testPolicySummary(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get user policy summary
	_, _, err := client.GetPolicyUserSummary(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get user policy summary: %w", err)
	}

	// Get role policy summary
	_, _, err = client.GetPolicyRoleSummary(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get role policy summary: %w", err)
	}

	return nil
}

func testPolicyResourceOptions(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get policy resource options
	options, _, err := client.GetPolicyResourceOptions(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get policy resource options: %w", err)
	}

	if options == nil {
		return fmt.Errorf("policy resource options is nil")
	}

	return nil
}
