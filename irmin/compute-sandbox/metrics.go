package sandbox

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/utils"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// ResourceUsage holds a snapshot of resource usage metrics as numeric values.
type ResourceUsage struct {
	ContainerID      string    // Container ID (short form)
	Timestamp        time.Time // Timestamp of the sample
	Name             string    // Container name
	CPUPercent       float64   // CPU usage in percentage
	MemUsageBytes    float64   // Memory usage in bytes (NOT a percentage)
	MemPercent       float64   // Memory usage percentage (parsed from stats, not used for sampling)
	NetInputBytes    float64   // Network input in bytes (cumulative)
	NetOutputBytes   float64   // Network output in bytes (cumulative)
	BlockInputBytes  float64   // Block input in bytes (cumulative)
	BlockOutputBytes float64   // Block output in bytes (cumulative)
}

// ResourceUsageMetrics holds average metric values sampled during container execution.
type ResourceUsageMetrics struct {
	CPU         float64 `json:"cpu"`          // Average CPU usage percentage
	MemUsage    float64 `json:"mem_usage"`    // Average memory usage in bytes
	NetInput    float64 `json:"net_input"`    // Average cumulative network input in bytes
	NetOutput   float64 `json:"net_output"`   // Average cumulative network output in bytes
	BlockInput  float64 `json:"block_input"`  // Average cumulative block input in bytes
	BlockOutput float64 `json:"block_output"` // Average cumulative block output in bytes
}

func (c *ComputeSandbox) CollectMetricsFromContainer(ctx context.Context, containerID string) ResourceUsageMetrics {
	shortID := containerID
	if len(containerID) > DockerShortIDLength {
		shortID = containerID[:DockerShortIDLength]
	}

	samples, err := c.collectSamplesUntilDone(ctx, containerID, shortID)
	if err != nil {
		// If we have any samples, use them even if we got an error
		if len(samples) > 0 {
			c.logger.InfoContext(ctx, "Container stopped but collected metrics",
				"container", containerID,
				"samples", len(samples))
		} else {
			c.logger.ErrorContext(ctx, "Error collecting metrics",
				"error", err,
				"container", containerID)
			return ResourceUsageMetrics{}
		}
	}

	// If we have no samples at all, return empty metrics
	if len(samples) == 0 {
		return ResourceUsageMetrics{}
	}

	// Calculate averages from samples
	var cpuSamples, memSamples, netInputSamples, netOutputSamples, blockInputSamples, blockOutputSamples []float64
	for _, ru := range samples {
		cpuSamples = append(cpuSamples, ru.CPUPercent)
		memSamples = append(memSamples, ru.MemUsageBytes)
		netInputSamples = append(netInputSamples, ru.NetInputBytes)
		netOutputSamples = append(netOutputSamples, ru.NetOutputBytes)
		blockInputSamples = append(blockInputSamples, ru.BlockInputBytes)
		blockOutputSamples = append(blockOutputSamples, ru.BlockOutputBytes)
	}

	return ResourceUsageMetrics{
		CPU:         utils.Average(cpuSamples),
		MemUsage:    utils.Average(memSamples),
		NetInput:    utils.Average(netInputSamples),
		NetOutput:   utils.Average(netOutputSamples),
		BlockInput:  utils.Average(blockInputSamples),
		BlockOutput: utils.Average(blockOutputSamples),
	}
}

// sanitizeContainerID ensures the container ID is safe to use in command arguments.
// It only allows alphanumeric characters and common Docker ID separators.
func sanitizeContainerID(id string) string {
	// Docker container IDs are typically hex strings, but we'll be conservative
	// and only allow alphanumeric chars and common separators
	const allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
	var sanitized strings.Builder
	for _, r := range id {
		if strings.ContainsRune(allowedChars, r) {
			sanitized.WriteRune(r)
		}
	}
	return sanitized.String()
}

// parseMemoryUsage parses memory usage from Docker stats output.
// It handles both percentage and byte-based formats.
func (c *ComputeSandbox) parseMemoryUsage(memStr string) (float64, float64, error) {
	var memUsage, memPercent float64
	var err error

	// Handle percentage format first
	if strings.HasSuffix(memStr, "%") {
		memPercent, err = strconv.ParseFloat(strings.TrimSuffix(memStr, "%"), 64)
		if err != nil {
			return 0, 0, fmt.Errorf("failed to parse memory percentage: %w", err)
		}
		return 0, memPercent, nil
	}

	// Try to parse as bytes with unit
	if strings.Contains(memStr, "/") {
		memParts := strings.SplitN(memStr, "/", StatsSplitCount)
		if len(memParts) != StatsSplitCount {
			return 0, 0, fmt.Errorf("invalid memory usage format: %s", memStr)
		}
		memUsage, err = utils.ParseBytes(strings.TrimSpace(memParts[0]))
	} else {
		memUsage, err = utils.ParseBytes(memStr)
	}
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse memory usage: %w", err)
	}

	return memUsage, 0, nil
}

