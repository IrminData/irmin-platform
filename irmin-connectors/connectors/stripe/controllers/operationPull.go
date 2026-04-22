package stripecontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"irmin-connectors/connectors/common"
	stripeclient "irmin-connectors/connectors/stripe/client"
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// StripePullProvider is the connector-side implementation of
// common.PullOperationProvider. Each pull emits one `<resource>.json`
// file per configured resource type — a plain JSON array of the
// records Stripe returned, in Stripe's wire shape, no reshaping.
// Downstream Irmin queries can ingest this with DuckDB when a
// columnar view is desired.
type StripePullProvider struct {
	dbInstance *db.Database
	logger     *slog.Logger
}

// ProgressHandler returns the per-page + rate-limit observability
// callback that gets wired into the Stripe client during
// InitializeClient. Without it, a multi-minute Stripe pull emits zero
// events between operation/init and operation/pull's final response,
// leaving operators debugging a 10-minute hang with no signal —
// which is exactly the field incident this whole machinery exists
// to prevent.
//
// Always returns a non-nil handler. Nil-safety lives one layer down
// in common.LogOperationProgress, which no-ops on nil dbInstance /
// logger / nil operation — so this method is safe to call from the
// progress-coverage audit test on a bare provider too.
//
// Throttling lives in common.LogOperationProgress (every 5 pages,
// rate-limit unthrottled), so this method emits every event the
// client fires and lets the common helper decide what surfaces.
func (p *StripePullProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return func(event common.ProgressEvent) {
		var operationID uint
		if operation != nil {
			operationID = operation.ID
		}
		common.LogOperationProgress(p.dbInstance, p.logger, operationID, event)
	}
}

// InitializeClient builds the Stripe client for this operation and
// installs the progress handler so long-running pulls surface
// per-page and rate-limit events into the workflow log stream.
func (p *StripePullProvider) InitializeClient(
	_ fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	// Hydrate logger before building the handler so the closure
	// p.ProgressHandler returns has a valid logger.
	p.logger = logger
	stripe, _, _, err := stripeclient.InitFromOperation(
		logger, operation,
		stripeclient.WithProgressHandler(p.ProgressHandler(operation)),
	)
	if err != nil {
		return nil, nil, func() {}, err
	}
	return stripe, nil, func() {}, nil
}

// GetAllFiles lists every pull-enabled resource and returns one JSON
// file per resource. One Stripe rate-limit charge per resource page
// (100 records). `max_records_per_resource` on the Connection caps
// per-resource size so a million-record Stripe account doesn't OOM
// the connector.
func (p *StripePullProvider) GetAllFiles(c fiber.Ctx, clientAny any) ([]string, [][]byte, error) {
	stripe, ok := clientAny.(*stripeclient.Client)
	if !ok {
		return nil, nil, errors.New("stripe: invalid client type for pull")
	}
	operation, _ := c.Locals("operation").(*db.Operation)
	ctx := c.Context()
	maxRecords := p.pullLimit(operation)

	var paths []string
	var blobs [][]byte

	for _, resource := range stripeclient.KnownResources() {
		if !resource.Pull {
			continue
		}
		path, blob, err := p.pullResource(ctx, stripe, resource, maxRecords, operation)
		if err != nil {
			return nil, nil, err
		}
		paths = append(paths, path)
		blobs = append(blobs, blob)
	}

	if len(paths) == 0 {
		return nil, nil, errors.New("stripe: no pullable resources configured")
	}
	return paths, blobs, nil
}

