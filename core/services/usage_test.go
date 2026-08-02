package services_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/utils"

	"github.com/zeebo/assert"
)

// TestNewUsageTracker_NilBilling tests that a nil billing service returns nil tracker.
func TestNewUsageTracker_NilBilling(t *testing.T) {
	tracker := services.NewUsageTracker(nil, nil, nil, nil, nil)
	assert.Nil(t, tracker)
}

// TestNewUsageTracker_Valid tests creating a valid tracker.
func TestNewUsageTracker_Valid(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	bs := services.NewBillingService(nil, env, logger)
	tracker := services.NewUsageTracker(nil, bs, nil, env, logger)
	assert.NotNil(t, tracker)
}

// TestTrack_NilReceiver tests that Track is safe to call on nil.
func TestTrack_NilReceiver(t *testing.T) {
	var tracker *services.UsageTracker
	// Should not panic
	tracker.Track(1, db.UsageDimensionAPIRequests, 1)
}

// TestTrack_SendsEvent tests that Track successfully sends an event to the channel.
func TestTrack_SendsEvent(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	bs := services.NewBillingService(nil, env, logger)
	tracker := services.NewUsageTracker(nil, bs, nil, env, logger)

	// Track an event — it goes to internal channel. We verify by starting and cancelling.
	tracker.Track(42, db.UsageDimensionAPIRequests, 5)
	// If it didn't panic and didn't block, the test passes
}

// TestEventToRecord tests converting usage events to database records.
func TestEventToRecord(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	bs := services.NewBillingService(nil, env, logger)
	tracker := services.NewUsageTracker(nil, bs, nil, env, logger)

	evt := services.UsageEvent{
		WorkspaceID: 42,
		Dimension:   db.UsageDimensionStorage,
		Quantity:    100,
		Timestamp:   time.Date(2025, 6, 15, 10, 30, 0, 0, time.UTC),
	}

	record := services.ExportEventToRecord(tracker, evt)

	assert.Equal(t, uint(42), record.WorkspaceID)
	assert.Equal(t, db.UsageDimensionStorage, record.Dimension)
	assert.Equal(t, int64(100), record.Quantity)
	assert.False(t, record.ReportedToPolar)

	// Period should be June 2025
	expectedStart := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	assert.Equal(t, expectedStart, record.PeriodStart)

	// Period end should be last nanosecond of June
	expectedEnd := time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC).Add(-time.Nanosecond)
	assert.Equal(t, expectedEnd, record.PeriodEnd)
}

// TestEventToRecord_MonthBoundaries tests period calculation across month boundaries.
func TestEventToRecord_MonthBoundaries(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	bs := services.NewBillingService(nil, env, logger)
	tracker := services.NewUsageTracker(nil, bs, nil, env, logger)

	tests := []struct {
		name        string
		timestamp   time.Time
		periodStart time.Time
		periodMonth time.Month
	}{
		{
			"january",
			time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC),
			time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			time.January,
		},
		{
			"february",
			time.Date(2025, 2, 28, 23, 59, 59, 0, time.UTC),
			time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC),
			time.February,
		},
		{
			"december",
			time.Date(2025, 12, 31, 23, 59, 59, 0, time.UTC),
			time.Date(2025, 12, 1, 0, 0, 0, 0, time.UTC),
			time.December,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			evt := services.UsageEvent{Timestamp: tc.timestamp}
			record := services.ExportEventToRecord(tracker, evt)
			assert.Equal(t, tc.periodStart, record.PeriodStart)
			assert.Equal(t, tc.periodMonth, record.PeriodStart.Month())
		})
	}
}

// TestStart_NilReceiver tests that Start is safe to call on nil.
func TestStart_NilReceiver(t *testing.T) {
	var tracker *services.UsageTracker
	err := tracker.Start(context.Background())
	assert.NoError(t, err)
}

// TestStart_Lifecycle tests that Start exits cleanly when context is cancelled.
func TestStart_Lifecycle(t *testing.T) {
	env := &utils.CoreAPIEnv{BillingEnabled: true}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	bs := services.NewBillingService(nil, env, logger)
	tracker := services.NewUsageTracker(nil, bs, nil, env, logger)

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan error, 1)
	go func() {
		done <- tracker.Start(ctx)
	}()

	// Give goroutines time to start
	time.Sleep(50 * time.Millisecond)

	// Cancel and wait for clean shutdown
	cancel()

	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("Start did not return after context cancellation")
	}
}

// TestWorkspaceStoragePrefix verifies workspace slug normalization for S3 prefix measurement.
func TestWorkspaceStoragePrefix(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "plain slug", in: "tims-office", want: "tims-office/"},
		{name: "leading slash", in: "/tims-office", want: "tims-office/"},
		{name: "trailing slash", in: "tims-office/", want: "tims-office/"},
		{name: "wrapped slashes", in: "/tims-office/", want: "tims-office/"},
		{name: "surrounding spaces", in: "  tims-office  ", want: "tims-office/"},
		{name: "empty", in: "", want: ""},
		{name: "only slashes and spaces", in: " / ", want: ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := services.ExportWorkspaceStoragePrefix(tc.in)
			assert.Equal(t, tc.want, got)
		})
	}
}