// constructDockerFilter creates a safe Docker filter argument for container ID.
// It returns an error if the container ID is invalid.
func constructDockerFilter(containerID string) (string, error) {
	sanitizedID := sanitizeContainerID(containerID)
	if sanitizedID == "" {
		return "", fmt.Errorf("invalid container ID: %s", containerID)
	}
	// Docker filter format is validated to be safe
	return fmt.Sprintf("id=%s", sanitizedID), nil
}

// waitForContainer waits for the container to finish and returns its exit code.
func (c *ComputeSandbox) waitForContainer(ctx context.Context, containerID string) (int, error) {
	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return -1, ctx.Err()
	}

	// Sanitize container ID to prevent command injection
	sanitizedID := sanitizeContainerID(containerID)
	if sanitizedID == "" {
		return -1, fmt.Errorf("invalid container ID: %s", containerID)
	}

	// Create context with timeout for docker wait command
	waitCtx, cancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancel()

	// Wait for container to finish
	cmd := exec.CommandContext(waitCtx, "docker", "wait", sanitizedID)
	output, err := cmd.Output()
	if err != nil {
		// Check if container exists using safe filter
		filter, filterErr := constructDockerFilter(containerID)
		if filterErr != nil {
			return -1, fmt.Errorf("failed to construct docker filter: %w", filterErr)
		}

		checkCtx, checkCancel := context.WithTimeout(ctx, DockerCommandTimeout)
		defer checkCancel()

		checkCmd := exec.CommandContext(checkCtx, "docker", "ps", "-a", "--filter", filter, "--format", "{{.ID}}")
		checkOutput, checkErr := checkCmd.Output()
		if checkErr != nil || len(strings.TrimSpace(string(checkOutput))) == 0 {
			return -1, fmt.Errorf("container %s does not exist", containerID)
		}
		return -1, fmt.Errorf("failed to wait for container %s: %w", containerID, err)
	}

	// Parse exit code
	exitCodeStr := strings.TrimSpace(string(output))
	exitCode, err := strconv.Atoi(exitCodeStr)
	if err != nil {
		return -1, fmt.Errorf("failed to parse exit code '%s': %w", exitCodeStr, err)
	}

	// Check if container exited with non-zero code
	if exitCode != 0 {
		// Get container logs for error context using sanitized ID
		logsCtx, logsCancel := context.WithTimeout(ctx, DockerCommandTimeout)
		defer logsCancel()

		logsCmd := exec.CommandContext(logsCtx, "docker", "logs", sanitizedID)
		logsOutput, logsErr := logsCmd.Output()
		if logsErr != nil {
			return exitCode, fmt.Errorf("container %s exited with code %d", containerID, exitCode)
		}

		return exitCode, fmt.Errorf(
			"container %s exited with code %d. Logs: %s",
			containerID,
			exitCode,
			string(logsOutput),
		)
	}

	return exitCode, nil
}

// checkContainerRunning checks if a container is still running.
func (c *ComputeSandbox) checkContainerRunning(ctx context.Context, containerID string) (bool, error) {
	filter, err := constructDockerFilter(containerID)
	if err != nil {
		return false, err
	}

	// Use context with timeout for the ps command
	psCtx, cancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancel()

	psCmd := exec.CommandContext(psCtx, "docker", "ps", "-a", "-q", "--filter", filter)
	output, err := psCmd.CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("error checking container status: %w", err)
	}

	return strings.TrimSpace(string(output)) != "", nil
}

// collectStatsSample collects a single stats sample from a container.
func (c *ComputeSandbox) collectStatsSample(ctx context.Context, containerID, shortID string) (ResourceUsage, error) {
	sanitizedID := sanitizeContainerID(containerID)
	if sanitizedID == "" {
		return ResourceUsage{}, fmt.Errorf("invalid container ID: %s", containerID)
	}

	// Check if container is still running first
	running, err := c.checkContainerRunning(ctx, containerID)
	if err != nil {
		return ResourceUsage{}, err
	}
	if !running {
		return ResourceUsage{}, fmt.Errorf("container %s is no longer running", shortID)
	}

	// Use context with timeout for the stats command
	statsCtx, cancel := context.WithTimeout(ctx, DockerCommandTimeout)
	defer cancel()

	statsCmd := exec.CommandContext(statsCtx, "docker", "stats", "--no-stream", sanitizedID)
	output, err := statsCmd.CombinedOutput()
	if err != nil {
		return ResourceUsage{}, fmt.Errorf("error getting container stats: %w", err)
	}

	return c.parseDockerStats(string(output), shortID)
}

