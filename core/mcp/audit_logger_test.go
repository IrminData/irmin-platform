package mcp

import (
	"context"
	"testing"
)

func TestAuditLoggerDrainsAndCountsEntriesAfterShutdown(t *testing.T) {
	t.Parallel()
	logger := NewAuditLogger()
	if err := logger.Close(context.Background()); err != nil {
		t.Fatal(err)
	}
	logger.Send(auditLogEntry{})
	if got := logger.Dropped(); got != 1 {
		t.Fatalf("dropped entries = %d, want 1", got)
	}
}
