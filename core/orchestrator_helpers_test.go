package main_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"irmin-api/db"
	"irmin-api/lib/crypto"
	"irmin-api/orchestrator"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestOrchestratorHelperProcessPendingWorkflowRunIDs(t *testing.T) {
	var seen []uint
	err := orchestrator.ProcessPendingWorkflowRunIDs(
		t.Context(),
		[]uint{1, 2, 3},
		func(_ context.Context, n *db.RunStatusNotificationPayload) error {
			seen = append(seen, n.ID)
			return nil
		},
	)
	assert.Equal(t, err, nil)
	assert.Equal(t, len(seen), 3)
	assert.Equal(t, seen[0], uint(1))
	assert.Equal(t, seen[1], uint(2))
	assert.Equal(t, seen[2], uint(3))
}

func TestOrchestratorHelperProcessPendingWorkflowRunIDsJoinsErrors(t *testing.T) {
	firstErr := errors.New("first")
	secondErr := errors.New("second")

	err := orchestrator.ProcessPendingWorkflowRunIDs(
		t.Context(),
		[]uint{1, 2, 3},
		func(_ context.Context, n *db.RunStatusNotificationPayload) error {
			switch n.ID {
			case 1:
				return firstErr
			case 3:
				return secondErr
			default:
				return nil
			}
		},
	)

	assert.NotEqual(t, err, nil)
	assert.Equal(t, errors.Is(err, firstErr), true)
	assert.Equal(t, errors.Is(err, secondErr), true)
}

func TestOrchestratorHelperApplyStalePending(t *testing.T) {
	now := time.Now().UTC()
	cutoff := now.Add(-orchestrator.StalePendingWorkflowRunAgeThreshold)
	oldStarted := cutoff.Add(-time.Hour)
	recentStarted := cutoff.Add(time.Hour)

	// Apply helper should cancel only stale pending rows.
	gormDB, openErr := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if openErr != nil {
		t.Fatalf("open sqlite: %v", openErr)
	}
	crypto.EncryptedJSONSerializer{Keyring: crypto.NewPassthroughKeyring()}.Register()
	if migrateErr := gormDB.AutoMigrate(&db.WorkflowRun{}); migrateErr != nil {
		t.Fatalf("automigrate workflow_runs: %v", migrateErr)
	}

	oldPending := db.WorkflowRun{
		Model:     gorm.Model{CreatedAt: oldStarted, UpdatedAt: oldStarted},
		Status:    irminmodels.WorkflowStatusPending,
		StartedAt: &oldStarted,
	}
	recentPending := db.WorkflowRun{
		Model:     gorm.Model{CreatedAt: recentStarted, UpdatedAt: recentStarted},
		Status:    irminmodels.WorkflowStatusPending,
		StartedAt: &recentStarted,
	}

	if createOldErr := gormDB.Create(&oldPending).Error; createOldErr != nil {
		t.Fatalf("create old pending: %v", createOldErr)
	}
	if createRecentErr := gormDB.Create(&recentPending).Error; createRecentErr != nil {
		t.Fatalf("create recent pending: %v", createRecentErr)
	}

	cancelled, applyErr := orchestrator.ApplyStalePendingUpdates(
		gormDB,
		now,
		cutoff,
		"auto-cancelled stale pending run during maintenance",
	)
	assert.Equal(t, applyErr, nil)
	assert.Equal(t, cancelled, int64(1))

	var updatedOld struct {
		Status     irminmodels.WorkflowStatus
		FinishedAt *time.Time
	}
	if fetchOldErr := gormDB.Model(&db.WorkflowRun{}).
		Select("status", "finished_at").
		Where("id = ?", oldPending.ID).
		First(&updatedOld).Error; fetchOldErr != nil {
		t.Fatalf("reload old pending: %v", fetchOldErr)
	}
	assert.Equal(t, updatedOld.Status, irminmodels.WorkflowStatusCancelled)
	assert.NotEqual(t, updatedOld.FinishedAt, nil)

	var updatedRecent struct {
		Status irminmodels.WorkflowStatus
	}
	if fetchRecentErr := gormDB.Model(&db.WorkflowRun{}).
		Select("status").
		Where("id = ?", recentPending.ID).
		First(&updatedRecent).Error; fetchRecentErr != nil {
		t.Fatalf("reload recent pending: %v", fetchRecentErr)
	}
	assert.Equal(t, updatedRecent.Status, irminmodels.WorkflowStatusPending)
}