// shouldSwitchToNormalSampling determines if we should switch from initial to normal sampling interval.
func (c *ComputeSandbox) shouldSwitchToNormalSampling(startTime time.Time) bool {
	return time.Since(startTime) > InitialSamplingDuration
}

// handleSamplingError handles errors during sampling and determines if we should continue.
func (c *ComputeSandbox) handleSamplingError(
	err error,
	containerID string,
	samplesCollected int,
	lastSampleTime time.Time,
) bool {
	// If context was cancelled, stop sampling
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return true
	}

	// If we haven't collected any samples recently and got an error, the container might be gone
	if samplesCollected == 0 || time.Since(lastSampleTime) > ContainerStopTimeout {
		c.logger.Info("Container appears to have stopped", "container", containerID, "samples", samplesCollected)
		return true
	}

	// For other errors, continue sampling with a delay
	time.Sleep(StatsRetryDelay)
	return false
}

// collectAndSendSample collects a stats sample and sends it to the channel.
func (c *ComputeSandbox) collectAndSendSample(
	ctx context.Context,
	containerID, shortID string,
	sampleChan chan ResourceUsage,
) (bool, time.Time, error) {
	ru, err := c.collectStatsSample(ctx, containerID, shortID)
	if err != nil {
		return false, time.Time{}, err
	}

	select {
	case sampleChan <- ru:
		return true, time.Now(), nil
	case <-ctx.Done():
		return false, time.Time{}, ctx.Err()
	default:
		// Channel is full, sample dropped but continue
		return false, time.Now(), nil
	}
}

// startSamplingGoroutine starts a goroutine that collects container metrics samples
// and sends them to the provided channel. It returns a cleanup function that should be
// called when sampling is complete.
func (c *ComputeSandbox) startSamplingGoroutine(
	ctx context.Context,
	containerID, shortID string,
	sampleChan chan ResourceUsage,
) func() {
	ticker := time.NewTicker(InitialSamplingIntervalMs * time.Millisecond)
	lastSampleTime := time.Now()
	startTime := time.Now()
	samplesCollected := 0

	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if c.shouldSwitchToNormalSampling(startTime) {
					ticker.Reset(NormalSamplingIntervalMs * time.Millisecond)
				}

				success, newLastSampleTime, err := c.collectAndSendSample(ctx, containerID, shortID, sampleChan)
				if success {
					samplesCollected++
					lastSampleTime = newLastSampleTime
				} else if err != nil && c.handleSamplingError(err, containerID, samplesCollected, lastSampleTime) {
					return
				}
			}
		}
	}()

	return func() {
		ticker.Stop()
	}
}

// collectSamplesUntilDone collects stats samples until the container stops or context is cancelled.
func (c *ComputeSandbox) collectSamplesUntilDone(
	ctx context.Context,
	containerID, shortID string,
) ([]ResourceUsage, error) {
	sampleChan := make(chan ResourceUsage, SampleChannelBufferSize)
	errChan := make(chan error, 1)

	// Start container wait goroutine
	go func() {
		if _, err := c.waitForContainer(ctx, containerID); err != nil {
			// Only send error if we haven't collected any samples
			select {
			case errChan <- err:
			default:
				// If error channel is full, we've already collected some samples
				// so we can ignore this error
			}
		}
	}()

	// Start sampling and get cleanup function
	cleanup := c.startSamplingGoroutine(ctx, containerID, shortID, sampleChan)
	defer cleanup()

	// Collect samples until done
	var samples []ResourceUsage
	containerDone := false

	for !containerDone {
		select {
		case err := <-errChan:
			// If we have samples, return them even if we got an error
			if len(samples) > 0 {
				c.logger.InfoContext(ctx, "Container stopped but collected metrics",
					"container", containerID,
					"samples", len(samples))
				return samples, nil
			}
			return nil, err
		case <-ctx.Done():
			// Context cancelled, return what we have
			c.logger.InfoContext(ctx, "Metrics collection cancelled", "container", containerID, "samples", len(samples))
			return samples, ctx.Err()
		case ru := <-sampleChan:
			samples = append(samples, ru)
		case <-time.After(ContainerStopTimeout):
			// Check if container is still running periodically
			running, err := c.checkContainerRunning(ctx, containerID)
			if err != nil || !running {
				containerDone = true
			}
		}
	}

	// Drain remaining samples
	for {
		select {
		case ru := <-sampleChan:
			samples = append(samples, ru)
		default:
			return samples, nil
		}
	}
}

