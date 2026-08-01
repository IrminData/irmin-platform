package linearclient_test

// Critical-path tests added per /review specialist findings.
// Pinning behavioural invariants the controller-level tests don't catch:
//
//   - Cursor stall guard in listAllPages (vendor returns same cursor twice
//     → hard error rather than infinite snapshot)
//   - IssueCreate strips client-supplied `id` so a refactor can't
//     silently turn a create into an update
//   - IssueCreate surfaces the save_issue failure envelope (success=false
//     with error string) as a Go error
//   - listCycles with a team_key that matches no team returns an empty
//     snapshot silently (rather than aborting or fetching every team)
//
// Each test drives a real MCP session via commontest.FakeMCPServer
// against the production code path.

import (
	"context"
	"encoding/json"
	"strings"
	"sync/atomic"
	"testing"

	"irmin-connectors/connectors/common/commontest"
	linearclient "irmin-connectors/connectors/linear/client"
)

func TestIssueCreate_StripsID(t *testing.T) {
	fake := commontest.NewFakeMCPServer(t)
	var captured map[string]any
	fake.OnTool("save_issue", func(args map[string]any) (json.RawMessage, error) {
		captured = args
		return json.RawMessage(
			`{"success":true,"issue":{"id":"IRM-1","title":"x","url":"https://linear.app/x"}}`,
		), nil
	})
	c := linearclient.NewWithSession(fake.Session())

	_, err := c.IssueCreate(context.Background(), map[string]any{
		"id":     "OLD-ID-SHOULD-BE-DROPPED",
		"title":  "x",
		"teamId": "team-1",
	})
	if err != nil {
		t.Fatalf("IssueCreate: %v", err)
	}
	if _, present := captured["id"]; present {
		t.Fatalf("save_issue create call must strip id, got args %v", captured)
	}
	if captured["title"] != "x" {
		t.Errorf("title not forwarded: %v", captured)
	}
}

func TestIssueCreate_FailureEnvelope(t *testing.T) {
	fake := commontest.NewFakeMCPServer(t)
	fake.OnTool("save_issue", func(_ map[string]any) (json.RawMessage, error) {
		return json.RawMessage(
			`{"success":false,"error":"team not found"}`,
		), nil
	})
	c := linearclient.NewWithSession(fake.Session())

	_, err := c.IssueCreate(context.Background(), map[string]any{
		"title":  "x",
		"teamId": "team-1",
	})
	if err == nil {
		t.Fatal("expected error on success=false envelope")
	}
	if !strings.Contains(err.Error(), "team not found") {
		t.Errorf("error must surface envelope text, got %q", err.Error())
	}
}

// TestIssueCreate_FailureEnvelopeWithoutErrorString pins a Cursor Bot
// finding: success=false with no error string AND a populated `issue`
// must NOT be treated as success. The earlier guard required a non-
// empty Error before erroring; that let a malformed envelope quietly
// produce a "created IRM-1" log for an issue Linear never persisted.
func TestIssueCreate_FailureEnvelopeWithoutErrorString(t *testing.T) {
	fake := commontest.NewFakeMCPServer(t)
	fake.OnTool("save_issue", func(_ map[string]any) (json.RawMessage, error) {
		// success=false but error="" and issue is populated. Regression
		// shape — the wrapped envelope cannot be trusted to carry an
		// error string on every failure mode.
		return json.RawMessage(
			`{"success":false,"issue":{"id":"GHOST-1","title":"x","url":"https://linear.app/x"}}`,
		), nil
	})
	c := linearclient.NewWithSession(fake.Session())

	_, err := c.IssueCreate(context.Background(), map[string]any{
		"title":  "x",
		"teamId": "team-1",
	})
	if err == nil {
		t.Fatal("success=false must surface as error even with empty error string and populated issue")
	}
	if !strings.Contains(err.Error(), "no error message") {
		t.Errorf("error should mention the empty-error case, got %q", err.Error())
	}
}

func TestListAllPages_CursorStallGuard(t *testing.T) {
	// Simulates a vendor bug where the same cursor is returned twice.
	// Without the guard the connector would loop forever, accumulating
	// duplicate records into one snapshot. The guard converts the loop
	// into a fast hard error.
	fake := commontest.NewFakeMCPServer(t)
	var calls atomic.Int32
	fake.OnTool("list_issues", func(_ map[string]any) (json.RawMessage, error) {
		calls.Add(1)
		// Always returns hasNextPage=true with the same cursor — even
		// on the second call, which is the moment the stall guard
		// must fire.
		return json.RawMessage(
			`{"issues":[{"id":"1"}],"hasNextPage":true,"cursor":"stuck"}`,
		), nil
	})
	c := linearclient.NewWithSession(fake.Session())

	res, _ := linearclient.FindResource("issues")
	_, _, err := c.ListBounded(
		context.Background(), res,
		linearclient.PullOptions{MaxRecords: 10000},
	)
	if err == nil {
		t.Fatal("expected stall-guard error, got nil")
	}
	if !strings.Contains(err.Error(), "stalled") {
		t.Errorf("error should mention stall, got %q", err.Error())
	}
	// Guard must fire on the SECOND identical-cursor page, not loop.
	if got := calls.Load(); got > 5 {
		t.Errorf("stall guard didn't trip fast enough: %d calls", got)
	}
}

func TestListCycles_TeamKeyNoMatch(t *testing.T) {
	// Operator sets team_key="DOES_NOT_EXIST" — list_teams returns
	// only OTHER. The cycle pull must return an empty snapshot
	// silently (no error, no truncation), letting the controller log
	// "0 records" rather than fail the whole pull.
	fake := commontest.NewFakeMCPServer(t)
	fake.OnTool("list_teams", func(_ map[string]any) (json.RawMessage, error) {
		return json.RawMessage(
			`{"teams":[{"id":"T1","key":"OTHER"}],"hasNextPage":false}`,
		), nil
	})
	cyclesCalled := false
	fake.OnTool("list_cycles", func(_ map[string]any) (json.RawMessage, error) {
		cyclesCalled = true
		return json.RawMessage(`{"cycles":[],"hasNextPage":false}`), nil
	})
	c := linearclient.NewWithSession(fake.Session())

	res, _ := linearclient.FindResource("cycles")
	nodes, truncated, err := c.ListBounded(
		context.Background(), res,
		linearclient.PullOptions{TeamKey: "DOES_NOT_EXIST"},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if truncated {
		t.Errorf("truncated=true with no matches misleads operator")
	}
	if len(nodes) != 0 {
		t.Errorf("expected zero cycles, got %d", len(nodes))
	}
	if cyclesCalled {
		t.Errorf("list_cycles should not be called when no team matches")
	}
}
