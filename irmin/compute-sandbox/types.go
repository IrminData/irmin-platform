package sandbox

import "time"

// ExecutionResult holds the execution logs and metrics collected during execution.
type ExecutionResult struct {
	StartTime            time.Time            `json:"start_time"`             // Start time of the execution
	EndTime              time.Time            `json:"end_time"`               // End time of the execution
	ContainerID          string               `json:"container_id"`           // Container/execution ID (legacy field, kept for compatibility)
	Logs                 string               `json:"logs"`                   // Output logs from execution
	ResourceUsageMetrics ResourceUsageMetrics `json:"resource_usage_metrics"` // Resource usage metrics (not available with nsjail)
	ResultFiles          map[string][]byte    `json:"result_files"`           // Map of result files and their contents
}

// ResourceUsageMetrics holds average metric values sampled during execution.
// Note: With nsjail, these metrics are not currently collected (would require external process monitoring).
type ResourceUsageMetrics struct {
	CPU         float64 `json:"cpu"`          // Average CPU usage percentage (not available with nsjail)
	MemUsage    float64 `json:"mem_usage"`    // Average memory usage in bytes (not available with nsjail)
	NetInput    float64 `json:"net_input"`    // Average cumulative network input in bytes (not available with nsjail)
	NetOutput   float64 `json:"net_output"`   // Average cumulative network output in bytes (not available with nsjail)
	BlockInput  float64 `json:"block_input"`  // Average cumulative block input in bytes (not available with nsjail)
	BlockOutput float64 `json:"block_output"` // Average cumulative block output in bytes (not available with nsjail)
}
