package sandbox

import "time"

const (
	// Sampling configuration.

	InitialSamplingIntervalMs = 10  // Sample every 10ms for the first second
	NormalSamplingIntervalMs  = 100 // Then sample every 100ms
	InitialSamplingDuration   = 1 * time.Second
	ContainerStopTimeout      = 100 * time.Millisecond // Time to wait after container stops before ending sampling
	StatsRetryDelay           = 10 * time.Millisecond  // Delay before retrying stats collection

	// Docker configuration.

	DockerShortIDLength     = 12  // Standard length of Docker's short container ID format
	DockerStatsFieldCount   = 14  // Expected number of fields in Docker stats output
	SampleChannelBufferSize = 100 // Buffer size for the metrics sampling channel
	StatsSplitCount         = 2   // Number of parts when splitting stats values (e.g. "X/Y")

	// Container operation timeouts.

	ContainerStartTimeout     = 30 * time.Second // Timeout for starting a container
	ContainerExecTimeout      = 10 * time.Second // Timeout for container stop operations
	DockerCommandTimeout      = 60 * time.Second // Timeout for general Docker commands
	ContainerCleanupTimeout   = 10 * time.Second // Timeout for container cleanup operations
	ContainerOperationTimeout = 30 * time.Minute // Maximum time for container operations

	// File operation timeouts.

	FileDownloadTimeout  = 300 * time.Second // 5 minutes for large files
	FileUploadTimeout    = 180 * time.Second // 3 minutes
	FileOperationTimeout = 30 * time.Second  // Timeout for general file operations

	// Runtime versions.

	LatestGoVersion     = "1.25.0"
	LatestNodeVersion   = "24.2.0"
	LatestPythonVersion = "3.11.12"

	// API configuration.

	TokenExpiryDuration = 60 * time.Minute // How long API tokens created for sandbox execution should be valid
)
