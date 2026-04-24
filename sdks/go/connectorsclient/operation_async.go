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

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// StartOperationPullRequest holds the payload for POST /operation/pull
// under the async protocol. It intentionally uses the same
// x-www-form-urlencoded surface as the pre-async handler so the
// server-side route signature does not churn; only the response
// shape changes (202 + {job_id} instead of a streamed zip body).
type StartOperationPullRequest struct {
	// Path is the connector-specific resource path being pulled
	// (e.g., "/v1/customers" for Stripe, a table identifier for
	// Postgres). Required.
	Path string

	// Extra carries any additional form fields the specific
	// connector accepts on its pull endpoint (cursor, filters,
	// batch hints). Use for connector-specific parameters — the
	// shared SDK types cannot enumerate every connector's knobs.
	Extra map[string]string
}

// StartOperationPull initiates an asynchronous pull against a
// connector. It expects the connector service to respond with
// 202 Accepted and {job_id, ...}; the returned
// StartOperationPullResponse carries that job_id, which the caller
// then uses to poll status and, eventually, fetch the result.
//
// On HTTP 200 (legacy synchronous response) this returns
// ErrLegacySyncPullResponse without attempting to drain the body —
// per the async-pull plan there is intentionally no sync fallback,
// and surfacing a specific error lets the Core poll wrapper print
// an actionable message rather than silently degrade.
//
// Any other non-2xx status returns an *APIError.
func (c *Client) StartOperationPull(
	ctx context.Context,
	req StartOperationPullRequest,
) (*irminmodels.StartOperationPullResponse, error) {
	body, headers := encodeStartPullForm(req)

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.BaseURL+"/operation/pull",
		body,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build start pull request: %w", err)
	}
	for k, v := range headers {
		httpReq.Header.Set(k, v)
	}
	c.applyDefaultHeaders(httpReq, "application/json")

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("start pull request to %s failed: %w", httpReq.URL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	// Legacy sync servers return 200 with the zip body. Don't drain
	// the body — it can be gigabytes. Bail with the sentinel so the
	// poll wrapper can emit an actionable operator message.
	if resp.StatusCode == http.StatusOK {
		return nil, ErrLegacySyncPullResponse
	}

	// 409 Conflict is the structured "operation already running"
	// signal. Parse the body into AlreadyRunningError so callers can
	// errors.As it and reach the blocking job_id directly. If the
	// body does not match the structured shape, fall back to
	// *APIError to preserve diagnostics for pre-envelope servers.
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
		return nil, fmt.Errorf("failed to read start pull response body: %w", err)
	}

	var out irminmodels.StartOperationPullResponse
	if unmarshalErr := json.Unmarshal(bodyBytes, &out); unmarshalErr != nil {
		return nil, fmt.Errorf("failed to unmarshal start pull response: %w", unmarshalErr)
	}
	if out.JobID == "" {
		return nil, errors.New(
			"connector accepted the pull (HTTP 202) but did not return a job_id",
		)
	}
	return &out, nil
}

// GetOperationJobStatus polls the status of an async operation job.
// Safe to call repeatedly; the Core side drives a poll loop at
// roughly 5s cadence. Progress events on the response are cumulative,
// so consumers may either diff against a previously seen slice or
// replace their local view wholesale.
//
// The caller should stop polling once the returned Status satisfies
// OperationJobStatus.IsTerminal.
func (c *Client) GetOperationJobStatus(
	ctx context.Context,
	jobID string,
) (*irminmodels.OperationJobStatusResponse, error) {
	if jobID == "" {
		return nil, errors.New("jobID must not be empty")
	}

	endpoint := fmt.Sprintf("%s/operation/status/%s", c.BaseURL, url.PathEscape(jobID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build status request: %w", err)
	}
	c.applyDefaultHeaders(httpReq, "application/json")

	resp, err := c.HTTPClient.Do(httpReq)
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

// FetchOperationResult streams the result archive (zip) for a
// completed async operation job. The caller is responsible for
// closing the returned io.ReadCloser — the connection stays open
// until the caller drains or closes it, and the request context
// governs the transfer lifetime.
//
// The body is intentionally not buffered into memory; this is the
// whole point of the async protocol. Callers should pipe the
// reader directly into their downstream processing (archive
// extraction, re-upload to LakeFS, etc.) so the zip never lands
// fully on either peer.
//
// Semantics by response status:
//
//   - 200 OK with application/zip (or any non-JSON) body: returns
//     the body reader.
//   - 409 Conflict: the job is not yet in terminal state complete.
//     Returns ErrResultNotReady; callers should resume polling
//     status rather than retry the result fetch.
//   - Any other non-2xx: returns *APIError.
func (c *Client) FetchOperationResult(
	ctx context.Context,
	jobID string,
) (io.ReadCloser, error) {
	if jobID == "" {
		return nil, errors.New("jobID must not be empty")
	}

	endpoint := fmt.Sprintf("%s/operation/result/%s", c.BaseURL, url.PathEscape(jobID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build result request: %w", err)
	}
	c.applyDefaultHeaders(httpReq, "application/zip")

	resp, err := c.streamClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("result request to %s failed: %w", httpReq.URL, err)
	}

	// 409 signals "not ready". Drain+close the body so the
	// connection can be reused, then surface the typed error.
	// Bounded drain — streamClient has no top-level timeout, so a
	// misbehaving server sending an unbounded 409 body would otherwise
	// hang this path. errorBodyReadLimit matches readAPIError's guard.
	//
	// We keep ErrResultNotReady as the primary signal here because
	// the poll wrapper's state machine keys off it; the structured
	// JobErrorBody shape does not override that semantic — a 409 on
	// the result endpoint means "keep polling status" regardless of
	// whether the body carries a reason.
	if resp.StatusCode == http.StatusConflict {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, errorBodyReadLimit))
		_ = resp.Body.Close()
		return nil, ErrResultNotReady
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		apiErr := readJobNonSuccess(resp)
		_ = resp.Body.Close()
		return nil, apiErr
	}

	// Success — hand the live body to the caller. They own Close.
	return resp.Body, nil
}

