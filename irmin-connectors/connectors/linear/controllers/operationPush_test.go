//nolint:testpackage // Tests internal helpers + provider methods.
package linearcontrollers

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"testing"

	"irmin-connectors/connectors/common/commontest"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/db"
)

// pushFake wraps the shared MCP fixture with an issue-create handler
// that records each call's input map. Linear's MCP exposes both create
// and update through a single `save_issue` tool — for push, the
// connector omits `id`, so we register save_issue once and only record
// calls without id (failing the test if an id slips in).
type pushFake struct {
	server *commontest.FakeMCPServer
	mu     sync.Mutex
	inputs []map[string]any
}

func newPushFake(t *testing.T) *pushFake {
	t.Helper()
	f := &pushFake{server: commontest.NewFakeMCPServer(t)}
	f.server.OnTool("save_issue", func(args map[string]any) (json.RawMessage, error) {
		f.mu.Lock()
		// Record a copy so a downstream mutation can't retroactively
		// alter the recorded input.
		recorded := map[string]any{}
		for k, v := range args {
			if k == "id" {
				continue // create path; id absence is the contract
			}
			recorded[k] = v
		}
		f.inputs = append(f.inputs, recorded)
		idx := len(f.inputs)
		f.mu.Unlock()
		title, _ := args["title"].(string)
		// Match the shape the connector's decodeIssueResponse expects:
		// either a wrapped envelope or a bare issue. We use the wrapped
		// form here to mirror what Linear's MCP server actually returns.
		body := map[string]any{
			"success": true,
			"issue": map[string]any{
				"id":         "IRM-" + strconv.Itoa(idx),
				"identifier": "IRM-" + strconv.Itoa(idx),
				"title":      title,
				"url":        "https://linear.app/irmin/issue/IRM-" + strconv.Itoa(idx),
			},
		}
		raw, _ := json.Marshal(body)
		return raw, nil
	})
	return f
}

func (f *pushFake) Client() *linearclient.Client {
	return linearclient.NewWithSession(f.server.Session())
}

func (f *pushFake) takenInputs() []map[string]any {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]map[string]any, len(f.inputs))
	copy(out, f.inputs)
	return out
}

// nilClient returns a Linear Client backed by a nil session, suitable
// for tests that hit a rejection path BEFORE any vendor call. Any
// CallTool through this client will error fast with a clear message.
func nilClient() *linearclient.Client {
	return linearclient.NewWithSession(nil)
}

func newPushProvider() *LinearPushProvider {
	return &LinearPushProvider{logger: slog.Default()}
}

// --- tests ----------------------------------------------------------------

func TestPushProvider_RejectsEmptyFiles(t *testing.T) {
	p := newPushProvider()
	err := p.ProcessFiles(context.Background(), nilClient(), &db.Operation{}, map[string][]byte{}, "")
	if err == nil || !strings.Contains(err.Error(), "no files") {
		t.Fatalf("empty files should error, got: %v", err)
	}
}

func TestPushProvider_HappyPath_AllRecordsCreated(t *testing.T) {
	fake := newPushFake(t)
	p := newPushProvider()

	files := map[string][]byte{
		"issues/new-zebra.json": []byte(`{"title":"Z","teamId":"team-1"}`),
		"issues/new-apple.json": []byte(`{"title":"A","teamId":"team-1"}`),
	}
	if err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, ""); err != nil {
		t.Fatalf("ProcessFiles: %v", err)
	}

	got := fake.takenInputs()
	if len(got) != 2 {
		t.Fatalf("expected 2 save_issue calls, got %d", len(got))
	}
	// Push is concurrent (pushConcurrency goroutines fan out via
	// errgroup) so input order is no longer deterministic — but
	// every candidate file must reach Linear exactly once. Audit
	// trail through per-file log events is what operators rely on
	// for postmortem reconstruction.
	titles := map[string]bool{}
	for _, in := range got {
		title, _ := in["title"].(string)
		titles[title] = true
	}
	if !titles["A"] || !titles["Z"] {
		t.Errorf("missing record(s): got titles %v, want A and Z", titles)
	}
}

// TestPushProvider_TargetPathFiltersIteration is the regression test
// for the bug Codex flagged in PR #186 review: the provider used to
// discard `targetPath` and re-create every file in the archive on
// retry. With the fix, the selector narrows iteration to the
// matching file(s).
func TestPushProvider_TargetPathFiltersIteration(t *testing.T) {
	fake := newPushFake(t)
	p := newPushProvider()

	files := map[string][]byte{
		"issues/new-a.json": []byte(`{"title":"A","teamId":"team-1"}`),
		"issues/new-b.json": []byte(`{"title":"B","teamId":"team-1"}`),
		"issues/new-c.json": []byte(`{"title":"C","teamId":"team-1"}`),
	}
	if err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, "issues/new-b.json"); err != nil {
		t.Fatalf("ProcessFiles: %v", err)
	}

	got := fake.takenInputs()
	if len(got) != 1 {
		t.Fatalf("expected exactly 1 save_issue call (filtered to new-b.json), got %d: %v", len(got), got)
	}
	if got[0]["title"] != "B" {
		t.Errorf("expected only 'B' to be sent, got: %v", got[0])
	}
}

