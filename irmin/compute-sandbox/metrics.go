package sandbox

import (
	"fmt"
	"irmin-api/utils"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

const (
	// DockerShortIDLength is the standard length of Docker's short container ID format.
	DockerShortIDLength = 12
	// SampleChannelBufferSize is the buffer size for the metrics sampling channel.
	SampleChannelBufferSize = 100
	// SamplingIntervalMs is the interval between metric samples in milliseconds.
	SamplingIntervalMs = 10
	// DockerStatsFieldCount is the expected number of fields in Docker stats output.
	DockerStatsFieldCount = 14
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

func (c *ComputeSandbox) CollectMetricsFromContainer(containerID string) ResourceUsageMetrics {
	shortID := containerID
	if len(containerID) > DockerShortIDLength {
		shortID = containerID[:DockerShortIDLength]
	}

	doneChan := make(chan struct{})
	samples := c.collectSamplesUntilDone(containerID, shortID, doneChan)

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

// waitForContainer waits for a container to stop and signals through the done channel.
func (c *ComputeSandbox) waitForContainer(containerID string, doneChan chan struct{}) {
	waitCmd := exec.Command("docker", "wait", containerID)
	_, outputErr := waitCmd.Output()
	if outputErr != nil {
		c.logger.Error("Error waiting for container", "error", outputErr)
	}
	close(doneChan)
}

// collectStatsSample collects a single stats sample for a container.
func (c *ComputeSandbox) collectStatsSample(containerID, shortID string) (ResourceUsage, error) {
	statsCmd := exec.Command("docker", "stats", "--no-stream", containerID)
	statsOutput, err := statsCmd.CombinedOutput()
	if err != nil {
		return ResourceUsage{}, fmt.Errorf("error getting stats: %w", err)
	}
	return c.parseDockerStats(string(statsOutput), shortID)
}

// startSamplingGoroutine starts a goroutine that periodically collects container stats
// and sends them to the provided channel. It returns a cleanup function that should be
// called when sampling is complete.
func (c *ComputeSandbox) startSamplingGoroutine(
	containerID, shortID string,
	doneChan chan struct{},
	sampleChan chan ResourceUsage,
) func() {
	ticker := time.NewTicker(SamplingIntervalMs * time.Millisecond)

	// Start sampling goroutine
	go func() {
		for {
			select {
			case <-doneChan:
				return
			case <-ticker.C:
				go func() {
					ru, err := c.collectStatsSample(containerID, shortID)
					if err != nil {
						c.logger.Error("Error collecting stats sample", "error", err)
						return
					}
					select {
					case sampleChan <- ru:
					default:
						// Drop sample if channel is full
					}
				}()
			}
		}
	}()

	// Return cleanup function
	return func() {
		ticker.Stop()
	}
}

// collectSamples collects stats samples from the sample channel until the container stops
// and drains any remaining samples.
func (c *ComputeSandbox) collectSamples(sampleChan chan ResourceUsage, doneChan chan struct{}) []ResourceUsage {
	var samples []ResourceUsage
	for {
		select {
		case <-doneChan:
			// Drain remaining samples
			for {
				select {
				case ru := <-sampleChan:
					samples = append(samples, ru)
				default:
					return samples
				}
			}
		case ru := <-sampleChan:
			samples = append(samples, ru)
		}
	}
}

// collectSamplesUntilDone collects stats samples until the container stops.
func (c *ComputeSandbox) collectSamplesUntilDone(containerID, shortID string, doneChan chan struct{}) []ResourceUsage {
	sampleChan := make(chan ResourceUsage, SampleChannelBufferSize)

	// Start container wait goroutine
	go c.waitForContainer(containerID, doneChan)

	// Start sampling and get cleanup function
	cleanup := c.startSamplingGoroutine(containerID, shortID, doneChan, sampleChan)
	defer cleanup()

	// Collect samples until done
	return c.collectSamples(sampleChan, doneChan)
}

// parseDockerStats parses the output from 'docker stats --no-stream' into a ResourceUsage struct.
// It searches for the line matching the given container shortID.
func (c *ComputeSandbox) parseDockerStats(statsOutput, shortID string) (ResourceUsage, error) {
	var ru ResourceUsage
	ru.Timestamp = time.Now()

	lines := strings.Split(statsOutput, "\n")
	var dataLine string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "CONTAINER") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) > 0 && fields[0] == shortID {
			dataLine = line
			break
		}
	}
	if dataLine == "" {
		return ru, fmt.Errorf("no stats found for container %s", shortID)
	}

	fields := strings.Fields(dataLine)
	// Expected fields from docker stats (approximate):
	// 0: CONTAINER ID, 1: NAME, 2: CPU %, 3: MEM USAGE, 4: /, 5: MEM LIMIT, 6: MEM %, 7: NET I/O, 8: /, 9: NET I/O, 10: BLOCK I/O, 11: /, 12: BLOCK I/O, 13: PIDS
	if len(fields) < DockerStatsFieldCount {
		return ru, fmt.Errorf("unexpected number of fields in stats output: %v", fields)
	}

	ru.ContainerID = fields[0]
	ru.Name = fields[1]

	// Parse CPU percentage.
	cpuStr := strings.TrimSuffix(fields[2], "%")
	cpu, err := strconv.ParseFloat(cpuStr, 64)
	if err != nil {
		return ru, fmt.Errorf("failed to parse CPU percent: %w", err)
	}
	ru.CPUPercent = cpu

	// Parse memory usage (fields[3]) into bytes.
	memUsage, err := utils.ParseBytes(fields[3])
	if err != nil {
		return ru, fmt.Errorf("failed to parse memory usage: %w", err)
	}
	ru.MemUsageBytes = memUsage

	// Parse memory percentage (fields[6]) – not used for sampling.
	memPercentStr := strings.TrimSuffix(fields[6], "%")
	memPercent, err := strconv.ParseFloat(memPercentStr, 64)
	if err != nil {
		return ru, fmt.Errorf("failed to parse memory percent: %w", err)
	}
	ru.MemPercent = memPercent

	// Parse network I/O: fields[7] (input) and fields[9] (output).
	netInput, err := utils.ParseBytes(fields[7])
	if err != nil {
		return ru, fmt.Errorf("failed to parse net input: %w", err)
	}
	ru.NetInputBytes = netInput

	netOutput, err := utils.ParseBytes(fields[9])
	if err != nil {
		return ru, fmt.Errorf("failed to parse net output: %w", err)
	}
	ru.NetOutputBytes = netOutput

	// Parse block I/O: fields[10] (input) and fields[12] (output).
	blockInput, err := utils.ParseBytes(fields[10])
	if err != nil {
		return ru, fmt.Errorf("failed to parse block input: %w", err)
	}
	ru.BlockInputBytes = blockInput

	blockOutput, err := utils.ParseBytes(fields[12])
	if err != nil {
		return ru, fmt.Errorf("failed to parse block output: %w", err)
	}
	ru.BlockOutputBytes = blockOutput

	return ru, nil
}
