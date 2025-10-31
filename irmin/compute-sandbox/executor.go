package sandbox

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// executionSemaphore limits concurrent executions to prevent resource exhaustion.
//
//nolint:gochecknoglobals // Semaphore needs to be global to control concurrency across all executions
var executionSemaphore = make(chan struct{}, MaxConcurrentExecutions)

// executor handles direct script execution without sandboxing.
type executor struct {
	sandbox *ComputeSandbox
}

// newExecutor creates a new direct executor.
func newExecutor(s *ComputeSandbox) *executor {
	return &executor{sandbox: s}
}

// execute runs the script directly with concurrency control.
func (e *executor) execute(
	ctx context.Context,
	workspaceDir, executable, executableType, apiKey, apiURL string,
) (ExecutionResult, error) {
	var result ExecutionResult
	result.StartTime = time.Now()

	// Check context before starting
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Acquire semaphore to limit concurrent executions
	if err := e.acquireExecutionSlot(ctx, workspaceDir); err != nil {
		return result, err
	}
	defer func() { <-executionSemaphore }() // Release on return

	// Build and configure command
	cmd, interpreterPath, err := e.buildCommand(ctx, workspaceDir, executable, executableType, apiKey, apiURL)
	if err != nil {
		return result, err
	}

	// Execute script
	e.sandbox.logger.InfoContext(ctx, "Executing script",
		"workspace", workspaceDir,
		"type", executableType,
		"interpreter", interpreterPath,
		"executable", executable)

	output, execErr := cmd.CombinedOutput()
	result.Logs = string(output)
	result.EndTime = time.Now()

	// Log execution results
	e.logExecutionResult(ctx, execErr, cmd, result)

	// Collect result files
	e.collectResultFiles(ctx, workspaceDir, &result)

	// Note: Resource metrics not available with direct execution
	result.ResourceUsageMetrics = ResourceUsageMetrics{}

	return result, execErr
}

// acquireExecutionSlot acquires a semaphore slot for execution.
func (e *executor) acquireExecutionSlot(ctx context.Context, workspaceDir string) error {
	select {
	case executionSemaphore <- struct{}{}:
		// Successfully acquired slot
		e.sandbox.logger.InfoContext(ctx, "Acquired execution slot",
			"workspace", filepath.Base(workspaceDir))
		return nil
	case <-ctx.Done():
		return fmt.Errorf("execution cancelled while waiting for slot: %w", ctx.Err())
	}
}

// buildCommand builds the execution command based on executable type.
func (e *executor) buildCommand(
	ctx context.Context,
	workspaceDir, executable, executableType, apiKey, apiURL string,
) (*exec.Cmd, string, error) {
	var cmd *exec.Cmd
	var interpreterPath string

	switch executableType {
	case RuntimeTypePython:
		interpreterPath = InterpreterPython
		cmd = exec.CommandContext(ctx, interpreterPath, executable, "--api-key", apiKey, "--api-url", apiURL)
	case RuntimeTypeGo:
		interpreterPath = InterpreterGo
		cmd = exec.CommandContext(ctx, interpreterPath, "run", executable, "--api-key", apiKey, "--api-url", apiURL)
	case RuntimeTypeNode:
		interpreterPath = InterpreterNode
		cmd = exec.CommandContext(ctx, interpreterPath, executable, "--api-key", apiKey, "--api-url", apiURL)
	default:
		return nil, "", fmt.Errorf("unsupported executable type: %s", executableType)
	}

	// Set working directory
	cmd.Dir = workspaceDir

	// Set up environment
	cmd.Env = os.Environ()

	// Set up Go cache for Go scripts
	if executableType == RuntimeTypeGo {
		e.setupGoCache(cmd)
	}

	return cmd, interpreterPath, nil
}

