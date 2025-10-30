package orchestrator

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// DispatchEventType represents the type of dispatch event.
type DispatchEventType string

const (
	DispatchEventTypeWorkflowRun DispatchEventType = "workflow_run"
)

// DispatchEvent represents an event dispatched by the orchestrator to the API.
type DispatchEvent struct {
	Timestamp     time.Time         `json:"timestamp"`
	EventType     DispatchEventType `json:"event_type"`
	WorkflowID    *uint             `json:"workflow_id,omitempty"`
	WorkflowRunID *uint             `json:"workflow_run_id,omitempty"`
}

// StartDispatcher starts the dispatcher that listens for PostgreSQL notifications
// about new or updated workflow runs and dispatches them to the API.
func (o *Orchestrator) StartDispatcher(ctx context.Context) error {
	o.logger.InfoContext(ctx, "starting dispatcher")

	// Create a channel to receive notifications
	notificationChan := make(chan string, DefaultChannelBufferSize)
	defer close(notificationChan)

	// Start the notification listener
	go o.startNotificationListener(ctx, notificationChan)

	// Process notifications
	return o.processNotifications(ctx, notificationChan)
}

// startNotificationListener listens for PostgreSQL notifications and sends them to the channel.
// Uses advisory locking to ensure only one process across all instances listens for notifications.
// This function blocks and holds the lock for its entire lifetime.
func (o *Orchestrator) startNotificationListener(ctx context.Context, notificationChan chan<- string) {
	// Acquire a connection to hold the advisory lock for the listener's lifetime
	lockConn, err := o.db.GetPgxConn(ctx)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to acquire connection for notification listener lock", "error", err)
		return
	}
	defer lockConn.Release()

	// Try to acquire a session-scoped advisory lock to become the notification listener
	// Only one process across all instances (including prefork children) will get this lock
	lockKey := "orchestrator:notification_listener"
	o.logger.DebugContext(ctx, "attempting to acquire notification listener lock")

	locked, lockErr := db.TryLockKeyConn(ctx, lockConn, lockKey)
	if lockErr != nil {
		o.logger.ErrorContext(ctx, "error acquiring notification listener lock", "error", lockErr)
		return
	}
	if !locked {
		// Another process is already listening for notifications
		o.logger.InfoContext(ctx, "notification listener already running in another process, skipping")
		return
	}

	// We got the lock - this process is the notification listener
	o.logger.WarnContext(ctx, "🎯 ACQUIRED notification listener lock - this process will handle all notifications")

	// Ensure the lock is released when done
	defer func() {
		if unlockErr := db.UnlockKeyConn(ctx, lockConn, lockKey); unlockErr != nil {
			o.logger.ErrorContext(ctx, "error releasing notification listener lock", "error", unlockErr)
		}
	}()

	// Start listening for notifications on a separate connection
	// We need a different connection because we're holding lockConn for the lock
	listenConn, err := o.db.GetPgxConn(ctx)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to acquire connection for notification listening", "error", err)
		return
	}
	defer listenConn.Release()

	// Start listening on the notification connection
	if _, listenExecErr := listenConn.Exec(ctx, "LISTEN workflow_run_status"); listenExecErr != nil {
		o.logger.ErrorContext(ctx, "failed to start listening for notifications", "error", listenExecErr)
		return
	}
	o.logger.InfoContext(ctx, "started listening for notifications on workflow_run_status channel")

	// Listen for notifications using the same connection that's listening
	// This keeps the function alive and the lock held
	for {
		// Wait for notification with timeout on the listening connection
		notification, waitForNotificationErr := listenConn.Conn().WaitForNotification(ctx)
		if waitForNotificationErr != nil {
			if errors.Is(waitForNotificationErr, context.Canceled) {
				o.logger.InfoContext(ctx, "notification listener context cancelled, stopping")
				return
			}
			o.logger.ErrorContext(ctx, "error waiting for notification", "error", waitForNotificationErr)
			return
		}

		if notification == nil {
			continue
		}

		select {
		case notificationChan <- notification.Payload:
			o.logger.DebugContext(ctx, "forwarded notification to channel", "payload", notification.Payload)
		case <-ctx.Done():
			return
		default:
			// Channel is full, log warning and skip
			o.logger.WarnContext(
				ctx,
				"notification channel full, skipping notification",
				"payload",
				notification.Payload,
			)
		}
	}
}

