package runner

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	connectorsclient "irmin-connectors/e2e-tests/connectors-client"
	"irmin-connectors/e2e-tests/helpers"
	"irmin-connectors/e2e-tests/tests"
)

// TestRunner orchestrates the execution of connector tests.
type TestRunner struct {
	Config  *TestConfig
	Summary *TestSummary
	Verbose bool
	Locale  string
}

// NewTestRunner creates a new test runner.
func NewTestRunner(config *TestConfig, verbose bool, locale string) *TestRunner {
	return &TestRunner{
		Config:  config,
		Summary: NewTestSummary(),
		Verbose: verbose,
		Locale:  locale,
	}
}

// RunTest executes a single test and records the result.
func (r *TestRunner) RunTest(name, connector string, testFunc func() error) {
	start := time.Now()
	err := testFunc()
	duration := time.Since(start)

	result := TestResult{
		Name:      name,
		Connector: connector,
		Passed:    err == nil,
		Error:     err,
		Duration:  duration,
	}

	r.Summary.AddResult(result)

	if r.Verbose {
		status := "✓"
		if !result.Passed {
			status = "✗"
		}
		fmt.Fprintf(os.Stderr, "%s [%s] %s (%s)\n", status, connector, name, duration.Round(time.Millisecond))
		if err != nil {
			fmt.Fprintf(os.Stderr, "  Error: %v\n", err)
		}
	}
}

// SkipTest records a skipped test.
func (r *TestRunner) SkipTest(name, connector, reason string) {
	result := TestResult{
		Name:       name,
		Connector:  connector,
		Passed:     false,
		Skipped:    true,
		SkipReason: reason,
	}

	r.Summary.AddResult(result)

	if r.Verbose {
		fmt.Fprintf(os.Stderr, "⊘ [%s] %s (skipped: %s)\n", connector, name, reason)
	}
}

// RunAll executes all tests for all enabled connectors.
func (r *TestRunner) RunAll(ctx context.Context, specificConnector, specificTest string) error {
	connectors := r.Config.GetEnabledConnectors()

	if specificConnector != "" {
		connectors = []string{specificConnector}
	}

	if len(connectors) == 0 {
		return errors.New("no enabled connectors found in configuration")
	}

	fmt.Fprintf(os.Stderr, "Running E2E tests for %d connector(s)...\n\n", len(connectors))

	for _, connectorName := range connectors {
		config, exists := r.Config.GetConnector(connectorName)
		if !exists || !config.Enabled {
			continue
		}

		if r.Verbose {
			fmt.Fprintf(os.Stderr, "\n=== Testing Connector: %s ===\n", connectorName)
		}

		r.runConnectorTests(ctx, connectorName, config, specificTest)
	}

	r.Summary.Finalize()
	r.Summary.Print(r.Verbose)

	if r.Summary.HasFailures() {
		return fmt.Errorf("test suite failed with %d failures", r.Summary.FailedTests)
	}

	return nil
}

// initOperationForType initializes an operation for a specific operation type using per-operation config.
// Returns the operation token, operation ID, and any error.
func (r *TestRunner) initOperationForType(
	ctx context.Context,
	client *helpers.ConnectorClient,
	cfg *ConnectorConfig,
	operationType string,
) (string, uint, error) {
	details, settings := cfg.GetOperationConfig(operationType)
	return tests.TestOperationInitWithID(ctx, client, details, settings)
}

