package linearcontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"irmin-connectors/connectors/common"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/db"
	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
)

// vendorRequestTimeout caps a single Linear HTTP request. Without
// this, a stalled or blackholed Linear endpoint (or a malicious
// `mcp_endpoint` override) would hang the worker goroutine
// indefinitely — the JobManager's heartbeat keeps the row alive, so
// the janitor never reclaims it as stuck. 60s is generous for an
// MCP tool call (Linear typically returns in <2s) and short enough
// that an outage doesn't pin a worker for hours.
const vendorRequestTimeout = 60 * time.Second

// newOAuthHTTPClient builds the base *http.Client every vendor-bound
// operation (pull / push / patch) uses. Only the timeout is set
// here — OAuth bearer + force-refresh are layered on inside
// lib.NewMCPSession.
func newOAuthHTTPClient() *http.Client {
	return &http.Client{Timeout: vendorRequestTimeout}
}

// LinearPullProvider implements common.PullOperationProvider. The
// connection ID is captured up-front in OperationPull (request
// goroutine) so the worker can construct an OAuth-wrapped HTTP
// client without a fiber.Ctx — see common/oauth_async.go for the
// rationale.
type LinearPullProvider struct {
	dbInstance   *db.Database
	logger       *slog.Logger
	tokenClient  *lib.OAuthTokenClient
	connectionID uint
	// ctx is the worker's job-scoped context, hydrated in
	// InitializeClient. Used by ProgressHandler so vendor-originated
	// progress events (when we wire them) fan into the job's
	// cumulative Progress slice via WithJobProgress, and so a
	// /operation/cancel signal stops further events. Mirrors the
	// Stripe pull provider.
	ctx context.Context
}

// ProgressHandler emits per-page events into the job's progress
// slice. Hydrated with the worker's ctx so cancel signals reach the
// fan-out and so events fired AFTER cancel/completion don't race the
// worker cleanup.
func (p *LinearPullProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandlerWithContext(p.ctx, p.dbInstance, p.logger, operation)
}

// InitializeClient opens the MCP session for this operation. The
// session's HTTP transport is wrapped with the OAuth round-tripper
// inside lib.NewMCPSession so every outbound MCP tool call carries a
// fresh Linear bearer token resolved from Core, with a once-on-401
// retry path that asks Core to rotate.
//
// The returned cleanup func closes the MCP session — the operation
// runner is responsible for invoking it; this is the same lifecycle
// shape sftp uses (Connect + Close on the same goroutine).
func (p *LinearPullProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	p.logger = logger
	p.ctx = ctx
	endpoint, endpointErr := resolveEndpointForOperation(operation)
	if endpointErr != nil {
		return nil, nil, func() {}, endpointErr
	}
	logCustomEndpointOverride(p.dbInstance, p.logger, operation, endpoint)
	client, cleanup, sessionErr := linearclient.OpenSession(
		ctx, endpoint, p.tokenClient, p.connectionID, newOAuthHTTPClient(), p.logger,
	)
	if sessionErr != nil {
		return nil, nil, func() {}, fmt.Errorf("linear: open MCP session: %w", sessionErr)
	}
	return client, nil, cleanup, nil
}

// resolveEndpointForOperation reads the Connection's `mcp_endpoint`
// setting and validates it against the allowlist. Centralised so
// pull / push / patch all reject out-of-allowlist hosts before any
// vendor I/O fires (and before the OAuth bearer leaves the process).
func resolveEndpointForOperation(operation *db.Operation) (string, error) {
	return linearclient.ResolveEndpoint(readSettingString(operation, "mcp_endpoint"))
}

