package orchestrator_test

import (
	"context"
	"testing"
	"time"

	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/orchestrator"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
)

// Helper function to create string pointer.
func ptrString(s string) *string {
	return &s
}

func TestBuildWorkflowStartLog_UnknownTrigger(t *testing.T) {
	workflow := &db.Workflow{
		Name: "Test Workflow",
		Type: irminmodels.WorkflowableTypeAction,
	}
	workflow.ID = 1

	run := &db.WorkflowRun{
		// No TriggeredByUser or TriggeredBy set
	}
	run.ID = 100

	log := orchestrator.ExportBuildWorkflowStartLog(workflow, run)

	assert.Equal(t, log.WorkflowID, uint(1))
	assert.Equal(t, log.WorkflowName, "Test Workflow")
	assert.Equal(t, log.WorkflowType, string(irminmodels.WorkflowableTypeAction))
	assert.Equal(t, log.RunID, uint(100))
	assert.Equal(t, log.TriggerType, "unknown")
	assert.Equal(t, log.Message, "Starting workflow: Test Workflow")
}

func TestBuildWorkflowStartLog_ManualTrigger(t *testing.T) {
	workflow := &db.Workflow{
		Name: "Manual Workflow",
		Type: irminmodels.WorkflowableTypeImport,
	}
	workflow.ID = 2

	user := &db.User{
		Email: "user@example.com",
	}

	run := &db.WorkflowRun{
		TriggeredByUser: user,
	}
	run.ID = 200

	log := orchestrator.ExportBuildWorkflowStartLog(workflow, run)

	assert.Equal(t, log.TriggerType, "manual")
	assert.Equal(t, log.TriggeredBy, "user@example.com")
}

func TestBuildWorkflowStartLog_TimeTrigger(t *testing.T) {
	workflow := &db.Workflow{
		Name: "Scheduled Workflow",
		Type: irminmodels.WorkflowableTypeExport,
	}
	workflow.ID = 3

	trigger := &db.WorkflowTrigger{
		Type: db.TimeTriggerType,
		Cron: ptrString("0 0 * * *"),
	}
	trigger.ID = 10

	run := &db.WorkflowRun{
		TriggeredBy: trigger,
	}
	run.ID = 300

	log := orchestrator.ExportBuildWorkflowStartLog(workflow, run)

	assert.Equal(t, log.TriggerType, string(db.TimeTriggerType))
	assert.Equal(t, *log.TriggerID, uint(10))
	assert.Equal(t, log.Cron, "0 0 * * *")
}

func TestBuildWorkflowStartLog_TimeTriggerWithRRule(t *testing.T) {
	workflow := &db.Workflow{
		Name: "RRule Workflow",
		Type: irminmodels.WorkflowableTypePipeline,
	}
	workflow.ID = 4

	trigger := &db.WorkflowTrigger{
		Type:  db.TimeTriggerType,
		RRule: ptrString("FREQ=DAILY;INTERVAL=1"),
	}
	trigger.ID = 11

	run := &db.WorkflowRun{
		TriggeredBy: trigger,
	}
	run.ID = 400

	log := orchestrator.ExportBuildWorkflowStartLog(workflow, run)

	assert.Equal(t, log.TriggerType, string(db.TimeTriggerType))
	assert.Equal(t, log.RRule, "FREQ=DAILY;INTERVAL=1")
	assert.Equal(t, log.Cron, "") // Should be empty
}

