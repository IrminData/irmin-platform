package orchestrator

import (
	"context"
	"errors"
	"fmt"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/utils"
	"log/slog"
	"strings"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/teambition/rrule-go"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Orchestrator struct {
	db             *db.Database
	logger         *slog.Logger
	env            *utils.CoreAPIEnv
	dataEngine     *engine.Client
	computeSandbox *sandbox.ComputeSandbox

	// LakeFS events are events that are received from the LakeFS webhook.
	lakefsEventQueue chan *lakefs.WebhookEvent
	// Worker events are events that are sent by the worker back to the orchestrator.
	workerEventQueue chan *WorkerEvent
	// Dispatched events are events that are dispatched to the API to be executed.
	dispatchedEventQueue chan *DispatchEvent
}

func NewOrchestrator(
	d *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	dataEngine *engine.Client,
) *Orchestrator {
	// Initialize the compute sandbox
	computeSandbox := sandbox.NewComputeSandbox(env, d, logger)

	// Initialize the orchestrator
	return &Orchestrator{
		db:                   d,
		logger:               logger,
		env:                  env,
		dataEngine:           dataEngine,
		computeSandbox:       computeSandbox,
		lakefsEventQueue:     make(chan *lakefs.WebhookEvent, DefaultChannelBufferSize),
		dispatchedEventQueue: make(chan *DispatchEvent, DefaultChannelBufferSize),
		workerEventQueue:     make(chan *WorkerEvent, DefaultChannelBufferSize),
	}
}

func (o *Orchestrator) AddLakefsEvent(event *lakefs.WebhookEvent) {
	o.lakefsEventQueue <- event
}

func (o *Orchestrator) AddDispatchedEvent(event *DispatchEvent) {
	o.dispatchedEventQueue <- event
}

func (o *Orchestrator) AddWorkerEvent(event *WorkerEvent) {
	o.workerEventQueue <- event
}

// StartOrchestrator starts the orchestrator and the dispatcher.
// It will tick every 10 seconds to check for time-based triggers.
// When a trigger is due to run, it will create a new workflow run.
// It will also start the dispatcher in a new goroutine.
// The dispatcher will check for pending workflow runs and dispatch them to be executed.
func (o *Orchestrator) StartOrchestrator(ctx context.Context) error {
	o.logger.InfoContext(ctx, "starting orchestrator")

	// Create a channel to receive dispatcher errors
	dispatcherErrChan := make(chan error, 1)

	// Start the dispatcher in a goroutine
	go func() {
		if err := o.StartDispatcher(ctx); err != nil {
			o.logger.ErrorContext(ctx, "dispatcher failed", "error", err)
			select {
			case dispatcherErrChan <- err:
			case <-ctx.Done():
			}
		}
	}()

	// tick every 10 seconds
	ticker := time.NewTicker(TriggerScanInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			o.logger.InfoContext(ctx, "orchestrator shutting down")
			return ctx.Err()

		case err := <-dispatcherErrChan:
			o.logger.ErrorContext(ctx, "dispatcher error, shutting down orchestrator", "error", err)
			return fmt.Errorf("dispatcher error: %w", err)

		case event := <-o.dispatchedEventQueue:
			o.logger.InfoContext(ctx, "received dispatched event", "event", event)

			// Create a new context for the dispatched event with proper cancellation
			dispatchedCtx, cancelDispatched := context.WithCancel(ctx)

			// Execute the dispatched event
			if err := o.ExecuteDispatchedEvent(dispatchedCtx, event); err != nil {
				o.logger.ErrorContext(ctx, "error executing dispatched event", "error", err)
			}

			// Properly cancel the context to prevent resource leaks
			cancelDispatched()

		case event := <-o.lakefsEventQueue:
			o.logger.InfoContext(ctx, "received lakefs event", "event", event)

			// Create a new context for the lakefs event with proper cancellation
			lakefsCtx, cancelLakefs := context.WithCancel(ctx)

			// Process the lakefs event
			if err := o.processRepositoryEvent(lakefsCtx, event); err != nil {
				o.logger.ErrorContext(ctx, "error processing repository event", "error", err)
			}

			// Properly cancel the context to prevent resource leaks
			cancelLakefs()

		case event := <-o.workerEventQueue:
			o.logger.InfoContext(ctx, "received worker event", "event", event)

			// Create a new context for the worker event with proper cancellation
			workerCtx, cancelWorker := context.WithCancel(ctx)

			// Process the worker event
			if err := o.processWorkerEvent(workerCtx, event); err != nil {
				o.logger.ErrorContext(ctx, "error processing worker event", "error", err)
			}

			// Properly cancel the context to prevent resource leaks
			cancelWorker()

		case <-ticker.C:
			// Create a new context for the trigger scan with proper cancellation
			triggerScanCtx, cancelTriggerScan := context.WithCancel(ctx)

			// Process the time triggers
			if err := o.processTimeTriggers(triggerScanCtx); err != nil {
				o.logger.ErrorContext(ctx, "error processing time triggers", "error", err)
			}

			// Properly cancel the context to prevent resource leaks
			cancelTriggerScan()
		}
	}
}