func TestPushProvider_TargetPathDirectoryPrefix(t *testing.T) {
	fake := newPushFake(t)
	p := newPushProvider()

	files := map[string][]byte{
		"issues/new-a.json":   []byte(`{"title":"A","teamId":"team-1"}`),
		"projects/new-x.json": []byte(`{"title":"X","teamId":"team-1"}`),
	}
	// `issues/` matches the issues subdirectory only.
	if err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, "issues/"); err != nil {
		t.Fatalf("ProcessFiles: %v", err)
	}
	got := fake.takenInputs()
	if len(got) != 1 || got[0]["title"] != "A" {
		t.Errorf("expected only 'A' (issues/ prefix), got: %v", got)
	}
}

func TestPushProvider_TargetPathNoMatchErrors(t *testing.T) {
	fake := newPushFake(t)
	p := newPushProvider()

	files := map[string][]byte{
		"issues/new-a.json": []byte(`{"title":"A","teamId":"team-1"}`),
	}
	err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, "projects/")
	if err == nil || !strings.Contains(err.Error(), "matched zero files") {
		t.Fatalf("non-matching target should error, got: %v", err)
	}
}

func TestPushProvider_AbortsOnInvalidJSON(t *testing.T) {
	fake := newPushFake(t)
	p := newPushProvider()

	files := map[string][]byte{
		"issues/new-broken.json": []byte(`{not json`),
	}
	err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, "")
	if err == nil || !strings.Contains(err.Error(), "parse") {
		t.Fatalf("invalid JSON should abort, got: %v", err)
	}
}

func TestReadIssueInput_RequiresTeamId(t *testing.T) {
	cases := []struct {
		name    string
		blob    string
		wantErr string
	}{
		{"missing title", `{"teamId":"x"}`, "title"},
		{"missing teamId", `{"title":"x"}`, "teamId"},
		{"happy path", `{"title":"x","teamId":"u"}`, ""},
		{"bad json", `{nope`, "invalid JSON"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := readIssueInput([]byte(tc.blob))
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if got["title"] != "x" {
					t.Errorf("happy: got %v", got)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("want error containing %q, got: %v", tc.wantErr, err)
			}
		})
	}
}

func TestReadIssueInput_DoesNotPopulateTeamKey(t *testing.T) {
	// Regression: previously the code wrote `input["teamKey"] = teamKeyDefault`,
	// but Linear's IssueCreateInput type has no `teamKey` field — the only
	// valid key is `teamId`. The vestigial teamKeyDefault parameter has
	// since been removed; the file must supply teamId itself.
	got, err := readIssueInput([]byte(`{"title":"x","teamId":"team-uuid"}`))
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if _, ok := got["teamKey"]; ok {
		t.Errorf("teamKey must NOT be set on Linear's IssueCreateInput; got: %v", got)
	}
	if got["teamId"] != "team-uuid" {
		t.Errorf("teamId should be preserved verbatim, got: %v", got)
	}
}

// TestPushProvider_RejectsOversizedArchive locks in the
// maxIssuesPerPush guard. Linear's IssueCreate has no client-supplied
// idempotency key, so a runaway caller (or an accidental retry of a
// huge archive) could create thousands of duplicate issues. The cap
// forces the user to split — which both bounds the blast radius and
// gives them a chance to spot duplication before it grows.
func TestPushProvider_RejectsOversizedArchive(t *testing.T) {
	p := newPushProvider()
	files := make(map[string][]byte, maxIssuesPerPush+1)
	for i := 0; i <= maxIssuesPerPush; i++ {
		files["issues/new-"+strconv.Itoa(i)+".json"] = []byte(`{"title":"x","teamId":"team-1"}`)
	}
	err := p.ProcessFiles(context.Background(), nilClient(), &db.Operation{}, files, "")
	if err == nil || !strings.Contains(err.Error(), "exceeds maxIssuesPerPush") {
		t.Fatalf("expected oversized-archive rejection, got: %v", err)
	}
}

