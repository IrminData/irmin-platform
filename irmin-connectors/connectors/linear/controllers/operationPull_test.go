//nolint:testpackage // Tests internal helpers + provider methods.
package linearcontrollers

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"

	"irmin-connectors/connectors/common/commontest"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/db"
)

// --- shared MCP fixture for controller-level tests ------------------------

// newPullProvider returns a bare LinearPullProvider safe for unit
// tests. The MCP client passed to GetAllFiles / GetFileByPath is wired
// directly to a commontest.FakeMCPServer because the tests exercise
// the provider's pull-and-shape logic, not the OAuth round-tripper.
// End-to-end OAuth retry against the round-tripper is covered by
// connectors/linear/client/oauth_acceptance_test.go.
func newPullProvider(t *testing.T) *LinearPullProvider {
	t.Helper()
	return &LinearPullProvider{logger: slog.Default()}
}

// newFakeAndClient is the canonical "give me an MCP-backed Linear
// client wired to a recorder fixture" two-liner every controller test
// uses. Mirrors the role newGraphQLFake + newPullClient played in the
// pre-MCP test surface.
//
// Returns the fake too, even though most callers don't use it, so a
// follow-up test that wants to add per-call assertions can switch
// from `_, client := newFakeAndClient(t)` to using both without
// changing the helper signature.
func newFakeAndClient(
	t *testing.T,
) (*commontest.FakeMCPServer, *linearclient.Client) { //nolint:unparam // fake exposed for future per-call assertions
	t.Helper()
	fake := commontest.NewFakeMCPServer(t)
	registerStubResources(fake)
	return fake, linearclient.NewWithSession(fake.Session())
}

// registerStubResources wires the four pull-enabled MCP list tools to
// canned responses. Used by every pull-side test that needs a working
// fake. Shape mirrors what Linear's real MCP server returns:
// `{"<resource>":[...records...],"hasNextPage":false}`.
func registerStubResources(f *commontest.FakeMCPServer) {
	f.OnTool("list_teams", func(_ map[string]any) (json.RawMessage, error) {
		return json.RawMessage(
			`{"teams":[{"id":"team-1","key":"IRM","name":"Irmin"}],"hasNextPage":false}`,
		), nil
	})
	f.OnTool("list_projects", func(_ map[string]any) (json.RawMessage, error) {
		return json.RawMessage(
			`{"projects":[{"id":"proj-1","name":"Launch"}],"hasNextPage":false}`,
		), nil
	})
	f.OnTool("list_cycles", func(_ map[string]any) (json.RawMessage, error) {
		// list_cycles requires teamId; the cycle pull resolves it via
		// list_teams first. The handler returns one cycle with the
		// Irmin team's key embedded so legacy assertions on
		// `team.key == "IRM"` still pass for client-side filter checks
		// in tests that set TeamKey.
		return json.RawMessage(
			`{"cycles":[{"id":"c1","team":{"key":"IRM"}}],"hasNextPage":false}`,
		), nil
	})
	f.OnTool("list_issues", func(_ map[string]any) (json.RawMessage, error) {
		return json.RawMessage(
			`{"issues":[{"id":"IRM-1","identifier":"IRM-1","title":"First"}],"hasNextPage":false}`,
		), nil
	})
}

// --- tests ----------------------------------------------------------------

func TestLinearPullProvider_GetAllFiles_EmitsOnePerResource(t *testing.T) {
	_, client := newFakeAndClient(t)

	p := newPullProvider(t)
	paths, blobs, err := p.GetAllFiles(context.Background(), client, &db.Operation{})
	if err != nil {
		t.Fatalf("GetAllFiles: %v", err)
	}
	if len(paths) != 4 {
		t.Fatalf("expected 4 files (issues, projects, cycles, teams), got %d: %v", len(paths), paths)
	}
	want := map[string]bool{"issues.json": true, "projects.json": true, "cycles.json": true, "teams.json": true}
	for _, p := range paths {
		if !want[p] {
			t.Errorf("unexpected file %q in pull output", p)
		}
	}
	// Each blob is a valid JSON array.
	for i, blob := range blobs {
		var arr []map[string]any
		if uErr := json.Unmarshal(blob, &arr); uErr != nil {
			t.Errorf("blob %d (%s) is not a JSON array: %v", i, paths[i], uErr)
		}
	}
}

