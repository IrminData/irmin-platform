package orchestrator

import (
	"context"
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	sandbox "irmin-api/compute-sandbox"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/utils"
	"log/slog"
	"strings"
	"sync"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
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
	cacheStorage   fiber.Storage

	// LakeFS events are events that are received from the LakeFS webhook.
	lakefsEventQueue chan *lakefs.WebhookEvent
	// Worker events are events that are sent by the worker back to the orchestrator.
	workerEventQueue chan *WorkerEvent
	// Dispatched events are events that are dispatched to the API to be executed.
	dispatchedEventQueue chan *DispatchEvent

	// Active workflow run contexts for cancellation
	activeRunContexts map[uint]context.CancelFunc
	activeRunMutex    sync.RWMutex
}

func NewOrchestrator(
	d *db.Database,
	logger *slog.Logger,
	env *utils.CoreAPIEnv,
	dataEngine *engine.Client,
	cacheStorage fiber.Storage,
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
		cacheStorage:         cacheStorage,
		lakefsEventQueue:     make(chan *lakefs.WebhookEvent, DefaultChannelBufferSize),
		dispatchedEventQueue: make(chan *DispatchEvent, DefaultChannelBufferSize),
		workerEventQueue:     make(chan *WorkerEvent, DefaultChannelBufferSize),
		activeRunContexts:    make(map[uint]context.CancelFunc),
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

// RegisterActiveRun registers a workflow run's cancel function for later cancellation.
func (o *Orchestrator) RegisterActiveRun(runID uint, cancel context.CancelFunc) {
	o.activeRunMutex.Lock()
	defer o.activeRunMutex.Unlock()
	o.activeRunContexts[runID] = cancel
	o.logger.Info("registered active workflow run", "run_id", runID)
}

// UnregisterActiveRun removes a workflow run's cancel function after completion.
func (o *Orchestrator) UnregisterActiveRun(runID uint) {
	o.activeRunMutex.Lock()
	defer o.activeRunMutex.Unlock()
	delete(o.activeRunContexts, runID)
	o.logger.Info("unregistered active workflow run", "run_id", runID)
}

// CancelWorkflowRun cancels a running workflow by calling its cancel function.
func (o *Orchestrator) CancelWorkflowRun(runID uint) bool {
	o.activeRunMutex.RLock()
	cancel, exists := o.activeRunContexts[runID]
	o.activeRunMutex.RUnlock()

	if !exists {
		o.logger.Info("workflow run not found in active runs", "run_id", runID)
		return false
	}

	o.logger.Info("cancelling workflow run", "run_id", runID)
	cancel()
	return true
}

// InvalidateWorkflowRunCache invalidates the cache for a specific workflow run.
// This ensures clients get fresh data when workflow run status/logs change.
func (o *Orchestrator) InvalidateWorkflowRunCache(run *db.WorkflowRun) {
	if run == nil || o.cacheStorage == nil {
		return
	}

	// Get the workflow to construct the cache path (with Workspace preloaded)
	workflow, err := o.db.GetWorkflowByID(run.WorkflowID)
	if err != nil {
		o.logger.Error("failed to get workflow for cache invalidation",
			"error", err,
			"workflow_id", run.WorkflowID)
		return
	}

	// Invalidate the workflow runs list cache for this workflow
	// This covers all workflow run-related endpoints for this workspace
	cachePath := fmt.Sprintf("/api/v1/workspaces/%s/workflows", workflow.Workspace.Slug)
	if invalidateErr := irmincache.InvalidatePathPrefixForAllUsers(o.cacheStorage, cachePath); invalidateErr != nil {
		o.logger.Error("failed to invalidate workflow runs cache",
			"error", invalidateErr,
			"cache_path", cachePath)
	} else {
		o.logger.Debug("invalidated workflow runs cache",
			"cache_path", cachePath,
			"run_id", run.ID)
	}
}

// cancelStuckWorkflowRuns cancels all workflow runs that are stuck in running, pending, or initiating status.
// This should be called when the orchestrator starts to handle cases where the server was restarted
// and workflow runs were left in an active state.
func (o *Orchestrator) cancelStuckWorkflowRuns(ctx context.Context) error {
	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Count stuck runs first to check if there are any
		var count int64
		if err := tx.Model(&db.WorkflowRun{}).
			Where("status IN ?", []irminmodels.WorkflowStatus{
				irminmodels.WorkflowStatusRunning,
				irminmodels.WorkflowStatusPending,
				irminmodels.WorkflowStatusInitiating,
			}).
			Count(&count).Error; err != nil {
			return err
		}

		if count == 0 {
			return nil
		}

		now := time.Now()

		// Bulk update status to cancelled and set finished_at only if it's NULL
		// Using COALESCE ensures we only update finished_at for runs that don't have it set,
		// and we target only the runs we're cancelling (not previously cancelled runs)
		result := tx.Model(&db.WorkflowRun{}).
			Where("status IN ?", []irminmodels.WorkflowStatus{
				irminmodels.WorkflowStatusRunning,
				irminmodels.WorkflowStatusPending,
				irminmodels.WorkflowStatusInitiating,
			}).
			Updates(map[string]any{
				"status":      irminmodels.WorkflowStatusCancelled,
				"finished_at": gorm.Expr("COALESCE(finished_at, ?)", now),
			})

		if result.Error != nil {
			return result.Error
		}

		o.logger.InfoContext(
			ctx,
			"cancelled stuck workflow runs",
			"count",
			result.RowsAffected,
		)
		return nil
	})
}

