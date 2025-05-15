package orchestrator

import (
	"context"
	"errors"
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/utils"
	"log/slog"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/teambition/rrule-go"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Orchestrator struct {
	db     *db.Database
	logger *slog.Logger
	env    *utils.CoreAPIEnv

	// LakeFS events are events that are received from the LakeFS webhook.
	lakefsEventQueue chan *lakefs.WebhookEvent
	// Worker events are events that are sent by the worker back to the orchestrator.
	workerEventQueue chan *WorkerEvent
	// Dispatched events are events that are dispatched to the API to be executed.
	dispatchedEventQueue chan *DispatchEvent
}

func NewOrchestrator(d *db.Database, logger *slog.Logger, env *utils.CoreAPIEnv) *Orchestrator {
	return &Orchestrator{
		db:                   d,
		logger:               logger,
		env:                  env,
		lakefsEventQueue:     make(chan *lakefs.WebhookEvent, 100),
		dispatchedEventQueue: make(chan *DispatchEvent, 100),
		workerEventQueue:     make(chan *WorkerEvent, 100),
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
	// Start the dispatcher
	go o.StartDispatcher(ctx)

	// tick every 10 seconds
	ticker := time.NewTicker(time.Second * 10)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			o.logger.InfoContext(ctx, "orchestrator shutting down")
			// TODO: We need to figure out how not to lose lakefs events when the orchestrator shuts down
			return ctx.Err()

		case event := <-o.dispatchedEventQueue:
			o.logger.InfoContext(ctx, "received dispatched event", "event", event)

			if err := o.ExecuteDispatchedEvent(ctx, event); err != nil {
				o.logger.ErrorContext(ctx, "error executing dispatched event", "error", err)
			}

		case event := <-o.lakefsEventQueue:
			o.logger.InfoContext(ctx, "received lakefs event", "event", event)

			if err := o.processRepositoryEvent(ctx, event); err != nil {
				o.logger.ErrorContext(ctx, "error processing repository event", "error", err)
			}

		case event := <-o.workerEventQueue:
			o.logger.InfoContext(ctx, "received worker event", "event", event)

			if err := o.processWorkerEvent(ctx, event); err != nil {
				o.logger.ErrorContext(ctx, "error processing worker event", "error", err)
			}

		case <-ticker.C:
			o.logger.InfoContext(ctx, "running trigger scan")

			if err := o.processTimeTriggers(ctx); err != nil {
				o.logger.ErrorContext(ctx, "error processing time triggers", "error", err)
			}
		}
	}
}

// processTimeTriggers processes time-based triggers.
// It will find triggers that are due to run and create a new workflow run.
// It will also update the trigger to the next run time.
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

		if len(triggers) == 0 {
			o.logger.InfoContext(ctx, "no triggers to process")
			return nil
		}
		o.logger.InfoContext(ctx, "found triggers", "triggers", triggers)

		for _, t := range triggers {
			// Calculate next run time if not set
			if t.NextRun == nil {
				nextRun, err := o.calculateNextRunTime(t)
				if err != nil {
					o.logger.ErrorContext(ctx, "failed to calculate next run time", "error", err, "trigger_id", t.ID)
					continue
				}
				t.NextRun = nextRun
			}

			// Create workflow run if trigger is due
			if t.NextRun.Before(time.Now()) || t.NextRun.Equal(time.Now()) {
				// Get the workflow associated with this trigger
				var workflow db.Workflow
				if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
					o.logger.ErrorContext(ctx, "failed to get workflow for trigger", "error", err, "trigger_id", t.ID)
					continue
				}

				// Create a new workflow run
				run, err := lib.CreateWorkflowRun(tx, &workflow, nil, &t)
				if err != nil {
					o.logger.ErrorContext(ctx, "failed to create workflow run", "error", err, "trigger_id", t.ID)
					continue
				}
				o.logger.InfoContext(ctx, "created workflow run", "run_id", run.ID)

				// Update trigger for next run
				t.LastRun = t.NextRun
				nextRun, err := o.calculateNextRunTime(t)
				if err != nil {
					o.logger.ErrorContext(ctx, "failed to calculate next run time", "error", err, "trigger_id", t.ID)
					continue
				}
				t.NextRun = nextRun
			}

			if err := tx.Save(&t).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// calculateNextRunTime calculates the next run time for a time trigger