func TestBuildWorkflowStartLog_RepositoryTrigger(t *testing.T) {
	workflow := &db.Workflow{
		Name: "Repository Event Workflow",
		Type: irminmodels.WorkflowableTypeAction,
	}
	workflow.ID = 5

	eventType := lakefs.WebhookEventType("post-commit")
	repository := &db.Repository{
		Slug: "data-repo",
	}

	trigger := &db.WorkflowTrigger{
		Type:            db.RepositoryTriggerType,
		RepositoryEvent: &eventType,
		Repository:      repository,
		RepositoryRef:   ptrString("main"),
	}
	trigger.ID = 12

	run := &db.WorkflowRun{
		TriggeredBy: trigger,
	}
	run.ID = 500

	log := orchestrator.ExportBuildWorkflowStartLog(workflow, run)

	assert.Equal(t, log.TriggerType, string(db.RepositoryTriggerType))
	assert.Equal(t, log.RepositoryEvent, "post-commit")
	assert.Equal(t, log.RepositorySlug, "data-repo")
	assert.Equal(t, log.RepositoryRef, "main")
}

func TestBuildWorkflowStartLog_WorkflowRunTrigger(t *testing.T) {
	workflow := &db.Workflow{
		Name: "Workflow Run Event Workflow",
		Type: irminmodels.WorkflowableTypeImport,
	}
	workflow.ID = 6

	linkedWorkflow := &db.Workflow{
		Name: "Linked Workflow",
	}
	linkedWorkflow.ID = 100

	workflowRunEvent := db.PostWorkflowRun
	trigger := &db.WorkflowTrigger{
		Type:             db.WorkflowRunTriggerType,
		WorkflowRunEvent: &workflowRunEvent,
		Workflow:         linkedWorkflow,
	}
	trigger.ID = 13

	run := &db.WorkflowRun{
		TriggeredBy: trigger,
	}
	run.ID = 600

	log := orchestrator.ExportBuildWorkflowStartLog(workflow, run)

	assert.Equal(t, log.TriggerType, string(db.WorkflowRunTriggerType))
	assert.Equal(t, log.WorkflowRunEvent, string(db.PostWorkflowRun))
	assert.Equal(t, *log.LinkedWorkflowID, uint(100))
	assert.Equal(t, log.LinkedWorkflowName, "Linked Workflow")
}

func TestPopulateTriggerDetails_TimeTrigger(t *testing.T) {
	log := &orchestrator.WorkflowStartLog{}

	trigger := &db.WorkflowTrigger{
		Type:  db.TimeTriggerType,
		Cron:  ptrString("*/5 * * * *"),
		RRule: ptrString("FREQ=WEEKLY"),
	}
	trigger.ID = 20

	orchestrator.ExportPopulateTriggerDetails(log, trigger)

	assert.Equal(t, log.TriggerType, string(db.TimeTriggerType))
	assert.Equal(t, *log.TriggerID, uint(20))
	assert.Equal(t, log.Cron, "*/5 * * * *")
	assert.Equal(t, log.RRule, "FREQ=WEEKLY")
}

func TestPopulateTriggerDetails_TimeTriggerNilValues(t *testing.T) {
	log := &orchestrator.WorkflowStartLog{}

	trigger := &db.WorkflowTrigger{
		Type: db.TimeTriggerType,
		// Cron and RRule are nil
	}
	trigger.ID = 21

	orchestrator.ExportPopulateTriggerDetails(log, trigger)

	assert.Equal(t, log.TriggerType, string(db.TimeTriggerType))
	assert.Equal(t, log.Cron, "")
	assert.Equal(t, log.RRule, "")
}

func TestPopulateRepositoryTrigger_AllFields(t *testing.T) {
	log := &orchestrator.WorkflowStartLog{}

	eventType := lakefs.WebhookEventType("pre-commit")
	repository := &db.Repository{
		Slug: "my-repo",
	}

	trigger := &db.WorkflowTrigger{
		RepositoryEvent: &eventType,
		Repository:      repository,
		RepositoryRef:   ptrString("feature-branch"),
	}

	orchestrator.ExportPopulateRepositoryTrigger(log, trigger)

	assert.Equal(t, log.RepositoryEvent, "pre-commit")
	assert.Equal(t, log.RepositorySlug, "my-repo")
	assert.Equal(t, log.RepositoryRef, "feature-branch")
}

