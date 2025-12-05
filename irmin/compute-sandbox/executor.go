package sandbox

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
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

	// Validate executable path to prevent directory traversal attacks
	if strings.Contains(executable, "..") {
		return result, fmt.Errorf("executable path contains directory traversal: %s", executable)
	}

	if filepath.IsAbs(executable) {
		return result, fmt.Errorf("executable path must be relative: %s", executable)
	}

	// Acquire semaphore to limit concurrent executions
	if err := e.acquireExecutionSlot(ctx, workspaceDir); err != nil {
		return result, err
	}
	defer func() { <-executionSemaphore }() // Release on return

	// Perform static analysis
	scriptPath := filepath.Join(workspaceDir, executable)
	if scanErr := e.scanScriptForDangerousPatterns(ctx, scriptPath); scanErr != nil {
		e.sandbox.logger.ErrorContext(ctx, "Failed to scan script", "error", scanErr)
		// Continue execution even if scan fails
	}

	// Security audit: Execution started
	e.sandbox.logger.InfoContext(ctx, "SECURITY_AUDIT: Script execution started",
		"workspace", filepath.Base(workspaceDir),
		"executable", executable,
		"type", executableType,
		"user", "sandbox",
		"timestamp", result.StartTime.Unix(),
		"timestamp_iso", result.StartTime.Format(time.RFC3339))

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
	result.EndTime = time.Now()

	// Format logs with timing information header
	result.Logs = e.formatLogsWithTiming(result.StartTime, result.EndTime, string(output))

	// Log execution results
	e.logExecutionResult(ctx, execErr, cmd, result)

	// Fix permissions on all files created by sandbox user
	e.fixWorkspacePermissions(ctx, workspaceDir)

	// Collect result files
	e.collectResultFiles(ctx, workspaceDir, &result)

	// Note: Resource metrics not available with direct execution
	result.ResourceUsageMetrics = ResourceUsageMetrics{}

	// Security audit: Execution completed
	exitCode := -1
	if cmd.ProcessState != nil {
		exitCode = cmd.ProcessState.ExitCode()
	}
	e.sandbox.logger.InfoContext(ctx, "SECURITY_AUDIT: Script execution completed",
		"workspace", filepath.Base(workspaceDir),
		"executable", executable,
		"type", executableType,
		"exit_code", exitCode,
		"duration_ms", result.EndTime.Sub(result.StartTime).Milliseconds(),
		"success", execErr == nil,
		"timestamp", result.EndTime.Unix(),
		"timestamp_iso", result.EndTime.Format(time.RFC3339))

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

// buildResourceLimitsPrefix returns resource limit commands for production environments.
// On Linux (production Docker), applies ulimit restrictions to prevent:
// - Disk DoS (max 1GB file size)
// - Fork bombs (max 512 processes per user)
// - File descriptor exhaustion (max 1024 open files)
// On macOS (development), returns empty string to avoid breaking local development.
func (e *executor) buildResourceLimitsPrefix() string {
	if runtime.GOOS == "linux" {
		// Production (Docker): Apply resource limits
		// ulimit -f: max file size in KB (1GB = 1048576 KB)
		// ulimit -n: max open files (1024)
		// ulimit -u: max processes per user (512 - allows concurrent Go programs with threads)
		// Note: -u is per-user limit, shared across all concurrent executions as sandbox user
		return "ulimit -f 1048576 && ulimit -n 1024 && ulimit -u 512 && "
	}
	// macOS development: Skip limits to avoid breaking local development
	return ""
}

