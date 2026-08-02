package sandbox

import "time"

// ExecutionResult holds the execution logs and metrics collected during script execution in a Daytona sandbox.
type ExecutionResult struct {
	StartTime            time.Time            `json:"start_time"`             // Start time of the execution
	EndTime              time.Time            `json:"end_time"`               // End time of the execution
	ContainerID          string               `json:"container_id"`           // Daytona sandbox ID
	Logs                 string               `json:"logs"`                   // Output logs from execution
	ResourceUsageMetrics ResourceUsageMetrics `json:"resource_usage_metrics"` // Resource usage metrics (reserved for future use)
	ResultFiles          map[string][]byte    `json:"result_files"`           // Map of result files and their contents
}

// ResourceUsageMetrics holds average metric values sampled during execution.
// Note: Metrics are not currently collected from Daytona sandboxes; reserved for future integration.
type ResourceUsageMetrics struct {
	CPU         float64 `json:"cpu"`          // Average CPU usage percentage
	MemUsage    float64 `json:"mem_usage"`    // Average memory usage in bytes
	NetInput    float64 `json:"net_input"`    // Average cumulative network input in bytes
	NetOutput   float64 `json:"net_output"`   // Average cumulative network output in bytes
	BlockInput  float64 `json:"block_input"`  // Average cumulative block input in bytes
	BlockOutput float64 `json:"block_output"` // Average cumulative block output in bytes
}

// DangerousPattern represents a pattern that might indicate malicious intent in script content.
type DangerousPattern struct {
	Pattern     string
	Description string
	Severity    string // "high", "medium", "low"
}
