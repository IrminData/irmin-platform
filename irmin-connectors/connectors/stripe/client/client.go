// Package client is the thin Stripe HTTP client the Stripe connector
// uses for every outbound call. A bespoke client (rather than the
// official github.com/stripe/stripe-go SDK) keeps the dependency
// surface small and lets us do exactly what we need: header pinning
// (Stripe-Version), cursor pagination, deterministic idempotency keys,
// and a narrow set of resource endpoints.
//
// Every write stamps an Idempotency-Key derived from the body — Stripe
// dedupes within a 24-hour window, which matches the re-run guarantees
// Irmin wants for workflows.
//
// Request bodies use Stripe's form-encoded flavor (RFC 3986 +
// bracketed nesting) rather than JSON, because that's what Stripe's v1
// API expects. Pull uses JSON responses; write endpoints return JSON
// too.
package client

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// DefaultBaseURL is the Stripe REST API root. Overridable via
// NewClient options so tests can point at an httptest.Server.
const DefaultBaseURL = "https://api.stripe.com"

// ListPageSize is the per-request page size Irmin asks Stripe for on
// list endpoints. Stripe's documented max is 100; we take the max to
// minimize round-trips on large accounts.
const ListPageSize = 100

// maxPreallocHint caps the pre-allocation size of the records slice
// in ListBounded. A user-supplied cap of, say, 1 000 000 would cause
// make([]json.RawMessage, 0, N) to allocate ~24 MB of slice headers
// up front — and a typo'd "99999999999" would OOM the process
// immediately, defeating the whole point of the cap. Above this
// ceiling we let Go grow the slice organically; the log-N reallocation
// cost is negligible compared to the Stripe round-trip cost.
const maxPreallocHint = 10_000

// scopeSeparator splits the content bytes from the scope string in
// ScopeIdempotency. A NUL byte is unambiguous: it can't appear inside
// the scope (which is always an ASCII path + id) or a well-formed
// JSON body, so `content || \x00 || scope` is prefix-free.
const scopeSeparator byte = 0x00

// defaultRequestTimeout is the per-request timeout applied to every
// outbound call when the caller's ctx has no deadline of its own.
const defaultRequestTimeout = 2 * time.Minute

// maxRateLimitRetries caps how many times a single do() call will
// retry after a 429. Stripe's default quota is 100 req/s; a 429 here
// is almost always transient congestion, so 5 retries with
// exponential backoff is enough for any realistic case without
// hanging the workflow.
const maxRateLimitRetries = 5

// defaultRetryAfter is the initial backoff when Stripe returns 429
// without a Retry-After header. Doubles per retry, capped at
// maxRetryAfter.
const defaultRetryAfter = 500 * time.Millisecond

// maxRetryAfter caps the backoff so a misbehaving header (or 5
// consecutive 429s) can't block a workflow for minutes.
const maxRetryAfter = 30 * time.Second

// APIError is the Stripe error envelope (`{"error": {...}}`).
// We surface the fields verbatim so callers can pass them through to
// operation logs — users expect to see Stripe's original message.
type APIError struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Param   string `json:"param"`
	// HTTPStatus is populated by the client, not Stripe.
	HTTPStatus int `json:"http_status"`
}

// Error satisfies the `error` interface. Format keeps the Stripe type
// + code prefix so log lines are greppable.
func (e *APIError) Error() string {
	switch {
	case e.Code != "" && e.Message != "":
		return fmt.Sprintf("stripe: %s/%s: %s", e.Type, e.Code, e.Message)
	case e.Message != "":
		return fmt.Sprintf("stripe: %s: %s", e.Type, e.Message)
	default:
		return fmt.Sprintf("stripe: HTTP %d", e.HTTPStatus)
	}
}