// CancelOperationJob requests that the connector service cancel an
// in-flight async operation job. Safe to call on terminal jobs
// (server is expected to treat it as a no-op). Uses POST with the
// job_id on the path so it composes with existing per-job routes.
//
// Returns nil on any 2xx; the richer response shape (status,
// was_active) is available via CancelOperationJobDetail. Callers
// that only need idempotent fire-and-forget semantics can keep
// calling this method.
func (c *Client) CancelOperationJob(ctx context.Context, jobID string) error {
	_, err := c.CancelOperationJobDetail(ctx, jobID)
	return err
}

// CancelOperationJobDetail is the richer form of CancelOperationJob
// that returns the parsed CancelOperationJobResponse on success so
// callers can tell "we actually signalled a running worker"
// (WasActive=true) from "job was already terminal" (WasActive=false).
//
// Servers that pre-date the structured response shape will return a
// 200 without WasActive; in that case the response carries the
// default zero values (Status="", WasActive=false) and callers
// should treat that as the legacy "accepted, unknown state" signal.
func (c *Client) CancelOperationJobDetail(
	ctx context.Context,
	jobID string,
) (*irminmodels.CancelOperationJobResponse, error) {
	if jobID == "" {
		return nil, errors.New("jobID must not be empty")
	}

	endpoint := fmt.Sprintf("%s/operation/cancel/%s", c.BaseURL, url.PathEscape(jobID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build cancel request: %w", err)
	}
	c.applyDefaultHeaders(httpReq, "application/json")

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("cancel request to %s failed: %w", httpReq.URL, err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, readJobNonSuccess(resp)
	}

	bodyBytes, readErr := io.ReadAll(io.LimitReader(resp.Body, errorBodyReadLimit))
	if readErr != nil {
		// Read failure on a 2xx is unexpected — surface it rather
		// than silently returning a zero-valued response.
		return nil, fmt.Errorf("failed to read cancel response body: %w", readErr)
	}
	// Legacy servers return {"message": "cancellation requested"}
	// without the richer fields. Attempt structured decode; if the
	// body is empty or minimally-shaped the zero-valued response is
	// the correct thing to return.
	var out irminmodels.CancelOperationJobResponse
	if len(bodyBytes) > 0 {
		// Best-effort decode. JSON errors here would mean the server
		// returned non-JSON on a 2xx, which contradicts its own
		// content type; don't fail the cancel over it — the cancel
		// itself succeeded at the HTTP layer.
		_ = json.Unmarshal(bodyBytes, &out)
	}
	return &out, nil
}

// encodeStartPullForm renders a StartOperationPullRequest as
// application/x-www-form-urlencoded body + the matching headers.
// Keeps the request surface identical to the pre-async
// /operation/pull handler so the server-side route does not change
// shape.
func encodeStartPullForm(req StartOperationPullRequest) (io.Reader, map[string]string) {
	values := url.Values{}
	values.Set("path", req.Path)
	for k, v := range req.Extra {
		// Protect against a caller overwriting path via Extra.
		if k == "path" {
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
