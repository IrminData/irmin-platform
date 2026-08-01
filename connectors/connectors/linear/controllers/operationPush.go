package linearcontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	"irmin-connectors/connectors/common"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/db"
	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
	"golang.org/x/sync/errgroup"
)

// pushConcurrency caps in-flight save_issue calls during push. Linear's
// MCP server does not document a strict rate limit on the create
// branch, so 4 is a deliberate balance between wall-clock latency for
// large pushes and risk of triggering server-side throttling. Each
// goroutine still serially logs its attempt + result, so audit trails
// stay intact (events are time-ordered across workers).
const pushConcurrency = 4

// maxIssuesPerPush bounds the number of files a single push call
// will iterate. The push handler has no native idempotency
// (Linear's IssueCreate has no client-supplied UUID), so a runaway
// caller — accidentally looping over the same upload, or supplying
// a ZIP with thousands of new-* files — could create thousands of
// duplicate Linear issues before anyone notices. 500 is the cap;
// callers with legitimate large uploads must split them, which
// gives the operator a natural rate-limit and a chance to spot
// duplication before it grows unbounded.
const maxIssuesPerPush = 500

// LinearPushProvider implements common.PushOperationProvider. The
// connection ID is captured up-front in OperationPush; the worker
// then constructs an OAuth-wrapped HTTP client around it.
//
// Only `issues/new-*.json` files are honored on push — every other
// path is skipped with a log line so an accidentally over-broad ZIP
// (e.g., a full pull's contents being re-pushed) doesn't fail the
// whole operation.
type LinearPushProvider struct {
	dbInstance   *db.Database
	logger       *slog.Logger
	tokenClient  *lib.OAuthTokenClient
	connectionID uint
}

// ProgressHandler returns nil — Linear push is a per-record MCP tool
// mutation loop and the volume per push is small (typically one or
// two issues at a time). The baseline heartbeat from the common
// push worker keeps the operation log moving.
func (p *LinearPushProvider) ProgressHandler(_ *db.Operation) common.ProgressHandler {
	return nil
}

// InitializeClient opens the OAuth-wrapped MCP session for the push
// operation. Returns the session-backed Client plus a cleanup func
// the runner will call when the operation completes.
func (p *LinearPushProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	p.logger = logger
	endpoint, endpointErr := resolveEndpointForOperation(operation)
	if endpointErr != nil {
		return nil, nil, func() {}, endpointErr
	}
	client, cleanup, sessionErr := linearclient.OpenSession(
		ctx, endpoint, p.tokenClient, p.connectionID, newOAuthHTTPClient(), p.logger,
	)
	if sessionErr != nil {
		return nil, nil, func() {}, fmt.Errorf("linear: open MCP session: %w", sessionErr)
	}
	return client, nil, cleanup, nil
}

// pushStats accumulates per-file outcomes so the completion log
// event reports created vs. skipped honestly. Same shape as Stripe's
// stats — copied here intentionally rather than abstracted because
// the per-resource semantics differ (Linear has no Update on push,
// only Create).
type pushStats struct {
	matched int
	created int
	skipped int
	failed  string // path of the file that aborted, or empty
}

// ProcessFiles iterates the ZIP and creates one Linear issue per
// `issues/new-*.json` file. Stops on the first hard error — Linear
// writes aren't transactional, so a partial run is harder to reason
// about than an abort.
//
// `targetPath` narrows the iteration to a single file (exact match) or
// a directory prefix (anything ending in `/`). Empty means "every
// file." This mirrors Stripe's selector semantics and is what callers
// retrying a single failed file rely on; without it, a retry of one
// new-*.json file would re-create every issue in the archive.
func (p *LinearPushProvider) ProcessFiles(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
	files map[string][]byte,
	targetPath string,
) error {
	client, ok := clientAny.(*linearclient.Client)
	if !ok {
		return errors.New("linear: invalid client type for push")
	}
	if len(files) == 0 {
		return errors.New("linear: no files to push")
	}

	resolvedTarget := strings.TrimPrefix(targetPath, "/")
	stats := &pushStats{}
	var statsMu sync.Mutex
	candidates := p.collectPushCandidates(operation, files, resolvedTarget, stats)
	stats.matched = len(candidates)

	// Cap the actual create count, not the archive size. The archive
	// may legitimately carry pull-side files (teams.json, existing
	// issues/IRM-42.json, etc.) that collectPushCandidates skips —
	// counting those toward maxIssuesPerPush would falsely reject
	// uploads whose real create count is comfortably under the cap.
	// The cap exists to bound duplicate-risk on retry, and only the
	// `issues/new-*.json` candidates produce IssueCreate calls.
	if len(candidates) > maxIssuesPerPush {
		return fmt.Errorf(
			"linear: push would create %d issues, exceeds maxIssuesPerPush=%d; "+
				"split into smaller uploads — Linear's IssueCreate has no native "+
				"idempotency so unbounded pushes risk duplicate issues on retry",
			len(candidates), maxIssuesPerPush,
		)
	}

	if err := p.fanOutIssueCreates(ctx, client, candidates, files, operation, stats, &statsMu); err != nil {
		p.logSummary(operation, files, stats)
		return err
	}

	if resolvedTarget != "" && stats.matched == 0 && stats.skipped == 0 {
		// Non-empty target that matched zero files is user error
		// (e.g., target=`teams/` against an issues-only zip). Surface
		// rather than silently returning success.
		return fmt.Errorf(
			"linear: target selector %q matched zero files in the uploaded zip",
			targetPath,
		)
	}
	p.logSummary(operation, files, stats)
	return nil
}