// runConnectorTests runs all applicable tests for a single connector.
func (r *TestRunner) runConnectorTests(ctx context.Context, name string, cfg ConnectorConfig, specificTest string) {
	const testTypeOperation = "operation"

	client := helpers.NewConnectorClient(name, cfg.URL, cfg.SystemToken, r.Locale)

	// Test 1: Info endpoint
	if specificTest == "" || specificTest == "info" {
		r.RunTest("Info", name, func() error {
			return tests.TestInfo(ctx, client)
		})
	}

	// Get connector info to determine capabilities
	info, infoErr := client.GetInfo(ctx)
	if infoErr != nil {
		if r.Verbose {
			fmt.Fprintf(os.Stderr, "Failed to get connector info, skipping capability-based tests: %v\n", infoErr)
		}
		return
	}

	// Test 2: Config fields
	if specificTest == "" || specificTest == "config" {
		r.RunTest("Config Fields (details)", name, func() error {
			return tests.TestConfigFields(ctx, client, "details", cfg.Details, cfg.Settings)
		})

		r.RunTest("Config Fields (settings)", name, func() error {
			return tests.TestConfigFields(ctx, client, "settings", cfg.Details, cfg.Settings)
		})

		r.RunTest("Config Validation (valid)", name, func() error {
			return tests.TestConfigValidation(ctx, client, cfg.Details, cfg.Settings, true)
		})

		r.RunTest("Config Validation (invalid)", name, func() error {
			return tests.TestConfigValidationInvalid(ctx, client)
		})
	}

	// Test 3: Operation lifecycle
	// Determine if we need to initialize an operation
	needsOperation := specificTest == "" ||
		specificTest == testTypeOperation ||
		specificTest == "schema" ||
		specificTest == "pull" ||
		specificTest == "push" ||
		specificTest == "patch" ||
		specificTest == "subscribe" ||
		specificTest == "roundtrip"

	if !needsOperation {
		return
	}

	var operationToken string
	var operationID uint
	var operationInitialized bool

	// Initialize operation (only test it if running all tests or operation-specific tests)
	if specificTest == "" || specificTest == testTypeOperation {
		r.RunTest("Operation Init", name, func() error {
			// Use empty string to get base config without operation-specific overrides
			// when running general operation tests (not tied to a specific operation type)
			token, opID, tokenErr := r.initOperationForType(ctx, client, &cfg, "")
			if tokenErr == nil {
				operationToken = token
				operationID = opID
				operationInitialized = true
			}
			return tokenErr
		})
	} else {
		// Initialize with operation-specific config if available (e.g., "pull", "push", "roundtrip")
		// Unknown operation types gracefully fall back to base config
		token, opID, tokenErr := r.initOperationForType(ctx, client, &cfg, specificTest)
		if tokenErr != nil {
			r.SkipTest(specificTest, name, fmt.Sprintf("operation initialization failed: %v", tokenErr))
			return
		}
		operationToken = token
		operationID = opID
		operationInitialized = true
	}

	// Ensure operation cleanup always happens if we initialized one
	if operationInitialized {
		defer func() {
			// Silent cleanup - errors are not critical here
			_ = client.CancelOperation(ctx, operationID)
		}()
	}

	// Only proceed with operation-dependent tests if we have a valid token
	if operationInitialized {
		r.runOperationDependentTests(
			ctx,
			name,
			&cfg,
			specificTest,
			testTypeOperation,
			client,
			operationToken,
			operationID,
			info,
		)
	}
}

// runOperationDependentTests runs tests that require an initialized operation.
func (r *TestRunner) runOperationDependentTests(
	ctx context.Context,
	name string,
	cfg *ConnectorConfig,
	specificTest string,
	testTypeOperation string,
	client *helpers.ConnectorClient,
	operationToken string,
	operationID uint,
	info *connectorsclient.ConnectorInfo,
) {
	// Create operation client for subsequent tests
	opClient := client.WithOperationToken(operationToken)

	// Run tests based on what's requested
	runAll := specificTest == ""

	// Test 4: Schema retrieval
	if runAll || specificTest == "schema" {
		r.runSchemaTest(ctx, name, opClient, info)
	}

	// Test 5: Pull capability
	if runAll || specificTest == "pull" {
		r.runPullTest(ctx, name, opClient, cfg, info)
	}

	// Test 6: Push capability
	if runAll || specificTest == "push" {
		r.runPushTest(ctx, name, opClient, cfg, info)
	}

	// Test 7: Patch capability
	if runAll || specificTest == "patch" {
		r.runPatchTest(ctx, name, opClient, cfg, info)
	}

	// Test 8: Subscribe capability
	if runAll || specificTest == "subscribe" {
		r.runSubscribeTest(ctx, name, opClient, cfg, info)
	}

	// Test 9: Round-trip test (push and pull verification)
	if runAll || specificTest == "roundtrip" {
		r.runRoundTripTest(ctx, name, opClient, cfg, info)
	}

	// Test 10-11: Operation lifecycle tests
	if runAll || specificTest == testTypeOperation {
		r.runOperationLifecycleTests(ctx, name, client, operationID)
	}
}

// runSchemaTest runs the schema test.
func (r *TestRunner) runSchemaTest(
	ctx context.Context,
	name string,
	opClient *helpers.ConnectorClient,
	info *connectorsclient.ConnectorInfo,
) {
	r.RunTest("Schema", name, func() error {
		return tests.TestSchema(ctx, opClient, info.Capabilities)
	})
}

