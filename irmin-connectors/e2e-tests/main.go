package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"irmin-connectors/e2e-tests/runner"
)

const (
	defaultConfigPath = "test-config.json"
	exampleConfigPath = "test-config.example.json"
	defaultLocale     = "en"
)

func main() {
	// Define command-line flags
	var (
		configPath = flag.String("config", defaultConfigPath, "Path to test configuration file")
		connector  = flag.String("connector", "", "Run tests for a specific connector only")
		test       = flag.String(
			"test",
			"",
			"Run a specific test type (info, config, operation, pull, push, patch, schema, subscribe)",
		)
		verbose    = flag.Bool("v", false, "Enable verbose output")
		locale     = flag.String("locale", defaultLocale, "Locale for connector API requests")
		initConfig = flag.Bool("init", false, "Generate a test-config.json from the example template")
		help       = flag.Bool("help", false, "Show help message")
	)

	flag.Parse()

	// Show help if requested
	if *help {
		printHelp()
		os.Exit(0)
	}

	// Handle config initialization
	if *initConfig {
		if initErr := initializeConfig(); initErr != nil {
			fmt.Fprintf(os.Stderr, "Error initializing config: %v\n", initErr)
			os.Exit(1)
		}
		fmt.Fprintf(os.Stderr, "✓ Configuration file created at %s\n", defaultConfigPath)
		fmt.Fprintf(os.Stderr, "Please edit the file and add your connector credentials before running tests.\n")
		os.Exit(0)
	}

	// Load test configuration
	config, err := runner.LoadConfig(*configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading config: %v\n", err)
		fmt.Fprintf(os.Stderr, "\nHint: Run with -init flag to create a configuration file from the template.\n")
		os.Exit(1)
	}

	// Validate at least one connector is enabled
	enabledConnectors := config.GetEnabledConnectors()
	if len(enabledConnectors) == 0 {
		fmt.Fprintf(os.Stderr, "No enabled connectors found in configuration file.\n")
		fmt.Fprintf(os.Stderr, "Please enable at least one connector in %s\n", *configPath)
		os.Exit(1)
	}

	// Create test runner
	testRunner := runner.NewTestRunner(config, *verbose, *locale)

	// Run tests
	ctx := context.Background()
	if runErr := testRunner.RunAll(ctx, *connector, *test); runErr != nil {
		os.Exit(1)
	}

	os.Exit(0)
}

// printHelp displays the help message.
func printHelp() {
	help := `Irmin Connectors E2E Test Suite

Usage:
  go run main.go [flags]

Flags:
  -config string
        Path to test configuration file (default "test-config.json")
  -connector string
        Run tests for a specific connector only (e.g., "postgres", "mysql")
  -test string
        Run a specific test type: info, config, operation, pull, push, patch, schema, subscribe
  -v
        Enable verbose output
  -locale string
        Locale for connector API requests (default "en")
  -init
        Generate a test-config.json from the example template
  -help
        Show this help message

Examples:
  # Run all tests for all enabled connectors
  go run main.go

  # Run tests for a specific connector
  go run main.go -connector postgres

  # Run a specific test type across all connectors
  go run main.go -test pull

  # Run with verbose output
  go run main.go -v

  # Initialize configuration file
  go run main.go -init
`
	_, _ = io.WriteString(os.Stderr, help)
}

// initializeConfig creates a test-config.json from the example template.
func initializeConfig() error {
	// Read the example config
	exampleData, err := os.ReadFile(exampleConfigPath)
	if err != nil {
		return fmt.Errorf("failed to read example config: %w", err)
	}

	// Parse and re-format to ensure valid JSON
	var config map[string]any
	if unmarshalErr := json.Unmarshal(exampleData, &config); unmarshalErr != nil {
		return fmt.Errorf("failed to parse example config: %w", unmarshalErr)
	}

	// Format with indentation
	formattedData, marshalErr := json.MarshalIndent(config, "", "  ")
	if marshalErr != nil {
		return fmt.Errorf("failed to format config: %w", marshalErr)
	}

	// Ensure directory exists
	dir := filepath.Dir(defaultConfigPath)
	if mkdirErr := os.MkdirAll(dir, 0750); mkdirErr != nil {
		return fmt.Errorf("failed to create directory: %w", mkdirErr)
	}

	// Write the config file
	if writeErr := os.WriteFile(defaultConfigPath, formattedData, 0600); writeErr != nil {
		return fmt.Errorf("failed to write config file: %w", writeErr)
	}

	return nil
}