// buildCommand builds the execution command based on executable type.
func (e *executor) buildCommand(
	ctx context.Context,
	workspaceDir, executable, executableType, apiKey, apiURL string,
) (*exec.Cmd, string, error) {
	var cmd *exec.Cmd
	var interpreterPath string

	// Get resource limits prefix (only on Linux/production)
	resourceLimits := e.buildResourceLimitsPrefix()

	// Determine if we should use sudo (only on Linux/production)
	useSudo := runtime.GOOS == "linux"

	// umask 002 ensures files are group-readable/writable (664 for files, 775 for dirs)
	// Use bash instead of sh because bash supports ulimit -u (process limit)
	// SECURITY: Pass executable as $3 positional parameter to prevent command injection
	switch executableType {
	case RuntimeTypePython:
		interpreterPath = InterpreterPython
		shellCmd := fmt.Sprintf("%sumask 002 && exec %s \"$3\" --api-key \"$1\" --api-url \"$2\"",
			resourceLimits, interpreterPath)
		if useSudo {
			cmd = exec.CommandContext(
				ctx,
				"sudo",
				"-u",
				"sandbox",
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		} else {
			// macOS development: run directly without sudo
			cmd = exec.CommandContext(
				ctx,
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		}
	case RuntimeTypeGo:
		interpreterPath = InterpreterGo
		shellCmd := fmt.Sprintf("%sumask 002 && exec %s run \"$3\" --api-key \"$1\" --api-url \"$2\"",
			resourceLimits, interpreterPath)
		if useSudo {
			cmd = exec.CommandContext(
				ctx,
				"sudo",
				"-u",
				"sandbox",
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		} else {
			// macOS development: run directly without sudo
			cmd = exec.CommandContext(
				ctx,
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		}
	case RuntimeTypeNode:
		interpreterPath = InterpreterNode
		shellCmd := fmt.Sprintf("%sumask 002 && exec %s \"$3\" --api-key \"$1\" --api-url \"$2\"",
			resourceLimits, interpreterPath)
		if useSudo {
			cmd = exec.CommandContext(
				ctx,
				"sudo",
				"-u",
				"sandbox",
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		} else {
			// macOS development: run directly without sudo
			cmd = exec.CommandContext(
				ctx,
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		}
	case RuntimeTypeTypeScript:
		interpreterPath = InterpreterTypeScript
		// Use npx ts-node to execute TypeScript files
		// SECURITY: Pass executable as $3 positional parameter to prevent command injection
		shellCmd := fmt.Sprintf("%sumask 002 && exec %s ts-node \"$3\" --api-key \"$1\" --api-url \"$2\"",
			resourceLimits, interpreterPath)
		if useSudo {
			cmd = exec.CommandContext(
				ctx,
				"sudo",
				"-u",
				"sandbox",
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		} else {
			// macOS development: run directly without sudo
			cmd = exec.CommandContext(
				ctx,
				"bash",
				"-c",
				shellCmd,
				"--",
				apiKey,
				apiURL,
				executable,
			)
		}
	default:
		return nil, "", fmt.Errorf("unsupported executable type: %s", executableType)
	}

	// Set working directory
	cmd.Dir = workspaceDir

	// CRITICAL: Use isolated environment, NOT os.Environ()
	cmd.Env = e.buildSandboxEnvironment(workspaceDir)

	// Set process group for isolation
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true, // Create new process group for easier cleanup
	}

	return cmd, interpreterPath, nil
}

// formatLogsWithTiming prepends execution timing information to the logs.
func (e *executor) formatLogsWithTiming(startTime, endTime time.Time, output string) string {
	duration := endTime.Sub(startTime)

	header := fmt.Sprintf(
		"=== Script Execution Report ===\n"+
			"Start Time:    %s\n"+
			"End Time:      %s\n"+
			"Duration:      %s\n"+
			"Duration (ms): %d\n"+
			"===============================\n\n",
		startTime.Format(time.RFC3339),
		endTime.Format(time.RFC3339),
		duration.Round(time.Millisecond).String(),
		duration.Milliseconds(),
	)

	return header + output
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
			e.sandbox.logger.InfoContext(ctx, "SECURITY_AUDIT: Result file collected",
				"file", fileName,
				"size", len(data),
				"workspace", filepath.Base(workspaceDir))
		} else {
			e.sandbox.logger.WarnContext(ctx, "SECURITY_AUDIT: Failed to read result file",
				"file", fileName,
				"error", readErr,
				"workspace", filepath.Base(workspaceDir))
		}
	}

	if len(resultFileData) > 0 {
		result.ResultFiles = resultFileData
	}
}

// fixWorkspacePermissions ensures all files in workspace are group-readable/writable.
func (e *executor) fixWorkspacePermissions(ctx context.Context, workspaceDir string) {
	if ctx.Err() != nil {
		return
	}

	// Walk the workspace and fix permissions on all files/dirs created by sandbox user
	//nolint:nilerr // We want to continue walking even on errors
	_ = filepath.Walk(workspaceDir, func(path string, info os.FileInfo, walkError error) error {
		if walkError != nil {
			return nil // Skip errors, continue walking
		}

		// Skip _input directory and Go cache (already handled)
		if strings.Contains(path, "/_input/") || strings.Contains(path, "/.go/") {
			return nil
		}

		if info.IsDir() {
			// Set directories to 02770 (setgid + group-writable)
			//nolint:gosec // G302: Group-writable with setgid for shared access
			if chmodErr := os.Chmod(path, 02770); chmodErr != nil {
				e.sandbox.logger.WarnContext(ctx, "Failed to chmod directory",
					"path", path,
					"error", chmodErr)
			}
		} else {
			// Set files to 0660 (group-readable/writable)
			//nolint:gosec // G306: Group-writable for shared access
			if chmodErr := os.Chmod(path, 0660); chmodErr != nil {
				e.sandbox.logger.WarnContext(ctx, "Failed to chmod file",
					"path", path,
					"error", chmodErr)
			}
		}
		return nil
	})
}

// installGoSDK installs Go SDK directly.
func (e *executor) installGoSDK(ctx context.Context, workspaceTempDir, projectName string) error {
	// Check for context cancellation
	if ctx.Err() != nil {
		return ctx.Err()
	}

	// Initialize go module with umask for group-writable files
	// SECURITY: Pass projectName as positional parameter to prevent injection
	shellCmd := "umask 002 && exec /usr/local/go/bin/go mod init \"$1\""
	initCmd := exec.CommandContext(ctx, "sh", "-c", shellCmd, "--", projectName)
	initCmd.Dir = workspaceTempDir
	initCmd.Env = e.buildSandboxEnvironment(workspaceTempDir)
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

	editShellCmd := fmt.Sprintf("umask 002 && exec /usr/local/go/bin/go mod edit -go=%s", LatestGoVersion)
	editCmd := exec.CommandContext(ctx, "sh", "-c", editShellCmd)
	editCmd.Dir = workspaceTempDir
	editCmd.Env = e.buildSandboxEnvironment(workspaceTempDir)
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

		getShellCmd := fmt.Sprintf("umask 002 && exec /usr/local/go/bin/go get \"%s\"", pkg)
		getCmd := exec.CommandContext(ctx, "sh", "-c", getShellCmd)
		getCmd.Dir = workspaceTempDir
		getCmd.Env = e.buildSandboxEnvironment(workspaceTempDir)
		if output, err := getCmd.CombinedOutput(); err != nil {
			e.sandbox.logger.ErrorContext(ctx, "go get failed",
				"package", pkg,
				"error", err,
				"output", string(output))
			return fmt.Errorf("go get %s failed: %w\nOutput: %s", pkg, err, string(output))
		}
		e.sandbox.logger.InfoContext(ctx, "Go package installed", "package", pkg)
	}

	// Fix permissions on Go module cache (Go creates read-only files by design)
	// Make all files/dirs group-writable so appuser can clean them up
	modCache := filepath.Join(workspaceTempDir, ".go", "pkg", "mod")
	//nolint:nilerr // We want to continue walking even on errors
	if walkErr := filepath.Walk(modCache, func(path string, info os.FileInfo, walkError error) error {
		if walkError != nil {
			return nil // Skip errors, continue walking
		}
		if info.IsDir() {
			// Set directories to 02770 (setgid + group-writable)
			//nolint:gosec // G302: Group-writable with setgid for cleanup
			_ = os.Chmod(path, 02770)
		} else {
			// Set files to 0660 (group-writable)
			//nolint:gosec // G306: Group-writable for cleanup
			_ = os.Chmod(path, 0660)
		}
		return nil
	}); walkErr != nil {
		e.sandbox.logger.WarnContext(ctx, "Failed to fix module cache permissions",
			"error", walkErr)
	}

	return nil
}