// processTimeTrigger handles a single time trigger, creating a workflow run if needed
// and updating its next run time.
func (o *Orchestrator) processTimeTrigger(ctx context.Context, tx *gorm.DB, t *db.WorkflowTrigger) error {
	o.logger.InfoContext(ctx, "processing time trigger", "trigger_id", t.ID)

	// Calculate next run time if not set
	if t.NextRun == nil {
		nextRun, ruleStr, cronStr, err := o.calculateNextRunTime(*t)
		if err != nil {
			o.logger.ErrorContext(ctx, "failed to calculate next run time", "error", err, "trigger_id", t.ID)
			return err
		}
		t.NextRun = nextRun
		t.RRule = ruleStr
		t.Cron = cronStr
	}

	// Create workflow run if trigger is due
	now := time.Now()
	if t.NextRun.Before(now) || t.NextRun.Equal(now) {
		if err := o.createWorkflowRunForTimeTrigger(ctx, tx, t); err != nil {
			o.logger.ErrorContext(
				ctx,
				"failed to create workflow run for trigger",
				"error",
				err,
				"trigger_id",
				t.ID,
			)
			return err
		}
	} else if err := tx.Save(t).Error; err != nil {
		return err
	}

	return nil
}

func (o *Orchestrator) processTimeTriggers(ctx context.Context) error {
	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var triggers []db.WorkflowTrigger

		// Find time based triggers that either:
		// 1. Have next_run <= now (due to run)
		// 2. Have no next_run set (need to calculate)
		// 3. Are not soft deleted (DeletedAt IS NULL)
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("type = ? AND (next_run IS NULL OR next_run <= ?) AND deleted_at IS NULL", db.TimeTriggerType, time.Now()).
			Find(&triggers).Error; err != nil {
			return err
		}

		// If there are no triggers to process, log and return
		if len(triggers) == 0 {
			return nil
		}

		// Process each trigger
		for _, t := range triggers {
			if err := o.processTimeTrigger(ctx, tx, &t); err != nil {
				// Log error but continue processing other triggers
				o.logger.ErrorContext(ctx, "error processing time trigger", "error", err, "trigger_id", t.ID)
				continue
			}
		}

		return nil
	})
}

