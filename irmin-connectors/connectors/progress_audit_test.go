package connectors_test

import (
	"testing"

	"irmin-connectors/connectors/common"
	firecrawlcontrollers "irmin-connectors/connectors/firecrawl/controllers"
	httpcontrollers "irmin-connectors/connectors/http/controllers"
	mysqlcontrollers "irmin-connectors/connectors/mysql/controllers"
	pineconecontrollers "irmin-connectors/connectors/pinecone/controllers"
	postgrescontrollers "irmin-connectors/connectors/postgres/controllers"
	sftpcontrollers "irmin-connectors/connectors/sftp/controllers"
	stripecontrollers "irmin-connectors/connectors/stripe/controllers"
)

// progressCoverage is the audit table the spec calls for: every
// connector known to do long-running work appears here, paired with
// the ProgressHandler return-value the connector author has
// committed to. CI fails when:
//
//   - a new entry is added below without `expectedNonNilPull` /
//     `expectedNonNilPush` reflecting the actual implementation
//     (the test is wrong),
//   - a connector flips its ProgressHandler return (someone removes
//     the real handler in a refactor and reverts to nil — the test
//     catches it before review),
//   - a connector listed in connectors/connectors.go's
//     RegisterAllConnectors block is not in this table at all (see
//     TestProgressAudit_AllRegisteredConnectorsCovered below).
//
// `expectedNonNil*` is a deliberate per-connector boolean rather
// than "always must be non-nil" because Phase 1+2 only ships the
// shared vocabulary + interface. Per-connector wiring lands in
// later PRs (Phase 3 in the rollout plan), and each PR flips its
// connector's flag in this table at the same time it wires the
// real handler. That keeps the test honest at every commit.
//
//nolint:gochecknoglobals // the audit table is intentionally global so each connector PR appends to it; rebuilding it inside every test would just hide the audit's intent.
var progressCoverage = []struct {
	name               string
	pullProvider       common.PullOperationProvider
	pushProvider       common.PushOperationProvider
	expectedNonNilPull bool
	expectedNonNilPush bool
}{
	{
		name:         "HTTP",
		pullProvider: &httpcontrollers.HTTPPullProvider{},
		pushProvider: &httpcontrollers.HTTPPushProvider{},
		// HTTP is a single bounded request — baseline heartbeat is
		// the right floor, no per-iteration progress needed.
		expectedNonNilPull: false,
		expectedNonNilPush: false,
	},
	{
		name:         "Firecrawl",
		pullProvider: &firecrawlcontrollers.FirecrawlPullProvider{},
		// Firecrawl ships pull-only.
		pushProvider:       nil,
		expectedNonNilPull: false, // Phase 3 flips this true
	},
	{
		name:         "Pinecone",
		pullProvider: &pineconecontrollers.PineconePullProvider{},
		pushProvider: &pineconecontrollers.PineconePushProvider{},
		// Phase 3 wired ProgressKindPage from FetchAll's
		// cursor-pagination loop and ProgressKindBatch from Upsert's
		// batching loop. Both providers always return non-nil
		// handlers; nil-safety lives in common.LogOperationProgress.
		expectedNonNilPull: true,
		expectedNonNilPush: true,
	},
	{
		name:               "PostgreSQL",
		pullProvider:       &postgrescontrollers.PostgresPullProvider{},
		pushProvider:       &postgrescontrollers.PostgresPushProvider{},
		expectedNonNilPull: false, // Phase 3 flips this true (HIGH priority)
		expectedNonNilPush: false, // Phase 3 flips this true
	},
	{
		name:               "MySQL",
		pullProvider:       &mysqlcontrollers.MySQLPullProvider{},
		pushProvider:       &mysqlcontrollers.MySQLPushProvider{},
		expectedNonNilPull: false, // Phase 3 flips this true (HIGH priority)
		expectedNonNilPush: false, // Phase 3 flips this true
	},
	{
		name:         "SFTP",
		pullProvider: &sftpcontrollers.SFTPPullProvider{},
		pushProvider: &sftpcontrollers.SFTPPushProvider{},
		// Phase 3 wired ProgressKindFile into DownloadDirectory's
		// recursive walk + UploadDirectory's per-file loop, plus
		// ProgressKindRateLimit into executeWithRetry's backoff.
		expectedNonNilPull: true,
		expectedNonNilPush: true,
	},
	{
		name:         "Stripe",
		pullProvider: &stripecontrollers.StripePullProvider{},
		pushProvider: &stripecontrollers.StripePushProvider{},
		// Pull migrated from local stripeclient.* progress types to
		// common.* in Phase 5. Returns a non-nil handler even on a
		// zero-value provider — nil-safety lives in
		// common.LogOperationProgress, not in the provider's guard.
		expectedNonNilPull: true,
		expectedNonNilPush: false, // Phase 3 flips this true
	},
}

