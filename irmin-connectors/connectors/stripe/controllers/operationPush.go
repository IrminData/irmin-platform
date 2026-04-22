package stripecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"

	"irmin-connectors/connectors/common"
	stripeclient "irmin-connectors/connectors/stripe/client"
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// StripePushProvider is the connector-side implementation of
// common.PushOperationProvider. It walks the uploaded ZIP, decides
// create-vs-update per file path, and posts each record to Stripe's
// REST API with a deterministic Idempotency-Key.
type StripePushProvider struct {
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns nil today — Stripe push is a per-record
// REST POST loop, and Phase 3 of the progress-events rollout will
// thread per-batch progress (ProgressKindBatch) through it. Until
// then, the baseline heartbeat from the common push handler covers
// the gap.
func (p *StripePushProvider) ProgressHandler(_ *db.Operation) common.ProgressHandler {
	return nil
}

// InitializeClient constructs the Stripe client from the Operation's
// stored details + settings.
func (p *StripePushProvider) InitializeClient(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	stripe, _, _, err := stripeclient.InitFromOperation(logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}
	p.logger = logger
	return stripe, nil, func() {}, nil
}

// pushStats accumulates per-operation counts so the completion log
// event reports what actually happened (pushed / skipped / created /
// updated), not the raw unzip count. Without this, an operator
// seeing "pushed 100 files" with 80 skipped-as-unrecognized had no
// way to tell from the logs that only 20 writes hit Stripe.
type pushStats struct {
	matched  int
	skipped  int
	created  int
	updated  int
	failedAt string
}

// ProcessFiles iterates every file in the uploaded ZIP and dispatches
// each one to Stripe based on its path. Stops on the first hard error
// — Stripe writes aren't transactional and a partial run is harder to
// reason about than an abort. Already-applied writes are safe to
// retry because the idempotency key is content-derived.
//
// Emits a "push_summary" operation log event at the end (or on abort)
// with per-bucket counts, so downstream observability doesn't have
// to infer completion from the generic "Push operation completed"
// line from the common package.
func (p *StripePushProvider) ProcessFiles(
	c fiber.Ctx,
	clientAny any,
	files map[string][]byte,
	targetPath string,
) error {
	stripe, ok := clientAny.(*stripeclient.Client)
	if !ok {
		return errors.New("stripe: invalid client type for push")
	}
	operation, _ := c.Locals("operation").(*db.Operation)
	ctx := c.Context()

	if len(files) == 0 {
		return errors.New("stripe: no files to push")
	}

	// Resolve the target selector to a canonical form — if the user
	// passes `customers` (no trailing slash) matching a known resource,
	// treat it as `customers/` so every file under that resource is
	// selected. Earlier revisions would silently match zero files and
	// log "pushed 100 files" with no actual Stripe writes; the
	// phantom-success was invisible to operators.
	resolvedTarget, targetErr := resolveTargetPath(targetPath)
	if targetErr != nil {
		return targetErr
	}

	stats := &pushStats{}
	orderedPaths := sortedPaths(files)
	for _, path := range orderedPaths {
		if resolvedTarget != "" && !pathMatchesTarget(path, resolvedTarget) {
			continue
		}
		outcome, err := p.pushFile(ctx, stripe, path, files[path], operation)
		if err != nil {
			stats.failedAt = path
			p.logPushSummary(operation, files, resolvedTarget, stats)
			return err
		}
		stats.recordOutcome(outcome)
	}

	// Non-empty target that matched zero files is user error (e.g.,
	// `target=invoices/` against a zip of only customers). Surface
	// rather than silently succeeding.
	if resolvedTarget != "" && stats.total() == 0 {
		p.logPushSummary(operation, files, resolvedTarget, stats)
		return fmt.Errorf(
			"stripe: target selector %q matched zero files in the uploaded zip",
			targetPath,
		)
	}

	p.logPushSummary(operation, files, resolvedTarget, stats)
	return nil
}

// resolveTargetPath normalizes a push `target` selector.
//
//   - Empty target means "every file" (caller-handled).
//   - A single-segment target that matches a known write-enabled
//     resource name gets a trailing slash so it behaves as a
//     directory prefix (`customers` → `customers/`).
//   - A single-segment target matching a read-only resource
//     (`charges`, `subscriptions`, `payouts`) returns a clear error
//     up front — the alternative is every matched file failing
//     individually with "read-only" deep inside pushFile, which
//     produces a noisy log and a less actionable error.
//   - Other values pass through unchanged — the resulting match is
//     either exact (full file path) or directory (already ends in /).
func resolveTargetPath(target string) (string, error) {
	if target == "" {
		return "", nil
	}
	trimmed := strings.TrimPrefix(target, "/")
	// Already a directory prefix, or an explicit file path — pass through.
	if strings.HasSuffix(trimmed, "/") || strings.Contains(trimmed, "/") {
		return trimmed, nil
	}
	// Single segment: check against the resource table.
	for _, r := range stripeclient.KnownResources() {
		if r.Name != trimmed {
			continue
		}
		if !r.Write {
			return "", fmt.Errorf(
				"stripe: target %q is a read-only resource; "+
					"push supports only write-enabled resources (customers, invoices, products, prices)",
				trimmed,
			)
		}
		return trimmed + "/", nil
	}
	// Unknown single segment — pass through so it can match a
	// theoretical top-level file, even though none exist under the
	// current layout. The zero-match check in ProcessFiles turns
	// this into a clear error instead of silent success.
	return trimmed, nil
}

// total returns the number of files this run actually dispatched to
// Stripe (not including skipped files).
func (s *pushStats) total() int { return s.created + s.updated }

// recordOutcome updates the appropriate counter for a single
// pushFile result.
func (s *pushStats) recordOutcome(outcome pushOutcome) {
	s.matched++
	switch outcome {
	case pushOutcomeCreated:
		s.created++
	case pushOutcomeUpdated:
		s.updated++
	case pushOutcomeSkipped:
		s.matched-- // skipped files don't count toward the matched set
		s.skipped++
	}
}

// pushOutcome reports what pushFile actually did so the stats
// aggregator can keep an accurate tally. Kept as its own type so the
// switch in recordOutcome is exhaustive and any future outcome type
// forces a compile error at the aggregator.
type pushOutcome int

const (
	pushOutcomeCreated pushOutcome = iota + 1
	pushOutcomeUpdated
	pushOutcomeSkipped
)

// pushFile resolves one file's path to a Stripe endpoint and either
// creates or updates the record. Returns the outcome (created /
// updated / skipped) so the caller's stats aggregator can log
// honest totals.
func (p *StripePushProvider) pushFile(
	ctx context.Context,
	stripe *stripeclient.Client,
	path string,
	content []byte,
	operation *db.Operation,
) (pushOutcome, error) {
	parsed, err := stripeclient.ParsePath(path)
	if err != nil {
		// Skip files Irmin doesn't recognize rather than failing the
		// whole push — unrelated docs or notes on the branch
		// shouldn't block writes. We still log so users see that a
		// file was skipped.
		p.logSkipped(operation, path, err)
		return pushOutcomeSkipped, nil
	}
	if !parsed.Resource.Write {
		return 0, fmt.Errorf(
			"stripe: resource %q is read-only; cannot push",
			parsed.Resource.Name,
		)
	}

	form, err := stripeclient.JSONToForm(content)
	if err != nil {
		return 0, fmt.Errorf("stripe: file %s: %w", path, err)
	}

	// scope = source file path. This disambiguates two `new-*.json`
	// files with identical content (template duplicated) so Stripe
	// doesn't dedupe the second create. For updates the file path
	// already differs per `<id>.json`, so the same scope works
	// uniformly — no branch needed.
	scope := path

	if parsed.IsNew {
		resp, createErr := stripe.Create(ctx, parsed.Resource.Path, scope, form)
		if createErr != nil {
			p.logError(operation, path, "Stripe create failed", createErr)
			return 0, fmt.Errorf("stripe: create %s: %w", parsed.Resource.Name, createErr)
		}
		p.logCreateSuccess(operation, path, parsed.Resource.Name, resp)
		return pushOutcomeCreated, nil
	}

	resp, updateErr := stripe.Update(ctx, parsed.Resource.Path, parsed.ID, scope, form)
	if updateErr != nil {
		p.logError(operation, path, "Stripe update failed", updateErr)
		return 0, fmt.Errorf("stripe: update %s/%s: %w", parsed.Resource.Name, parsed.ID, updateErr)
	}
	p.logUpdateSuccess(operation, path, parsed.Resource.Name, parsed.ID, resp)
	return pushOutcomeUpdated, nil
}

// pathMatchesTarget returns true when the target selector matches the
// file's path. Currently only exact-path and prefix-dir matches are
// supported (e.g., target="customers/" matches customers/*, target=""
// matches everything — handled by caller).
func pathMatchesTarget(filePath, target string) bool {
	filePath = strings.TrimPrefix(filePath, "/")
	target = strings.TrimPrefix(target, "/")
	if filePath == target {
		return true
	}
	if strings.HasSuffix(target, "/") && strings.HasPrefix(filePath, target) {
		return true
	}
	return false
}

// sortedPaths returns the map keys in sorted order for deterministic
// iteration (zip archives don't preserve order and Go map iteration is
// randomized). sort.Strings matches the convention used by every
// sibling connector's push path.
func sortedPaths(files map[string][]byte) []string {
	paths := make([]string, 0, len(files))
	for k := range files {
		paths = append(paths, k)
	}
	sort.Strings(paths)
	return paths
}

// logPushSummary emits a single structured event with the accurate
// per-outcome counts, so operators don't have to reconstruct "was this
// a real push or did all files get skipped" from per-file events.
// Called on both the happy path and on abort (with `failed_at` set).
func (p *StripePushProvider) logPushSummary(
	operation *db.Operation, files map[string][]byte, target string, s *pushStats,
) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	payload := map[string]any{
		"files_in_zip": len(files),
		"matched":      s.matched,
		"created":      s.created,
		"updated":      s.updated,
		"skipped":      s.skipped,
		"target":       target,
	}
	msg := "Stripe push summary"
	if s.failedAt != "" {
		payload["failed_at"] = s.failedAt
		msg = "Stripe push aborted"
	}
	eventType := db.LogEventTypeInfo
	if s.failedAt != "" {
		eventType = db.LogEventTypeError
	}
	common.LogOperationEvent(p.dbInstance, p.logger, operation.ID, eventType, msg, payload)
}

