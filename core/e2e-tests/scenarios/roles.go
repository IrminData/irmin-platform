package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// RoleScenarios returns test cases for role operations.
func RoleScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Role_List",
			Description: "List all available roles",
			Run:         testRoleList,
		},
	}
}

func testRoleList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	roles, _, err := client.ListRoles(ctx)
	if err != nil {
		return fmt.Errorf("failed to list roles: %w", err)
	}

	// There should be at least one role (owner, admin, member, etc.)
	if len(roles) == 0 {
		return fmt.Errorf("no roles found")
	}

	// Verify roles have required fields
	for _, role := range roles {
		if role.ID == "" {
			return fmt.Errorf("role ID is empty")
		}
		if role.Role == "" {
			return fmt.Errorf("role name is empty")
		}
	}

	return nil
}
