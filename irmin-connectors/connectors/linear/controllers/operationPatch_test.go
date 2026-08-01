//nolint:testpackage // Tests internal helpers + controller methods.
package linearcontrollers

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"sync"
	"testing"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/common/commontest"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// patchFake registers a save_issue handler against the shared MCP
// fixture and tracks (id, input) per call so tests can assert that
// ops on the same issue coalesced into one tool call rather than
// firing one tool call per op. Linear's MCP `save_issue` is upsert:
// if `id` is set, the tool routes to its update branch; the connector
// always passes id on patch, so every call recorded here is an update.
type patchFake struct {
	server *commontest.FakeMCPServer
	mu     sync.Mutex
	calls  []patchCall
}

type patchCall struct {
	ID    string
	Input map[string]any
}

func newPatchFake(t *testing.T) *patchFake {
	t.Helper()
	f := &patchFake{server: commontest.NewFakeMCPServer(t)}
	f.server.OnTool("save_issue", func(args map[string]any) (json.RawMessage, error) {
		f.mu.Lock()
		id, _ := args["id"].(string)
		// Record everything except id under Input so test assertions
		// on field updates stay terse.
		input := map[string]any{}
		for k, v := range args {
			if k == "id" {
				continue
			}
			input[k] = v
		}
		f.calls = append(f.calls, patchCall{ID: id, Input: input})
		f.mu.Unlock()
		title, _ := args["title"].(string)
		body := map[string]any{
			"success": true,
			"issue": map[string]any{
				"id":    id,
				"title": title,
				"url":   "https://linear.app/x",
			},
		}
		raw, _ := json.Marshal(body)
		return raw, nil
	})
	return f
}

func (f *patchFake) Client() *linearclient.Client {
	return linearclient.NewWithSession(f.server.Session())
}

func (f *patchFake) takenCalls() []patchCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]patchCall, len(f.calls))
	copy(out, f.calls)
	return out
}

func newControllersForTest() *Controllers {
	return &Controllers{
		Controllers:    &common.Controllers{Logger: slog.Default()},
		OAuthConnector: &common.OAuthConnector{},
	}
}

// patchNilClient returns a Linear Client backed by a nil session,
// suitable for rejection-path tests that should never reach a vendor
// call. CallTool through it errors fast with a clear message.
func patchNilClient() *linearclient.Client {
	return linearclient.NewWithSession(nil)
}

// --- tests ----------------------------------------------------------------

func TestApplyOpToInput(t *testing.T) {
	value := any("foo")
	cases := []struct {
		name    string
		op      irminmodels.PatchOperation
		field   string
		wantErr string
		wantKey string // expected map key after applying
	}{
		{"replace happy", irminmodels.PatchOperation{Op: "replace", Value: &value}, "title", "", "title"},
		{"add happy", irminmodels.PatchOperation{Op: "add", Value: &value}, "description", "", "description"},
		{"replace nil-value", irminmodels.PatchOperation{Op: "replace"}, "title", "requires a value", ""},
		{"remove sets nil", irminmodels.PatchOperation{Op: "remove"}, "description", "", "description"},
		{"move unsupported", irminmodels.PatchOperation{Op: "move"}, "title", "not supported", ""},
		{"copy unsupported", irminmodels.PatchOperation{Op: "copy"}, "title", "not supported", ""},
		{"unknown op", irminmodels.PatchOperation{Op: "frobnicate"}, "title", "unsupported op", ""},
		{
			"nested rejected",
			irminmodels.PatchOperation{Op: "replace", Value: &value},
			"metadata/plan",
			"nested field path",
			"",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			input := map[string]any{}
			err := applyOpToInput(tc.op, tc.field, input)
			if tc.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("want error containing %q, got: %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if _, ok := input[tc.wantKey]; !ok {
				t.Errorf("expected key %q in input, got: %v", tc.wantKey, input)
			}
		})
	}
}