// GetFileByPath supports two modes:
//   - "customers" or "customers.json" → pull just the customers resource
//   - "customers/cus_…"               → GET a single record by ID
//
// The `.json` suffix is accepted on whole-resource pulls because that's
// the filename pullResource emits on output — so a workflow authored as
// "this connector path produces `customers.json`" round-trips cleanly
// without users having to remember that the input form drops the
// extension.
//
// Empty path is rejected — HandleOperationPull dispatches to
// GetAllFiles in that case, so reaching the provider with an empty
// path is a programming error.
func (p *StripePullProvider) GetFileByPath(
	c fiber.Ctx, clientAny any, rawPath string,
) (string, []byte, error) {
	if rawPath == "" {
		return "", nil, errors.New(
			"stripe: GetFileByPath requires a non-empty path (use GetAllFiles for whole-account pulls)",
		)
	}

	stripe, ok := clientAny.(*stripeclient.Client)
	if !ok {
		return "", nil, errors.New("stripe: invalid client type for pull")
	}
	operation, _ := c.Locals("operation").(*db.Operation)
	ctx := c.Context()

	// Single-record mode: `customers/cus_abc` (with or without `.json`)
	if strings.Contains(strings.TrimPrefix(rawPath, "/"), "/") {
		return p.pullSingleRecord(ctx, stripe, rawPath, operation)
	}

	// Whole-resource mode: `customers` or `customers.json`.
	resource, err := resolveWholeResource(rawPath)
	if err != nil {
		return "", nil, err
	}
	return p.pullResource(ctx, stripe, resource, p.pullLimit(operation), operation)
}

// resolveWholeResource maps a whole-resource pull path to a Resource.
// Accepts both the bare resource slug (`customers`) and the filename
// form (`customers.json`) because the latter is exactly what
// pullResource emits as output — so workflows that copy the output
// filename back in as a source path round-trip without surprise.
//
// Rejects non-pull-enabled resources with a specific error so the
// caller doesn't have to duplicate the check.
func resolveWholeResource(rawPath string) (stripeclient.Resource, error) {
	trimmed := strings.TrimPrefix(rawPath, "/")
	resourceName := strings.TrimSuffix(trimmed, ".json")
	resource, err := stripeclient.FindResource(resourceName)
	if err != nil {
		return stripeclient.Resource{}, err
	}
	if !resource.Pull {
		return stripeclient.Resource{}, fmt.Errorf(
			"resource %q is not pull-enabled", resource.Name,
		)
	}
	return resource, nil
}

// pullLimit returns the max records to fetch per resource. Reads
// `max_records_per_resource` from the Connection's settings and falls
// back to 0 (unbounded, for backward compat with small accounts).
// Callers pass this to stripe.ListAll which caps accordingly.
func (p *StripePullProvider) pullLimit(operation *db.Operation) int {
	if operation == nil {
		return 0
	}
	var settingsMap map[string]any
	if err := json.Unmarshal(operation.Settings, &settingsMap); err != nil {
		return 0
	}
	return parsePositiveInt(settingsMap["max_records_per_resource"])
}

// parsePositiveInt coerces a settings value (which arrives as a string
// through DynamicField, but may also come in as int / int64 / float64
// / json.Number depending on the decoder) to a positive int, or 0 if
// parsing fails or the value is non-positive.
//
// json.Number and int64 were originally missed — if any upstream
// layer ever uses json.Decoder.UseNumber() (to preserve integer
// precision), the cap would silently fall through to unbounded and
// defeat the OOM guard that `max_records_per_resource` exists to
// enforce.
func parsePositiveInt(raw any) int {
	switch v := raw.(type) {
	case int:
		if v > 0 {
			return v
		}
	case int64:
		if v > 0 {
			return int(v)
		}
	case float64:
		if v > 0 {
			return int(v)
		}
	case json.Number:
		if n, err := v.Int64(); err == nil && n > 0 {
			return int(n)
		}
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(v))
		if err == nil && n > 0 {
			return n
		}
	}
	return 0
}