func (p *StripePushProvider) logSkipped(operation *db.Operation, path string, reason error) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe push skipped unrecognized file",
		map[string]any{"path": path, "reason": reason.Error()},
	)
}

func (p *StripePushProvider) logError(operation *db.Operation, path, msg string, err error) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeError,
		msg,
		map[string]any{"path": path, "error": err.Error()},
	)
}

func (p *StripePushProvider) logCreateSuccess(
	operation *db.Operation, path, resource string, response json.RawMessage,
) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe create succeeded",
		map[string]any{
			"resource":       resource,
			"source_path":    path,
			"created_id":     extractIDForLog(response),
			"response_bytes": len(response),
		},
	)
}

func (p *StripePushProvider) logUpdateSuccess(
	operation *db.Operation, path, resource, id string, response json.RawMessage,
) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe update succeeded",
		map[string]any{
			"resource":       resource,
			"id":             id,
			"source_path":    path,
			"response_bytes": len(response),
		},
	)
}

// extractIDForLog is the log-safe variant of stripeclient.ExtractID:
// never returns an error, falls back to the empty string when the
// record is unparseable. Used only for observability fields where a
// missing id is informational, not actionable.
func extractIDForLog(raw json.RawMessage) string {
	id, _ := stripeclient.ExtractID(raw)
	return id
}

// OperationPush godoc
// @Summary Push data to Stripe
// @Description Push JSON records to Stripe. Files under `<resource>/new-*.json` create new records; files under `<resource>/<id>.json` update existing ones. Supported resources: customers, invoices, products, prices.
// @Tags stripe
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param file formData file true "ZIP containing JSON resource files"
// @Param path formData string false "Optional target path selector (file or directory prefix like `customers/`)"
// @Success 200 {object} fiber.Map "Data pushed successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file format"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 409 {object} fiber.Map "Operation already running"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &StripePushProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB)
}
