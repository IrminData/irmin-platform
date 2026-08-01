package sandbox

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/daytonaio/daytona/libs/sdk-go/pkg/daytona"
	"github.com/daytonaio/daytona/libs/sdk-go/pkg/options"
)

// executionSemaphore limits concurrent executions to prevent resource exhaustion.
//
//nolint:gochecknoglobals // Semaphore needs to be global to control concurrency across all executions
var executionSemaphore = make(chan struct{}, MaxConcurrentExecutions)

// executeDaytona runs the script inside a Daytona sandbox.
// It creates a sandbox, uploads files, installs runtime dependencies,
// executes the script, and collects result files.
func (s *ComputeSandbox) executeDaytona(
	ctx context.Context,
	scriptContent string,
	inputFiles map[string][]byte,
	runtimeType, scriptFileName, apiKey, apiURL string,
) (ExecutionResult, error) {
	var result ExecutionResult
	result.StartTime = time.Now()

	// Check context before starting
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Acquire semaphore to limit concurrent sandbox creations
	if err := s.acquireExecutionSlot(ctx); err != nil {
		return result, err
	}
	defer func() { <-executionSemaphore }()

	// Scan script for dangerous patterns (advisory only)
	s.scanScriptContent(ctx, scriptContent, scriptFileName)

	// Security audit: Execution started
	s.logger.InfoContext(ctx, "SECURITY_AUDIT: Script execution started",
		"type", runtimeType,
		"timestamp", result.StartTime.Unix(),
		"timestamp_iso", result.StartTime.Format(time.RFC3339))

	// Create Daytona sandbox
	envVars := map[string]string{
		"LANG":   "C.UTF-8",
		"LC_ALL": "C.UTF-8",
	}

	sb, snapshotUsed, err := s.daytona.createSandbox(ctx, runtimeType, envVars)
	if err != nil {
		return result, fmt.Errorf("failed to create sandbox: %w", err)
	}
	// Always clean up the sandbox, even on error
	defer s.deleteSandbox(sb)

	// Upload script file
	scriptPath := filepath.Join(SandboxWorkDir, scriptFileName)
	if uploadErr := sb.FileSystem.UploadFile(ctx, []byte(scriptContent), scriptPath); uploadErr != nil {
		return result, fmt.Errorf("failed to upload script: %w", uploadErr)
	}

	// Upload input files
	if uploadErr := s.uploadInputFiles(ctx, sb, inputFiles); uploadErr != nil {
		return result, fmt.Errorf("failed to upload input files: %w", uploadErr)
	}

	// Install runtime SDK if needed. Skipped when the sandbox booted from a snapshot,
	// since the snapshot is expected to have the SDK pre-baked (see seed-snapshots).
	if !snapshotUsed {
		if installErr := s.installRuntimeSDK(ctx, sb, runtimeType); installErr != nil {
			return result, fmt.Errorf("failed to install runtime SDK: %w", installErr)
		}
	}

	// Execute the script
	cmd := s.buildExecutionCommand(runtimeType, scriptFileName, apiKey, apiURL)
	s.logger.InfoContext(ctx, "Executing script in Daytona sandbox",
		"sandbox_id", sb.ID,
		"runtime", runtimeType,
		"script", scriptFileName)

	execResp, execErr := sb.Process.ExecuteCommand(ctx, cmd, options.WithCwd(SandboxWorkDir))
	result.EndTime = time.Now()
	result.ContainerID = sb.ID

	// Build logs from execution output — only format when the command actually ran,
	// so that infrastructure failures (execResp == nil) leave Logs empty and allow
	// the caller to distinguish them from script-level errors.
	exitCode := -1
	if execResp != nil {
		exitCode = execResp.ExitCode
		result.Logs = s.formatLogsWithTiming(result.StartTime, result.EndTime, execResp.Result)
	}

	// Collect result files from sandbox
	s.collectResultFilesFromSandbox(ctx, sb, &result)

	// Determine the final error: infrastructure failure takes priority,
	// otherwise a non-zero exit code is treated as a script execution failure.
	if execErr == nil && exitCode != 0 {
		execErr = fmt.Errorf("script exited with code %d", exitCode)
	}

	// Security audit: Execution completed
	s.logger.InfoContext(ctx, "SECURITY_AUDIT: Script execution completed",
		"sandbox_id", sb.ID,
		"type", runtimeType,
		"exit_code", exitCode,
		"duration_ms", result.EndTime.Sub(result.StartTime).Milliseconds(),
		"success", execErr == nil,
		"timestamp", result.EndTime.Unix(),
		"timestamp_iso", result.EndTime.Format(time.RFC3339))

	return result, execErr
}

// acquireExecutionSlot acquires a semaphore slot for execution.
func (s *ComputeSandbox) acquireExecutionSlot(ctx context.Context) error {
	select {
	case executionSemaphore <- struct{}{}:
		s.logger.InfoContext(ctx, "Acquired execution slot")
		return nil
	case <-ctx.Done():
		return fmt.Errorf("execution cancelled while waiting for slot: %w", ctx.Err())
	}
}

