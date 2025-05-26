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

	// Runtime versions.

	LatestGoVersion     = "1.24.3"
	LatestNodeVersion   = "22.10.0"
	LatestPythonVersion = "3.11.12"

	// API configuration.

	TokenExpiryDuration = 60 * time.Minute // How long API tokens created for sandbox execution should be valid
)
