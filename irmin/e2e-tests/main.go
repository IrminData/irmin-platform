package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
	"github.com/IrminData/irmin-e2e-tests/scenarios"
)

// scenarioFunc is a function that returns test cases for a scenario category.
type scenarioFunc func() []runner.TestCase

// scenarioRegistry maps scenario names to their functions.
var scenarioRegistry = map[string]scenarioFunc{
	"profile":         scenarios.ProfileScenarios,
	"repository":      scenarios.RepositoryScenarios,
	"object":          scenarios.ObjectScenarios,
	"object-advanced": scenarios.ObjectAdvancedScenarios,
	"branch":          scenarios.BranchScenarios,
	"commit":          scenarios.CommitScenarios,
	"query":           scenarios.QueryScenarios,
	"workspace-tag":   scenarios.WorkspaceTagScenarios,
	"git-tag":         scenarios.GitTagScenarios,
	"merge":           scenarios.MergeCompareScenarios,
	"script":          scenarios.ScriptScenarios,
	"search":          scenarios.SearchScenarios,
	"workspace":       scenarios.WorkspaceScenarios,
	"workflow":        scenarios.WorkflowScenarios,
	"workflow-run":    scenarios.WorkflowRunScenarios,
	"connection":      scenarios.ConnectionScenarios,
	"connector":       scenarios.ConnectorScenarios,
	"credential":      scenarios.CredentialScenarios,
	"policy":          scenarios.PolicyScenarios,
	"role":            scenarios.RoleScenarios,
	"user":            scenarios.UserScenarios,
	"invite":          scenarios.InviteScenarios,
	"log":             scenarios.LogScenarios,
	"embedding":       scenarios.EmbeddingScenarios,
	"ai-app":          scenarios.AIApplicationScenarios,
}

func main() {
	os.Exit(run())
}

func run() int {
	// Parse command line flags
	configPath := flag.String("config", "test-config.json", "Path to the test configuration file")
	verbose := flag.Bool("verbose", false, "Enable verbose output")
	scenario := flag.String("scenario", "", "Run only a specific scenario category")
	listScenarios := flag.Bool("list", false, "List all available scenario categories")
	flag.Parse()

	if *listScenarios {
		printAvailableScenarios()
		return 0
	}

	logger := setupLogger(*verbose)
	cfg := loadConfig(*configPath, logger)

	if *verbose {
		cfg.Verbose = true
	}

	logger.Info("starting E2E tests", "api_url", cfg.APIBaseURL)

	testRunner := runner.NewRunner(cfg, logger)
	tests := getTests(*scenario, logger)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	// Register cleanup defer BEFORE Setup to ensure cleanup runs in normal execution path
	defer func() {
		if cleanupErr := testRunner.Cleanup(ctx); cleanupErr != nil {
			logger.Error("failed to cleanup test environment", "error", cleanupErr)
		}
	}()

	if err := testRunner.Setup(ctx); err != nil {
		logger.Error("failed to setup test environment", "error", err)
		return 1
	}

	testRunner.RunTests(ctx, tests)
	testRunner.PrintSummary()

	if testRunner.HasFailures() {
		return 1
	}

	return 0
}

func printAvailableScenarios() {
	fmt.Println("Available scenario categories:")
	for name := range scenarioRegistry {
		fmt.Printf("  - %s\n", name)
	}
}

func setupLogger(verbose bool) *slog.Logger {
	logLevel := slog.LevelInfo
	if verbose {
		logLevel = slog.LevelDebug
	}
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
}

func loadConfig(configPath string, logger *slog.Logger) *config.Config {
	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		logger.Error("failed to load config", "error", err)
		fmt.Println("\nMake sure you have created a test-config.json file.")
		fmt.Println("You can copy test-config.example.json and fill in your values.")
		os.Exit(1)
	}
	return cfg
}

func getTests(scenario string, logger *slog.Logger) []runner.TestCase {
	if scenario == "" {
		return getAllScenarios()
	}

	scenarioFn, ok := scenarioRegistry[scenario]
	if !ok {
		logger.Error("unknown scenario", "scenario", scenario)
		printAvailableScenarios()
		os.Exit(1)
	}

	return scenarioFn()
}

func getAllScenarios() []runner.TestCase {
	var allTests []runner.TestCase
	for _, scenarioFn := range scenarioRegistry {
		allTests = append(allTests, scenarioFn()...)
	}
	return allTests
}
