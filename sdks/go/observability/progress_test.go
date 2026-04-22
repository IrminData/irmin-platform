package observability_test

import (
	"testing"
	"time"

	"github.com/IrminData/irmin-sdk-go/observability"
)

// TestProgressKind_WireFormat pins the string values of the kind
// constants. They are part of the cross-language wire format —
// irmin-ai's TypeScript consumer matches these by value — so a
// rename here is a breaking change to every consumer at once.
func TestProgressKind_WireFormat(t *testing.T) {
	cases := map[string]string{
		observability.ProgressKindPage:      "page",
		observability.ProgressKindRateLimit: "rate_limit",
		observability.ProgressKindBatch:     "batch",
		observability.ProgressKindQuery:     "query",
		observability.ProgressKindFile:      "file",
		observability.ProgressKindHeartbeat: "heartbeat",
	}
	for got, want := range cases {
		if got != want {
			t.Errorf("kind constant changed value: got %q, want %q", got, want)
		}
	}
}

// TestProgressHandler_Invocation verifies the function-type signature
// is callable as expected — producers all use the same `if h != nil
// { h(event) }` guard pattern, so the type must accept ProgressEvent
// and return nothing.
func TestProgressHandler_Invocation(t *testing.T) {
	var calls int
	h := observability.ProgressHandler(func(observability.ProgressEvent) { calls++ })
	h(observability.ProgressEvent{Kind: observability.ProgressKindHeartbeat})
	h(observability.ProgressEvent{Kind: observability.ProgressKindPage, Page: 1})
	if calls != 2 {
		t.Errorf("handler invocations: got %d, want 2", calls)
	}
}

// TestProgressEvent_FieldsAccessible is a smoke test that every
// per-kind field is reachable as a public struct field. If a future
// refactor accidentally unexports one, this fails to compile —
// catching the API break at SDK build time, not at downstream
// consumer build time.
func TestProgressEvent_FieldsAccessible(_ *testing.T) {
	_ = observability.ProgressEvent{
		Kind:             observability.ProgressKindFile,
		ResourcePath:     "sftp://host:22",
		Page:             1,
		RecordsSoFar:     100,
		Cursor:           "tok",
		Attempt:          0,
		Wait:             time.Second,
		Batch:            1,
		BatchSize:        100,
		Rows:             1000,
		File:             "report.csv",
		BytesTransferred: 2048,
		BytesTotal:       4096,
	}
}
