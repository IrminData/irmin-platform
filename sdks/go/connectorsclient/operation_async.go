package connectorsclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// OperationJob is a handle to an async operation the caller started
// via Client.StartOperation{Pull,Push,Patch}. It encapsulates the
// job_id and the per-job operation token the server mints on the 202
// response. Every lifecycle method (Status, Result, Cancel, Wait) uses
// the operation token for authentication — the Client's broader
// system token is never sent to job-scoped routes.
//
// This mirrors the wire-contract security property: the system token
// authorises starting an operation, the operation token authorises
// everything else about that one operation. A compromised system
// token cannot poll or cancel in-flight jobs it did not start; a
// compromised operation token can only affect the one job it was
// minted for.
//
// OperationJob is created by the Start* methods — do not construct
// instances directly. A handle is tied to the Client that started it;
// the Client's HTTP transport and connection-ID header are reused on
// every lifecycle call.
type OperationJob struct {
	// JobID is the server-assigned opaque identifier for this
	// operation. Safe to log.
	JobID string

	// operationToken is the per-job bearer credential. Unexported so
	// callers cannot bypass the handle; the SDK is the only code path
	// that sends it on the wire.
	operationToken string

	// client is the parent Client whose transport, BaseURL, Locale,
	// and ConnectionID are reused on every lifecycle call.
	client *Client
}

// StartOperationPullRequest holds the payload for POST /operation/pull
// under the async protocol. It intentionally uses the same
// x-www-form-urlencoded surface as the pre-async handler so the
// server-side route signature does not churn; only the response
// shape changes (202 + {job_id, operation_token} instead of a streamed
// zip body).
type StartOperationPullRequest struct {
	// Path is the connector-specific resource path being pulled
	// (e.g., "/v1/customers" for Stripe, a table identifier for
	// Postgres). Required.
	Path string

	// Details carries the connection's external-system credentials
	// (host / port / API key / TLS cert / etc.) — the same map
	// shape the pre-async /operation/init handshake used to ship
	// once and the connector cached on its Operation row.
	//
	// After Phase 4, /operation/init is gone; every Start* request
	// carries the credentials inline so the connector service can
	// upsert its Operation row on the fly. The wire shape is
	// `details[<key>]=<value>` form fields, matching what
	// /operation/init expected so the server-side parser does not
	// have to change.
	//
	// For OAuth-backed connectors, this map is typically empty —
	// the connector reaches into Core via the SystemOAuthAccessToken
	// route on every vendor call.
	Details map[string]string

	// Settings carries workspace-level scoping choices (which
	// project / schema / folder to pull from). Same wire shape as
	// Details: `settings[<key>]=<value>` form fields.
	Settings map[string]string

	// Extra carries any additional form fields the specific
	// connector accepts on its pull endpoint (cursor, filters,
	// batch hints). Use for connector-specific parameters — the
	// shared SDK types cannot enumerate every connector's knobs.
	Extra map[string]string
}

// StartOperationPushRequest holds the payload for POST /operation/push
// under the async protocol. The body is multipart/form-data — the
// server expects either `file` (a zip of resource files) or
// `presigned_url` (a URL it can fetch the zip from), plus an optional
// `path` form field for connector-specific targeting.
//
// Exactly one of File, FilePath, or PresignedURL must be set. Extra
// carries any additional form fields the specific connector accepts
// on its push endpoint.
type StartOperationPushRequest struct {
	// Path is the connector-specific target (table name, bucket
	// prefix, HTTP URL override, etc.). Optional.
	Path string
	// PresignedURL lets the connector service fetch the zip directly
	// from S3 so Core does not have to stream large payloads through
	// itself. When set, File and FilePath are ignored.
	PresignedURL string
	// File is an in-memory zip. Used when PresignedURL is empty.
	File []byte
	// FileName is the multipart part filename when File is set.
	// Defaults to "push.zip".
	FileName string
	// FilePath points at a zip on disk. Used when both PresignedURL
	// and File are empty.
	FilePath string

	// Details / Settings carry the connection's credentials and
	// workspace-level scoping. See StartOperationPullRequest for the
	// long-form rationale — the same shape applies here.
	Details  map[string]string
	Settings map[string]string

	// Extra carries additional form fields (connector-specific).
	Extra map[string]string
}