// parseCPUUsage parses CPU usage from Docker stats output.
func (c *ComputeSandbox) parseCPUUsage(cpuStr string) (float64, error) {
	cpuStr = strings.TrimSpace(cpuStr)
	var cpuPercent float64
	var err error

	if strings.HasSuffix(cpuStr, "%") {
		cpuStr = strings.TrimSuffix(cpuStr, "%")
		cpuPercent, err = strconv.ParseFloat(cpuStr, 64)
	} else {
		cpuParts := strings.SplitN(cpuStr, "/", StatsSplitCount)
		if len(cpuParts) != StatsSplitCount {
			return 0, fmt.Errorf("invalid CPU usage format: %s", cpuStr)
		}
		cpuPercent, err = strconv.ParseFloat(strings.TrimSpace(cpuParts[0]), 64)
	}
	if err != nil {
		return 0, fmt.Errorf("failed to parse CPU percent: %w", err)
	}
	return cpuPercent, nil
}

// parseIOValue parses a single I/O value from Docker stats output.
// It handles both direct format (e.g. "429kB") and X/Y format (e.g. "429kB / 0B").
func (c *ComputeSandbox) parseIOValue(valueStr, valueType string) (float64, error) {
	if strings.Contains(valueStr, "/") {
		parts := strings.SplitN(valueStr, "/", StatsSplitCount)
		if len(parts) != StatsSplitCount {
			return 0, fmt.Errorf("invalid %s format: %s", valueType, valueStr)
		}
		return utils.ParseBytes(strings.TrimSpace(parts[0]))
	}
	return utils.ParseBytes(valueStr)
}

// parseNetworkIO parses network I/O from Docker stats output.
func (c *ComputeSandbox) parseNetworkIO(inputStr, outputStr string) (float64, float64, error) {
	netInput, err := c.parseIOValue(inputStr, "network input")
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse net input: %w", err)
	}

	netOutput, err := c.parseIOValue(outputStr, "network output")
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse net output: %w", err)
	}

	return netInput, netOutput, nil
}

// parseBlockIO parses block I/O from Docker stats output.
func (c *ComputeSandbox) parseBlockIO(inputStr, outputStr string) (float64, float64, error) {
	blockInput, err := c.parseIOValue(inputStr, "block input")
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse block input: %w", err)
	}

	blockOutput, err := c.parseIOValue(outputStr, "block output")
	if err != nil {
		return 0, 0, fmt.Errorf("failed to parse block output: %w", err)
	}

	return blockInput, blockOutput, nil
}

// findContainerStatsLine finds the line in Docker stats output that matches the given container ID.
func (c *ComputeSandbox) findContainerStatsLine(statsOutput, shortID string) (string, error) {
	lines := strings.Split(statsOutput, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "CONTAINER") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) > 0 && fields[0] == shortID {
			return line, nil
		}
	}
	return "", fmt.Errorf("no stats found for container %s", shortID)
}

// parseDockerStats parses the output from 'docker stats --no-stream' into a ResourceUsage struct.
// It searches for the line matching the given container shortID.
func (c *ComputeSandbox) parseDockerStats(statsOutput, shortID string) (ResourceUsage, error) {
	var ru ResourceUsage
	ru.Timestamp = time.Now()

	dataLine, err := c.findContainerStatsLine(statsOutput, shortID)
	if err != nil {
		return ru, err
	}

	fields := strings.Fields(dataLine)
	if len(fields) < DockerStatsFieldCount {
		return ru, fmt.Errorf("unexpected number of fields in stats output: %v", fields)
	}

	ru.ContainerID = fields[0]
	ru.Name = fields[1]

	// Parse CPU usage
	cpuPercent, err := c.parseCPUUsage(fields[2])
	if err != nil {
		return ru, err
	}
	ru.CPUPercent = cpuPercent

	// Parse memory usage
	memUsage, memPercent, err := c.parseMemoryUsage(fields[3])
	if err != nil {
		return ru, err
	}
	ru.MemUsageBytes = memUsage
	ru.MemPercent = memPercent

	// Parse memory percentage if not already set
	if ru.MemPercent == 0 {
		memPercentStr := strings.TrimSuffix(fields[6], "%")
		var memPercentVal float64
		memPercentVal, err = strconv.ParseFloat(strings.TrimSpace(memPercentStr), 64)
		if err != nil {
			return ru, fmt.Errorf("failed to parse memory percent: %w", err)
		}
		ru.MemPercent = memPercentVal
	}

	// Parse network I/O
	netInput, netOutput, err := c.parseNetworkIO(fields[7], fields[9])
	if err != nil {
		return ru, err
	}
	ru.NetInputBytes = netInput
	ru.NetOutputBytes = netOutput

	// Parse block I/O
	blockInput, blockOutput, err := c.parseBlockIO(fields[10], fields[12])
	if err != nil {
		return ru, err
	}
	ru.BlockInputBytes = blockInput
	ru.BlockOutputBytes = blockOutput

	return ru, nil
}
