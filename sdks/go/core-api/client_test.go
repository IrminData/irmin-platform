package irmincore_test

import (
	"testing"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
)

func TestClient_ValidationIntegration(t *testing.T) {
	// Create a client with validation enabled
	client := irmincore.NewClient("https://api.example.com", "fake-token", "en")

	t.Run("ValidateRequest method works", func(t *testing.T) {
		// Test valid request
		validReq := irmincore.CreateConnectionRequest{
			Name:      "Test Connection",
			Connector: "postgres",
		}

		err := client.ValidateRequest(validReq)
		if err != nil {
			t.Errorf("Expected valid request to pass validation, got error: %v", err)
		}

		// Test invalid request
		invalidReq := irmincore.CreateConnectionRequest{
			// Missing required fields
		}

		err = client.ValidateRequest(invalidReq)
		if err == nil {
			t.Error("Expected invalid request to fail validation")
		}
	})

	t.Run("ValidateVar method works", func(t *testing.T) {
		// Test valid email
		err := client.ValidateVar("test@example.com", "email")
		if err != nil {
			t.Errorf("Expected valid email to pass validation, got error: %v", err)
		}

		// Test invalid email
		err = client.ValidateVar("not-an-email", "email")
		if err == nil {
			t.Error("Expected invalid email to fail validation")
		}
	})

	t.Run("Client has validator initialized", func(t *testing.T) {
		if client.Validator == nil {
			t.Error("Expected client to have validator initialized")
		}
	})

	t.Run("SQID validation is skipped on client-side", func(t *testing.T) {
		// This should pass even with an "invalid" SQID because client-side validation skips SQID checks
		req := irmincore.TransferConnectionOwnershipRequest{
			NewOwnerID: "definitely_not_a_valid_sqid",
		}

		err := client.ValidateRequest(req)
		if err != nil {
			t.Errorf("Client-side validator should skip SQID validation, got error: %v", err)
		}
	})
}