// StartOperationPatchRequest holds the payload for POST /operation/patch
// under the async protocol. The body is multipart/form-data with a
// required `patches` file carrying the JSON Patch operations.
//
// Patches may be supplied inline via Patches (the SDK marshals them)
// or as raw JSON bytes via PatchesJSON (caller-marshalled, preserves
// key ordering when that matters).
type StartOperationPatchRequest struct {
	// Patches is the slice of JSON Patch ops to apply. When non-empty
	// the SDK marshals it into the `patches` multipart field.
	Patches []irminmodels.PatchOperation
	// PatchesJSON is the raw JSON bytes of the operations array. Used
	// when Patches is nil — the caller owns marshalling.
	PatchesJSON []byte
	// FileName is the multipart part filename for the patches field.
	// Defaults to "patches.json".
	FileName string

	// Details / Settings carry the connection's credentials and
	// workspace-level scoping. See StartOperationPullRequest for the
	// long-form rationale.
	Details  map[string]string
	Settings map[string]string

	// Extra carries additional form fields (connector-specific).
	Extra map[string]string
}

// StartOperationPull initiates an asynchronous pull against a
// connector. The Client's system token authorises the start; the
// returned OperationJob carries the per-job operation token used on
// subsequent lifecycle calls.
//
// Semantics by response status:
//
//   - 202 Accepted — job queued; returns the handle.
//   - 200 OK — the connector service is on the pre-async protocol.
//     Returns ErrLegacySyncPullResponse without draining the body
//     (which could be a multi-gigabyte zip).
//   - 409 Conflict — an operation is already running for this
//     connection. Returns *AlreadyRunningError carrying the blocking
//     job_id when the server emits a structured body, *APIError
//     otherwise.
//   - Any other non-2xx — *APIError.
func (c *Client) StartOperationPull(
	ctx context.Context,
	req StartOperationPullRequest,
) (*OperationJob, error) {
	body, headers := encodeStartPullForm(req)
	return c.startOperation(ctx, "/operation/pull", http.MethodPost, body, headers)
}

// StartOperationPush initiates an asynchronous push. See
// StartOperationPull for the response-status semantics.
func (c *Client) StartOperationPush(
	ctx context.Context,
	req StartOperationPushRequest,
) (*OperationJob, error) {
	opts, err := buildPushRequestOptions(req)
	if err != nil {
		return nil, err
	}
	return c.startOperationFromOpts(ctx, "/operation/push", opts)
}

// StartOperationPatch initiates an asynchronous patch. See
// StartOperationPull for the response-status semantics.
func (c *Client) StartOperationPatch(
	ctx context.Context,
	req StartOperationPatchRequest,
) (*OperationJob, error) {
	opts, err := buildPatchRequestOptions(req)
	if err != nil {
		return nil, err
	}
	return c.startOperationFromOpts(ctx, "/operation/patch", opts)
}

// startOperationFromOpts is the variant of startOperation that builds
// the request body + headers via prepareBodyAndHeaders (multipart /
// form-urlencoded switched on opts.ContentType). Pull uses the
// direct body path because its form encoding is trivial; push and
// patch need the multipart plumbing.
func (c *Client) startOperationFromOpts(
	ctx context.Context,
	endpoint string,
	opts RequestOptions,
) (*OperationJob, error) {
	bodyReader, headers, err := c.prepareBodyAndHeaders(opts)
	if err != nil {
		return nil, err
	}
	return c.startOperation(ctx, endpoint, opts.Method, bodyReader, headers)
}