// calculateNextRunTime calculates the next run time for a time trigger
// based on the RRule or Cron expression.
// It returns the next run time, the RRule string, the Cron string, and an error.
func (o *Orchestrator) calculateNextRunTime(t db.WorkflowTrigger) (*time.Time, *string, *string, error) {
	if t.Type != db.TimeTriggerType {
		return nil, nil, nil, errors.New("trigger type is not time")
	}

	var nextRun time.Time
	var ruleStr string
	var cronStr string
	now := time.Now()
	switch {
	case t.RRule != nil && *t.RRule != "":
		// Prepare the RRule string
		ruleStr = *t.RRule
		ruleStr = strings.TrimPrefix(ruleStr, "RRULE:")
		ruleStr = strings.TrimSpace(ruleStr)
		ruleStr = strings.TrimSuffix(ruleStr, ";")

		// If the RRule string doesn't contain DTSTART, add it
		if !strings.Contains(ruleStr, "DTSTART") {
			// Format with newlines between components
			ruleStr = "DTSTART:" + now.UTC().Format("20060102T150405Z") + "\n" + ruleStr
		} else {
			// Replace semicolons with newlines for existing DTSTART
			ruleStr = strings.ReplaceAll(ruleStr, ";", "\n")
		}

		// Parse the RRule string
		rule, err := rrule.StrToRRule(ruleStr)
		if err != nil {
			return nil, &ruleStr, t.Cron, errors.New(
				"invalid RRule format, rrule: " + ruleStr + " error: " + err.Error(),
			)
		}

		// If we have a last run time, use it as the start time
		// Otherwise use now as the start time
		startTime := now
		if t.LastRun != nil {
			startTime = *t.LastRun
		}

		// Get the next occurrence after the start time
		next := rule.After(startTime, false)
		if next.IsZero() {
			return nil, &ruleStr, t.Cron, errors.New("no future occurrences found in RRule")
		}
		nextRun = next

	case t.Cron != nil && *t.Cron != "":
		// Prepare the cron expression
		cronStr = *t.Cron
		cronStr = strings.TrimPrefix(cronStr, "CRON:")
		cronStr = strings.TrimSpace(cronStr)

		// Parse the cron expression
		schedule, err := cron.ParseStandard(cronStr)
		if err != nil {
			return nil, t.RRule, &cronStr, errors.New(
				"invalid cron expression, cron: " + cronStr + " error: " + err.Error(),
			)
		}

		// If we have a last run time, use it as the start time
		// Otherwise use now as the start time
		startTime := now
		if t.LastRun != nil {
			startTime = *t.LastRun
		}

		// Get the next occurrence after the start time
		next := schedule.Next(startTime)
		if next.IsZero() {
			return nil, t.RRule, &cronStr, errors.New("no future occurrences found in cron expression")
		}
		nextRun = next

	default:
		return nil, nil, nil, errors.New("time trigger has neither RRule nor Cron")
	}

	return &nextRun, &ruleStr, &cronStr, nil
}

// createWorkflowRunForTimeTrigger creates a new workflow run for a time trigger and updates its next run time.
func (o *Orchestrator) createWorkflowRunForTimeTrigger(ctx context.Context, tx *gorm.DB, t *db.WorkflowTrigger) error {
	// Get the workflow associated with this trigger
	var workflow db.Workflow
	if getWorkflowErr := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; getWorkflowErr != nil {
		o.logger.ErrorContext(ctx, "failed to get workflow for trigger", "error", getWorkflowErr, "trigger_id", t.ID)
		// Delete the trigger if we can't find the workflow
		if deleteTriggerErr := tx.Delete(t).Error; deleteTriggerErr != nil {
			o.logger.ErrorContext(ctx, "failed to delete trigger", "error", deleteTriggerErr, "trigger_id", t.ID)
		}
		return getWorkflowErr
	}

	// Create a new workflow run
	run, createWorkflowRunErr := lib.CreateWorkflowRun(tx, &workflow, nil, t)
	if createWorkflowRunErr != nil {
		o.logger.ErrorContext(ctx, "failed to create workflow run", "error", createWorkflowRunErr, "trigger_id", t.ID)
		return createWorkflowRunErr
	}
	o.logger.InfoContext(ctx, "created workflow run", "run_id", run.ID)

	// Update trigger for next run
	now := time.Now()
	t.LastRun = &now
	nextRun, ruleStr, cronStr, calculateNextRunTimeErr := o.calculateNextRunTime(*t)
	if calculateNextRunTimeErr != nil {
		o.logger.ErrorContext(
			ctx,
			"failed to calculate next run time",
			"error",
			calculateNextRunTimeErr,
			"trigger_id",
			t.ID,
		)
		return calculateNextRunTimeErr
	}
	t.NextRun = nextRun
	t.RRule = ruleStr
	t.Cron = cronStr

	if saveTriggerErr := tx.Save(t).Error; saveTriggerErr != nil {
		o.logger.ErrorContext(ctx, "failed to save trigger", "error", saveTriggerErr, "trigger_id", t.ID)
		return saveTriggerErr
	}

	return nil
}

