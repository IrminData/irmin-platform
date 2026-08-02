package orchestrator

import "time"

const (
	// DefaultChannelBufferSize represents the default buffer size for the orchestrator's channels.
	DefaultChannelBufferSize = 100

	// TriggerScanInterval represents the interval for scanning triggers.
	TriggerScanInterval = 10 * time.Second

	// MaintenanceTickInterval is how often the orchestrator runs
	// lightweight periodic maintenance jobs that don't belong in the
	// heavyweight -gc command (which is admin-invoked and batch-style).
	// 10 minutes is comfortably under every retention window we care
	// about while keeping DB pressure negligible.
	MaintenanceTickInterval = 10 * time.Minute

	// ListenForStatusChangesTimeout is the timeout for listening for status changes.
	ListenForStatusChangesTimeout = 90 * time.Second

	// DefaultMaxWorkflowRuntime is the default maximum runtime for a workflow in seconds.
	DefaultMaxWorkflowRuntime = 120

	// GracefulShutdownTimeout is the maximum time to wait for active workflows during shutdown.
	GracefulShutdownTimeout = 30 * time.Second

	// syncModeFull always performs a full data sync.
	syncModeFull = "full"
	// syncModePatch only accepts patch-based events.
	syncModePatch = "patch"
	// syncModeAuto performs full sync on schedule/manual, patch sync on events.
	syncModeAuto = "auto"
)