// startOperation is the shared request driver for
// Start{Pull,Push,Patch}. Handles the 202/200-legacy/409/other-non-2xx
// branching, decodes the StartOperationJobResponse, and returns a
// constructed OperationJob handle.
func (c *Client) startOperation(
	ctx context.Context,
	endpoint string,
	method string,
	body io.Reader,
	headers map[string]string,
) (*OperationJob, error) {
	fullURL := c.BaseURL + endpoint

	httpReq, err := http.NewRequestWithContext(ctx, method, fullURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to build start-operation request: %w", err)
	}
	// Caller headers first, defaults LAST so a caller-supplied
	// opts.Headers cannot silently overwrite Authorization or
	// X-Irmin-Connection-Id on the start-operation call. See
	// applyDefaultHeaders for the contract.
	for k, v := range headers {
		httpReq.Header.Set(k, v)
	}
	c.applyDefaultHeaders(httpReq, "application/json")

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("start-operation request to %s failed: %w", httpReq.URL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	// Legacy sync server — the connectors service returned a 200
	// with a body (zip for pull, success JSON for push/patch) instead
	// of the expected 202 Accepted. Don't drain the body, it could be
	// a multi-gigabyte zip on the pull path.
	if resp.StatusCode == http.StatusOK {
		return nil, ErrLegacySyncResponse
	}

	if resp.StatusCode == http.StatusConflict {
		bodyBytes := readBoundedBody(resp)
		if alreadyErr := readAlreadyRunningError(bodyBytes); alreadyErr != nil {
			return nil, alreadyErr
		}
		return nil, apiErrorFromBytes(resp.StatusCode, bodyBytes)
	}

	if resp.StatusCode != http.StatusAccepted {
		return nil, readAPIError(resp)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read start-operation response body: %w", err)
	}

	var out irminmodels.StartOperationJobResponse
	if unmarshalErr := json.Unmarshal(bodyBytes, &out); unmarshalErr != nil {
		return nil, fmt.Errorf("failed to unmarshal start-operation response: %w", unmarshalErr)
	}
	if out.JobID == "" {
		return nil, errors.New(
			"connector accepted the operation (HTTP 202) but did not return a job_id",
		)
	}
	if out.OperationToken == "" {
		// Server is on a pre-Phase-4 build that accepts the async
		// protocol but has not yet started minting per-job operation
		// tokens. Without a token the handle cannot authenticate the
		// lifecycle routes — surface a typed error so the caller can
		// distinguish this from other misbehaviours.
		return nil, ErrMissingOperationToken
	}

	return &OperationJob{
		JobID:          out.JobID,
		operationToken: out.OperationToken,
		client:         c,
	}, nil
}

// Status returns the current status snapshot for the job. Safe to
// call repeatedly; progress events are cumulative.
func (j *OperationJob) Status(ctx context.Context) (*irminmodels.OperationJobStatusResponse, error) {
	if j == nil {
		return nil, errors.New("nil OperationJob handle")
	}

	endpoint := fmt.Sprintf("%s/operation/status/%s", j.client.BaseURL, url.PathEscape(j.JobID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build status request: %w", err)
	}
	j.client.applyHeadersForToken(httpReq, j.operationToken, "application/json")

	resp, err := j.client.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("status request to %s failed: %w", httpReq.URL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, readJobNonSuccess(resp)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read status response body: %w", err)
	}

	var out irminmodels.OperationJobStatusResponse
	if unmarshalErr := json.Unmarshal(bodyBytes, &out); unmarshalErr != nil {
		return nil, fmt.Errorf("failed to unmarshal status response: %w", unmarshalErr)
	}
	return &out, nil
}

// Result streams the result archive for a completed job.
//
// Semantics by response status:
//
//   - 200 OK — returns the body reader; caller owns Close.
//   - 204 No Content — terminal job with no artifact (push/patch
//     style). Returns ErrNoResultArtifact; check via errors.Is.
//   - 409 Conflict — job is still running. Returns ErrResultNotReady;
//     caller should resume polling Status.
//   - Any other non-2xx — *APIError or *JobServerError depending on
//     whether the body carries a structured JobErrorBody.
func (j *OperationJob) Result(ctx context.Context) (io.ReadCloser, error) {
	if j == nil {
		return nil, errors.New("nil OperationJob handle")
	}

	endpoint := fmt.Sprintf("%s/operation/result/%s", j.client.BaseURL, url.PathEscape(j.JobID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build result request: %w", err)
	}
	j.client.applyHeadersForToken(httpReq, j.operationToken, "application/zip")

	resp, err := j.client.streamClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("result request to %s failed: %w", httpReq.URL, err)
	}

	if resp.StatusCode == http.StatusConflict {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, errorBodyReadLimit))
		_ = resp.Body.Close()
		return nil, ErrResultNotReady
	}

	// 204 is the structured "complete but no artifact" signal for
	// push/patch/subscribe jobs. Drain (there should be no body) and
	// surface the sentinel so callers that only care about status
	// reach a clean success branch.
	if resp.StatusCode == http.StatusNoContent {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, errorBodyReadLimit))
		_ = resp.Body.Close()
		return nil, ErrNoResultArtifact
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		apiErr := readJobNonSuccess(resp)
		_ = resp.Body.Close()
		return nil, apiErr
	}

	return resp.Body, nil
}

