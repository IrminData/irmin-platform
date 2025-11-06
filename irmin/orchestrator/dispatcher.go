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
	"github.com/jackc/pgx/v5/pgxpool"
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

	// Create a cancellable context for the listener goroutine
	listenerCtx, cancelListener := context.WithCancel(ctx)
	defer cancelListener()

	// Create a channel to receive notifications
	notificationChan := make(chan string, DefaultChannelBufferSize)

	// Create an error channel to receive fatal errors from the listener
	listenerErrChan := make(chan error, 1)

	// Create a done channel to signal when the listener goroutine has finished
	listenerDone := make(chan struct{})

	// Start the notification listener
	go func() {
		o.startNotificationListener(listenerCtx, notificationChan, listenerErrChan)
		close(listenerDone)
	}()

	// Process notifications
	processErr := o.processNotifications(ctx, notificationChan, listenerErrChan)

	// Cancel the listener context to signal it to stop
	cancelListener()

	// Wait for the listener goroutine to finish before closing channels
	<-listenerDone

	// Now it's safe to close the channels
	close(notificationChan)
	close(listenerErrChan)

	return processErr
}

// startNotificationListener listens for PostgreSQL notifications and sends them to the channel.
// Uses advisory locking to ensure only one process across all instances listens for notifications.
// This function blocks and holds the lock for its entire lifetime.
// Fatal errors are sent to listenerErrChan to propagate back to StartDispatcher.
func (o *Orchestrator) startNotificationListener(
	ctx context.Context,
	notificationChan chan<- string,
	listenerErrChan chan<- error,
) {
	lockConn, lockKey, locked, err := o.acquireNotificationListenerLock(ctx, listenerErrChan)
	if err != nil || !locked {
		return
	}
	defer lockConn.Release()
	defer o.releaseNotificationListenerLock(ctx, lockConn, lockKey)

	listenConn, err := o.setupNotificationListening(ctx, listenerErrChan)
	if err != nil {
		return
	}
	defer listenConn.Release()

	o.runNotificationLoop(ctx, listenConn, notificationChan, listenerErrChan)
}

// acquireNotificationListenerLock acquires the advisory lock for the notification listener.
// Returns the connection, lock key, whether the lock was acquired, and any error.
func (o *Orchestrator) acquireNotificationListenerLock(
	ctx context.Context,
	listenerErrChan chan<- error,
) (*pgxpool.Conn, string, bool, error) {
	lockConn, err := o.db.GetPgxConn(ctx)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to acquire connection for notification listener lock", "error", err)
		o.sendListenerError(
			ctx,
			listenerErrChan,
			fmt.Errorf("failed to acquire connection for notification listener lock: %w", err),
		)
		return nil, "", false, err
	}

	lockKey := "orchestrator:notification_listener"
	o.logger.DebugContext(ctx, "attempting to acquire notification listener lock")

	locked, lockErr := db.TryLockKeyConn(ctx, lockConn, lockKey)
	if lockErr != nil {
		o.logger.ErrorContext(ctx, "error acquiring notification listener lock", "error", lockErr)
		o.sendListenerError(ctx, listenerErrChan, fmt.Errorf("error acquiring notification listener lock: %w", lockErr))
		lockConn.Release()
		return nil, "", false, lockErr
	}

	if !locked {
		o.logger.InfoContext(ctx, "notification listener already running in another process, skipping")
		lockConn.Release()
		return nil, "", false, nil
	}

	o.logger.WarnContext(ctx, "🎯 ACQUIRED notification listener lock - this process will handle all notifications")
	return lockConn, lockKey, true, nil
}

// releaseNotificationListenerLock releases the advisory lock.
func (o *Orchestrator) releaseNotificationListenerLock(ctx context.Context, lockConn *pgxpool.Conn, lockKey string) {
	if unlockErr := db.UnlockKeyConn(ctx, lockConn, lockKey); unlockErr != nil {
		o.logger.ErrorContext(ctx, "error releasing notification listener lock", "error", unlockErr)
	}
}