// StartOrchestrator starts the orchestrator and the dispatcher.
// It will tick every 10 seconds to check for time-based triggers.
// When a trigger is due to run, it will create a new workflow run.
// It will also start the dispatcher in a new goroutine.
// The dispatcher will check for pending workflow runs and dispatch them to be executed.
//
//nolint:gocognit // This function is complex but it is necessary to ensure the orchestrator starts correctly.
func (o *Orchestrator) StartOrchestrator(ctx context.Context) error {
	o.logger.InfoContext(ctx, "starting orchestrator")

	// Cancel any stuck workflow runs from previous server restarts
	if err := o.cancelStuckWorkflowRuns(ctx); err != nil {
		o.logger.ErrorContext(ctx, "failed to cancel stuck workflow runs", "error", err)
		// Log the error but don't fail startup - the orchestrator should still start
	}

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

			// Process lakefs events asynchronously to avoid blocking the main loop
			// These events trigger workflows based on repository events (commits, merges, etc.)
			go func(evt *lakefs.WebhookEvent) {
				// Create a dedicated context for this lakefs event derived from the parent context
				// This ensures the goroutine is cancelled when the orchestrator shuts down
				lakefsCtx, cancelLakefs := context.WithCancel(ctx)
				defer cancelLakefs()

				// Process the lakefs event
				if err := o.processRepositoryEvent(lakefsCtx, evt); err != nil {
					o.logger.ErrorContext(lakefsCtx, "error processing repository event", "error", err)
				}
			}(event)

		case event := <-o.workerEventQueue:
			o.logger.InfoContext(ctx, "received worker event", "event", event)

			// Process worker events asynchronously to avoid blocking the main loop
			// Worker events are used to trigger other workflows based on workflow run completion
			go func(evt *WorkerEvent) {
				// Create a dedicated context for this worker event derived from the parent context
				// This ensures the goroutine is cancelled when the orchestrator shuts down
				workerCtx, cancelWorker := context.WithCancel(ctx)
				defer cancelWorker()

				// Process the worker event
				if err := o.processWorkerEvent(workerCtx, evt); err != nil {
					o.logger.ErrorContext(workerCtx, "error processing worker event", "error", err)
				}
			}(event)

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
// Returns true if a workflow run was created, false otherwise.
func (o *Orchestrator) processRepositoryTrigger(
	ctx context.Context,
	tx *gorm.DB,
	t *db.WorkflowTrigger,
	event *lakefs.WebhookEvent,
) (bool, error) {
	o.logger.InfoContext(ctx, "processing repository trigger",
		"trigger_id", t.ID,
		"trigger_event_type", t.RepositoryEvent,
		"trigger_ref", t.RepositoryRef,
		"event_type", event.EventType,
		"event_repository", event.RepositoryID,
		"event_branch", event.BranchID,
		"event_tag", event.TagID,
		"event_commit", event.CommitID,
	)

	// If the trigger specifies an event type, check if it matches the event
	if t.RepositoryEvent != nil && *t.RepositoryEvent != event.EventType {
		o.logger.InfoContext(ctx, "event type does not match trigger - skipping",
			"trigger_id", t.ID,
			"trigger_event_type", *t.RepositoryEvent,
			"actual_event_type", event.EventType,
		)
		return false, nil
	}

	// If the trigger specifies a ref, check if it matches the event
	if t.RepositoryRef != nil && *t.RepositoryRef != "" {
		refMatched := false
		if event.BranchID != nil && *t.RepositoryRef == *event.BranchID {
			refMatched = true
		}
		if event.TagID != nil && *t.RepositoryRef == *event.TagID {
			refMatched = true
		}
		if event.CommitID != nil && *t.RepositoryRef == *event.CommitID {
			refMatched = true
		}

		if !refMatched {
			o.logger.InfoContext(ctx, "ref does not match trigger - skipping",
				"trigger_id", t.ID,
				"trigger_ref", *t.RepositoryRef,
				"event_branch", event.BranchID,
				"event_tag", event.TagID,
				"event_commit", event.CommitID,
			)
			return false, nil
		}
	}

	// Get the workflow associated with this trigger
	var workflow db.Workflow
	if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
		o.logger.ErrorContext(ctx, "failed to get workflow for repository trigger",
			"error", err,
			"trigger_id", t.ID,
			"schedule_id", t.ScheduleID,
		)
		// Delete the trigger if we can't find the workflow
		if deleteErr := tx.Delete(t).Error; deleteErr != nil {
			o.logger.ErrorContext(ctx, "failed to delete orphaned trigger", "error", deleteErr, "trigger_id", t.ID)
		}
		return false, err
	}

	o.logger.InfoContext(ctx, "repository event matched trigger - creating workflow run",
		"trigger_id", t.ID,
		"workflow_id", workflow.ID,
		"workflow_name", workflow.Name,
		"event_type", event.EventType,
		"repository", event.RepositoryID,
	)

	// Create a new workflow run
	run, err := lib.CreateWorkflowRun(tx, &workflow, nil, t)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to create workflow run from repository event",
			"error", err,
			"trigger_id", t.ID,
			"workflow_id", workflow.ID,
			"event_type", event.EventType,
		)
		return false, err
	}

	o.logger.InfoContext(ctx, "successfully created workflow run from repository event",
		"run_id", run.ID,
		"workflow_id", workflow.ID,
		"workflow_name", workflow.Name,
		"trigger_id", t.ID,
		"event_type", event.EventType,
		"repository", event.RepositoryID,
	)
	return true, nil
}

