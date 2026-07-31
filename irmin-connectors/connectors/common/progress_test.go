//nolint:testpackage // white-box test — exercises unexported shouldEmitProgress / renderProgressEvent, which are the throttle + format primitives behind LogOperationProgress. Keeping them unexported is intentional (they're implementation details, not part of the connector-facing API).
package common

import (
	"encoding/json"
	"testing"
	"time"
)

func TestShouldEmitProgress_Page(t *testing.T) {
	cases := []struct {
		page     int
		expected bool
	}{
		{0, true},   // first iteration fencepost — always surface
		{1, true},   // page 1 always
		{2, false},  // skipped
		{4, false},  // skipped
		{5, true},   // every 5th
		{10, true},  // every 5th
		{12, false}, // skipped
		{15, true},  // every 5th
		{100, true}, // every 5th
	}
	for _, tc := range cases {
		got := shouldEmitProgress(ProgressEvent{Kind: ProgressKindPage, Page: tc.page})
		if got != tc.expected {
			t.Errorf("page=%d: got %v, want %v", tc.page, got, tc.expected)
		}
	}
}

func TestShouldEmitProgress_Batch(t *testing.T) {
	cases := []struct {
		batch    int
		expected bool
	}{
		{1, true},
		{2, false},
		{9, false},
		{10, true},
		{11, false},
		{20, true},
		{30, true},
	}
	for _, tc := range cases {
		got := shouldEmitProgress(ProgressEvent{Kind: ProgressKindBatch, Batch: tc.batch})
		if got != tc.expected {
			t.Errorf("batch=%d: got %v, want %v", tc.batch, got, tc.expected)
		}
	}
}

func TestShouldEmitProgress_UnthrottledKinds(t *testing.T) {
	kinds := []string{
		ProgressKindQuery,
		ProgressKindFile,
		ProgressKindRateLimit,
		ProgressKindHeartbeat,
	}
	for _, kind := range kinds {
		if !shouldEmitProgress(ProgressEvent{Kind: kind}) {
			t.Errorf("kind=%s should always emit", kind)
		}
	}
}

func TestShouldEmitProgress_UnknownKind(t *testing.T) {
	// Unknown kinds surface rather than silently drop — better an
	// extra row than a missed event from a connector we haven't
	// taught the common helper about yet.
	if !shouldEmitProgress(ProgressEvent{Kind: "custom"}) {
		t.Error("unknown kind should surface by default")
	}
}

func TestRenderProgressEvent_Page(t *testing.T) {
	msg, meta := renderProgressEvent(ProgressEvent{
		Kind:         ProgressKindPage,
		ResourcePath: "/v1/customers",
		Page:         3,
		RecordsSoFar: 300,
		Cursor:       "cus_abc",
	})
	if msg != "Operation in progress: fetching page" {
		t.Errorf("unexpected message: %q", msg)
	}
	if meta["kind"] != ProgressKindPage {
		t.Errorf("kind: got %v", meta["kind"])
	}
	if meta["resource_path"] != "/v1/customers" {
		t.Errorf("resource_path: got %v", meta["resource_path"])
	}
	if meta["page"] != 3 {
		t.Errorf("page: got %v", meta["page"])
	}
	if meta["records"] != 300 {
		t.Errorf("records: got %v", meta["records"])
	}
	if meta["cursor"] != "cus_abc" {
		t.Errorf("cursor: got %v", meta["cursor"])
	}
}

func TestRenderProgressEvent_PageNoCursor(t *testing.T) {
	// The first page has no cursor — omit the field rather than
	// leaving an empty-string artifact in the log row.
	_, meta := renderProgressEvent(ProgressEvent{
		Kind:         ProgressKindPage,
		ResourcePath: "/v1/customers",
		Page:         1,
	})
	if _, present := meta["cursor"]; present {
		t.Errorf("cursor should be omitted when empty")
	}
}