// fanOutIssueCreates runs save_issue create calls across a bounded
// worker pool. errgroup cancels remaining workers on the first
// failure, matching the previous "abort on first error" semantic —
// but a few in-flight goroutines may still complete before noticing
// the cancel, so stats may show a couple more `created` than a serial
// run would. The per-attempt and per-result log events remain the
// audit-trail source of truth for which records actually went through
// Linear (operators rely on this for idempotency-recovery).
func (p *LinearPushProvider) fanOutIssueCreates(
	ctx context.Context,
	client *linearclient.Client,
	candidates []string,
	files map[string][]byte,
	operation *db.Operation,
	stats *pushStats,
	statsMu *sync.Mutex,
) error {
	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(pushConcurrency)
	for _, path := range candidates {
		g.Go(func() error {
			return p.createOnePushedIssue(gctx, client, path, files[path], operation, stats, statsMu)
		})
	}
	return g.Wait()
}

// createOnePushedIssue runs the per-file create flow under the worker
// pool: emit the "attempting" event, parse, call save_issue, then emit
// success or failure. Stats updates take statsMu.
func (p *LinearPushProvider) createOnePushedIssue(
	ctx context.Context,
	client *linearclient.Client,
	path string,
	blob []byte,
	operation *db.Operation,
	stats *pushStats,
	statsMu *sync.Mutex,
) error {
	// Per-file "about to create" event — gives operators a postmortem
	// trail when a network blip kills the worker between Linear's commit
	// and our response read. Re-running the push will create duplicates
	// (Linear's IssueCreate has no native idempotency); these events let
	// an operator identify which records went through before the abort.
	p.logEvent(operation, db.LogEventTypeInfo,
		"Linear issueCreate attempting",
		map[string]any{"source_path": path},
	)
	input, inputErr := readIssueInput(blob)
	if inputErr != nil {
		recordPushFailure(stats, statsMu, path)
		return fmt.Errorf("linear: parse %s: %w", path, inputErr)
	}
	created, createErr := client.IssueCreate(ctx, input)
	if createErr != nil {
		recordPushFailure(stats, statsMu, path)
		p.logEvent(operation, db.LogEventTypeError,
			"Linear issueCreate failed",
			map[string]any{"path": path, "error": createErr.Error()},
		)
		return fmt.Errorf("linear: create %s: %w", path, createErr)
	}
	statsMu.Lock()
	stats.created++
	statsMu.Unlock()
	p.logEvent(operation, db.LogEventTypeInfo,
		"Linear issueCreate succeeded",
		map[string]any{
			"source_path": path,
			"id":          created.ID,
			"url":         created.URL,
		},
	)
	return nil
}

// recordPushFailure stamps the first failing path on stats so the
// completion summary reports which file aborted.
func recordPushFailure(stats *pushStats, statsMu *sync.Mutex, path string) {
	statsMu.Lock()
	defer statsMu.Unlock()
	if stats.failed == "" {
		stats.failed = path
	}
}