// setupNotificationListening sets up the database connection and starts listening for notifications.
func (o *Orchestrator) setupNotificationListening(
	ctx context.Context,
	listenerErrChan chan<- error,
) (*pgxpool.Conn, error) {
	listenConn, err := o.db.GetPgxConn(ctx)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to acquire connection for notification listening", "error", err)
		o.sendListenerError(
			ctx,
			listenerErrChan,
			fmt.Errorf("failed to acquire connection for notification listening: %w", err),
		)
		return nil, err
	}

	if _, listenExecErr := listenConn.Exec(ctx, "LISTEN workflow_run_status"); listenExecErr != nil {
		o.logger.ErrorContext(ctx, "failed to start listening for notifications", "error", listenExecErr)
		o.sendListenerError(
			ctx,
			listenerErrChan,
			fmt.Errorf("failed to start listening for notifications: %w", listenExecErr),
		)
		listenConn.Release()
		return nil, listenExecErr
	}

	o.logger.InfoContext(ctx, "started listening for notifications on workflow_run_status channel")
	return listenConn, nil
}

// runNotificationLoop runs the main loop that waits for and processes notifications.
func (o *Orchestrator) runNotificationLoop(
	ctx context.Context,
	listenConn *pgxpool.Conn,
	notificationChan chan<- string,
	listenerErrChan chan<- error,
) {
	for {
		notification, waitForNotificationErr := listenConn.Conn().WaitForNotification(ctx)
		if waitForNotificationErr != nil {
			if errors.Is(waitForNotificationErr, context.Canceled) {
				o.logger.InfoContext(ctx, "notification listener context cancelled, stopping")
				return
			}
			o.logger.ErrorContext(ctx, "error waiting for notification", "error", waitForNotificationErr)
			o.sendListenerError(
				ctx,
				listenerErrChan,
				fmt.Errorf("error waiting for notification: %w", waitForNotificationErr),
			)
			return
		}

		if notification == nil {
			continue
		}

		o.forwardNotification(ctx, notification.Payload, notificationChan)
	}
}

// forwardNotification forwards a notification to the notification channel.
func (o *Orchestrator) forwardNotification(ctx context.Context, payload string, notificationChan chan<- string) {
	select {
	case notificationChan <- payload:
		o.logger.DebugContext(ctx, "forwarded notification to channel", "payload", payload)
	case <-ctx.Done():
		return
	default:
		o.logger.WarnContext(ctx, "notification channel full, skipping notification", "payload", payload)
	}
}

// sendListenerError sends an error to the listener error channel, respecting context cancellation.
func (o *Orchestrator) sendListenerError(ctx context.Context, listenerErrChan chan<- error, err error) {
	select {
	case listenerErrChan <- err:
	case <-ctx.Done():
	}
}

// processNotifications processes notifications from the channel.
// Returns an error if the notification listener encounters a fatal error.
func (o *Orchestrator) processNotifications(
	ctx context.Context,
	notificationChan <-chan string,
	listenerErrChan <-chan error,
) error {
	for {
		select {
		case <-ctx.Done():
			o.logger.InfoContext(ctx, "dispatcher shutting down")
			return ctx.Err()

		case err := <-listenerErrChan:
			o.logger.ErrorContext(ctx, "notification listener encountered fatal error", "error", err)
			return fmt.Errorf("notification listener failed: %w", err)

		case payload := <-notificationChan:
			o.logger.InfoContext(ctx, "received notification", "payload", payload)

			notification, err := o.parseNotification(payload)
			if err != nil {
				o.logger.ErrorContext(ctx, "failed to parse notification payload",
					"error", err,
					"payload", payload)
				continue
			}

			// Handle different status changes
			switch notification.Status {
			case string(irminmodels.WorkflowStatusPending):
				// New workflow run to dispatch
				if processWorkflowRunErr := o.processWorkflowRun(ctx, notification); processWorkflowRunErr != nil {
					o.logger.ErrorContext(ctx, "failed to process workflow run",
						"error", processWorkflowRunErr,
						"run_id", notification.ID)
				}

			case string(irminmodels.WorkflowStatusCancelled):
				// Workflow run cancelled - need to stop execution
				o.logger.InfoContext(ctx, "workflow run cancelled, attempting to cancel execution",
					"run_id", notification.ID)

				cancelled := o.CancelWorkflowRun(notification.ID)
				if cancelled {
					o.logger.InfoContext(ctx, "workflow execution cancelled successfully",
						"run_id", notification.ID)
				} else {
					o.logger.InfoContext(ctx, "workflow not running or already finished",
						"run_id", notification.ID)
				}
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
