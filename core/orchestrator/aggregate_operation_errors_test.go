package orchestrator_test

import (
	"errors"
	"strings"
	"testing"

	"irmin-api/orchestrator"
)

// TestAggregateOperationErrors_ReturnsNilOnEmpty ensures the helper
// forwards a "no errors" result as nil so callers can propagate its
// return value directly without extra branching.
func TestAggregateOperationErrors_ReturnsNilOnEmpty(t *testing.T) {
	if err := orchestrator.ExportAggregateOperationErrors("import", nil); err != nil {
		t.Errorf("nil slice: got %v, want nil", err)
	}
	if err := orchestrator.ExportAggregateOperationErrors("import", []error{}); err != nil {
		t.Errorf("empty slice: got %v, want nil", err)
	}
}

// TestAggregateOperationErrors_NonEmptyIsNonNil is the regression guard
// for the bug reported in the field: a Stripe import workflow returned
// a connector 500 for every path, the orchestrator logged the errors
// into the run's log stream, but the run itself was marked "complete"
// with duration_ms=1098. Root cause: executeWorkflowableCommon
// returned (logs, nil) regardless of result.errors, so the caller's
// allAttemptsFailed toggle flipped to false and the final status
// became WorkflowStatusComplete instead of WorkflowStatusError.
//
// This test guards the error-aggregation path in isolation so a future
// refactor can't re-introduce the silent nil.
func TestAggregateOperationErrors_NonEmptyIsNonNil(t *testing.T) {
	e1 := errors.New("pull customers failed: 500")
	e2 := errors.New("pull charges failed: context deadline")

	err := orchestrator.ExportAggregateOperationErrors("import", []error{e1, e2})
	if err == nil {
		t.Fatal("aggregated error must be non-nil when there is at least one input error")
	}
	// Operation name + count surface in the message so operators reading
	// the logs can tell what happened without digging into wrapped errors.
	if !strings.Contains(err.Error(), "import") {
		t.Errorf("aggregated message must mention operation: %v", err)
	}
	if !strings.Contains(err.Error(), "2 error(s)") {
		t.Errorf("aggregated message must mention input count: %v", err)
	}
	// errors.Is must still find each original — downstream retry logic
	// and diagnostics rely on wrapped-error traversal.
	if !errors.Is(err, e1) {
		t.Errorf("errors.Is(err, e1) = false, want true")
	}
	if !errors.Is(err, e2) {
		t.Errorf("errors.Is(err, e2) = false, want true")
	}
}
