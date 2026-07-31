//nolint:testpackage // white-box test — exercises unexported emitPageProgress / emitBatchProgress, which are the per-iteration emission seams the FetchAll and Upsert loops call into. Going through the public surface would require mocking the Pinecone SDK end-to-end.
package client

import (
	"testing"

	"irmin-connectors/connectors/common"
)

// TestWithProgressHandler_SetsField verifies the functional option
// reaches the client field — the contract that lets the pull and
// push controllers wire their handlers without having to construct
// a PineconeClient by hand.
func TestWithProgressHandler_SetsField(t *testing.T) {
	called := 0
	handler := func(common.ProgressEvent) { called++ }

	c := &PineconeClient{}
	WithProgressHandler(handler)(c)

	if c.progressHandler == nil {
		t.Fatal("WithProgressHandler did not install the handler")
	}
	c.progressHandler(common.ProgressEvent{Kind: common.ProgressKindPage})
	if called != 1 {
		t.Errorf("installed handler called %d times, want 1", called)
	}
}

// TestEmitPageProgress_NoHandler asserts the nil-handler fast path.
// FetchAll calls emitPageProgress unconditionally on every loop
// iteration; if the nil check ever regressed, every short-running
// pull would panic.
func TestEmitPageProgress_NoHandler(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("nil handler should not panic: %v", r)
		}
	}()
	c := &PineconeClient{}
	c.emitPageProgress(1, 100, "")
}

// TestEmitPageProgress_Shape captures the metadata an operator
// debugging a stuck pull will see. Page number, cumulative record
// count, and the cursor that produced the page are all needed for
// "where did we get to" forensics.
func TestEmitPageProgress_Shape(t *testing.T) {
	var got common.ProgressEvent
	c := &PineconeClient{
		namespace:       "demo",
		progressHandler: func(ev common.ProgressEvent) { got = ev },
	}
	c.emitPageProgress(3, 250, "tok_xyz")

	if got.Kind != common.ProgressKindPage {
		t.Errorf("Kind = %q, want %q", got.Kind, common.ProgressKindPage)
	}
	if got.ResourcePath != "pinecone://demo" {
		t.Errorf("ResourcePath = %q, want pinecone://demo", got.ResourcePath)
	}
	if got.Page != 3 || got.RecordsSoFar != 250 || got.Cursor != "tok_xyz" {
		t.Errorf("event shape = %+v", got)
	}
}

// TestEmitPageProgress_DefaultNamespace verifies the resourcePath
// fallback when a Pinecone index has no namespace configured —
// otherwise the operation log shows "pinecone://" with nothing
// after, which is uglier than an explicit "default" sentinel.
func TestEmitPageProgress_DefaultNamespace(t *testing.T) {
	var got common.ProgressEvent
	c := &PineconeClient{
		progressHandler: func(ev common.ProgressEvent) { got = ev },
	}
	c.emitPageProgress(1, 0, "")
	if got.ResourcePath != "pinecone://default" {
		t.Errorf("default-namespace ResourcePath = %q, want pinecone://default", got.ResourcePath)
	}
}

// TestEmitBatchProgress_Shape mirrors TestEmitPageProgress_Shape for
// the Upsert path. Batch number + size are what an operator needs
// to estimate "how much further until this finishes."
func TestEmitBatchProgress_Shape(t *testing.T) {
	var got common.ProgressEvent
	c := &PineconeClient{
		namespace:       "vectors",
		progressHandler: func(ev common.ProgressEvent) { got = ev },
	}
	c.emitBatchProgress(5, 100)

	if got.Kind != common.ProgressKindBatch {
		t.Errorf("Kind = %q, want %q", got.Kind, common.ProgressKindBatch)
	}
	if got.Batch != 5 || got.BatchSize != 100 {
		t.Errorf("event shape = %+v", got)
	}
	if got.ResourcePath != "pinecone://vectors" {
		t.Errorf("ResourcePath = %q, want pinecone://vectors", got.ResourcePath)
	}
}

// TestEmitBatchProgress_NoHandler — symmetric guard for Upsert.
func TestEmitBatchProgress_NoHandler(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("nil handler should not panic: %v", r)
		}
	}()
	c := &PineconeClient{}
	c.emitBatchProgress(1, 100)
}