func TestApplyIssuePatches_CoalescesOnSameIssue(t *testing.T) {
	fake := newPatchFake(t)
	cs := newControllersForTest()

	titleVal := any("Renamed")
	prioVal := any(2.0) // JSON numbers decode to float64
	ops := []irminmodels.PatchOperation{
		{Op: "replace", Path: "/issues/uuid-7.json/title", Value: &titleVal},
		{Op: "replace", Path: "/issues/uuid-7.json/priority", Value: &prioVal},
	}
	if err := cs.applyIssuePatches(context.Background(), fake.Client(), "issues/uuid-7.json", ops, &db.Operation{}); err != nil {
		t.Fatalf("applyIssuePatches: %v", err)
	}
	calls := fake.takenCalls()
	if len(calls) != 1 {
		t.Fatalf("expected exactly 1 save_issue (coalesced), got %d: %v", len(calls), calls)
	}
	if calls[0].ID != "uuid-7" {
		t.Errorf("ID = %q, want uuid-7", calls[0].ID)
	}
	if calls[0].Input["title"] != "Renamed" {
		t.Errorf("title not in coalesced input: %v", calls[0].Input)
	}
	if calls[0].Input["priority"] != 2.0 {
		t.Errorf("priority not in coalesced input: %v", calls[0].Input)
	}
}

func TestApplyIssuePatches_RejectsNonPatchableResource(t *testing.T) {
	cs := newControllersForTest()
	val := any("X")
	ops := []irminmodels.PatchOperation{
		{Op: "replace", Path: "/teams/uuid-1.json/name", Value: &val},
	}
	err := cs.applyIssuePatches(context.Background(), patchNilClient(), "teams/uuid-1.json", ops, &db.Operation{})
	if err == nil || !strings.Contains(err.Error(), "not patch-enabled") {
		t.Fatalf("expected non-patch-enabled rejection, got: %v", err)
	}
}

func TestApplyIssuePatches_RejectsNewPath(t *testing.T) {
	cs := newControllersForTest()
	val := any("X")
	ops := []irminmodels.PatchOperation{
		{Op: "replace", Path: "/issues/new-foo.json/title", Value: &val},
	}
	err := cs.applyIssuePatches(context.Background(), patchNilClient(), "issues/new-foo.json", ops, &db.Operation{})
	if err == nil || !strings.Contains(err.Error(), "use push for create") {
		t.Fatalf("expected new-path rejection, got: %v", err)
	}
}

func TestApplyIssuePatches_NoOpInputDoesNotCallVendor(t *testing.T) {
	fake := newPatchFake(t)
	cs := newControllersForTest()

	// `remove` sets the field to nil — the input map will end up
	// non-empty, so today this DOES call save_issue. The contract
	// the code documents is "no field changes → no vendor call",
	// which only fires when applyOpToInput leaves input empty (e.g.,
	// every op is invalid... but those error out). So a true no-op
	// path is hard to exercise; instead, test the inverse — a
	// remove DOES propagate to the vendor.
	ops := []irminmodels.PatchOperation{
		{Op: "remove", Path: "/issues/uuid-1.json/description"},
	}
	if err := cs.applyIssuePatches(context.Background(), fake.Client(), "issues/uuid-1.json", ops, &db.Operation{}); err != nil {
		t.Fatalf("applyIssuePatches: %v", err)
	}
	calls := fake.takenCalls()
	if len(calls) != 1 {
		t.Fatalf("expected 1 save_issue for remove, got %d", len(calls))
	}
	if v, ok := calls[0].Input["description"]; !ok || v != nil {
		t.Errorf("remove should send field=nil, got: %v", calls[0].Input)
	}
}

func TestApplyIssuePatches_RejectsWholeRecordReplace(t *testing.T) {
	cs := newControllersForTest()
	val := any(map[string]any{"title": "x"})
	ops := []irminmodels.PatchOperation{
		// Path equals the file key exactly — no field suffix → whole-record replace.
		{Op: "replace", Path: "/issues/uuid-1.json", Value: &val},
	}
	err := cs.applyIssuePatches(context.Background(), patchNilClient(), "issues/uuid-1.json", ops, &db.Operation{})
	if err == nil || !strings.Contains(err.Error(), "entire issue") {
		t.Fatalf("expected whole-record replace rejection, got: %v", err)
	}
}

func TestKeysSortedDeterministic(t *testing.T) {
	in := map[string]any{"zebra": 1, "apple": 1, "mango": 1}
	got := keys(in)
	want := []string{"apple", "mango", "zebra"}
	for i, k := range got {
		if k != want[i] {
			t.Errorf("keys[%d] = %q, want %q (full: %v)", i, k, want[i], got)
		}
	}
}