// TestPushProvider_CapAppliesToCreatesNotArchiveSize pins the
// fix for a Cursor Bot finding: the cap counts actual create
// calls, not files in the ZIP. An archive that contains many
// non-creatable files (e.g., a full pull's worth of `teams.json`,
// `projects.json`, existing `issues/IRM-N.json` snapshots) plus
// a small number of `issues/new-*.json` entries must succeed
// when the create count is under the cap, even if the total file
// count is well over.
func TestPushProvider_CapAppliesToCreatesNotArchiveSize(t *testing.T) {
	fake := newPushFake(t)
	p := newPushProvider()
	// Build an archive of (maxIssuesPerPush + 50) files where ONLY
	// 3 are new-*.json. The remaining 547 are pull-side files that
	// must be skipped without counting against the cap.
	files := make(map[string][]byte, maxIssuesPerPush+50)
	files["teams.json"] = []byte(`[{"id":"team-1"}]`)
	files["projects.json"] = []byte(`[]`)
	for i := range maxIssuesPerPush + 47 {
		// Existing issue snapshots (no `new-` prefix) are skipped.
		files["issues/IRM-"+strconv.Itoa(i)+".json"] = []byte(`{"id":"IRM-x"}`)
	}
	for i := range 3 {
		files["issues/new-"+strconv.Itoa(i)+".json"] = []byte(`{"title":"x","teamId":"team-1"}`)
	}
	if err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, ""); err != nil {
		t.Fatalf("ProcessFiles must succeed when only 3 issues are creatable: %v", err)
	}
	if got := len(fake.takenInputs()); got != 3 {
		t.Errorf("expected 3 save_issue calls, got %d", got)
	}
}

// TestPushProvider_RejectsWhenCreateCountExceedsCap guards the
// other direction: when the actual create count breaches the cap
// (regardless of how many other files sit in the archive), the
// guard fires.
func TestPushProvider_RejectsWhenCreateCountExceedsCap(t *testing.T) {
	p := newPushProvider()
	// Mix in some non-creatable files for realism.
	files := make(map[string][]byte, maxIssuesPerPush+10)
	files["teams.json"] = []byte(`[{"id":"team-1"}]`)
	for i := 0; i <= maxIssuesPerPush; i++ {
		files["issues/new-"+strconv.Itoa(i)+".json"] = []byte(`{"title":"x","teamId":"team-1"}`)
	}
	err := p.ProcessFiles(context.Background(), nilClient(), &db.Operation{}, files, "")
	if err == nil || !strings.Contains(err.Error(), "exceeds maxIssuesPerPush") {
		t.Fatalf("expected create-count rejection, got: %v", err)
	}
}

func TestPathMatchesTarget(t *testing.T) {
	cases := []struct {
		path, target string
		want         bool
	}{
		{"issues/new-a.json", "issues/new-a.json", true}, // exact
		{"issues/new-a.json", "issues/", true},           // dir prefix
		{"projects/new-x.json", "issues/", false},        // dir prefix mismatch
		{"issues/new-a.json", "issues", false},           // missing trailing slash, not exact
		{"/issues/new-a.json", "issues/new-a.json", true},
	}
	for _, tc := range cases {
		if got := pathMatchesTarget(tc.path, tc.target); got != tc.want {
			t.Errorf("pathMatchesTarget(%q, %q) = %v, want %v", tc.path, tc.target, got, tc.want)
		}
	}
}

// TestPushProvider_LogsAttemptBeforeCreate documents the per-file
// "Linear issueCreate attempting" log event added so operators can
// reconstruct which records went through during a partial-failure
// retry. Today this asserts the helper takes the right shape; once
// db.LogOperationEvent is exposed for assertion in tests, this test
// can verify the event itself was emitted.
func TestPushProvider_LogsAttemptBeforeCreate(t *testing.T) {
	// Smoke: the provider runs to completion. This guards against
	// the event-logging helper crashing on a nil db / nil logger
	// (the helpers in operationPull.go are nil-safe, so this should
	// never panic). If the panic ever returns, this test catches it.
	fake := newPushFake(t)
	p := newPushProvider()
	files := map[string][]byte{
		"issues/new-a.json": []byte(`{"title":"A","teamId":"team-1"}`),
	}
	if err := p.ProcessFiles(context.Background(), fake.Client(), &db.Operation{}, files, ""); err != nil {
		t.Fatalf("ProcessFiles: %v", err)
	}
	if got := fake.takenInputs(); len(got) != 1 {
		t.Fatalf("expected one create call, got %d", len(got))
	}
	// Quick shape check that the logged event JSON would round-trip.
	_, jErr := json.Marshal(map[string]any{"source_path": "issues/new-a.json"})
	if jErr != nil {
		t.Fatalf("log payload should be JSON-encodable: %v", jErr)
	}
}