// runPullTest runs the pull test if the capability is supported.
func (r *TestRunner) runPullTest(
	ctx context.Context,
	name string,
	opClient *helpers.ConnectorClient,
	cfg *ConnectorConfig,
	info *connectorsclient.ConnectorInfo,
) {
	if tests.HasCapability(info.Capabilities, "pull") {
		// Basic pull test
		r.RunTest("Pull", name, func() error {
			return tests.TestPull(ctx, opClient, cfg.TestData.PullPath)
		})

		// ZIP verification test
		r.RunTest("Pull (ZIP Verification)", name, func() error {
			return tests.TestPullWithZipVerification(ctx, opClient, cfg.TestData.PullPath)
		})
	} else {
		r.SkipTest("Pull", name, "capability not supported")
		r.SkipTest("Pull (ZIP Verification)", name, "capability not supported")
	}
}

// runPushTest runs the push test if the capability is supported.
func (r *TestRunner) runPushTest(
	ctx context.Context,
	name string,
	opClient *helpers.ConnectorClient,
	cfg *ConnectorConfig,
	info *connectorsclient.ConnectorInfo,
) {
	if tests.HasCapability(info.Capabilities, "push") {
		r.RunTest("Push", name, func() error {
			return tests.TestPush(ctx, opClient, cfg.TestData.PushPath, cfg.TestData.PushFile)
		})
	} else {
		r.SkipTest("Push", name, "capability not supported")
	}
}

// runPatchTest runs the patch test if the capability is supported.
func (r *TestRunner) runPatchTest(
	ctx context.Context,
	name string,
	opClient *helpers.ConnectorClient,
	cfg *ConnectorConfig,
	info *connectorsclient.ConnectorInfo,
) {
	if tests.HasCapability(info.Capabilities, "apply_patch") {
		r.RunTest("Patch", name, func() error {
			return tests.TestPatch(ctx, opClient, cfg.TestData.PatchFile)
		})
	} else {
		r.SkipTest("Patch", name, "capability not supported")
	}
}

// runSubscribeTest runs the subscribe test if the capability is supported.
func (r *TestRunner) runSubscribeTest(
	ctx context.Context,
	name string,
	opClient *helpers.ConnectorClient,
	cfg *ConnectorConfig,
	info *connectorsclient.ConnectorInfo,
) {
	if tests.HasCapability(info.Capabilities, "patch_event") {
		r.RunTest("Subscribe", name, func() error {
			return tests.TestSubscribe(ctx, opClient, cfg.TestData.WebhookURL, cfg.TestData.WebhookToken)
		})
	} else {
		r.SkipTest("Subscribe", name, "capability not supported")
	}
}

// runRoundTripTest runs the round-trip test (push then pull) if both capabilities are supported.
func (r *TestRunner) runRoundTripTest(
	ctx context.Context,
	name string,
	opClient *helpers.ConnectorClient,
	cfg *ConnectorConfig,
	info *connectorsclient.ConnectorInfo,
) {
	hasPush := tests.HasCapability(info.Capabilities, "push")
	hasPull := tests.HasCapability(info.Capabilities, "pull")

	if hasPush && hasPull {
		r.RunTest("Round-Trip (Push/Pull)", name, func() error {
			return tests.TestRoundTrip(ctx, opClient, cfg.TestData.PushPath, cfg.TestData.PushFile)
		})
	} else {
		var reason string
		switch {
		case !hasPush && !hasPull:
			reason = "push and pull capabilities not supported"
		case !hasPush:
			reason = "push capability not supported"
		default:
			reason = "pull capability not supported"
		}
		r.SkipTest("Round-Trip (Push/Pull)", name, reason)
	}
}

// runOperationLifecycleTests runs operation status and cancel tests.
func (r *TestRunner) runOperationLifecycleTests(
	ctx context.Context,
	name string,
	client *helpers.ConnectorClient,
	operationID uint,
) {
	// Test: Operation status
	r.RunTest("Operation Status", name, func() error {
		return tests.TestOperationStatus(ctx, client, operationID)
	})

	// Test: Operation status with logs verification
	r.RunTest("Operation Status (Logs)", name, func() error {
		return tests.TestOperationStatusWithLogs(ctx, client, operationID)
	})

	// Test: Operation cancel
	// Note: This test explicitly validates the cancel operation works
	// Actual cleanup is handled by defer in runConnectorTests
	// Cancel will be called twice: once here as a test, once in defer
	// This is acceptable as cancel operations should be idempotent
	r.RunTest("Operation Cancel", name, func() error {
		return tests.TestOperationCancel(ctx, client, operationID)
	})
}