func (o *Orchestrator) processRepositoryEvent(ctx context.Context, event *lakefs.WebhookEvent) error {
	o.logger.InfoContext(ctx, "processing repository event",
		"event_type", event.EventType,
		"repository_id", event.RepositoryID,
		"branch", event.BranchID,
		"tag", event.TagID,
		"commit", event.CommitID,
		"commit_message", event.CommitMessage,
		"committer", event.Committer,
	)

	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get the repository from the event
		var repository db.Repository
		if err := tx.Where(&db.Repository{LakeFSRepoID: event.RepositoryID}).
			Preload("Owner").
			Preload("Workspace").
			Preload("Tags").
			First(&repository).Error; err != nil {
			o.logger.ErrorContext(ctx, "failed to get repository for event - repository may not exist in Irmin",
				"error", err,
				"lakefs_repository_id", event.RepositoryID,
				"event_type", event.EventType,
			)
			return err
		}

		o.logger.InfoContext(ctx, "found repository for event",
			"repository_id", repository.ID,
			"repository_slug", repository.Slug,
			"workspace_id", repository.WorkspaceID,
		)

		var triggers []db.WorkflowTrigger
		if findErr := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("type = ? AND repository_id = ? AND deleted_at IS NULL", db.RepositoryTriggerType, repository.ID).
			Find(&triggers).Error; findErr != nil {
			o.logger.ErrorContext(ctx, "failed to find triggers for repository",
				"error", findErr,
				"repository_id", repository.ID,
			)
			return findErr
		}

		if len(triggers) == 0 {
			o.logger.InfoContext(ctx, "no repository triggers found for this repository",
				"repository_id", repository.ID,
				"repository_slug", repository.Slug,
				"event_type", event.EventType,
			)
			return nil
		}

		o.logger.InfoContext(ctx, "found repository triggers to evaluate",
			"trigger_count", len(triggers),
			"repository_id", repository.ID,
			"event_type", event.EventType,
		)

		// Process each trigger
		runsCreated := 0
		for _, t := range triggers {
			created, triggerErr := o.processRepositoryTrigger(ctx, tx, &t, event)
			if triggerErr != nil {
				// Log error but continue processing other triggers
				o.logger.ErrorContext(ctx, "error processing repository trigger",
					"error", triggerErr,
					"trigger_id", t.ID,
					"repository_id", repository.ID,
				)
				continue
			}
			if created {
				runsCreated++
			}
		}

		o.logger.InfoContext(ctx, "finished processing repository event",
			"triggers_evaluated", len(triggers),
			"runs_created", runsCreated,
			"repository_id", repository.ID,
			"event_type", event.EventType,
		)

		return nil
	})
}

