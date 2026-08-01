package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// InviteScenarios returns test cases for invite operations.
func InviteScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Invite_Send_List_Delete",
			Description: "Send an invite, list invites, and delete it",
			Run:         testInviteLifecycle,
		},
		{
			Name:        "Invite_Inbox",
			Description: "List invites in the user's inbox",
			Run:         testInviteInbox,
		},
		{
			Name:        "Invite_Update_Resend",
			Description: "Send an invite, update role, and resend",
			Run:         testInviteUpdateResend,
		},
	}
}

func testInviteLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get available roles
	roles, _, err := client.ListRoles(ctx)
	if err != nil {
		return fmt.Errorf("failed to list roles: %w", err)
	}

	if len(roles) == 0 {
		return fmt.Errorf("no roles available")
	}

	// Find a non-owner role (typically "member" or similar)
	var roleID string
	for _, r := range roles {
		if !r.IsOwner {
			roleID = r.ID
			break
		}
	}
	if roleID == "" {
		roleID = roles[0].ID
	}

	// Send an invite to a test email
	testEmail := fmt.Sprintf("e2e-test-%d@example.com", randomSuffix())

	invite, _, err := client.SendInvite(ctx, cfg.Workspace, irmincore.SendInviteRequest{
		Email: testEmail,
		Role:  roleID,
	})
	if err != nil {
		return fmt.Errorf("failed to send invite: %w", err)
	}

	if invite.ID == "" {
		return fmt.Errorf("invite ID is empty")
	}

	// List invites to workspace
	invites, _, err := client.ListInvitesToWorkspace(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list invites: %w", err)
	}

	found := false
	for _, i := range invites {
		if i.ID == invite.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("sent invite not found in list")
	}

	// Get invite details
	fetchedInvite, _, err := client.GetInvite(ctx, invite.ID)
	if err != nil {
		return fmt.Errorf("failed to get invite: %w", err)
	}

	if fetchedInvite.ID != invite.ID {
		return fmt.Errorf("invite ID mismatch")
	}

	// Delete the invite
	if cfg.CleanupAfterTests {
		_, err = client.DeleteInvite(ctx, invite.ID)
		if err != nil {
			return fmt.Errorf("failed to delete invite: %w", err)
		}
	}

	return nil
}

func testInviteInbox(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List invites in the user's inbox
	_, _, err := client.ListInviteInbox(ctx)
	if err != nil {
		return fmt.Errorf("failed to list invite inbox: %w", err)
	}

	return nil
}

func testInviteUpdateResend(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get available roles
	roles, _, err := client.ListRoles(ctx)
	if err != nil {
		return fmt.Errorf("failed to list roles: %w", err)
	}

	if len(roles) < 2 {
		// Need at least 2 roles to test update
		return nil
	}

	// Find two non-owner roles
	var roleID1, roleID2 string
	for _, r := range roles {
		if !r.IsOwner {
			if roleID1 == "" {
				roleID1 = r.ID
			} else if roleID2 == "" {
				roleID2 = r.ID
				break
			}
		}
	}

	if roleID1 == "" || roleID2 == "" {
		// Not enough non-owner roles to test
		roleID1 = roles[0].ID
		if len(roles) > 1 {
			roleID2 = roles[1].ID
		} else {
			return nil
		}
	}

	// Send an invite
	testEmail := fmt.Sprintf("e2e-update-test-%d@example.com", randomSuffix())

	invite, _, err := client.SendInvite(ctx, cfg.Workspace, irmincore.SendInviteRequest{
		Email: testEmail,
		Role:  roleID1,
	})
	if err != nil {
		return fmt.Errorf("failed to send invite: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteInvite(ctx, invite.ID)
		}
	}()

	// Update the invite role
	updatedInvite, _, err := client.UpdateInvite(ctx, invite.ID, irmincore.UpdateInviteRequest{
		Role: roleID2,
	})
	if err != nil {
		return fmt.Errorf("failed to update invite: %w", err)
	}

	if updatedInvite.ID != invite.ID {
		return fmt.Errorf("updated invite ID mismatch")
	}

	// Resend the invite
	_, _, err = client.ResendInvite(ctx, invite.ID)
	if err != nil {
		return fmt.Errorf("failed to resend invite: %w", err)
	}

	return nil
}