// Client is the Stripe HTTP client. One instance per operation is fine
// — no internal caching, just configured transport + headers.
type Client struct {
	apiKey     string
	apiVersion string
	baseURL    string
	httpClient *http.Client
	// progressHandler is the optional observability hook for the
	// pagination loop and the 429-retry loop. Without it, a long pull
	// emits zero events between operation/init and operation/pull's
	// final result, which leaves operators debugging a 10-minute hang
	// with no signal. Callers (the pull controller) wire this up to
	// the operation-log stream.
	progressHandler ProgressHandler
}

// ProgressEvent is a single observability event emitted from the
// Stripe client during long-running operations. The pull path uses
// this to surface per-page progress + rate-limit waits into the
// workflow's log stream so an apparently-stuck run is actually
// diagnosable.
type ProgressEvent struct {
	// Kind discriminates the event. One of ProgressKindPage or
	// ProgressKindRateLimit (more may be added later).
	Kind string
	// ResourcePath is the endpoint the event applies to
	// (e.g., "/v1/customers"). Always set.
	ResourcePath string
	// Page is 1-based page number within the current pagination loop.
	// Only meaningful for ProgressKindPage.
	Page int
	// RecordsSoFar is the cumulative record count accumulated by this
	// call to ListBounded. Only meaningful for ProgressKindPage.
	RecordsSoFar int
	// Cursor is the `starting_after` cursor that produced this page,
	// or "" for the first page. Useful for resume / diagnostics.
	// Only meaningful for ProgressKindPage.
	Cursor string
	// Attempt is the 0-based retry attempt. Only meaningful for
	// ProgressKindRateLimit.
	Attempt int
	// Wait is how long the client is about to sleep before retrying.
	// Only meaningful for ProgressKindRateLimit.
	Wait time.Duration
}

// ProgressKind* enumerate the event types emitted via ProgressHandler.
const (
	// ProgressKindPage fires after each successful list-page response.
	ProgressKindPage = "page"
	// ProgressKindRateLimit fires when the client is about to sleep
	// before retrying a 429. Without this event, rate-limit storms
	// look like a silent hang.
	ProgressKindRateLimit = "rate_limit"
)

// ProgressHandler receives observability events from long-running
// operations. Called synchronously from inside the pagination /
// retry loops — implementations must return quickly. nil-safe:
// callers that don't need progress events simply don't set one.
type ProgressHandler func(ProgressEvent)

// Option configures the Client at construction time.
type Option func(*Client)

// WithBaseURL overrides the API base URL. Tests pass an httptest
// server URL here; production callers use the default.
func WithBaseURL(baseURL string) Option {
	return func(c *Client) {
		c.baseURL = strings.TrimRight(baseURL, "/")
	}
}

// WithHTTPClient overrides the underlying http.Client. Tests set a
// custom transport here to assert on outbound headers.
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) {
		c.httpClient = hc
	}
}

// WithProgressHandler installs an observability hook for pagination
// + retry loops. Pass nil to disable (same as the default).
func WithProgressHandler(h ProgressHandler) Option {
	return func(c *Client) {
		c.progressHandler = h
	}
}