func TestRenderProgressEvent_RateLimit(t *testing.T) {
	msg, meta := renderProgressEvent(ProgressEvent{
		Kind:         ProgressKindRateLimit,
		ResourcePath: "/v1/customers",
		Attempt:      2,
		Wait:         1500 * time.Millisecond,
	})
	if msg != "Operation in progress: rate-limit backoff" {
		t.Errorf("unexpected message: %q", msg)
	}
	if meta["attempt"] != 2 {
		t.Errorf("attempt: got %v", meta["attempt"])
	}
	if meta["wait_ms"] != int64(1500) {
		t.Errorf("wait_ms: got %v", meta["wait_ms"])
	}
}

func TestRenderProgressEvent_Batch(t *testing.T) {
	_, meta := renderProgressEvent(ProgressEvent{
		Kind:         ProgressKindBatch,
		ResourcePath: "qdrant://vectors",
		Batch:        5,
		BatchSize:    100,
	})
	if meta["batch"] != 5 {
		t.Errorf("batch: got %v", meta["batch"])
	}
	if meta["batch_size"] != 100 {
		t.Errorf("batch_size: got %v", meta["batch_size"])
	}
}

func TestRenderProgressEvent_Query(t *testing.T) {
	_, meta := renderProgressEvent(ProgressEvent{
		Kind:         ProgressKindQuery,
		ResourcePath: "public.orders",
		Rows:         123456,
	})
	if meta["rows"] != int64(123456) {
		t.Errorf("rows: got %v", meta["rows"])
	}
}

func TestRenderProgressEvent_File(t *testing.T) {
	_, meta := renderProgressEvent(ProgressEvent{
		Kind:             ProgressKindFile,
		ResourcePath:     "sftp://host/inbox",
		File:             "report.csv",
		BytesTransferred: 2048,
		BytesTotal:       4096,
	})
	if meta["file"] != "report.csv" {
		t.Errorf("file: got %v", meta["file"])
	}
	if meta["bytes_transferred"] != int64(2048) {
		t.Errorf("bytes_transferred: got %v", meta["bytes_transferred"])
	}
	if meta["bytes_total"] != int64(4096) {
		t.Errorf("bytes_total: got %v", meta["bytes_total"])
	}
}

func TestRenderProgressEvent_FileUnknownTotal(t *testing.T) {
	// BytesTotal == 0 means "unknown" — omit from the metadata map
	// rather than lie with a zero.
	_, meta := renderProgressEvent(ProgressEvent{
		Kind: ProgressKindFile,
		File: "stream.bin",
	})
	if _, present := meta["bytes_total"]; present {
		t.Error("bytes_total should be omitted when zero")
	}
}

func TestRenderProgressEvent_Heartbeat(t *testing.T) {
	msg, meta := renderProgressEvent(ProgressEvent{
		Kind:         ProgressKindHeartbeat,
		ResourcePath: "operation/pull",
	})
	if msg != "Operation in progress" {
		t.Errorf("unexpected heartbeat message: %q", msg)
	}
	if meta["kind"] != ProgressKindHeartbeat {
		t.Errorf("heartbeat kind: got %v", meta["kind"])
	}
}

// TestRenderProgressEvent_JSONRoundTrip ensures every metadata map
// produced by renderProgressEvent is JSON-marshalable — important
// because LogOperationEvent json.Marshals it before persistence, and
// a silently-failing marshal would drop the log row.
func TestRenderProgressEvent_JSONRoundTrip(t *testing.T) {
	events := []ProgressEvent{
		{Kind: ProgressKindPage, ResourcePath: "/v1/x", Page: 5, RecordsSoFar: 50, Cursor: "c"},
		{Kind: ProgressKindRateLimit, ResourcePath: "/v1/x", Attempt: 1, Wait: time.Second},
		{Kind: ProgressKindBatch, ResourcePath: "x", Batch: 2, BatchSize: 100},
		{Kind: ProgressKindQuery, ResourcePath: "t", Rows: 1_000_000},
		{Kind: ProgressKindFile, File: "a.csv", BytesTransferred: 10, BytesTotal: 20},
		{Kind: ProgressKindHeartbeat, ResourcePath: "op"},
	}
	for _, event := range events {
		_, meta := renderProgressEvent(event)
		b, err := json.Marshal(meta)
		if err != nil {
			t.Errorf("kind=%s: marshal failed: %v", event.Kind, err)
			continue
		}
		var back map[string]any
		if unmarshalErr := json.Unmarshal(b, &back); unmarshalErr != nil {
			t.Errorf("kind=%s: unmarshal failed: %v", event.Kind, unmarshalErr)
		}
		if back["kind"] != event.Kind {
			t.Errorf("kind=%s: round-trip lost kind, got %v", event.Kind, back["kind"])
		}
	}
}