// Cancel requests that the connector service cancel this job. Safe to
// call on terminal jobs (server treats it as a no-op). Returns nil on
// any 2xx; the richer response shape (status, was_active) is
// available via CancelDetail.
func (j *OperationJob) Cancel(ctx context.Context) error {
	_, err := j.CancelDetail(ctx)
	return err
}

// CancelDetail is the richer form of Cancel that returns the parsed
// CancelOperationJobResponse on success so callers can tell "we
// actually signalled a running worker" (WasActive=true) from "job was
// already terminal" (WasActive=false).
//
// Servers that pre-date the structured response shape will return a
// 200 without WasActive; in that case the response carries the
// default zero values and callers should treat that as the legacy
// "accepted, unknown state" signal.
func (j *OperationJob) CancelDetail(ctx context.Context) (*irminmodels.CancelOperationJobResponse, error) {
	if j == nil {
		return nil, errors.New("nil OperationJob handle")
	}

	endpoint := fmt.Sprintf("%s/operation/cancel/%s", j.client.BaseURL, url.PathEscape(j.JobID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build cancel request: %w", err)
	}
	j.client.applyHeadersForToken(httpReq, j.operationToken, "application/json")

	resp, err := j.client.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("cancel request to %s failed: %w", httpReq.URL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, readJobNonSuccess(resp)
	}

	bodyBytes, readErr := io.ReadAll(io.LimitReader(resp.Body, errorBodyReadLimit))
	if readErr != nil {
		return nil, fmt.Errorf("failed to read cancel response body: %w", readErr)
	}
	var out irminmodels.CancelOperationJobResponse
	if len(bodyBytes) > 0 {
		// Best-effort decode — a server returning non-JSON on a 2xx
		// contradicts its own content type; don't fail the cancel
		// over it, the cancel itself succeeded at the HTTP layer.
		_ = json.Unmarshal(bodyBytes, &out)
	}
	return &out, nil
}

// Wait polls Status until the job reaches a terminal state (complete,
// failed, or cancelled) or ctx is cancelled. Returns ctx.Err on
// cancellation. On terminal failure or cancellation, the status
// response is still returned so callers can inspect progress /
// error details; check Status.Status.IsTerminal and classify
// success via == irminmodels.OperationJobStatusComplete.
//
// pollInterval is clamped to a 500ms floor so a zero value does not
// busy-loop the connector service. Typical callers use 1–5s.
func (j *OperationJob) Wait(
	ctx context.Context,
	pollInterval time.Duration,
) (*irminmodels.OperationJobStatusResponse, error) {
	if j == nil {
		return nil, errors.New("nil OperationJob handle")
	}
	const minPoll = 500 * time.Millisecond
	if pollInterval < minPoll {
		pollInterval = minPoll
	}

	for {
		status, err := j.Status(ctx)
		if err != nil {
			return nil, err
		}
		if status.Status.IsTerminal() {
			return status, nil
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(pollInterval):
		}
	}
}

// encodeStartPullForm renders a StartOperationPullRequest as
// application/x-www-form-urlencoded body + the matching headers.
// Keeps the request surface identical to the pre-async
// /operation/pull handler so the server-side route does not change
// shape. Credentials flow through the shared
// buildDetailsSettingsForm encoder so the wire shape stays in
// lockstep with the config-field endpoints (the canonical reference
// for `details[<key>]` / `settings[<key>]` form fields).
func encodeStartPullForm(req StartOperationPullRequest) (io.Reader, map[string]string) {
	values := url.Values{}
	values.Set("path", req.Path)
	for k, v := range buildDetailsSettingsForm(req.Details, req.Settings) {
		values.Set(k, v)
	}
	for k, v := range req.Extra {
		// Protect against a caller overwriting path via Extra.
		if k == "path" || isReservedCredentialKey(k) {
			continue
		}
		values.Set(k, v)
	}
	body := strings.NewReader(values.Encode())
	headers := map[string]string{
		"Content-Type": "application/x-www-form-urlencoded",
	}
	return body, headers
}

// mergeCredentialFormFields lifts the single canonical
// buildDetailsSettingsForm encoder into the in-place merge style the
// multipart push/patch encoders prefer. One source of truth for the
// `details[<key>]` / `settings[<key>]` wire shape (defined in
// config_fields.go); a future format change there propagates here
// for free.
func mergeCredentialFormFields(formFields, details, settings map[string]string) {
	for k, v := range buildDetailsSettingsForm(details, settings) {
		formFields[k] = v
	}
}

// isReservedCredentialKey returns true for raw form keys that overlap
// the credential channel's wire shape. Used to refuse Extra values
// that would silently shadow Details/Settings entries; callers that
// genuinely need those keys should set them on Details / Settings.
func isReservedCredentialKey(key string) bool {
	return strings.HasPrefix(key, "details[") || strings.HasPrefix(key, "settings[")
}

// buildPushRequestOptions composes the multipart body for a push.
// Validates that exactly one source (File / FilePath / PresignedURL)
// is set.
func buildPushRequestOptions(req StartOperationPushRequest) (RequestOptions, error) {
	sources := 0
	if req.PresignedURL != "" {
		sources++
	}
	if len(req.File) > 0 {
		sources++
	}
	if req.FilePath != "" {
		sources++
	}
	if sources == 0 {
		return RequestOptions{}, errors.New(
			"StartOperationPush requires one of File, FilePath, or PresignedURL",
		)
	}
	if sources > 1 {
		return RequestOptions{}, errors.New(
			"StartOperationPush accepts exactly one of File, FilePath, or PresignedURL",
		)
	}

	formFields := map[string]string{}
	if req.Path != "" {
		formFields["path"] = req.Path
	}
	mergeCredentialFormFields(formFields, req.Details, req.Settings)
	for k, v := range req.Extra {
		// Protect against a caller overwriting reserved fields via Extra.
		if k == "path" || k == "file" || k == "presigned_url" || isReservedCredentialKey(k) {
			continue
		}
		formFields[k] = v
	}

	var files []FormFile
	if req.PresignedURL != "" {
		formFields["presigned_url"] = req.PresignedURL
		return RequestOptions{
			Method:      http.MethodPost,
			FormFields:  formFields,
			ContentType: "application/x-www-form-urlencoded",
		}, nil
	}

	fileName := req.FileName
	if fileName == "" {
		fileName = "push.zip"
	}
	if len(req.File) > 0 {
		files = []FormFile{{
			FieldName: "file",
			FileName:  fileName,
			Reader:    bytes.NewReader(req.File),
		}}
	} else {
		files = []FormFile{{
			FieldName: "file",
			FileName:  fileName,
			FilePath:  req.FilePath,
		}}
	}

	return RequestOptions{
		Method:      http.MethodPost,
		FormFields:  formFields,
		Files:       files,
		ContentType: "multipart/form-data",
	}, nil
}

// buildPatchRequestOptions composes the multipart body for a patch.
// Either Patches (marshalled here) or PatchesJSON (caller-supplied
// bytes) must carry the operations.
func buildPatchRequestOptions(req StartOperationPatchRequest) (RequestOptions, error) {
	var payload []byte
	switch {
	case len(req.PatchesJSON) > 0:
		payload = req.PatchesJSON
	case len(req.Patches) > 0:
		marshalled, err := json.Marshal(req.Patches)
		if err != nil {
			return RequestOptions{}, fmt.Errorf("failed to marshal patch operations: %w", err)
		}
		payload = marshalled
	default:
		return RequestOptions{}, errors.New(
			"StartOperationPatch requires Patches or PatchesJSON to be set",
		)
	}

	fileName := req.FileName
	if fileName == "" {
		fileName = "patches.json"
	}

	formFields := map[string]string{}
	mergeCredentialFormFields(formFields, req.Details, req.Settings)
	for k, v := range req.Extra {
		if k == "patches" || isReservedCredentialKey(k) {
			continue
		}
		formFields[k] = v
	}

	return RequestOptions{
		Method:     http.MethodPost,
		FormFields: formFields,
		Files: []FormFile{{
			FieldName: "patches",
			FileName:  fileName,
			Reader:    bytes.NewReader(payload),
		}},
		ContentType: "multipart/form-data",
	}, nil
}

// errorBodyReadLimit is the upper bound on how many bytes of a
// non-success response body we read into APIError.Body. Connector
// errors are small JSON / plain-text payloads in practice; this cap
// stops a pathological server from feeding an unbounded body into
// the client's memory via an error path.
const errorBodyReadLimit = 1 << 20 // 1 MiB

// readAPIError builds an *APIError by reading whatever body the
// connector returned for the current response. Consumes the body;
// the caller is still responsible for closing it (we keep this
// separate so cancel/status paths can control their own cleanup).
func readAPIError(resp *http.Response) error {
	var buf bytes.Buffer
	_, _ = io.Copy(&buf, io.LimitReader(resp.Body, errorBodyReadLimit))
	return &APIError{
		StatusCode: resp.StatusCode,
		Body:       buf.String(),
	}
}

// readAlreadyRunningError reads the response body and attempts to
// decode it into an AlreadyRunningBody. Returns a wrapped
// *AlreadyRunningError on success, or nil if the body cannot be
// decoded into the structured shape — the caller should fall back
// to *APIError (constructed from the same bytes via apiErrorFromBytes)
// in that case to preserve diagnostics for pre-envelope servers.
//
// "Structured shape" means the body was valid JSON containing the
// canonical Error string. JobID absent is acceptable (legacy sync
// holder); body totally malformed is not.
func readAlreadyRunningError(bodyBytes []byte) *AlreadyRunningError {
	if len(bodyBytes) == 0 {
		return nil
	}
	var body irminmodels.AlreadyRunningBody
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		// Intentional discard — a JSON parse failure means the
		// server did not send a structured body; the caller falls
		// back to *APIError with the raw bytes. Propagating the
		// parse error would obscure the actual HTTP failure.
		return nil //nolint:nilerr // parse failure means "not structured" — caller falls back to *APIError
	}
	if body.Error == "" {
		// Likely a non-AlreadyRunningBody JSON object (e.g.,
		// {"foo":"bar"}). Don't claim it's a structured 409.
		return nil
	}
	return &AlreadyRunningError{Body: body}
}