// logCustomEndpointOverride emits a single audit-log event when a
// Connection sets a non-default endpoint. The setting is designed for
// self-hosted Linear or test fixtures, but it also means the OAuth
// bearer token gets sent to a user-supplied URL — worth surfacing on
// every operation start so audit-log readers see the deviation
// rather than discovering token exfiltration after the fact.
func logCustomEndpointOverride(
	dbInstance *db.Database, logger *slog.Logger, operation *db.Operation, endpoint string,
) {
	if endpoint == "" || endpoint == linearclient.DefaultMCPEndpoint {
		return
	}
	if operation == nil || dbInstance == nil || logger == nil {
		return
	}
	common.LogOperationEvent(
		dbInstance, logger, operation.ID,
		db.LogEventTypeWarning,
		"Linear connector using non-default mcp_endpoint — OAuth bearer token will be sent to this URL",
		map[string]any{
			"endpoint":         endpoint,
			"default_endpoint": linearclient.DefaultMCPEndpoint,
		},
	)
}

// GetAllFiles pulls every pull-enabled resource and returns one JSON
// array file per resource. Mirrors the Stripe shape so workflows
// that copy the same path pattern across connectors round-trip
// uniformly.
func (p *LinearPullProvider) GetAllFiles(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
) ([]string, [][]byte, error) {
	client, ok := clientAny.(*linearclient.Client)
	if !ok {
		return nil, nil, errors.New("linear: invalid client type for pull")
	}

	opts := pullOptionsFromOperation(operation)

	var paths []string
	var blobs [][]byte
	for _, resource := range linearclient.KnownResources() {
		if !resource.Pull {
			continue
		}
		path, blob, err := p.pullResource(ctx, client, resource, opts, operation)
		if err != nil {
			return nil, nil, err
		}
		paths = append(paths, path)
		blobs = append(blobs, blob)
	}
	if len(paths) == 0 {
		return nil, nil, errors.New("linear: no pullable resources configured")
	}
	return paths, blobs, nil
}

// GetFileByPath supports whole-resource pulls (`issues`,
// `issues.json`, etc.). Single-record fetches like
// `issues/IRM-42.json` are out of scope: doing them right requires a
// per-vendor identifier-to-UUID lookup that callers can satisfy by
// pulling the resource and filtering downstream.
func (p *LinearPullProvider) GetFileByPath(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
	rawPath string,
) (string, []byte, error) {
	if rawPath == "" {
		return "", nil, errors.New(
			"linear: GetFileByPath requires a non-empty path (use GetAllFiles for whole-workspace pulls)",
		)
	}
	parsed, err := linearclient.ParsePath(rawPath)
	if err != nil {
		return "", nil, err
	}
	if parsed.ID != "" || parsed.IsNew {
		return "", nil, fmt.Errorf(
			"linear: single-record pull for %q is not supported in this connector version; "+
				"pull the whole resource and filter downstream",
			rawPath,
		)
	}
	if !parsed.Resource.Pull {
		return "", nil, fmt.Errorf("linear: resource %q is not pull-enabled", parsed.Resource.Name)
	}

	client, ok := clientAny.(*linearclient.Client)
	if !ok {
		return "", nil, errors.New("linear: invalid client type for pull")
	}

	opts := pullOptionsFromOperation(operation)
	return p.pullResource(ctx, client, parsed.Resource, opts, operation)
}

// pullResource fetches one resource's full record set, marshals to a
// JSON array, and emits a per-resource log event so operators see
// progress without enabling debug logging.
//
// Memory note: this materialises the full record set in memory before
// marshalling. At defaultMaxRecordsPerResource (100k) with ~5KB per
// issue the peak heap is ~500MB during marshal. A streaming variant
// would require changing common.PullOperationProvider's GetAllFiles
// signature to accept an io.Writer per file (instead of returning
// [][]byte), which ripples through every connector — out of scope for
// the MCP refactor. Track as a follow-up: the right move is a
// page-streaming GetAllFilesTo(writer) variant that all connectors can
// opt into.
func (p *LinearPullProvider) pullResource(
	ctx context.Context,
	client *linearclient.Client,
	resource linearclient.Resource,
	opts linearclient.PullOptions,
	operation *db.Operation,
) (string, []byte, error) {
	nodes, truncated, err := client.ListBounded(ctx, resource, opts)
	if err != nil {
		p.logEvent(operation, db.LogEventTypeError,
			"Linear pull failed",
			map[string]any{"resource": resource.Name, "error": err.Error()},
		)
		return "", nil, fmt.Errorf("linear: pull %s: %w", resource.Name, err)
	}
	blob := common.MarshalJSONArray(nodes)
	if truncated {
		p.logEvent(operation, db.LogEventTypeInfo,
			"Linear pull truncated at max_records_per_resource cap",
			map[string]any{
				"resource":     resource.Name,
				"record_count": len(nodes),
				"cap":          opts.MaxRecords,
			},
		)
	} else {
		p.logEvent(operation, db.LogEventTypeInfo,
			"Linear pull succeeded",
			map[string]any{"resource": resource.Name, "record_count": len(nodes)},
		)
	}
	return resource.Name + ".json", blob, nil
}