// processNotifications processes notifications from the channel.
func (o *Orchestrator) processNotifications(ctx context.Context, notificationChan <-chan string) error {
	for {
		select {
		case <-ctx.Done():
			o.logger.InfoContext(ctx, "dispatcher shutting down")
			return ctx.Err()

		case payload := <-notificationChan:
			o.logger.InfoContext(ctx, "received notification", "payload", payload)

			notification, err := o.parseNotification(payload)
			if err != nil {
				o.logger.ErrorContext(ctx, "failed to parse notification payload",
					"error", err,
					"payload", payload)
				continue
			}

			// Only process if the status is pending
			if notification.Status != string(irminmodels.WorkflowStatusPending) {
				continue
			}

			if processWorkflowRunErr := o.processWorkflowRun(ctx, notification); processWorkflowRunErr != nil {
				o.logger.ErrorContext(ctx, "failed to process workflow run",
					"error", processWorkflowRunErr,
					"run_id", notification.ID)
			}
		}
	}
}

// parseNotification parses a notification payload.
func (o *Orchestrator) parseNotification(payload string) (*db.RunStatusNotificationPayload, error) {
	var notification db.RunStatusNotificationPayload
	if err := json.Unmarshal([]byte(payload), &notification); err != nil {
		return nil, fmt.Errorf("failed to parse notification: %w", err)
	}
	return &notification, nil
}

// processWorkflowRun processes a single workflow run.
func (o *Orchestrator) processWorkflowRun(ctx context.Context, notification *db.RunStatusNotificationPayload) error {
	// Use a transaction with proper locking to claim the job
	var run db.WorkflowRun
	processWorkflowRunErr := o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if claimWorkflowRunErr := o.claimWorkflowRun(tx, notification.ID, &run); claimWorkflowRunErr != nil {
			return claimWorkflowRunErr
		}

		// If no run was claimed, it was already claimed by another dispatcher
		if run.ID == 0 {
			return nil
		}

		// Update status to 'initiating' with a timestamp and claim info
		run.Status = irminmodels.WorkflowStatusInitiating
		if updateRunStatusErr := tx.Save(&run).Error; updateRunStatusErr != nil {
			return fmt.Errorf("failed to update run status: %w", updateRunStatusErr)
		}

		return nil
	})

	if processWorkflowRunErr != nil {
		o.logger.ErrorContext(ctx, "failed to process workflow run",
			"error", processWorkflowRunErr,
			"run_id", notification.ID)
		return fmt.Errorf("failed to process workflow run: %w", processWorkflowRunErr)
	}

	// If we got a run, dispatch it
	if run.ID != 0 {
		if dispatchRunErr := o.dispatchRun(ctx, &run); dispatchRunErr != nil {
			// If dispatch fails, we should mark the run as failed
			run.Status = irminmodels.WorkflowStatusError
			run.UpdatedAt = time.Now()
			if err := o.db.WithContext(ctx).Save(&run).Error; err != nil {
				o.logger.ErrorContext(ctx, "failed to update run status after dispatch error",
					"error", dispatchRunErr,
					"run_id", run.ID)
			}
			return fmt.Errorf("failed to dispatch run: %w", dispatchRunErr)
		}
	}

	return nil
}

// claimWorkflowRun attempts to claim a workflow run using proper locking.
func (o *Orchestrator) claimWorkflowRun(tx *gorm.DB, id uint, run *db.WorkflowRun) error {
	if claimWorkflowRunErr := tx.Clauses(clause.Locking{
		Strength: "UPDATE",
		Options:  "SKIP LOCKED",
	}).Where("id = ? AND status = ? AND deleted_at IS NULL", id, irminmodels.WorkflowStatusPending).
		First(&run).Error; claimWorkflowRunErr != nil {
		if errors.Is(claimWorkflowRunErr, gorm.ErrRecordNotFound) {
			// Job was already claimed by another dispatcher
			return nil
		}
		return fmt.Errorf("failed to claim job: %w", claimWorkflowRunErr)
	}

	return nil
}

// dispatchRun dispatches a run to the /dispatch endpoint of the API.
func (o *Orchestrator) dispatchRun(ctx context.Context, run *db.WorkflowRun) error {
	if run == nil {
		return errors.New("run is nil")
	}
	if run.ID == 0 {
		return errors.New("run id is 0")
	}

	// Initialise the Irmin client with the system API key.
	client := irmincore.NewClient(fmt.Sprintf("%s/api", o.env.URL), o.env.SystemToken, "en")

	// Build the dispatch event.
	dispatchEvent := DispatchEvent{
		Timestamp:     time.Now(),
		EventType:     DispatchEventTypeWorkflowRun,
		WorkflowRunID: &run.ID,
		WorkflowID:    &run.WorkflowID,
	}

	// Dispatch the event.
	_, dispatchRunErr := client.CallSystemWebhook(ctx, "dispatch", nil, &dispatchEvent)
	if dispatchRunErr != nil {
		o.logger.ErrorContext(ctx, "failed to dispatch run", "error", dispatchRunErr, "run_id", run.ID)
		return dispatchRunErr
	}
	o.logger.InfoContext(ctx, "dispatched run", "run_id", run.ID)

	return nil
}
