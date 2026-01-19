package runner

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
)

// TestResult holds the result of a single test.
type TestResult struct {
	Name     string
	Passed   bool
	Duration time.Duration
	Error    error
}

// TestFunc is the signature for a test function.
type TestFunc func(ctx context.Context, client *irmincore.Client, cfg *config.Config) error

// TestCase represents a single test case.
type TestCase struct {
	Name        string
	Description string
	Run         TestFunc
}

// Runner executes E2E tests.
type Runner struct {
	client  *irmincore.Client
	config  *config.Config
	logger  *slog.Logger
	results []TestResult
}

// NewRunner creates a new test runner.
func NewRunner(cfg *config.Config, logger *slog.Logger) *Runner {
	client := irmincore.NewClient(cfg.APIBaseURL, cfg.AuthToken, "en")
	return &Runner{
		client:  client,
		config:  cfg,
		logger:  logger,
		results: make([]TestResult, 0),
	}
}

// Setup creates the shared workspace and repository for tests.
func (r *Runner) Setup(ctx context.Context) error {
	// Create workspace
	workspaceName := fmt.Sprintf("e2e-test-%d", rand.IntN(100000))
	r.logger.Info("creating test workspace", "name", workspaceName)

	workspace, _, err := r.client.CreateWorkspace(ctx, irmincore.CreateWorkspaceRequest{
		Name:        workspaceName,
		Description: "E2E test workspace - created automatically",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace: %w", err)
	}

	r.config.Workspace = workspace.Slug
	r.logger.Info("workspace created", "slug", workspace.Slug)

	// Create shared test repository
	repoName := fmt.Sprintf("e2e-shared-repo-%d", rand.IntN(100000))
	r.logger.Info("creating shared test repository", "name", repoName)

	repo, _, err := r.client.CreateRepository(ctx, r.config.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Shared E2E test repository",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	r.config.TestRepository = repo.Slug
	r.config.TestRepositoryID = repo.ID
	r.logger.Info("repository created", "slug", repo.Slug, "id", repo.ID)

	// Create an initial commit so the default branch has a commit
	// This is required by LakeFS for branch operations to work
	initFiles := map[string][]byte{
		".gitkeep": []byte("# E2E test repository\n"),
	}
	_, _, err = r.client.UploadObject(ctx, r.config.Workspace, repo.Slug, "main", ".gitkeep", initFiles)
	if err != nil {
		return fmt.Errorf("failed to upload initial file: %w", err)
	}

	_, _, err = r.client.CreateCommit(ctx, r.config.Workspace, repo.Slug, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: "Initial commit for E2E tests",
	})
	if err != nil {
		return fmt.Errorf("failed to create initial commit: %w", err)
	}
	r.logger.Info("initial commit created")

	// Create shared test connection if configuration is provided
	if r.config.Connection != nil && r.config.Connection.ConnectorName != "" {
		r.setupTestConnection(ctx)
	}

	return nil
}

// setupTestConnection looks up the connector by name and creates a test connection.
func (r *Runner) setupTestConnection(ctx context.Context) {
	// Look up connector ID by name
	connectors, _, err := r.client.ListConnectors(ctx)
	if err != nil {
		r.logger.Warn("failed to list connectors - connection tests will be skipped",
			"error", err)
		return
	}

	connectorID := r.findConnectorIDByName(connectors, r.config.Connection.ConnectorName)
	if connectorID == "" {
		r.logger.Warn("connector not found - connection tests will be skipped",
			"connector_name", r.config.Connection.ConnectorName)
		return
	}

	r.config.Connection.ConnectorID = connectorID
	r.createTestConnection(ctx, connectorID)
}

// findConnectorIDByName searches for a connector by name and returns its ID.
func (r *Runner) findConnectorIDByName(connectors []irminmodels.Connector, name string) string {
	for _, connector := range connectors {
		if connector.Name == name {
			return connector.ID
		}
	}
	return ""
}

// createTestConnection creates a test connection with the given connector ID.
func (r *Runner) createTestConnection(ctx context.Context, connectorID string) {
	connectionName := fmt.Sprintf("e2e-shared-connection-%d", rand.IntN(100000))
	r.logger.Info("creating shared test connection",
		"name", connectionName,
		"connector_name", r.config.Connection.ConnectorName,
		"connector_id", connectorID)

	connection, _, err := r.client.CreateConnection(ctx, r.config.Workspace, irmincore.CreateConnectionRequest{
		Name:        connectionName,
		Connector:   connectorID,
		Description: "Shared E2E test connection",
		Details:     r.config.Connection.Details,
		Settings:    r.config.Connection.Settings,
	})
	if err != nil {
		r.logger.Warn("failed to create test connection - connection tests will be skipped",
			"error", err)
		return
	}

	r.config.TestConnection = connection.ID
	r.logger.Info("connection created", "id", connection.ID)
}

// Cleanup deletes the shared workspace (which cascades to delete the repository).
func (r *Runner) Cleanup(ctx context.Context) error {
	if !r.config.CleanupAfterTests {
		r.logger.Info("skipping cleanup", "workspace", r.config.Workspace)
		return nil
	}

	if r.config.Workspace == "" {
		return nil
	}

	r.logger.Info("deleting test workspace", "workspace", r.config.Workspace)
	_, err := r.client.DeleteWorkspace(ctx, r.config.Workspace)
	if err != nil {
		return fmt.Errorf("failed to delete workspace: %w", err)
	}

	r.logger.Info("workspace deleted", "workspace", r.config.Workspace)
	return nil
}

// RunTests executes all provided test cases.
func (r *Runner) RunTests(ctx context.Context, tests []TestCase) []TestResult {
	r.logger.Info("starting E2E tests", "count", len(tests))
	r.results = make([]TestResult, 0, len(tests))

	for _, tc := range tests {
		result := r.runTest(ctx, tc)
		r.results = append(r.results, result)

		if result.Passed {
			r.logger.Info("test passed",
				"name", tc.Name,
				"duration", result.Duration.Round(time.Millisecond))
		} else {
			r.logger.Error("test failed",
				"name", tc.Name,
				"duration", result.Duration.Round(time.Millisecond),
				"error", result.Error)
		}
	}

	return r.results
}

func (r *Runner) runTest(ctx context.Context, tc TestCase) TestResult {
	start := time.Now()

	err := tc.Run(ctx, r.client, r.config)
	duration := time.Since(start)

	return TestResult{
		Name:     tc.Name,
		Passed:   err == nil,
		Duration: duration,
		Error:    err,
	}
}

// PrintSummary prints a summary of test results.
func (r *Runner) PrintSummary() {
	passed := 0
	failed := 0
	var totalDuration time.Duration

	for _, result := range r.results {
		totalDuration += result.Duration
		if result.Passed {
			passed++
		} else {
			failed++
		}
	}

	fmt.Println("\n" + "=" + repeatString("=", 60))
	fmt.Println("TEST SUMMARY")
	fmt.Println(repeatString("=", 61))
	fmt.Printf("Total:    %d\n", len(r.results))
	fmt.Printf("Passed:   %d\n", passed)
	fmt.Printf("Failed:   %d\n", failed)
	fmt.Printf("Duration: %s\n", totalDuration.Round(time.Millisecond))
	fmt.Println(repeatString("=", 61))

	if failed > 0 {
		fmt.Println("\nFailed tests:")
		for _, result := range r.results {
			if !result.Passed {
				fmt.Printf("  - %s: %v\n", result.Name, result.Error)
			}
		}
	}
}

// HasFailures returns true if any tests failed.
func (r *Runner) HasFailures() bool {
	for _, result := range r.results {
		if !result.Passed {
			return true
		}
	}
	return false
}

// Client returns the underlying API client.
func (r *Runner) Client() *irmincore.Client {
	return r.client
}

// Config returns the runner's configuration.
func (r *Runner) Config() *config.Config {
	return r.config
}

func repeatString(s string, count int) string {
	result := ""
	for range count {
		result += s
	}
	return result
}
