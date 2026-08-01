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

	// Skip if test data is not available
	user, workspace := lib.SkipIfNoTestData(t, ts.DB, ts.Env.TestUserEmail, ts.Env.TestWorkspace)

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
	if getErr := ts.DB.First(&logEvent, "user_id = ? AND workspace_id = ?", user.ID, workspace.ID).Error; getErr != nil {
		t.Fatalf("Failed to get log event: %v", getErr)
	}

	// Make sure the log event was created
	assert.Equal(t, logEvent.Type, db.LogEventTypeInfo)
	assert.Equal(t, logEvent.Description, "Test audit log event")
	assert.Equal(t, *logEvent.UserID, user.ID)
	assert.Equal(t, *logEvent.WorkspaceID, workspace.ID)

	// Delete the log event
	if deleteErr := ts.DB.Delete(&logEvent).Error; deleteErr != nil {
		t.Fatalf("Failed to delete log event: %v", deleteErr)
	}
}
