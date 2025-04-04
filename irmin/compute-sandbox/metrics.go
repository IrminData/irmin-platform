package sandbox

import (
	"fmt"
	"irmin-api/utils"
	"os"
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

func CollectMetricsFromContainer(containerID string) ResourceUsageMetrics {
	// Use the first 12 characters as the short ID.
	shortID := containerID
	if len(containerID) > 12 {
		shortID = containerID[:12]
	}

	// Channel to signal when the container stops.
	doneChan := make(chan struct{})
	go func() {
		waitCmd := exec.Command("docker", "wait", containerID)
		waitCmd.Output() // Ignoring error for brevity.
		close(doneChan)
	}()

	// Buffered channel to receive stats samples.
	sampleChan := make(chan ResourceUsage, 100)

	// Immediately fetch one sample.
	go func() {
		statsCmd := exec.Command("docker", "stats", "--no-stream", containerID)
		statsOutput, err := statsCmd.CombinedOutput()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting immediate stats: %v\n", err)
			return
		}
		ru, err := parseDockerStats(string(statsOutput), shortID)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing immediate stats: %v\n", err)
			return
		}
		sampleChan <- ru
	}()

	// Create a ticker that fires every 10 milliseconds.
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	// Channel to signal the sampling goroutine to stop.
	sampleDone := make(chan struct{})

	// Launch a goroutine that triggers docker stats calls without blocking.
	go func() {
		for {
			select {
			case <-doneChan:
				close(sampleDone)
				return
			case <-ticker.C:
				go func() {
					statsCmd := exec.Command("docker", "stats", "--no-stream", containerID)
					statsOutput, err := statsCmd.CombinedOutput()
					if err != nil {
						return
					}
					ru, err := parseDockerStats(string(statsOutput), shortID)
					if err != nil {
						fmt.Fprintf(os.Stderr, "Error parsing stats: %v\n", err)
						return
					}
					// Send sample; if sampleChan is full, drop the sample.
					select {
					case sampleChan <- ru:
					default:
					}
				}()
			}
		}
	}()

	// Prepare slices to store raw samples.
	var cpuSamples, memSamples, netInputSamples, netOutputSamples, blockInputSamples, blockOutputSamples []float64

	// Main loop: collect stats samples until sampling goroutine is done.
collectLoop:
	for {
		select {
		case ru := <-sampleChan:
			cpuSamples = append(cpuSamples, ru.CPUPercent)
			memSamples = append(memSamples, ru.MemUsageBytes)
			netInputSamples = append(netInputSamples, ru.NetInputBytes)
			netOutputSamples = append(netOutputSamples, ru.NetOutputBytes)
			blockInputSamples = append(blockInputSamples, ru.BlockInputBytes)
			blockOutputSamples = append(blockOutputSamples, ru.BlockOutputBytes)
		case <-sampleDone:
			break collectLoop
		}
	}

	// Drain any remaining samples.
drainLoop:
	for {
		select {
		case ru := <-sampleChan:
			cpuSamples = append(cpuSamples, ru.CPUPercent)
			memSamples = append(memSamples, ru.MemUsageBytes)
			netInputSamples = append(netInputSamples, ru.NetInputBytes)
			netOutputSamples = append(netOutputSamples, ru.NetOutputBytes)
			blockInputSamples = append(blockInputSamples, ru.BlockInputBytes)
			blockOutputSamples = append(blockOutputSamples, ru.BlockOutputBytes)
		default:
			break drainLoop
		}
	}

	// Set the collected metrics.
	metrics := ResourceUsageMetrics{
		CPU:         utils.Average(cpuSamples),
		MemUsage:    utils.Average(memSamples),
		NetInput:    utils.Average(netInputSamples),
		NetOutput:   utils.Average(netOutputSamples),
		BlockInput:  utils.Average(blockInputSamples),
		BlockOutput: utils.Average(blockOutputSamples),
	}

	return metrics
}

// parseDockerStats parses the output from 'docker stats --no-stream' into a ResourceUsage struct.
// It searches for the line matching the given container shortID.
func parseDockerStats(statsOutput, shortID string) (ResourceUsage, error) {
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
	if len(fields) < 14 {
		return ru, fmt.Errorf("unexpected number of fields in stats output: %v", fields)
	}

	ru.ContainerID = fields[0]
	ru.Name = fields[1]

	// Parse CPU percentage.
	cpuStr := strings.TrimSuffix(fields[2], "%")
	cpu, err := strconv.ParseFloat(cpuStr, 64)
	if err != nil {
		return ru, fmt.Errorf("failed to parse CPU percent: %v", err)
	}
	ru.CPUPercent = cpu

	// Parse memory usage (fields[3]) into bytes.
	memUsage, err := utils.ParseBytes(fields[3])
	if err != nil {
		return ru, fmt.Errorf("failed to parse memory usage: %v", err)
	}
	ru.MemUsageBytes = memUsage

	// Parse memory percentage (fields[6]) – not used for sampling.
	memPercentStr := strings.TrimSuffix(fields[6], "%")
	memPercent, err := strconv.ParseFloat(memPercentStr, 64)
	if err != nil {
		return ru, fmt.Errorf("failed to parse memory percent: %v", err)
	}
	ru.MemPercent = memPercent

	// Parse network I/O: fields[7] (input) and fields[9] (output).
	netInput, err := utils.ParseBytes(fields[7])
	if err != nil {
		return ru, fmt.Errorf("failed to parse net input: %v", err)
	}
	ru.NetInputBytes = netInput

	netOutput, err := utils.ParseBytes(fields[9])
	if err != nil {
		return ru, fmt.Errorf("failed to parse net output: %v", err)
	}
	ru.NetOutputBytes = netOutput

	// Parse block I/O: fields[10] (input) and fields[12] (output).
	blockInput, err := utils.ParseBytes(fields[10])
	if err != nil {
		return ru, fmt.Errorf("failed to parse block input: %v", err)
	}
	ru.BlockInputBytes = blockInput

	blockOutput, err := utils.ParseBytes(fields[12])
	if err != nil {
		return ru, fmt.Errorf("failed to parse block output: %v", err)
	}
	ru.BlockOutputBytes = blockOutput

	return ru, nil
}