// processRepositoryTrigger handles a single repository trigger, creating a workflow run if conditions match.
func (o *Orchestrator) processRepositoryTrigger(
	ctx context.Context,
	tx *gorm.DB,
	t *db.WorkflowTrigger,
	event *lakefs.WebhookEvent,
) error {
	o.logger.InfoContext(ctx, "processing event", "event", event, "trigger", t)

	// If the trigger specifies an event type, check if it matches the event
	if t.RepositoryEvent != nil && *t.RepositoryEvent != event.EventType {
		o.logger.InfoContext(ctx, "event type does not match trigger", "event", event, "trigger", t)
		return nil
	}

	// If the trigger specifies a ref, check if it matches the event
	if t.RepositoryRef != nil && *t.RepositoryRef != "" {
		if t.RepositoryRef != event.BranchID &&
			t.RepositoryRef != event.TagID &&
			t.RepositoryRef != event.CommitID {
			o.logger.InfoContext(ctx, "ref does not match trigger", "event", event, "trigger", t)
			return nil
		}
	}

	// Get the workflow associated with this trigger
	var workflow db.Workflow
	if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
		o.logger.ErrorContext(ctx, "failed to get workflow for trigger", "error", err, "trigger_id", t.ID)
		// Delete the trigger if we can't find the workflow
		if deleteErr := tx.Delete(t).Error; deleteErr != nil {
			o.logger.ErrorContext(ctx, "failed to delete trigger", "error", deleteErr, "trigger_id", t.ID)
		}
		return err
	}

	// Create a new workflow run
	run, err := lib.CreateWorkflowRun(tx, &workflow, nil, t)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to create workflow run", "error", err, "trigger_id", t.ID)
		return err
	}
	o.logger.InfoContext(ctx, "created workflow run", "run_id", run.ID)
	return nil
}

func (o *Orchestrator) processRepositoryEvent(ctx context.Context, event *lakefs.WebhookEvent) error {
	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get the repository from the event
		var repository db.Repository
		if err := tx.Where("lakefs_repo_id = ?", event.RepositoryID).First(&repository).Error; err != nil {
			o.logger.ErrorContext(ctx, "failed to get repository", "error", err, "repository_id", event.RepositoryID)
			return err
		}

		o.logger.InfoContext(ctx, "found repository", "repository", repository)

		var triggers []db.WorkflowTrigger
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("type = ? AND repository_id = ? AND deleted_at IS NULL", db.RepositoryTriggerType, repository.ID).
			Find(&triggers).Error; err != nil {
			return err
		}

		o.logger.InfoContext(ctx, "found triggers", "triggers", triggers)

		// Process each trigger
		for _, t := range triggers {
			if err := o.processRepositoryTrigger(ctx, tx, &t, event); err != nil {
				// Log error but continue processing other triggers
				o.logger.ErrorContext(ctx, "error processing repository trigger", "error", err, "trigger_id", t.ID)
				continue
			}
		}

		return nil
	})
}

// processWorkflowRunTrigger handles a single workflow run trigger.
func (o *Orchestrator) processWorkflowRunTrigger(
	ctx context.Context,
	tx *gorm.DB,
	t *db.WorkflowTrigger,
	event *WorkerEvent,
) error {
	o.logger.InfoContext(ctx, "processing event", "event", event, "trigger", t)

	// Get the workflow associated with this trigger
	var workflow db.Workflow
	if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
		o.logger.ErrorContext(ctx, "failed to get workflow for trigger", "error", err, "trigger_id", t.ID)
		// Delete the trigger if we can't find the workflow
		if deleteErr := tx.Delete(t).Error; deleteErr != nil {
			o.logger.ErrorContext(ctx, "failed to delete trigger", "error", deleteErr, "trigger_id", t.ID)
		}
		return err
	}

	// Create a new workflow run
	run, err := lib.CreateWorkflowRun(tx, &workflow, nil, t)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to create workflow run", "error", err, "trigger_id", t.ID)
		return err
	}
	o.logger.InfoContext(ctx, "created workflow run", "run_id", run.ID)
	return nil
}

func (o *Orchestrator) processWorkerEvent(ctx context.Context, event *WorkerEvent) error {
	if event.Topic != WorkerEventTopicWorkflowRun {
		return nil
	}

	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Find the matching triggers
		var triggers []db.WorkflowTrigger
		if err := tx.Where("workflow_run_event = ? AND workflow_id = ? AND deleted_at IS NULL",
			event.WorkflowRunEventType, event.WorkflowID).Find(&triggers).Error; err != nil {
			o.logger.ErrorContext(ctx, "failed to get triggers", "error", err,
				"workflow_id", event.WorkflowID, "workflow_run_id", event.WorkflowRunID)
			return err
		}

		// Process each trigger
		for _, t := range triggers {
			if err := o.processWorkflowRunTrigger(ctx, tx, &t, event); err != nil {
				// Log error but continue processing other triggers
				o.logger.ErrorContext(ctx, "error processing workflow run trigger", "error", err, "trigger_id", t.ID)
				continue
			}
		}

		return nil
	})
}