// NewClient constructs a Stripe HTTP client. apiKey must be a secret
// or restricted key (caller validated via stripemodels.ConnectionDetails);
// apiVersion is the pinned Stripe-Version.
func NewClient(apiKey, apiVersion string, opts ...Option) *Client {
	c := &Client{
		apiKey:     apiKey,
		apiVersion: apiVersion,
		baseURL:    DefaultBaseURL,
		httpClient: &http.Client{Timeout: defaultRequestTimeout},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// ListPage is a single page of a list response. `HasMore` drives the
// outer pagination loop; `NextCursor` is the last element's id, which
// Stripe expects as the `starting_after` param on the next call.
type ListPage struct {
	Data       []json.RawMessage
	HasMore    bool
	NextCursor string
}

// listEnvelope mirrors Stripe's list response shape.
type listEnvelope struct {
	Data    []json.RawMessage `json:"data"`
	HasMore bool              `json:"has_more"`
}

// List fetches a single page of a list endpoint. Higher-level helpers
// (e.g., ListAll) loop over this until HasMore is false. The `extra`
// map lets callers pass resource-specific filters — the standard
// `limit` and `starting_after` are stamped automatically.
func (c *Client) List(
	ctx context.Context,
	resourcePath string,
	startingAfter string,
	extra url.Values,
) (*ListPage, error) {
	q := url.Values{}
	for k, v := range extra {
		q[k] = v
	}
	q.Set("limit", strconv.Itoa(ListPageSize))
	if startingAfter != "" {
		q.Set("starting_after", startingAfter)
	}

	req, err := c.newRequest(ctx, http.MethodGet, resourcePath, q, nil, "")
	if err != nil {
		return nil, err
	}

	body, err := c.do(req)
	if err != nil {
		return nil, err
	}

	var env listEnvelope
	if err = json.Unmarshal(body, &env); err != nil {
		return nil, fmt.Errorf("stripe: failed to decode list response: %w", err)
	}

	page := &ListPage{
		Data:    env.Data,
		HasMore: env.HasMore,
	}
	// Stripe's cursor is the id of the last element on the page. We
	// extract it lazily rather than requiring every resource struct to
	// be typed; a `{"id": "..."}` shape works for every list endpoint.
	//
	// A malformed last-record (no id, JSON decode error) returns an
	// error rather than silently terminating pagination with
	// truncated-but-reported-complete results. An earlier revision
	// swallowed the error and returned NextCursor="", which made a
	// corrupt Stripe record invisibly cap pulls at whatever page the
	// bad record landed on.
	if env.HasMore && len(env.Data) > 0 {
		id, idErr := ExtractID(env.Data[len(env.Data)-1])
		if idErr != nil {
			return nil, fmt.Errorf(
				"stripe: cannot continue pagination at %s: %w",
				resourcePath, idErr,
			)
		}
		page.NextCursor = id
	}

	return page, nil
}

// ListAll pages through the entire list and returns every record. Use
// for small-to-medium resource sets; very large accounts should use
// ListBounded with a cap to avoid loading everything in memory.
func (c *Client) ListAll(
	ctx context.Context,
	resourcePath string,
	extra url.Values,
) ([]json.RawMessage, error) {
	records, _, err := c.ListBounded(ctx, resourcePath, extra, 0 /* unbounded */)
	return records, err
}

// ListBounded pages through the list but stops once `maxRecords`
// records have been collected. A maxRecords <= 0 means unbounded.
// The second return value is true when the cap truncated the result
// (the source actually had more records than returned).
//
// Irmin's pull path uses this so a merchant with millions of Stripe
// records can cap per-resource memory via the `max_records_per_resource`
// setting instead of OOM'ing the connector.
func (c *Client) ListBounded(
	ctx context.Context,
	resourcePath string,
	extra url.Values,
	maxRecords int,
) ([]json.RawMessage, bool, error) {
	all := make([]json.RawMessage, 0, preallocHint(maxRecords))
	cursor := ""
	pageNum := 0
	for {
		pageNum++
		page, err := c.List(ctx, resourcePath, cursor, extra)
		if err != nil {
			return nil, false, err
		}
		for _, rec := range page.Data {
			if maxRecords > 0 && len(all) >= maxRecords {
				// Source had more but we hit the cap mid-page.
				c.emitPageProgress(resourcePath, pageNum, len(all), cursor)
				return all, true, nil
			}
			all = append(all, rec)
		}
		// Emit page progress every iteration. Critical for
		// observability: without this, a 30-page pull silently
		// consumes several minutes between operation/init and
		// operation/pull's final response, and operators debugging a
		// hung run have no signal to work with.
		c.emitPageProgress(resourcePath, pageNum, len(all), cursor)
		if !page.HasMore || page.NextCursor == "" {
			return all, false, nil
		}
		// Cap reached exactly at a page boundary — still truncated
		// from the caller's perspective because HasMore is true.
		if maxRecords > 0 && len(all) >= maxRecords {
			return all, true, nil
		}
		cursor = page.NextCursor
	}
}

// emitPageProgress invokes the configured progress handler with a
// page event. No-op when no handler is set.
func (c *Client) emitPageProgress(resourcePath string, page, records int, cursor string) {
	if c.progressHandler == nil {
		return
	}
	c.progressHandler(ProgressEvent{
		Kind:         ProgressKindPage,
		ResourcePath: resourcePath,
		Page:         page,
		RecordsSoFar: records,
		Cursor:       cursor,
	})
}

// emitRateLimitProgress invokes the configured progress handler with
// a rate-limit event. No-op when no handler is set.
func (c *Client) emitRateLimitProgress(resourcePath string, attempt int, wait time.Duration) {
	if c.progressHandler == nil {
		return
	}
	c.progressHandler(ProgressEvent{
		Kind:         ProgressKindRateLimit,
		ResourcePath: resourcePath,
		Attempt:      attempt,
		Wait:         wait,
	})
}

// ErrEmptyForm is returned by Create and Update when the provided
// form has no entries. Sending an empty body to Stripe's Create
// Customer (etc.) endpoints silently creates a record with zero
// user-supplied fields — a "ghost" resource the caller almost
// certainly didn't intend. We reject this at the client boundary.
var ErrEmptyForm = errors.New(
	"stripe: refusing to send empty form — would create a ghost resource",
)

// Create posts a form-encoded body to the given resource path. Stripe
// assigns the resource id and returns the full record in the response
// body, which callers unmarshal into their resource type.
//
// The Idempotency-Key is composed from the form body (deterministic —
// url.Values.Encode sorts keys), a caller-supplied `scope` string,
// and the client's pinned Stripe-Version:
//
//	sha256(form.Encode() || 0x00 || scope || 0x00 || apiVersion)
//
// This means (a) whitespace / key-order changes in the source file
// don't change the key (callers pass file contents through
// JSONToForm which normalizes both), (b) two different source files
// can share content and still produce distinct keys via their
// `scope`, and (c) bumping Stripe-Version invalidates cached
// responses so users don't get the old version's response shape back.
func (c *Client) Create(
	ctx context.Context,
	resourcePath, scope string,
	form url.Values,
) (json.RawMessage, error) {
	if len(form) == 0 {
		return nil, ErrEmptyForm
	}
	body := form.Encode()
	req, err := c.newRequest(
		ctx,
		http.MethodPost,
		resourcePath,
		nil, /* query */
		strings.NewReader(body),
		c.idempotencyFor(body, scope),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	return c.do(req)
}

// Update posts a form-encoded body to an existing resource. Stripe
// uses POST (not PATCH/PUT) for partial updates — only the provided
// fields are changed.
//
// Idempotency key is scoped identically to Create; see that doc for
// the composition.
func (c *Client) Update(
	ctx context.Context,
	resourcePath, id, scope string,
	form url.Values,
) (json.RawMessage, error) {
	if len(form) == 0 {
		return nil, ErrEmptyForm
	}
	body := form.Encode()
	req, err := c.newRequest(
		ctx,
		http.MethodPost,
		resourcePath+"/"+url.PathEscape(id),
		nil, /* query */
		strings.NewReader(body),
		c.idempotencyFor(body, scope),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	return c.do(req)
}

// idempotencyFor composes the Idempotency-Key hash input from the
// form body, caller-supplied scope, and the pinned API version, then
// returns the sha256 hex digest. Centralized so tests can assert the
// exact shape and so Create/Update share the same policy.
func (c *Client) idempotencyFor(encodedBody, scope string) string {
	seed := make([]byte, 0, len(encodedBody)+2+len(scope)+len(c.apiVersion))
	seed = append(seed, encodedBody...)
	seed = append(seed, scopeSeparator)
	seed = append(seed, scope...)
	seed = append(seed, scopeSeparator)
	seed = append(seed, c.apiVersion...)
	return idempotencyKey(seed)
}

// GetByID fetches a single resource record at `/v1/<resource>/<id>`.
// Returns the raw record JSON — callers pass the body straight
// through to the branch.
func (c *Client) GetByID(
	ctx context.Context,
	resourcePath, id string,
) (json.RawMessage, error) {
	req, err := c.newRequest(
		ctx,
		http.MethodGet,
		resourcePath+"/"+url.PathEscape(id),
		nil, /* query */
		nil, /* body */
		"",  /* idempotency */
	)
	if err != nil {
		return nil, err
	}
	return c.do(req)
}

// Ping calls a lightweight endpoint that requires a valid API key.
// /v1/balance is accessible with every Stripe API key (including
// narrowly-scoped restricted keys that only have write access on a
// specific resource) — unlike /v1/charges?limit=1 which requires
// Read on Charges and falsely fails a write-only key at config-
// validation time. The endpoint is idempotent, has no side effects,
// and returns a small fixed response.
func (c *Client) Ping(ctx context.Context) error {
	req, err := c.newRequest(ctx, http.MethodGet, "/v1/balance", nil, nil, "")
	if err != nil {
		return err
	}
	_, err = c.do(req)
	return err
}

// newRequest builds the HTTP request with every Stripe-specific header
// stamped. A single chokepoint means tests only have to assert on one
// code path.
func (c *Client) newRequest(
	ctx context.Context,
	method, path string,
	query url.Values,
	body io.Reader,
	idempotency string,
) (*http.Request, error) {
	u := c.baseURL + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, u, body)
	if err != nil {
		return nil, fmt.Errorf("stripe: new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Stripe-Version", c.apiVersion)
	req.Header.Set("Accept", "application/json")
	if idempotency != "" {
		req.Header.Set("Idempotency-Key", idempotency)
	}
	return req, nil
}

// do executes the request and returns the response body. Non-2xx
// responses are parsed into APIError; 429 responses are retried with
// exponential backoff up to maxRateLimitRetries times, honoring the
// HTTP Retry-After header if present.
//
// The request body is preserved across retries via req.GetBody (set
// automatically by http.NewRequestWithContext when the body is a
// re-readable reader — which covers strings.NewReader, the only body
// type Create/Update pass in).
func (c *Client) do(req *http.Request) (json.RawMessage, error) {
	var lastErr error
	for attempt := 0; attempt <= maxRateLimitRetries; attempt++ {
		body, status, header, err := c.doOnce(req)
		if err != nil {
			return nil, err
		}
		if status != http.StatusTooManyRequests {
			return decodeResponse(status, body)
		}
		lastErr = parseErrorBody(status, body)
		if attempt == maxRateLimitRetries {
			break
		}
		wait := retryAfterDelay(header, body, attempt)
		// Rate-limit waits are otherwise silent. Surface them so a
		// 429 storm (up to ~3 minutes of cumulative backoff) is
		// visible in the workflow log instead of looking like a hang.
		c.emitRateLimitProgress(req.URL.Path, attempt, wait)
		select {
		case <-req.Context().Done():
			return nil, req.Context().Err()
		case <-time.After(wait):
		}
		if rewindErr := rewindBody(req); rewindErr != nil {
			// Preserve the underlying 429 context in the error chain
			// so operators debugging a stuck rate-limit loop see both
			// the rewind failure AND Stripe's rate-limit reason.
			return nil, fmt.Errorf("%w (after 429: %w)", rewindErr, lastErr)
		}
	}
	return nil, lastErr
}

// maxResponseBytes caps the HTTP response body size we'll read into
// memory. Stripe list responses with 100 records and pathological
// metadata can approach 50MB — higher would start stressing the
// runtime; lower would truncate legitimate payloads. Hitting the cap
// returns an APIError rather than succeeding with truncated data.
const maxResponseBytes = 50 * 1024 * 1024 // 50 MB

// doOnce issues a single HTTP request and returns (body, status,
// header, err). Separated from do() so the retry loop reads linearly.
// Returns the response header so the retry loop can read the
// `Retry-After` header per RFC 7231 when Stripe throttles.
func (c *Client) doOnce(req *http.Request) ([]byte, int, http.Header, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("stripe: HTTP call: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	// io.LimitReader caps the memory footprint so a misbehaving or
	// malicious upstream can't OOM the connector. Reading +1 byte
	// past the cap is a signal that the body was larger than the
	// limit — we surface that as a concrete error.
	limited := io.LimitReader(resp.Body, maxResponseBytes+1)
	body, readErr := io.ReadAll(limited)
	if readErr != nil {
		return nil, resp.StatusCode, resp.Header, fmt.Errorf("stripe: read response: %w", readErr)
	}
	if int64(len(body)) > maxResponseBytes {
		return nil, resp.StatusCode, resp.Header, fmt.Errorf(
			"stripe: response body exceeds %d-byte cap", maxResponseBytes,
		)
	}
	return body, resp.StatusCode, resp.Header, nil
}

// decodeResponse turns a completed response into the caller's view:
// body on 2xx, APIError on 4xx/5xx.
func decodeResponse(status int, body []byte) (json.RawMessage, error) {
	if status >= 200 && status < 300 {
		return body, nil
	}
	return nil, parseErrorBody(status, body)
}

// parseErrorBody maps a non-2xx body into an APIError. Tries Stripe's
// `{"error": {...}}` envelope first and falls back to a generic
// status error when the body isn't shaped like Stripe expects.
func parseErrorBody(status int, body []byte) *APIError {
	var env struct {
		Err APIError `json:"error"`
	}
	if jsonErr := json.Unmarshal(body, &env); jsonErr == nil && env.Err.Type != "" {
		env.Err.HTTPStatus = status
		return &env.Err
	}
	return &APIError{
		HTTPStatus: status,
		Message:    strings.TrimSpace(string(body)),
	}
}

// retryAfterDelay computes the backoff for the next 429 retry.
// Precedence matches RFC 7231 §7.1.3 + Stripe conventions:
//  1. HTTP `Retry-After` header — integer seconds OR HTTP-date format.
//     This is what Stripe actually sets on real-world 429s.
//  2. `retry_after_ms` in Stripe's JSON error envelope (rare, but
//     honored if present).
//  3. Exponential backoff from defaultRetryAfter, capped at
//     maxRetryAfter.
//
// The header read is the primary signal; earlier revisions only
// looked at the JSON field, which meant production 429s fell through
// to exponential backoff and ignored what Stripe told us to do.
func retryAfterDelay(header http.Header, body []byte, attempt int) time.Duration {
	if header != nil {
		if hdr := header.Get("Retry-After"); hdr != "" {
			if d, ok := parseRetryAfterHeader(hdr); ok {
				return clampRetryAfter(d)
			}
		}
	}

	// Stripe's error envelope is `{"error": {"retry_after_ms": N, ...}}` —
	// not a top-level field. Earlier revisions read from the top level
	// and silently fell through to exponential backoff for every real
	// Stripe 429. We keep the top-level fallback for defensive parsing
	// against proxied responses that might flatten the shape.
	type bodyEnvelope struct {
		Error struct {
			RetryAfterMs int `json:"retry_after_ms"`
		} `json:"error"`
		RetryAfterMs int `json:"retry_after_ms"`
	}
	var env bodyEnvelope
	if err := json.Unmarshal(body, &env); err == nil {
		if env.Error.RetryAfterMs > 0 {
			return clampRetryAfter(time.Duration(env.Error.RetryAfterMs) * time.Millisecond)
		}
		if env.RetryAfterMs > 0 {
			return clampRetryAfter(time.Duration(env.RetryAfterMs) * time.Millisecond)
		}
	}
	return clampRetryAfter(defaultRetryAfter << attempt)
}

// parseRetryAfterHeader handles both RFC 7231 Retry-After shapes:
// a bare integer (seconds) or an HTTP-date. Returns (duration, true)
// on success, (0, false) on malformed input so the caller falls
// through to the next precedence level.
func parseRetryAfterHeader(hdr string) (time.Duration, bool) {
	// Integer seconds first — the common case.
	if secs, err := strconv.Atoi(strings.TrimSpace(hdr)); err == nil && secs >= 0 {
		return time.Duration(secs) * time.Second, true
	}
	// HTTP-date per RFC 7231 §7.1.1.1 — the preferred format is
	// IMF-fixdate (RFC 1123); http.ParseTime accepts all three
	// supported encodings (RFC 1123, RFC 850, ANSI C).
	if t, err := http.ParseTime(hdr); err == nil {
		if d := time.Until(t); d > 0 {
			return d, true
		}
		// Past-dated Retry-After → retry immediately. Zero is valid.
		return 0, true
	}
	return 0, false
}

// clampRetryAfter bounds a retry duration so a misbehaving header
// value can't block the workflow for hours.
func clampRetryAfter(d time.Duration) time.Duration {
	if d < 0 {
		return 0
	}
	if d > maxRetryAfter {
		return maxRetryAfter
	}
	return d
}

// rewindBody resets req.Body so a retry sends the same payload. GET
// requests have no body; Create/Update bodies are strings.NewReader,
// which GetBody can re-emit. Returns an error if GetBody is missing —
// shouldn't happen for the bodies this client uses, but surfacing
// the error is safer than silently retrying with an empty body.
func rewindBody(req *http.Request) error {
	if req.Body == nil || req.Body == http.NoBody {
		return nil
	}
	if req.GetBody == nil {
		return errors.New("stripe: cannot retry request without GetBody")
	}
	fresh, err := req.GetBody()
	if err != nil {
		return fmt.Errorf("stripe: rewind body for retry: %w", err)
	}
	req.Body = fresh
	return nil
}

// preallocHint returns a safe pre-allocation size for the records
// slice in ListBounded. Clamped by maxPreallocHint so a user-supplied
// cap like "99999999999" doesn't OOM the process on the very first
// line of the function. Returns 0 when maxRecords is unset.
func preallocHint(maxRecords int) int {
	if maxRecords <= 0 {
		return 0
	}
	if maxRecords > maxPreallocHint {
		return maxPreallocHint
	}
	return maxRecords
}

// ExtractID plucks the `id` field out of a Stripe record. Returns
// the id and nil on success, "" and a descriptive error when the
// record can't be parsed or has no id — so pagination loops don't
// silently terminate on malformed data. Used by the
// pagination loop to build the `starting_after` cursor and by
// operation-log emitters to record the id Stripe assigned on create.
// Returns "" if the record is malformed (which also terminates the
// pagination loop safely).
func ExtractID(raw json.RawMessage) (string, error) {
	var peek struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(raw, &peek); err != nil {
		return "", fmt.Errorf("stripe: decode record id: %w", err)
	}
	if peek.ID == "" {
		return "", errors.New("stripe: record is missing required `id` field")
	}
	return peek.ID, nil
}

// idempotencyKey returns the sha256 hex digest of the given bytes,
// or the empty string when no source was provided (signaling "don't
// stamp the header"). Stripe allows up to 255 chars; sha256-hex is 64.
func idempotencyKey(source []byte) string {
	if len(source) == 0 {
		return ""
	}
	sum := sha256.Sum256(source)
	return hex.EncodeToString(sum[:])
}

// IsAuthError reports whether err is a Stripe 401/403 response. The
// config-validation path uses this to render a "bad API key" message
// distinct from generic failure.
func IsAuthError(err error) bool {
	var se *APIError
	if !errors.As(err, &se) {
		return false
	}
	return se.HTTPStatus == http.StatusUnauthorized ||
		se.HTTPStatus == http.StatusForbidden
}