// uploadInputFiles uploads all input files to the sandbox's _input directory.
func (s *ComputeSandbox) uploadInputFiles(
	ctx context.Context,
	sb *daytona.Sandbox,
	inputFiles map[string][]byte,
) error {
	if len(inputFiles) == 0 {
		return nil
	}

	// Create _input directory
	inputDir := filepath.Join(SandboxWorkDir, "_input")
	if err := sb.FileSystem.CreateFolder(ctx, inputDir); err != nil {
		return fmt.Errorf("failed to create _input directory: %w", err)
	}

	for filePath, content := range inputFiles {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		// Validate input file path
		if strings.Contains(filePath, "..") {
			return fmt.Errorf("input file path contains directory traversal: %s", filePath)
		}
		if filepath.IsAbs(filePath) {
			return fmt.Errorf("input file path must be relative: %s", filePath)
		}

		remotePath := filepath.Join(inputDir, filePath)

		// Create all intermediate directories between inputDir and the file's parent.
		// CreateFolder may not create parents recursively, so walk from inputDir down.
		if dir := filepath.Dir(remotePath); dir != inputDir {
			if mkdirErr := s.createParentDirs(ctx, sb, inputDir, dir); mkdirErr != nil {
				return fmt.Errorf("failed to create directory for %s: %w", filePath, mkdirErr)
			}
		}

		if uploadErr := sb.FileSystem.UploadFile(ctx, content, remotePath); uploadErr != nil {
			return fmt.Errorf("failed to upload input file %s: %w", filePath, uploadErr)
		}

		s.logger.InfoContext(ctx, "Input file uploaded", "file", filePath)
	}

	return nil
}

// createParentDirs creates all intermediate directories between baseDir and targetDir.
// It collects the directory chain and creates them top-down to handle APIs
// that do not recursively create parent directories.
func (s *ComputeSandbox) createParentDirs(
	ctx context.Context,
	sb *daytona.Sandbox,
	baseDir, targetDir string,
) error {
	// Collect directories from targetDir up to (but not including) baseDir
	var dirs []string
	for dir := targetDir; dir != baseDir && dir != filepath.Dir(dir); dir = filepath.Dir(dir) {
		dirs = append(dirs, dir)
	}

	// Create top-down (reverse order)
	for i := len(dirs) - 1; i >= 0; i-- {
		if err := sb.FileSystem.CreateFolder(ctx, dirs[i]); err != nil {
			return err
		}
	}
	return nil
}

