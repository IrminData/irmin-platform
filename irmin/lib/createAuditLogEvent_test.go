package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/zeebo/assert"
)

const (
	logEventCreationSleepTime = 2 * time.Second
)

func TestCreateAuditLogEvent(t *testing.T) {
	ts := lib.GetTestSuite()
	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Create a slog logger for testing
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Build the log event
	logEvent := db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: "Test audit log event",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	}

	// Create the log event
	lib.CreateAuditLogEventAsync(ts.DB, logger, &logEvent)

	// Wait for the log event to be created
	time.Sleep(logEventCreationSleepTime)

	// Get the log event
	if err = ts.DB.First(&logEvent, "user_id = ? AND workspace_id = ?", user.ID, workspace.ID).Error; err != nil {
		t.Fatalf("Failed to get log event: %v", err)
	}

	// Make sure the log event was created
	assert.Equal(t, logEvent.Type, db.LogEventTypeInfo)
	assert.Equal(t, logEvent.Description, "Test audit log event")
	assert.Equal(t, *logEvent.UserID, user.ID)
	assert.Equal(t, *logEvent.WorkspaceID, workspace.ID)

	// Delete the log event
	if err = ts.DB.Delete(&logEvent).Error; err != nil {
		t.Fatalf("Failed to delete log event: %v", err)
	}
}
