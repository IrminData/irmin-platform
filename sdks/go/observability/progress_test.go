package observability_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/IrminData/irmin-platform/sdks/go/observability"
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

// TestProgressEvent_JSONWireFormat pins the JSON field names used on
// the /operation/status wire. These names cross the connectors ↔ Core
// boundary, so a rename here is a protocol-breaking change that must
// be caught at SDK build time — before it silently zeroes out
// progress fields in downstream consumers.
func TestProgressEvent_JSONWireFormat(t *testing.T) {
	ev := observability.ProgressEvent{
		Kind:             observability.ProgressKindFile,
		ResourcePath:     "/v1/customers",
		Page:             3,
		RecordsSoFar:     300,
		Cursor:           "cus_123",
		Attempt:          1,
		Wait:             500 * time.Millisecond,
		Batch:            2,
		BatchSize:        100,
		Rows:             10_000,
		File:             "report.csv",
		BytesTransferred: 1024,
		BytesTotal:       4096,
	}
	raw, err := json.Marshal(ev)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	out := string(raw)
	for _, key := range []string{
		`"kind":"file"`,
		`"resource_path":"/v1/customers"`,
		`"page":3`,
		`"records_so_far":300`,
		`"cursor":"cus_123"`,
		`"attempt":1`,
		`"wait":500000000`,
		`"batch":2`,
		`"batch_size":100`,
		`"rows":10000`,
		`"file":"report.csv"`,
		`"bytes_transferred":1024`,
		`"bytes_total":4096`,
	} {
		if !strings.Contains(out, key) {
			t.Errorf("wire format missing %q in %s", key, out)
		}
	}

	// Zero-valued per-kind fields must be omitted so a lean "page"
	// event doesn't carry file/bytes fields on the wire.
	minimal := observability.ProgressEvent{Kind: observability.ProgressKindHeartbeat}
	raw, err = json.Marshal(minimal)
	if err != nil {
		t.Fatalf("marshal minimal: %v", err)
	}
	out = string(raw)
	for _, omitted := range []string{"page", "bytes_total", "rate_limit", "file", "rows"} {
		if strings.Contains(out, omitted) {
			t.Errorf("minimal event should not carry %q on the wire, got %s", omitted, out)
		}
	}
}
