package sandbox

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// ExecutionResult holds the container logs and raw metric samples collected during execution.
type ExecutionResult struct {
	StartTime            time.Time            `json:"start_time"`             // Start time of the container
	EndTime              time.Time            `json:"end_time"`               // End time of the container
	ContainerID          string               `json:"container_id"`           // Container ID (short form)
	Logs                 string               `json:"logs"`                   // Output logs from container execution
	ResourceUsageMetrics ResourceUsageMetrics `json:"resource_usage_metrics"` // Averace metric values, sampled every 10 milliseconds of execution
	ResultFiles          map[string][]byte    `json:"result_files"`           // Map of result files and their contents
}

// buildDockerRunCommand constructs the docker run command arguments based on the executable type.
func (s *ComputeSandbox) buildDockerRunCommand(tmpDir, executable, executableType, apiKey, apiURL string) []string {
	args := []string{"run", "-d",
		"-v", fmt.Sprintf("%s:/usr/src/app", tmpDir),
		"-w", "/usr/src/app",
	}

	switch executableType {
	case "python":
		args = append(args,
			fmt.Sprintf("python:%s", LatestPythonVersion),
			"python",
			executable,
			"--api-key", apiKey,
			"--api-url", apiURL,
		)
	case "go":
		args = append(args,
			fmt.Sprintf("golang:%s", LatestGoVersion),
			"go", "run",
			executable,
			"--api-key", apiKey,
			"--api-url", apiURL,
		)
	case "node":
		args = append(args,
			fmt.Sprintf("node:%s", LatestNodeVersion),
			"node",
			executable,
			"--api-key", apiKey,
			"--api-url", apiURL,
		)
	}
	return args
}

// collectContainerMetrics starts a container and collects its metrics.
func (s *ComputeSandbox) collectContainerMetrics(
	ctx context.Context,
	tmpDir, executable, executableType, apiKey, apiURL string,
) (string, ResourceUsageMetrics) {
	containerIDChan := make(chan string, 1)
	doneChan := make(chan struct{})

	go func() {
		defer close(doneChan)

		args := s.buildDockerRunCommand(tmpDir, executable, executableType, apiKey, apiURL)
		if len(args) == 0 {
			return
		}

		// Use context with timeout for container start
		startCtx, cancel := context.WithTimeout(ctx, ContainerStartTimeout)
		defer cancel()

		cmd := exec.CommandContext(startCtx, "docker", args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			s.logger.Error("docker run failed", "error", err, "output", string(output))
			return
		}

		containerID := strings.TrimSpace(string(output))
		containerIDChan <- containerID
	}()

	select {
	case containerID := <-containerIDChan:
		if containerID == "" {
			return "", ResourceUsageMetrics{}
		}
		metrics := s.CollectMetricsFromContainer(ctx, containerID)
		return containerID, metrics
	case <-doneChan:
		return "", ResourceUsageMetrics{}
	case <-ctx.Done():
		s.logger.InfoContext(ctx, "Container start cancelled", "error", ctx.Err())
		return "", ResourceUsageMetrics{}
	}
}

// cleanupContainer removes the container and logs any errors.
func (s *ComputeSandbox) cleanupContainer(ctx context.Context, containerID string) {
	if containerID == "" {
		return
	}

	// Sanitize container ID to prevent command injection
	sanitizedID := sanitizeContainerID(containerID)
	if sanitizedID == "" {
		s.logger.ErrorContext(ctx, "Invalid container ID for cleanup", "containerID", containerID)
		return
	}

	// Use context with timeout for cleanup
	cleanupCtx, cancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancel()

	rmCmd := exec.CommandContext(cleanupCtx, "docker", "rm", sanitizedID)
	if err := rmCmd.Run(); err != nil {
		s.logger.ErrorContext(ctx, "Error removing container", "error", err)
	}
}

// getContainerLogs retrieves logs and exit code from the container.
func (s *ComputeSandbox) getContainerLogs(ctx context.Context, containerID string) (string, error) {
	if containerID == "" {
		return "", nil
	}

	// Sanitize container ID to prevent command injection
	sanitizedID := sanitizeContainerID(containerID)
	if sanitizedID == "" {
		return "", fmt.Errorf("invalid container ID: %s", containerID)
	}

	// Use context with timeout for logs retrieval
	logsCtx, cancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancel()

	logsCmd := exec.CommandContext(logsCtx, "docker", "logs", sanitizedID)
	logsOutput, err := logsCmd.CombinedOutput()
	if err != nil {
		return string(logsOutput), err
	}

	// Log the exit code for debugging
	waitCtx, waitCancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer waitCancel()

	waitCmd := exec.CommandContext(waitCtx, "docker", "wait", sanitizedID)
	if waitOutput, waitErr := waitCmd.CombinedOutput(); waitErr == nil {
		if exitCode, atoiErr := strconv.Atoi(strings.TrimSpace(string(waitOutput))); atoiErr == nil && exitCode != 0 {
			s.logger.InfoContext(ctx, "Container completed with non-zero exit code",
				"container", containerID,
				"exit_code", exitCode)
		}
	}

	return string(logsOutput), nil
}

// runInDocker executes the provided executable code using a Docker container,
// continuously collects resource usage statistics (every 10 milliseconds) while the container is running,
// and then returns the container logs along with arrays of raw metric samples.
// Memory usage is collected in bytes, not as a percentage.
// The executableType parameter specifies the type of executable (e.g., "python", "go", "node").
// The tmpDir parameter is the path to the temporary directory where the executable code is located.
// The executable parameter is the name of the executable file to run inside the container.
// The function returns an ExecutionResult struct containing the container logs and resource usage metrics.
func (s *ComputeSandbox) runInDocker(
	ctx context.Context,
	executable, tmpDir, executableType, apiKey, apiURL string,
) (ExecutionResult, error) {
	var result ExecutionResult
	result.StartTime = time.Now()

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Start container and collect metrics
	containerID, metrics := s.collectContainerMetrics(ctx, tmpDir, executable, executableType, apiKey, apiURL)
	result.ContainerID = containerID
	result.ResourceUsageMetrics = metrics

	// Ensure container cleanup using background context to avoid cancellation issues
	if containerID != "" {
		defer func() {
			cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), ContainerCleanupTimeout)
			defer cleanupCancel()
			s.cleanupContainer(cleanupCtx, containerID)
		}()
	}

	// Check for context cancellation before getting logs
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Get container logs
	logs, err := s.getContainerLogs(ctx, containerID)
	if err != nil {
		result.Logs = logs
		return result, err
	}
	result.Logs = logs

	// Process result files if logs exist and context not cancelled
	if logs != "" && ctx.Err() == nil {
		resultFiles := s.parseResultFiles(logs)
		resultFileData := make(map[string][]byte)

		for _, fileName := range resultFiles {
			// Check for context cancellation before each file read
			if ctx.Err() != nil {
				break
			}

			containerFilePath := filepath.Join("/usr/src/app", fileName)
			if data, readResultErr := s.readResultFileFromContainer(ctx, containerID, containerFilePath); readResultErr == nil {
				resultFileData[fileName] = data
			}
		}

		if len(resultFileData) > 0 {
			result.ResultFiles = resultFileData
		}
	}

	result.EndTime = time.Now()
	return result, nil
}