// pullResource fetches up to maxRecords of a given resource type and
// returns the JSON-array blob. A maxRecords <= 0 means unbounded.
// Called from both GetAllFiles and GetFileByPath.
func (p *StripePullProvider) pullResource(
	ctx context.Context,
	stripe *stripeclient.Client,
	resource stripeclient.Resource,
	maxRecords int,
	operation *db.Operation,
) (string, []byte, error) {
	records, truncated, err := stripe.ListBounded(ctx, resource.Path, nil, maxRecords)
	if err != nil {
		p.logPullError(operation, resource.Name, err)
		return "", nil, fmt.Errorf("stripe: pull %s: %w", resource.Name, err)
	}
	blob := marshalJSONArray(records)
	if truncated {
		p.logPullTruncated(operation, resource.Name, len(records), maxRecords /* limit */)
	} else {
		p.logPullSuccess(operation, resource.Name, len(records))
	}
	return resource.Name + ".json", blob, nil
}

// pullSingleRecord issues `GET /v1/<resource>/<id>` and writes the
// result to a `<resource>/<id>.json` file — the same path shape push
// and patch expect, so pulling a single record round-trips cleanly.
func (p *StripePullProvider) pullSingleRecord(
	ctx context.Context,
	stripe *stripeclient.Client,
	rawPath string,
	operation *db.Operation,
) (string, []byte, error) {
	// ParsePath rejects paths that lack `.json`; synthesize one so the
	// user can pass the more natural `customers/cus_abc` form here.
	canonical := rawPath
	if !strings.HasSuffix(canonical, ".json") {
		canonical += ".json"
	}
	parsed, err := stripeclient.ParsePath(canonical)
	if err != nil {
		return "", nil, err
	}
	if parsed.ID == "" {
		return "", nil, errors.New("stripe: single-record pull requires a resource id")
	}

	record, err := stripe.GetByID(ctx, parsed.Resource.Path, parsed.ID)
	if err != nil {
		p.logPullError(operation, parsed.Resource.Name, err)
		return "", nil, err
	}

	return parsed.Resource.Name + "/" + parsed.ID + ".json", []byte(record), nil
}

// marshalJSONArray collapses a slice of raw records into a compact
// JSON array. We avoid re-parsing individual records — they're
// already valid JSON objects from Stripe — so the output is a faithful
// passthrough of Stripe's shape.
func marshalJSONArray(records []json.RawMessage) []byte {
	if len(records) == 0 {
		return []byte("[]")
	}
	var buf bytes.Buffer
	buf.WriteByte('[')
	for i, r := range records {
		if i > 0 {
			buf.WriteByte(',')
		}
		buf.Write(r)
	}
	buf.WriteByte(']')
	return buf.Bytes()
}

func (p *StripePullProvider) logPullError(operation *db.Operation, resource string, err error) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeError,
		"Stripe pull failed",
		map[string]any{"resource": resource, "error": err.Error()},
	)
}

func (p *StripePullProvider) logPullSuccess(operation *db.Operation, resource string, count int) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe pull succeeded",
		map[string]any{"resource": resource, "record_count": count},
	)
}

// logPullTruncated is a distinct log event so operators can see when a
// pull hit its configured cap (vs. genuinely pulled everything).
// Matters for observability: a "succeeded with N records" when the
// account has N+M records is a silently-incomplete snapshot without
// this signal.
func (p *StripePullProvider) logPullTruncated(
	operation *db.Operation, resource string, count, limit int,
) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(
		p.dbInstance, p.logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe pull truncated at max_records_per_resource cap",
		map[string]any{
			"resource":     resource,
			"record_count": count,
			"cap":          limit,
		},
	)
}

// OperationPull godoc
// @Summary Pull data from Stripe
// @Description Pull Stripe resources (customers, charges, subscriptions, invoices, payouts) as JSON files. If path is empty, every pull-enabled resource is returned. Response is a ZIP archive of the resulting files.
// @Tags stripe
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce application/zip
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string false "Optional resource name (e.g., 'customers') or `resource/id` for single-record pull"
// @Success 200 {file} binary "ZIP archive of pulled JSON files (one per resource)"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 409 {object} fiber.Map "Operation already running"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &StripePullProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB)
}