// setupGoCache configures Go cache directories for Go script execution.
func (e *executor) setupGoCache(cmd *exec.Cmd) {
	goCacheDir := filepath.Join(os.TempDir(), "irmin-go-cache")
	if mkdirErr := os.MkdirAll(goCacheDir, 0750); mkdirErr == nil {
		cmd.Env = append(cmd.Env,
			fmt.Sprintf("GOPATH=%s", goCacheDir),
			fmt.Sprintf("GOMODCACHE=%s/pkg/mod", goCacheDir),
		)
	}
}

// logExecutionResult logs the outcome of script execution.
func (e *executor) logExecutionResult(ctx context.Context, execErr error, cmd *exec.Cmd, result ExecutionResult) {
	if execErr != nil {
		exitCode := -1
		if cmd.ProcessState != nil {
			exitCode = cmd.ProcessState.ExitCode()
		}
		e.sandbox.logger.ErrorContext(ctx, "Script execution failed",
			"error", execErr,
			"exit_code", exitCode,
			"output", result.Logs,
			"output_length", len(result.Logs))
	} else {
		e.sandbox.logger.InfoContext(ctx, "Script execution completed successfully",
			"duration", result.EndTime.Sub(result.StartTime))
	}
}

// collectResultFiles collects result files from workspace.
func (e *executor) collectResultFiles(ctx context.Context, workspaceDir string, result *ExecutionResult) {
	if result.Logs == "" || ctx.Err() != nil {
		return
	}

	resultFiles := e.sandbox.parseResultFiles(result.Logs)
	resultFileData := make(map[string][]byte)

	for _, fileName := range resultFiles {
		// Check for context cancellation
		if ctx.Err() != nil {
			break
		}

		// Read file from workspace
		fullPath := filepath.Join(workspaceDir, fileName)
		if data, readErr := os.ReadFile(fullPath); readErr == nil {
			resultFileData[fileName] = data
			e.sandbox.logger.InfoContext(ctx, "Result file collected", "file", fileName, "size", len(data))
		} else {
			e.sandbox.logger.WarnContext(ctx, "Failed to read result file", "file", fileName, "error", readErr)
		}
	}

	if len(resultFileData) > 0 {
		result.ResultFiles = resultFileData
	}
}

// installGoSDK installs Go SDK directly.
func (e *executor) installGoSDK(ctx context.Context, workspaceTempDir, projectName string) error {
	// Check for context cancellation
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Initialize go module
	initCmd := exec.CommandContext(ctx, "go", "mod", "init", projectName)
	initCmd.Dir = workspaceTempDir
	if output, err := initCmd.CombinedOutput(); err != nil {
		e.sandbox.logger.ErrorContext(ctx, "go mod init failed",
			"error", err,
			"output", string(output))
		return fmt.Errorf("go mod init failed: %w\nOutput: %s", err, string(output))
	}

	// Update go version
	if ctx.Err() != nil {
		return ctx.Err()
	}

	//nolint:gosec // LatestGoVersion is a constant, not user input
	editCmd := exec.CommandContext(ctx, "go", "mod", "edit", fmt.Sprintf("-go=%s", LatestGoVersion))
	editCmd.Dir = workspaceTempDir
	if output, err := editCmd.CombinedOutput(); err != nil {
		e.sandbox.logger.ErrorContext(ctx, "go mod edit failed",
			"error", err,
			"output", string(output))
		return fmt.Errorf("go mod edit failed: %w\nOutput: %s", err, string(output))
	}

	// Install packages
	packages := []string{
		"github.com/IrminData/irmin-sdk-go",
		"github.com/IrminData/irmin-sdk-go/api",
		"github.com/IrminData/irmin-sdk-go/utils",
	}

	for _, pkg := range packages {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		getCmd := exec.CommandContext(ctx, "go", "get", pkg)
		getCmd.Dir = workspaceTempDir
		if output, err := getCmd.CombinedOutput(); err != nil {
			e.sandbox.logger.ErrorContext(ctx, "go get failed",
				"package", pkg,
				"error", err,
				"output", string(output))
			return fmt.Errorf("go get %s failed: %w\nOutput: %s", pkg, err, string(output))
		}
		e.sandbox.logger.InfoContext(ctx, "Go package installed", "package", pkg)
	}

	return nil
}