// TestThrottledQueryEmitter_FirstCallEmits verifies the
// always-emit-first-call contract — operators need an immediate
// "started" signal regardless of the throttle threshold, otherwise
// a fast-completing query (10 rows total) would never fire.
func TestThrottledQueryEmitter_FirstCallEmits(t *testing.T) {
	var got []ProgressEvent
	emit := ThrottledQueryEmitter(
		func(ev ProgressEvent) { got = append(got, ev) },
		"postgres://demo/orders", 1000, 5*time.Second,
	)
	emit(0)
	if len(got) != 1 {
		t.Fatalf("first call: got %d emissions, want 1", len(got))
	}
	if got[0].Kind != ProgressKindQuery || got[0].ResourcePath != "postgres://demo/orders" {
		t.Errorf("first emission shape = %+v", got[0])
	}
}

// TestThrottledQueryEmitter_RowGate covers the "fire every N rows"
// half of the throttle. With minRows=1000 and a fast call sequence,
// we should emit at row counts 0, 1000, 2000... and skip everything
// in between.
func TestThrottledQueryEmitter_RowGate(t *testing.T) {
	var rowsAt []int64
	emit := ThrottledQueryEmitter(
		func(ev ProgressEvent) { rowsAt = append(rowsAt, ev.Rows) },
		"x", 1000, 1*time.Hour, // long interval so only the row gate matters
	)
	for r := int64(0); r <= 3000; r += 100 {
		emit(r)
	}
	want := []int64{0, 1000, 2000, 3000}
	if len(rowsAt) != len(want) {
		t.Fatalf("emit row counts = %v, want %v", rowsAt, want)
	}
	for i, w := range want {
		if rowsAt[i] != w {
			t.Errorf("emission %d: row=%d, want %d", i, rowsAt[i], w)
		}
	}
}

// TestThrottledQueryEmitter_NilHandler asserts the nil-handler fast
// path returns a usable no-op closure. The row-scan loop calls the
// returned function on every iteration; if it returned nil the loop
// would have to add its own guard (defeating the abstraction).
func TestThrottledQueryEmitter_NilHandler(t *testing.T) {
	emit := ThrottledQueryEmitter(nil, "x", 100, time.Second)
	if emit == nil {
		t.Fatal("nil-handler path returned nil emitter — must return no-op closure")
	}
	emit(0)
	emit(50000)
}

// TestLogOperationProgress_NilSafe verifies the documented contract:
// passing a nil dbInstance or logger no-ops rather than panicking.
// Connectors return real handlers from ProgressHandler(operation)
// before InitializeClient has hydrated the dbInstance, and the
// progress-coverage audit test invokes those handlers on bare
// providers — both paths must not panic.
func TestLogOperationProgress_NilSafe(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("nil dbInstance/logger should not panic: %v", r)
		}
	}()
	LogOperationProgress(nil, nil, 0, ProgressEvent{Kind: ProgressKindHeartbeat})
}

// TestProgressHandler_InvocationCounts verifies a real handler is
// invoked exactly once per call — the common contract every
// connector relies on. Throttling happens in LogOperationProgress,
// not in the handler dispatch itself.
func TestProgressHandler_InvocationCounts(t *testing.T) {
	var calls int
	h := ProgressHandler(func(ProgressEvent) { calls++ })
	h(ProgressEvent{Kind: ProgressKindHeartbeat})
	h(ProgressEvent{Kind: ProgressKindPage, Page: 2})
	h(ProgressEvent{Kind: ProgressKindPage, Page: 3})
	if calls != 3 {
		t.Errorf("handler calls: got %d, want 3", calls)
	}
}