func TestPopulateRepositoryTrigger_NilFields(t *testing.T) {
	log := &orchestrator.WorkflowStartLog{}

	trigger := &db.WorkflowTrigger{
		// All repository-related fields are nil
	}

	orchestrator.ExportPopulateRepositoryTrigger(log, trigger)

	assert.Equal(t, log.RepositoryEvent, "")
	assert.Equal(t, log.RepositorySlug, "")
	assert.Equal(t, log.RepositoryRef, "")
}

func TestPopulateWorkflowRunTrigger_AllFields(t *testing.T) {
	log := &orchestrator.WorkflowStartLog{}

	workflowRunEvent := db.PreWorkflowRun
	linkedWorkflow := &db.Workflow{
		Name: "Parent Workflow",
	}
	linkedWorkflow.ID = 50

	trigger := &db.WorkflowTrigger{
		WorkflowRunEvent: &workflowRunEvent,
		Workflow:         linkedWorkflow,
	}

	orchestrator.ExportPopulateWorkflowRunTrigger(log, trigger)

	assert.Equal(t, log.WorkflowRunEvent, string(db.PreWorkflowRun))
	assert.Equal(t, *log.LinkedWorkflowID, uint(50))
	assert.Equal(t, log.LinkedWorkflowName, "Parent Workflow")
}

func TestPopulateWorkflowRunTrigger_NilFields(t *testing.T) {
	log := &orchestrator.WorkflowStartLog{}

	trigger := &db.WorkflowTrigger{
		// All workflow run related fields are nil
	}

	orchestrator.ExportPopulateWorkflowRunTrigger(log, trigger)

	assert.Equal(t, log.WorkflowRunEvent, "")
	assert.That(t, log.LinkedWorkflowID == nil)
	assert.Equal(t, log.LinkedWorkflowName, "")
}

func TestTrimPaths(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "paths with leading slashes",
			input:    []string{"/path/to/file", "/another/path"},
			expected: []string{"path/to/file", "another/path"},
		},
		{
			name:     "paths without leading slashes",
			input:    []string{"path/to/file", "another/path"},
			expected: []string{"path/to/file", "another/path"},
		},
		{
			name:     "mixed paths",
			input:    []string{"/leading", "no-leading", "//double-leading"},
			expected: []string{"leading", "no-leading", "double-leading"},
		},
		{
			name:     "empty paths",
			input:    []string{},
			expected: nil,
		},
		{
			name:     "single empty string",
			input:    []string{""},
			expected: []string{""},
		},
		{
			name:     "just slashes",
			input:    []string{"/", "//", "///"},
			expected: []string{"", "", ""},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := orchestrator.ExportTrimPaths(tt.input)
			if tt.expected == nil {
				assert.That(t, result == nil)
			} else {
				assert.Equal(t, len(result), len(tt.expected))
				for i, v := range result {
					assert.Equal(t, v, tt.expected[i])
				}
			}
		})
	}
}

func TestCheckContextCancellation_NotCancelled(t *testing.T) {
	ctx := context.Background()

	logs, err := orchestrator.ExportCheckContextCancellation(ctx, "before starting")

	assert.That(t, logs == nil)
	assert.That(t, err == nil)
}

func TestCheckContextCancellation_Cancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	logs, err := orchestrator.ExportCheckContextCancellation(ctx, "before starting")

	assert.Equal(t, len(logs), 1)
	assert.That(t, err != nil)
	assert.Equal(t, err, context.Canceled)
}

func TestCheckContextCancellation_DeadlineExceeded(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()
	time.Sleep(10 * time.Millisecond) // Wait for timeout

	logs, err := orchestrator.ExportCheckContextCancellation(ctx, "during execution")

	assert.Equal(t, len(logs), 1)
	assert.That(t, err != nil)
	assert.Equal(t, err, context.DeadlineExceeded)
}