func TestLinearPullProvider_GetFileByPath_RejectsSingleRecord(t *testing.T) {
	_, client := newFakeAndClient(t)
	p := newPullProvider(t)

	_, _, err := p.GetFileByPath(context.Background(), client, &db.Operation{}, "issues/IRM-42.json")
	if err == nil || !strings.Contains(err.Error(), "not supported") {
		t.Fatalf("expected single-record rejection, got: %v", err)
	}
}

func TestLinearPullProvider_GetFileByPath_EmptyPathErrors(t *testing.T) {
	p := newPullProvider(t)
	_, _, err := p.GetFileByPath(context.Background(), nil, &db.Operation{}, "")
	if err == nil {
		t.Fatal("expected empty-path error")
	}
}

func TestLinearPullProvider_GetFileByPath_WholeResource(t *testing.T) {
	_, client := newFakeAndClient(t)
	p := newPullProvider(t)

	path, blob, err := p.GetFileByPath(context.Background(), client, &db.Operation{}, "teams")
	if err != nil {
		t.Fatalf("GetFileByPath(teams): %v", err)
	}
	if path != "teams.json" {
		t.Errorf("path = %q, want teams.json", path)
	}
	if !strings.Contains(string(blob), "Irmin") {
		t.Errorf("blob should contain stub team data, got: %s", blob)
	}
}

func TestPullOptionsFromOperation_DefaultCap(t *testing.T) {
	op := &db.Operation{Settings: []byte(`{}`)}
	opts := pullOptionsFromOperation(op)
	if opts.MaxRecords != defaultMaxRecordsPerResource {
		t.Errorf("empty settings → MaxRecords %d, want %d", opts.MaxRecords, defaultMaxRecordsPerResource)
	}
}

func TestPullOptionsFromOperation_HonorsExplicitCap(t *testing.T) {
	op := &db.Operation{Settings: []byte(`{"max_records_per_resource":"500","team_key":"IRM"}`)}
	opts := pullOptionsFromOperation(op)
	if opts.MaxRecords != 500 {
		t.Errorf("explicit cap → MaxRecords %d, want 500", opts.MaxRecords)
	}
	if opts.TeamKey != "IRM" {
		t.Errorf("team_key = %q, want IRM", opts.TeamKey)
	}
}

// parsePositiveInt previously had a Linear-local copy with its own
// test cases. The helper moved to connectors/common/operationDataHelpers.go
// and the consolidated tests live in
// connectors/common/operationDataHelpers_test.go.

func TestReadSettingString_TrimAndTypeFallthrough(t *testing.T) {
	op := &db.Operation{Settings: []byte(`{"a":"  hi  ","b":42}`)}
	if got := readSettingString(op, "a"); got != "hi" {
		t.Errorf("trim: got %q, want hi", got)
	}
	if got := readSettingString(op, "b"); got != "" {
		t.Errorf("non-string falls through: got %q, want empty", got)
	}
	bad := &db.Operation{Settings: []byte("not-json")}
	if got := readSettingString(bad, "a"); got != "" {
		t.Errorf("malformed JSON: got %q, want empty", got)
	}
	if got := readSettingString(nil, "a"); got != "" {
		t.Errorf("nil operation: got %q, want empty", got)
	}
}

// marshalJSONArray previously had a Linear-local copy. It moved to
// connectors/common/operationDataHelpers.go alongside parsePositiveInt
// and sortedPaths so a future fix lands once.
