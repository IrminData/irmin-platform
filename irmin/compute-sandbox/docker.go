package sandbox

import (
	"fmt" // Make sure utils.ParseBytes converts e.g. "9.602MiB" to bytes.
	"os/exec"
	"path/filepath"
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

// runInDocker executes the provided executable code using a Docker container,
// continuously collects resource usage statistics (every 10 milliseconds) while the container is running,
// and then returns the container logs along with arrays of raw metric samples.
// Memory usage is collected in bytes, not as a percentage.
// The executableType parameter specifies the type of executable (e.g., "python", "go", "node").
// The tmpDir parameter is the path to the temporary directory where the executable code is located.
// The executable parameter is the name of the executable file to run inside the container.
// The function returns an ExecutionResult struct containing the container logs and resource usage metrics.
func (s *ComputeSandbox) runInDocker(
	executable, tmpDir, executableType, apiKey, apiURL string,
) (ExecutionResult, error) {
	var result ExecutionResult

	// Record the start time.
	result.StartTime = time.Now()

	// build the docker run command
	args := []string{"run", "-d",
		"-v", fmt.Sprintf("%s:/usr/src/app", tmpDir),
		"-w", "/usr/src/app",
	}
	switch executableType {
	case "python":
		args = append(args, "python:latest", "python", executable, "--api-key", apiKey, "--api-url", apiURL)
	case "go":
		args = append(args, "golang:latest", "go", "run", executable, "--api-key", apiKey, "--api-url", apiURL)
	case "node":
		args = append(args, "node:latest", "node", executable, "--api-key", apiKey, "--api-url", apiURL)
	default:
		return result, fmt.Errorf("unsupported executable type: %s", executableType)
	}

	// run the docker command and capture both stdout and stderr
	cmd := exec.Command("docker", args...)
	output, runCmdCombinedOutputErr := cmd.CombinedOutput()
	if runCmdCombinedOutputErr != nil {
		// include the raw Docker output to aid troubleshooting
		return result, fmt.Errorf("docker run failed: %w, %s", runCmdCombinedOutputErr, string(output))
	}

	containerID := strings.TrimSpace(string(output))
	result.ContainerID = containerID
	defer func() {
		rmCmd := exec.Command("docker", "rm", containerID)
		if rmCmdErr := rmCmd.Run(); rmCmdErr != nil {
			s.logger.Error("Error removing container", "error", rmCmdErr)
		}
	}()

	// Collect resource usage metrics while the container is running.
	result.ResourceUsageMetrics = s.CollectMetricsFromContainer(containerID)

	// Record the end time.
	result.EndTime = time.Now()

	// Retrieve the container logs.
	logsCmd := exec.Command("docker", "logs", containerID)
	logsOutput, logsCmdErr := logsCmd.CombinedOutput()
	if logsCmdErr != nil {
		result.Logs = string(logsOutput)
		return result, logsCmdErr
	}
	result.Logs = string(logsOutput)

	// Parse all result files from logs.
	resultFiles := s.parseResultFiles(string(logsOutput))

	// Create a map to store multiple result files.
	resultFileData := make(map[string][]byte)

	// Process each result file.
	// The file is read from the container's file system rather than the local file system.
	for _, fileName := range resultFiles {
		// Construct the container's path to the file, using the working directory from the docker run command.
		containerFilePath := filepath.Join("/usr/src/app", fileName)
		data, readResultFileFromContainerErr := s.readResultFileFromContainer(containerID, containerFilePath)
		if readResultFileFromContainerErr == nil {
			resultFileData[fileName] = data
		}
	}

	// Only set ResultFiles if we have results.
	if len(resultFileData) > 0 {
		result.ResultFiles = resultFileData
	}

	return result, nil
}
