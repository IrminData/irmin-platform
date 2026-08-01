package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// CredentialScenarios returns test cases for API credential/token operations.
func CredentialScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Credential_Create_List_Delete",
			Description: "Create an API token, list tokens, and delete it",
			Run:         testCredentialLifecycle,
		},
	}
}

func testCredentialLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create a new API token (expires in 1 hour)
	tokenName := fmt.Sprintf("e2e-token-%d", randomSuffix())

	token, _, err := client.CreateToken(ctx, irmincore.CreateCredentialRequest{
		Name:   tokenName,
		Expiry: 3600, // 1 hour in seconds
	})
	if err != nil {
		return fmt.Errorf("failed to create token: %w", err)
	}

	if token.ID == "" {
		return fmt.Errorf("token ID is empty")
	}

	// List tokens
	tokens, _, err := client.ListTokens(ctx)
	if err != nil {
		return fmt.Errorf("failed to list tokens: %w", err)
	}

	found := false
	for _, t := range tokens {
		if t.ID == token.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created token not found in list")
	}

	// Delete the token
	if cfg.CleanupAfterTests {
		_, err = client.DeleteToken(ctx, token.ID)
		if err != nil {
			return fmt.Errorf("failed to delete token: %w", err)
		}
	}

	return nil
}