// based on the RRule or Cron expression.
func (o *Orchestrator) calculateNextRunTime(t db.WorkflowTrigger) (*time.Time, error) {
	if t.Type != db.TimeTriggerType {
		return nil, errors.New("trigger type is not time")
	}

	var nextRun time.Time
	now := time.Now()

	if t.RRule != nil {
		// Parse the RRule string
		rule, err := rrule.StrToRRule(*t.RRule)
		if err != nil {
			return nil, errors.New("invalid RRule format: " + err.Error())
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
			return nil, errors.New("no future occurrences found in RRule")
		}
		nextRun = next
	} else if t.Cron != nil {
		// Parse the cron expression
		schedule, err := cron.ParseStandard(*t.Cron)
		if err != nil {
			return nil, errors.New("invalid cron expression: " + err.Error())
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
			return nil, errors.New("no future occurrences found in cron expression")
		}
		nextRun = next
	} else {
		return nil, errors.New("time trigger has neither RRule nor Cron")
	}

	return &nextRun, nil
}

// processRepositoryEvent processes the repository event.
// It will find the repository and the workflow associated with the event
// and create a new workflow run.
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

		// Find repository event triggers that point to any of the repositories
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("type = ? AND repository_id = ? AND deleted_at IS NULL", db.RepositoryTriggerType, repository.ID).
			Find(&triggers).Error; err != nil {
			return err
		}

		o.logger.InfoContext(ctx, "found triggers", "triggers", triggers)

		// Loop through the triggers and see if they correspond to any of the events
		for _, t := range triggers {
			o.logger.InfoContext(ctx, "processing event", "event", event, "trigger", t)

			// If the trigger specifies an event type, check if it matches the event
			if t.RepositoryEvent != nil && *t.RepositoryEvent != event.EventType {
				o.logger.InfoContext(ctx, "event type does not match trigger", "event", event, "trigger", t)
				continue
			}

			// If the trigger specifies a ref, check if it matches the event
			if t.RepositoryRef != nil && *t.RepositoryRef != "" {
				if t.RepositoryRef != event.BranchID &&
					t.RepositoryRef != event.TagID &&
					t.RepositoryRef != event.CommitID {
					o.logger.InfoContext(ctx, "ref does not match trigger", "event", event, "trigger", t)
					continue
				}
			}

			// Get the workflow associated with this trigger
			var workflow db.Workflow
			if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
				o.logger.ErrorContext(ctx, "failed to get workflow for trigger", "error", err, "trigger_id", t.ID)
				continue
			}

			// Create a new workflow run
			run, err := lib.CreateWorkflowRun(tx, &workflow, nil, &t)
			if err != nil {
				o.logger.ErrorContext(ctx, "failed to create workflow run", "error", err, "trigger_id", t.ID)
				continue
			}
			o.logger.InfoContext(ctx, "created workflow run", "run_id", run.ID)
		}

		return nil
	})
}

// processWorkerEvent processes the events sent by the worker.
// It will find the matching triggers and create a new workflow run.
func (o *Orchestrator) processWorkerEvent(ctx context.Context, event *WorkerEvent) error {
	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Process the event based on the topic
		switch event.Topic {
		case WorkerEventTopicWorkflowRun:
			// Find the matching triggers
			var triggers []db.WorkflowTrigger
			if err := tx.Where("workflow_run_event = ? AND workflow_id = ? AND deleted_at IS NULL", event.WorkflowRunEventType, event.WorkflowID).Find(&triggers).Error; err != nil {
				o.logger.ErrorContext(ctx,
					"failed to get trigger",
					"error",
					err,
					"workflow_id",
					event.WorkflowID,
					"workflow_run_id",
					event.WorkflowRunID,
				)
				return err
			}

			// Loop through the triggers and see if they correspond to any of the events
			for _, t := range triggers {
				o.logger.InfoContext(ctx, "processing event", "event", event, "trigger", t)

				// Get the workflow associated with this trigger
				var workflow db.Workflow
				if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
					o.logger.ErrorContext(ctx, "failed to get workflow for trigger", "error", err, "trigger_id", t.ID)
					continue
				}

				// Create a new workflow run
				run, err := lib.CreateWorkflowRun(tx, &workflow, nil, &t)
				if err != nil {
					o.logger.ErrorContext(ctx, "failed to create workflow run", "error", err, "trigger_id", t.ID)
					continue
				}
				o.logger.InfoContext(ctx, "created workflow run", "run_id", run.ID)
			}
		}

		return nil
	})
}
