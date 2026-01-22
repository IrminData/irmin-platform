package orchestrator

import "time"

const (
	// DefaultChannelBufferSize represents the default buffer size for the orchestrator's channels.
	DefaultChannelBufferSize = 100

	// TriggerScanInterval represents the interval for scanning triggers.
	TriggerScanInterval = 10 * time.Second

	// ListenForStatusChangesTimeout is the timeout for listening for status changes.
	ListenForStatusChangesTimeout = 90 * time.Second

	// DefaultMaxWorkflowRuntime is the default maximum runtime for a workflow in seconds.
	DefaultMaxWorkflowRuntime = 120

	// syncModeFull always performs a full data sync.
	syncModeFull = "full"
	// syncModePatch only accepts patch-based events.
	syncModePatch = "patch"
	// syncModeAuto performs full sync on schedule/manual, patch sync on events.
	syncModeAuto = "auto"
)
