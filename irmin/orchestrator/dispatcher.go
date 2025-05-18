package orchestrator

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
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
	WorkflowRunID *uint             `json:"workflow_run_id,omitempty"`
}

// StartDispatcher starts the dispatcher that listens for PostgreSQL notifications
// about new or updated workflow runs and dispatches them to the API.
func (o *Orchestrator) StartDispatcher(ctx context.Context) error {
	o.logger.InfoContext(ctx, "starting dispatcher")

	// Create a channel to receive notifications
	notificationChan := make(chan string, 100)
	defer close(notificationChan)

	// Start the notification listener
	go o.startNotificationListener(ctx, notificationChan)

	// Process notifications
	return o.processNotifications(ctx, notificationChan)
}

// startNotificationListener starts a goroutine that listens for PostgreSQL notifications.
func (o *Orchestrator) startNotificationListener(ctx context.Context, notificationChan chan<- string) {
	// Start listening for notifications
	cleanup, err := o.db.ListenForNotifications(ctx, "workflow_run_status")
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to start listening for notifications", "error", err)
		return
	}
	defer cleanup()

	// Background goroutine to handle notifications
	go func() {
		for {
			// Wait for notification with timeout
			ctxWithTimeout, cancel := context.WithTimeout(ctx, 90*time.Second)
			notification, err := o.db.WaitForNotification(ctxWithTimeout, "workflow_run_status")
			cancel()

			if err != nil {
				if errors.Is(err, context.DeadlineExceeded) {
					continue
				}
				if errors.Is(err, context.Canceled) {
					return
				}
				o.logger.ErrorContext(ctx, "error waiting for notification", "error", err)
				return
			}

			select {
			case notificationChan <- notification.Payload:
			case <-ctx.Done():
				return
			default:
				// Channel is full, log warning and skip
				o.logger.WarnContext(ctx, "notification channel full, skipping notification")
			}
		}
	}()
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
			if notification.Status != string(db.WorkflowStatusPending) {
				continue
			}

			if err := o.processWorkflowRun(ctx, notification); err != nil {
				o.logger.ErrorContext(ctx, "failed to process workflow run",
					"error", err,
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
	err := o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := o.claimWorkflowRun(ctx, tx, notification.ID, &run); err != nil {
			return err
		}

		// If no run was claimed, it was already claimed by another dispatcher
		if run.ID == 0 {
			return nil
		}

		// Update status to 'initiating' with a timestamp and claim info
		run.Status = db.WorkflowStatusInitiating
		if err := tx.Save(&run).Error; err != nil {
			return fmt.Errorf("failed to update run status: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to process workflow run: %w", err)
	}

	// If we got a run, dispatch it
	if run.ID != 0 {
		if err := o.dispatchRun(ctx, &run); err != nil {
			// If dispatch fails, we should mark the run as failed
			run.Status = db.WorkflowStatusError
			run.UpdatedAt = time.Now()
			if err := o.db.WithContext(ctx).Save(&run).Error; err != nil {
				o.logger.ErrorContext(ctx, "failed to update run status after dispatch error",
					"error", err,
					"run_id", run.ID)
			}
			return fmt.Errorf("failed to dispatch run: %w", err)
		}
	}

	return nil
}

// claimWorkflowRun attempts to claim a workflow run using proper locking.
func (o *Orchestrator) claimWorkflowRun(ctx context.Context, tx *gorm.DB, runID uint, run *db.WorkflowRun) error {
	if err := tx.Clauses(clause.Locking{
		Strength: "UPDATE",
		Options:  "SKIP LOCKED",
	}).Where("id = ? AND status = ? AND deleted_at IS NULL", runID, db.WorkflowStatusPending).
		First(run).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Job was already claimed by another dispatcher
			o.logger.DebugContext(ctx, "job already claimed by another dispatcher",
				"run_id", runID)
			return nil
		}
		return fmt.Errorf("failed to claim job: %w", err)
	}

	// Double-check the status hasn't changed
	if run.Status != db.WorkflowStatusPending {
		return nil
	}

	return nil
}

// dispatchRun dispatches a run to the /dispatch endpoint of the API.
func (o *Orchestrator) dispatchRun(ctx context.Context, run *db.WorkflowRun) error {
	// Initialise the Irmin client with the system API key.
	client := irmincore.NewClient(fmt.Sprintf("%s/api", o.env.URL), o.env.SystemToken, "en")

	// Build the dispatch event.
	dispatchEvent := DispatchEvent{
		Timestamp:     time.Now(),
		EventType:     DispatchEventTypeWorkflowRun,
		WorkflowRunID: &run.ID,
	}

	// Dispatch the event.
	_, err := client.CallSystemWebhook("dispatch", nil, &dispatchEvent)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to dispatch run", "error", err, "run_id", run.ID)
		return err
	}
	o.logger.InfoContext(ctx, "dispatched run", "run_id", run.ID)

	return nil
}