// processWorkflowRunTrigger handles a single workflow run trigger.
// Returns true if a workflow run was created, false otherwise.
func (o *Orchestrator) processWorkflowRunTrigger(
	ctx context.Context,
	tx *gorm.DB,
	t *db.WorkflowTrigger,
	event *WorkerEvent,
) (bool, error) {
	o.logger.InfoContext(ctx, "processing workflow run trigger",
		"trigger_id", t.ID,
		"trigger_event_type", t.WorkflowRunEvent,
		"trigger_workflow_id", t.WorkflowID,
		"source_workflow_id", event.WorkflowID,
		"source_workflow_run_id", event.WorkflowRunID,
		"event_type", event.WorkflowRunEventType,
	)

	// Get the workflow associated with this trigger
	var workflow db.Workflow
	if err := tx.Where("schedule_id = ?", t.ScheduleID).First(&workflow).Error; err != nil {
		o.logger.ErrorContext(ctx, "failed to get workflow for workflow run trigger",
			"error", err,
			"trigger_id", t.ID,
			"schedule_id", t.ScheduleID,
		)
		// Delete the trigger if we can't find the workflow
		if deleteErr := tx.Delete(t).Error; deleteErr != nil {
			o.logger.ErrorContext(ctx, "failed to delete orphaned trigger", "error", deleteErr, "trigger_id", t.ID)
		}
		return false, err
	}

	o.logger.InfoContext(ctx, "workflow run event matched trigger - creating workflow run",
		"trigger_id", t.ID,
		"target_workflow_id", workflow.ID,
		"target_workflow_name", workflow.Name,
		"source_workflow_id", event.WorkflowID,
		"source_workflow_run_id", event.WorkflowRunID,
		"event_type", event.WorkflowRunEventType,
	)

	// Create a new workflow run
	run, err := lib.CreateWorkflowRun(tx, &workflow, nil, t)
	if err != nil {
		o.logger.ErrorContext(ctx, "failed to create workflow run from workflow run event",
			"error", err,
			"trigger_id", t.ID,
			"target_workflow_id", workflow.ID,
			"source_workflow_id", event.WorkflowID,
		)
		return false, err
	}

	o.logger.InfoContext(ctx, "successfully created workflow run from workflow run event",
		"run_id", run.ID,
		"target_workflow_id", workflow.ID,
		"target_workflow_name", workflow.Name,
		"trigger_id", t.ID,
		"source_workflow_id", event.WorkflowID,
		"source_workflow_run_id", event.WorkflowRunID,
		"event_type", event.WorkflowRunEventType,
	)
	return true, nil
}

func (o *Orchestrator) processWorkerEvent(ctx context.Context, event *WorkerEvent) error {
	if event.Topic != WorkerEventTopicWorkflowRun {
		o.logger.DebugContext(ctx, "ignoring worker event - not a workflow run event",
			"topic", event.Topic,
		)
		return nil
	}

	o.logger.InfoContext(ctx, "processing workflow run event",
		"event_type", event.WorkflowRunEventType,
		"source_workflow_id", event.WorkflowID,
		"source_workflow_run_id", event.WorkflowRunID,
	)

	return o.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Find the matching triggers
		var triggers []db.WorkflowTrigger
		if err := tx.Where("workflow_run_event = ? AND workflow_id = ? AND deleted_at IS NULL",
			event.WorkflowRunEventType, event.WorkflowID).Find(&triggers).Error; err != nil {
			o.logger.ErrorContext(ctx, "failed to find triggers for workflow run event",
				"error", err,
				"source_workflow_id", event.WorkflowID,
				"source_workflow_run_id", event.WorkflowRunID,
				"event_type", event.WorkflowRunEventType,
			)
			return err
		}

		if len(triggers) == 0 {
			o.logger.InfoContext(ctx, "no workflow run triggers found for this event",
				"source_workflow_id", event.WorkflowID,
				"source_workflow_run_id", event.WorkflowRunID,
				"event_type", event.WorkflowRunEventType,
			)
			return nil
		}

		o.logger.InfoContext(ctx, "found workflow run triggers to evaluate",
			"trigger_count", len(triggers),
			"source_workflow_id", event.WorkflowID,
			"event_type", event.WorkflowRunEventType,
		)

		// Process each trigger
		runsCreated := 0
		for _, t := range triggers {
			created, err := o.processWorkflowRunTrigger(ctx, tx, &t, event)
			if err != nil {
				// Log error but continue processing other triggers
				o.logger.ErrorContext(ctx, "error processing workflow run trigger",
					"error", err,
					"trigger_id", t.ID,
					"source_workflow_id", event.WorkflowID,
				)
				continue
			}
			if created {
				runsCreated++
			}
		}

		o.logger.InfoContext(ctx, "finished processing workflow run event",
			"triggers_evaluated", len(triggers),
			"runs_created", runsCreated,
			"source_workflow_id", event.WorkflowID,
			"source_workflow_run_id", event.WorkflowRunID,
			"event_type", event.WorkflowRunEventType,
		)

		return nil
	})
}