// collectPushCandidates filters the uploaded archive down to the
// `issues/new-*.json` files this push will actually create, logging
// every skipped file with a reason. Pulled out of ProcessFiles so the
// outer handler stays under the gocognit cap and so the candidate
// shape (sorted, push-enabled, parseable) is asserted in one place.
func (p *LinearPushProvider) collectPushCandidates(
	operation *db.Operation,
	files map[string][]byte,
	resolvedTarget string,
	stats *pushStats,
) []string {
	candidates := make([]string, 0, len(files))
	for _, path := range common.SortedPaths(files) {
		if resolvedTarget != "" && !pathMatchesTarget(path, resolvedTarget) {
			continue
		}
		parsed, parseErr := linearclient.ParsePath(path)
		if parseErr != nil {
			p.logSkipped(operation, path, parseErr.Error())
			stats.skipped++
			continue
		}
		if !parsed.IsNew {
			p.logSkipped(
				operation,
				path,
				"linear push only handles `<resource>/new-*.json` files (use patch for updates)",
			)
			stats.skipped++
			continue
		}
		if !parsed.Resource.Push {
			p.logSkipped(operation, path, fmt.Sprintf("resource %q is not push-enabled", parsed.Resource.Name))
			stats.skipped++
			continue
		}
		candidates = append(candidates, path)
	}
	return candidates
}

// pathMatchesTarget returns true when the file path matches the
// target selector. Exact-path equals or directory-prefix (selector
// ends in `/`). Mirrors the Stripe push selector semantics so callers
// can use the same retry shape across both connectors.
func pathMatchesTarget(filePath, target string) bool {
	filePath = strings.TrimPrefix(filePath, "/")
	if filePath == target {
		return true
	}
	if strings.HasSuffix(target, "/") && strings.HasPrefix(filePath, target) {
		return true
	}
	return false
}

// readIssueInput decodes the JSON file into Linear's save_issue tool
// input shape. The tool requires `teamId` (a UUID); there is no
// `teamKey` field. The connector cannot reliably translate the
// `settings.team_key` string (e.g., "IRM") into a teamId without a
// runtime lookup, so we require the JSON file to supply teamId
// itself. Pull writes the team UUID into every `issues/*.json`
// snapshot, so the round-trip path stays clean.
func readIssueInput(blob []byte) (map[string]any, error) {
	var input map[string]any
	if err := json.Unmarshal(blob, &input); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	if _, ok := input["title"]; !ok {
		return nil, errors.New("missing required field 'title'")
	}
	if _, hasTeamID := input["teamId"]; !hasTeamID {
		return nil, errors.New(
			"missing required field 'teamId' (Linear's save_issue tool requires the team UUID; " +
				"copy it from a pulled issue's `team.id` field)",
		)
	}
	return input, nil
}

func (p *LinearPushProvider) logSkipped(operation *db.Operation, path, reason string) {
	p.logEvent(operation, db.LogEventTypeInfo,
		"Linear push skipped file",
		map[string]any{"path": path, "reason": reason},
	)
}

func (p *LinearPushProvider) logSummary(
	operation *db.Operation, files map[string][]byte, s *pushStats,
) {
	payload := map[string]any{
		"files_in_zip": len(files),
		"matched":      s.matched,
		"created":      s.created,
		"skipped":      s.skipped,
	}
	msg := "Linear push summary"
	evt := db.LogEventTypeInfo
	if s.failed != "" {
		payload["failed_at"] = s.failed
		msg = "Linear push aborted"
		evt = db.LogEventTypeError
	}
	p.logEvent(operation, evt, msg, payload)
}

func (p *LinearPushProvider) logEvent(
	operation *db.Operation, evt db.LogEventType, msg string, payload map[string]any,
) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(p.dbInstance, p.logger, operation.ID, evt, msg, payload)
}

// OperationPush godoc
// @Summary Push data to Linear
// @Description Creates new Linear issues from JSON files in the uploaded ZIP. Files matching `issues/new-*.json` are turned into IssueCreate mutations; every other file is skipped with a log line. Each file's JSON must be a valid Linear IssueCreateInput including a `teamId` UUID (Linear's input type has no `teamKey` field — copy the UUID from a pulled issue's `team.id`).
// @Tags linear
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "ZIP containing JSON issue files (issues/new-*.json)"
// @Success 202 {object} fiber.Map "Async push job accepted ({job_id, operation_token})"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 409 {object} fiber.Map "Operation already running"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	connectionID, err := lib.ConnectionIDFromRequestHeader(func(k string) string { return c.Get(k) })
	if err != nil {
		return cs.WriteResolveError(c, err)
	}
	provider := &LinearPushProvider{
		dbInstance:   cs.DB,
		logger:       cs.Logger,
		tokenClient:  cs.OAuthConnector.TokenClient,
		connectionID: connectionID,
	}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB, cs.App)
}
