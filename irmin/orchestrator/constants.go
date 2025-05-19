package orchestrator

import "time"

const (
	// DefaultChannelBufferSize represents the default buffer size for the orchestrator's channels.
	DefaultChannelBufferSize = 100

	// NotificationTimeout represents the timeout for notifications.
	NotificationTimeout = 90 * time.Second

	// TriggerScanInterval represents the interval for scanning triggers.
	TriggerScanInterval = 10 * time.Second

	// ListenForStatusChangesTimeout is the timeout for listening for status changes.
	ListenForStatusChangesTimeout = 90 * time.Second

	// DefaultMaxWorkflowRuntime is the default maximum runtime for a workflow in seconds.
	DefaultMaxWorkflowRuntime = 120
)