// installRuntimeSDK installs the appropriate SDK inside the sandbox.
//
// Coupling note: this is bypassed by executeDaytona when the sandbox booted from a
// Daytona snapshot. If you extend snapshotForRuntime to a new runtime (e.g. Python,
// Node), you MUST also bake that runtime's SDK install into the corresponding snapshot
// inside SeedSnapshots — otherwise scripts will fail at execute time with a missing
// import. Keep snapshotForRuntime, SeedSnapshots, and this function in sync.
func (s *ComputeSandbox) installRuntimeSDK(
	ctx context.Context,
	sb *daytona.Sandbox,
	runtimeType string,
) error {
	if runtimeType != RuntimeTypeGo {
		return nil
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	s.logger.InfoContext(ctx, "Installing Go SDK in sandbox", "sandbox_id", sb.ID)

	// Initialize Go module (mkdir -p ensures the workspace directory exists)
	initCmd := fmt.Sprintf(
		"sh -c 'mkdir -p %s && cd %s && go mod init sandbox && go mod edit -go=%s 2>&1'",
		SandboxWorkDir, SandboxWorkDir, LatestGoVersion,
	)
	if resp, err := sb.Process.ExecuteCommand(ctx, initCmd); err != nil {
		return fmt.Errorf("go mod init failed: %w", err)
	} else if resp.ExitCode != 0 {
		return fmt.Errorf("go mod init failed (exit %d): %s", resp.ExitCode, resp.Result)
	}

	// Install SDK packages
	packages := []string{
		"github.com/IrminData/irmin-platform/sdks/go/api@" + GoSDKVersion,
		"github.com/IrminData/irmin-platform/sdks/go/utils@" + GoSDKVersion,
	}

	for _, pkg := range packages {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		getCmd := fmt.Sprintf("sh -c 'cd %s && go get %s 2>&1'", SandboxWorkDir, pkg)
		resp, err := sb.Process.ExecuteCommand(ctx, getCmd)
		if err != nil {
			return fmt.Errorf("go get %s failed: %w", pkg, err)
		}
		if resp.ExitCode != 0 {
			return fmt.Errorf("go get %s failed (exit %d): %s", pkg, resp.ExitCode, resp.Result)
		}
		s.logger.InfoContext(ctx, "Go package installed", "package", pkg)
	}

	return nil
}

// buildExecutionCommand builds the shell command to execute the script.
// Commands are wrapped in sh -c with 2>&1 to capture both stdout and stderr,
// since Daytona's ExecuteCommand only returns stdout in the response.
func (s *ComputeSandbox) buildExecutionCommand(
	runtimeType, scriptFileName, apiKey, apiURL string,
) string {
	var inner string
	switch runtimeType {
	case RuntimeTypeGo:
		inner = fmt.Sprintf("go run %s --api-key %q --api-url %q", scriptFileName, apiKey, apiURL)
	case RuntimeTypePython:
		inner = fmt.Sprintf("python3 %s --api-key %q --api-url %q", scriptFileName, apiKey, apiURL)
	case RuntimeTypeNode:
		inner = fmt.Sprintf("node %s --api-key %q --api-url %q", scriptFileName, apiKey, apiURL)
	default:
		inner = fmt.Sprintf("./%s --api-key %q --api-url %q", scriptFileName, apiKey, apiURL)
	}
	return fmt.Sprintf("sh -c %s", shellescape(inner+" 2>&1"))
}

// collectResultFilesFromSandbox downloads result files from the sandbox based on log parsing.
func (s *ComputeSandbox) collectResultFilesFromSandbox(
	ctx context.Context,
	sb *daytona.Sandbox,
	result *ExecutionResult,
) {
	if result.Logs == "" || ctx.Err() != nil {
		return
	}

	resultFiles := s.parseResultFiles(result.Logs)
	resultFileData := make(map[string][]byte)

	for _, fileName := range resultFiles {
		if ctx.Err() != nil {
			break
		}

		// Validate result file name to prevent path traversal
		if strings.Contains(fileName, "..") || filepath.IsAbs(fileName) {
			s.logger.WarnContext(ctx, "SECURITY_AUDIT: Skipping result file with suspicious path",
				"file", fileName,
				"sandbox_id", sb.ID)
			continue
		}

		remotePath := filepath.Join(SandboxWorkDir, fileName)
		data, err := sb.FileSystem.DownloadFile(ctx, remotePath, nil)
		if err == nil {
			resultFileData[fileName] = data
			s.logger.InfoContext(ctx, "SECURITY_AUDIT: Result file collected",
				"file", fileName,
				"size", len(data),
				"sandbox_id", sb.ID)
		} else {
			s.logger.WarnContext(ctx, "SECURITY_AUDIT: Failed to read result file",
				"file", fileName,
				"error", err,
				"sandbox_id", sb.ID)
		}
	}

	if len(resultFileData) > 0 {
		result.ResultFiles = resultFileData
	}
}

// deleteSandbox deletes a Daytona sandbox, logging any errors.
// Uses context.Background() to ensure cleanup runs even if the parent context is cancelled.
func (s *ComputeSandbox) deleteSandbox(sb *daytona.Sandbox) {
	cleanupCtx := context.Background()
	if err := sb.Delete(cleanupCtx); err != nil {
		s.logger.ErrorContext(cleanupCtx, "Error deleting Daytona sandbox",
			"sandbox_id", sb.ID,
			"error", err)
	} else {
		s.logger.InfoContext(cleanupCtx, "Daytona sandbox deleted", "sandbox_id", sb.ID)
	}
}

// formatLogsWithTiming prepends execution timing information to the logs.
func (s *ComputeSandbox) formatLogsWithTiming(startTime, endTime time.Time, output string) string {
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

// shellescape wraps a string in single quotes for safe use as a sh -c argument.
func shellescape(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'"
}

// scanScriptContent performs static analysis on script content before uploading.
func (s *ComputeSandbox) scanScriptContent(ctx context.Context, content, scriptFileName string) {
	dangerousPatterns := []DangerousPattern{
		{Pattern: "/app", Description: "Accessing application directory", Severity: "high"},
		{Pattern: "/etc/passwd", Description: "Accessing system password file", Severity: "high"},
		{Pattern: "/etc/shadow", Description: "Accessing system shadow file", Severity: "high"},
		{Pattern: "../", Description: "Directory traversal attempt", Severity: "high"},
		{Pattern: "/proc/", Description: "Accessing process information", Severity: "medium"},
		{Pattern: "/sys/", Description: "Accessing system information", Severity: "medium"},
		{Pattern: "$HOME", Description: "Home directory access", Severity: "medium"},
		{Pattern: "os.environ", Description: "Environment variable access (Python)", Severity: "medium"},
		{Pattern: "process.env", Description: "Environment variable access (Node)", Severity: "medium"},
		{Pattern: "os.Getenv", Description: "Environment variable access (Go)", Severity: "medium"},
	}

	for _, dp := range dangerousPatterns {
		if strings.Contains(content, dp.Pattern) {
			s.logger.WarnContext(ctx, "SECURITY_ALERT: Dangerous pattern",
				"pattern", dp.Pattern,
				"description", dp.Description,
				"severity", dp.Severity,
				"script", scriptFileName)
		}
	}
}