// TestProgressAudit_HandlerExpectations walks the audit table and
// asserts every connector's ProgressHandler matches what the table
// says it should return. The intent is to catch silent regressions:
// if someone deletes the real handler from a connector and reverts
// to a nil stub during a refactor, this test fails immediately
// rather than waiting for a field incident to surface the gap.
func TestProgressAudit_HandlerExpectations(t *testing.T) {
	for _, entry := range progressCoverage {
		t.Run(entry.name+"/Pull", func(t *testing.T) {
			if entry.pullProvider == nil {
				t.Skip("connector ships no pull provider")
			}
			handler := entry.pullProvider.ProgressHandler(nil)
			gotNonNil := handler != nil
			if gotNonNil != entry.expectedNonNilPull {
				t.Errorf(
					"%s pull ProgressHandler: got non-nil=%v, expected non-nil=%v — "+
						"either wire the real handler or update progressCoverage in this file",
					entry.name, gotNonNil, entry.expectedNonNilPull,
				)
			}
		})
		t.Run(entry.name+"/Push", func(t *testing.T) {
			if entry.pushProvider == nil {
				t.Skip("connector ships no push provider")
			}
			handler := entry.pushProvider.ProgressHandler(nil)
			gotNonNil := handler != nil
			if gotNonNil != entry.expectedNonNilPush {
				t.Errorf(
					"%s push ProgressHandler: got non-nil=%v, expected non-nil=%v — "+
						"either wire the real handler or update progressCoverage in this file",
					entry.name, gotNonNil, entry.expectedNonNilPush,
				)
			}
		})
	}
}

// registeredConnectors mirrors the connector enumeration in
// connectors/connectors.go's RegisterAllConnectors. Kept in sync
// manually — when a new connector is added there, this list MUST
// be updated, and that connector MUST appear in progressCoverage
// above. TestProgressAudit_AllRegisteredConnectorsCovered enforces
// the second half.
//
//nolint:gochecknoglobals // mirrors the global enumeration in connectors.go; the only authoritative source we can compare against without reinventing connector registration.
var registeredConnectors = []string{
	"PostgreSQL",
	"MySQL",
	"SFTP",
	"HTTP",
	"Firecrawl",
	"Pinecone",
	"Stripe",
}

// TestProgressAudit_AllRegisteredConnectorsCovered is the gate that
// stops a new connector from silently shipping without anyone
// thinking about progress events. Adding a connector to
// RegisterAllConnectors but forgetting to update progressCoverage
// fails this test.
func TestProgressAudit_AllRegisteredConnectorsCovered(t *testing.T) {
	covered := make(map[string]bool, len(progressCoverage))
	for _, entry := range progressCoverage {
		covered[entry.name] = true
	}
	for _, name := range registeredConnectors {
		if !covered[name] {
			t.Errorf(
				"connector %q is in RegisterAllConnectors but missing from "+
					"progressCoverage in connectors/progress_audit_test.go — add it "+
					"with explicit expectedNonNilPull/expectedNonNilPush so this "+
					"audit reflects reality",
				name,
			)
		}
	}
}