// logEvent is the no-op-safe wrapper around common.LogOperationEvent.
// Each guard mirrors the Stripe convention so progress-coverage
// tests can run on a bare provider without panicking.
func (p *LinearPullProvider) logEvent(
	operation *db.Operation, evt db.LogEventType, msg string, payload map[string]any,
) {
	if operation == nil || p.dbInstance == nil || p.logger == nil {
		return
	}
	common.LogOperationEvent(p.dbInstance, p.logger, operation.ID, evt, msg, payload)
}

// defaultMaxRecordsPerResource bounds an empty / unset
// `max_records_per_resource` setting at 100k records per resource.
// Without this, a default-configured Connection on a workspace with
// hundreds of thousands of issues would buffer every record into a
// single []json.RawMessage and OOM the worker before writing the zip.
// 100k is generous (Linear's default page size is 50, so 2k requests)
// but high enough that small/medium workspaces never hit the cap.
// Users who need the full snapshot can set the value explicitly.
const defaultMaxRecordsPerResource = 100_000

// pullOptionsFromOperation extracts the per-Connection pull options
// from the Operation's stored settings. Reads `team_key` and
// `max_records_per_resource`. Empty / invalid `max_records_per_resource`
// falls through to defaultMaxRecordsPerResource — explicit-zero is
// not treated as "unbounded" because the cost of an unbounded default
// (worker OOM on large workspaces) outweighs the convenience.
func pullOptionsFromOperation(operation *db.Operation) linearclient.PullOptions {
	maxRecords := common.ParsePositiveInt(readSettingValue(operation, "max_records_per_resource"))
	if maxRecords == 0 {
		maxRecords = defaultMaxRecordsPerResource
	}
	return linearclient.PullOptions{
		TeamKey:    readSettingString(operation, "team_key"),
		MaxRecords: maxRecords,
	}
}

// readSettingString returns the string value of a settings key.
func readSettingString(operation *db.Operation, key string) string {
	v := readSettingValue(operation, key)
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}

// readSettingValue returns the raw value of a settings key.
// Settings is stored as datatypes.JSON; we unmarshal once per call.
// Operation is a small object so the cost is negligible compared to
// the worker's vendor I/O.
func readSettingValue(operation *db.Operation, key string) any {
	if operation == nil {
		return nil
	}
	var settings map[string]any
	if err := json.Unmarshal(operation.Settings, &settings); err != nil {
		return nil
	}
	return settings[key]
}

// OperationPull godoc
// @Summary Pull data from Linear
// @Description Pulls Linear issues, projects, cycles, and teams as JSON files. The connection ID is captured from the request before the async worker starts so the worker can resolve OAuth tokens without a fiber.Ctx. If `path` is empty, every pull-enabled resource is returned; a `<resource>` or `<resource>.json` path narrows the pull to a single resource. Single-record paths are not yet supported.
// @Tags linear
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce application/zip
// @Param path formData string false "Optional resource name (e.g., 'issues')"
// @Success 200 {file} binary "ZIP archive of pulled JSON files"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 409 {object} fiber.Map "Operation already running"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	connectionID, err := lib.ConnectionIDFromRequestHeader(func(k string) string { return c.Get(k) })
	if err != nil {
		return cs.WriteResolveError(c, err)
	}
	provider := &LinearPullProvider{
		dbInstance:   cs.DB,
		logger:       cs.Logger,
		tokenClient:  cs.OAuthConnector.TokenClient,
		connectionID: connectionID,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB, cs.App)
}
