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
	ResultsData          map[string][]byte    `json:"results_data"`
}

// RunInDocker executes the provided executable code using a Docker container,
// continuously collects resource usage statistics (every 10 milliseconds) while the container is running,
// and then returns the container logs along with arrays of raw metric samples.
// Memory usage is collected in bytes, not as a percentage.
// The executableType parameter specifies the type of executable (e.g., "python", "go", "node").
// The tmpDir parameter is the path to the temporary directory where the executable code is located.
// The executable parameter is the name of the executable file to run inside the container.
// The function returns an ExecutionResult struct containing the container logs and resource usage metrics.
func runInDocker(executable, tmpDir, executableType, apiKey, apiURL string) (ExecutionResult, error) {
	var result ExecutionResult

	// Record the start time.
	result.StartTime = time.Now()

	// Launch the container in detached mode.
	var runCmd *exec.Cmd
	if executableType == "python" {
		runCmd = exec.Command("docker", "run", "-d",
			"-v", fmt.Sprintf("%s:/usr/src/app", tmpDir),
			"-w", "/usr/src/app",
			"python:latest", "python", executable,
			"--api-key", apiKey,
			"--api-url", apiURL)
	} else if executableType == "go" {
		runCmd = exec.Command("docker", "run", "-d",
			"-v", fmt.Sprintf("%s:/usr/src/app", tmpDir),
			"-w", "/usr/src/app",
			"golang:latest", "go", "run", executable,
			"--api-key", apiKey,
			"--api-url", apiURL)
	} else if executableType == "node" {
		runCmd = exec.Command("docker", "run", "-d",
			"-v", fmt.Sprintf("%s:/usr/src/app", tmpDir),
			"-w", "/usr/src/app",
			"node:latest", "node", executable,
			"--api-key", apiKey,
			"--api-url", apiURL)
	} else {
		return result, fmt.Errorf("unsupported executable type: %s", executableType)
	}
	containerIDBytes, err := runCmd.Output()
	if err != nil {
		return result, err
	}
	containerID := strings.TrimSpace(string(containerIDBytes))
	result.ContainerID = containerID

	// Ensure the container is always removed.
	defer func() {
		exec.Command("docker", "rm", containerID).Run()
	}()

	// Collect resource usage metrics while the container is running.
	result.ResourceUsageMetrics = CollectMetricsFromContainer(containerID)

	// Record the end time.
	result.EndTime = time.Now()

	// Retrieve the container logs.
	logsCmd := exec.Command("docker", "logs", containerID)
	logsOutput, err := logsCmd.CombinedOutput()
	if err != nil {
		result.Logs = string(logsOutput)
		return result, err
	}
	result.Logs = string(logsOutput)

	// Parse all result files from logs.
	resultFiles := parseResultFiles(string(logsOutput))

	// Create a map to store multiple result files.
	resultsData := make(map[string][]byte)

	// Process each result file.
	// The file is read from the container's file system rather than the local file system.
	for _, fileName := range resultFiles {
		// Construct the container's path to the file, using the working directory from the docker run command.
		containerFilePath := filepath.Join("/usr/src/app", fileName)
		data, err := readResultFileFromContainer(containerID, containerFilePath)
		if err == nil {
			resultsData[fileName] = data
		}
	}

	// Only set ResultsData if we have results.
	if len(resultsData) > 0 {
		result.ResultsData = resultsData
	}

	return result, nil
}