// readJobServerError attempts to decode bodyBytes into a
// JobErrorBody. Returns *JobServerError on success, nil otherwise.
//
// The discriminator is a non-empty Reason field. Old-style
// {"error": "..."} bodies lack this and fall through so the caller
// can surface *APIError with the original bytes.
func readJobServerError(statusCode int, bodyBytes []byte) *JobServerError {
	if len(bodyBytes) == 0 {
		return nil
	}
	var body irminmodels.JobErrorBody
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		// Intentional discard — same rationale as
		// readAlreadyRunningError. A parse failure means the server
		// did not send a structured body; let the caller fall back
		// to *APIError with the raw bytes.
		return nil //nolint:nilerr // parse failure means "not structured" — caller falls back to *APIError
	}
	if body.Reason == "" {
		return nil
	}
	return &JobServerError{StatusCode: statusCode, Body: body}
}

// apiErrorFromBytes is the *APIError fallback for the cases where
// the structured-body decoders rejected the response. Keeps the raw
// bytes as the diagnostic Body string so operator-facing logs still
// see whatever the server actually sent.
func apiErrorFromBytes(statusCode int, bodyBytes []byte) error {
	return &APIError{StatusCode: statusCode, Body: string(bodyBytes)}
}

// readBoundedBody drains up to errorBodyReadLimit bytes of the
// response body for error-parsing purposes. Separate helper so the
// structured/legacy decoders operate on the same byte slice without
// each re-reading resp.Body.
func readBoundedBody(resp *http.Response) []byte {
	buf, _ := io.ReadAll(io.LimitReader(resp.Body, errorBodyReadLimit))
	return buf
}

// readJobNonSuccess centralises the non-2xx body parsing used by
// status / result / cancel: prefer *JobServerError when the body
// carries a structured reason, fall back to *APIError otherwise.
// Consumes the body.
func readJobNonSuccess(resp *http.Response) error {
	bodyBytes := readBoundedBody(resp)
	if structured := readJobServerError(resp.StatusCode, bodyBytes); structured != nil {
		return structured
	}
	return apiErrorFromBytes(resp.StatusCode, bodyBytes)
}
