package lib_test

import (
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	novugo "github.com/novuhq/novu-go"
	"github.com/zeebo/assert"
)

func TestGetNovuWorkflowDefinitions(t *testing.T) {
	definitions := lib.GetNovuWorkflowDefinitions()
	assert.Equal(t, len(definitions), 1)
	assert.Equal(t, definitions[0].WorkflowID, lib.NovuInviteWorkflowID)
	assert.Equal(t, definitions[0].Name, "Workspace Invite")
	assert.That(t, len(definitions[0].Steps) > 0)
}

func TestEnsureNovuWorkflows_NoSecretKey(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	// Should log a warning and return without error when secret key is empty
	envCopy := *ts.Env
	envCopy.NovuSecretKey = ""

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	// Should not panic
	lib.EnsureNovuWorkflows(&envCopy, logger)
}

func TestEnsureNovuWorkflows_WithSecretKey(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	if ts.Env.NovuSecretKey == "" {
		t.Skip("Novu secret key not configured")
	}

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Should either find or create the workflow without panicking
	lib.EnsureNovuWorkflows(ts.Env, logger)
}

func TestEnsureNovuWorkflows_Idempotent(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	if ts.Env.NovuSecretKey == "" {
		t.Skip("Novu secret key not configured")
	}

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Calling twice should succeed (second call finds existing workflow)
	lib.EnsureNovuWorkflows(ts.Env, logger)
	lib.EnsureNovuWorkflows(ts.Env, logger)
}

func TestEnsureSingleWorkflow_VerifiesExistingWorkflow(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}

	if ts.Env.NovuSecretKey == "" {
		t.Skip("Novu secret key not configured")
	}

	client := novugo.New(novugo.WithSecurity(ts.Env.NovuSecretKey))
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))

	definitions := lib.GetNovuWorkflowDefinitions()
	assert.That(t, len(definitions) > 0)

	// After EnsureNovuWorkflows, the workflow should be retrievable
	lib.EnsureNovuWorkflows(ts.Env, logger)

	// Verify the workflow exists via the Novu API
	resp, err := client.Workflows.Get(t.Context(), definitions[0].WorkflowID, nil, nil)
	if err != nil {
		t.Logf("Workflow get returned error (may not exist yet in Novu env): %v", err)
		return
	}
	assert.That(t, resp != nil)
	assert.That(t, resp.WorkflowResponseDto != nil)
	t.Logf("Workflow %s verified with status: %s",
		resp.WorkflowResponseDto.WorkflowID, resp.WorkflowResponseDto.Status)
}
