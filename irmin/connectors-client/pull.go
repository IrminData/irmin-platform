package connectorsclient

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	sdkconnectors "github.com/IrminData/irmin-sdk-go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/IrminData/irmin-sdk-go/observability"
)

// PollInterval is the cadence at which the async-pull wrapper polls
// /operation/status between the initial 202 Accepted and a terminal
// state. Exported as a package-level const so tests can tune it and so
// operators can see the tunable knob at a glance. 5s matches the
// connector-service heartbeat cadence so one poll round-trip is
// guaranteed to observe any status flip since the last poll.
const PollInterval = 5 * time.Second

// statusPollTimeout bounds the per-poll HTTP round trip. Kept short
// and independent of the overall poll-loop deadline: each status call
// should return in well under a second on a healthy connector, and if
// it hangs we want the caller's ctx (or the poll loop's retry) to take
// over rather than a single stuck poll burning the whole MaxRuntime.
const statusPollTimeout = 30 * time.Second

// maxConsecutiveStatusPollErrors controls how many back-to-back
// non-context status failures we tolerate before aborting the poll
// loop and issuing best-effort cancel. This keeps single HTTP/network
// blips from killing long-running pulls while still failing fast on
// sustained status endpoint outages.
const maxConsecutiveStatusPollErrors = 3

// startConflictRetryTimeout bounds how long OperationPull waits and retries
// when /operation/pull reports a pre-existing in-flight operation (409).
// This avoids immediate "already running" failures when cleanup is still
// in progress from a just-failed prior attempt.
const startConflictRetryTimeout = 15 * time.Second

// startConflictRetryInterval controls backoff between /operation/pull retries
// while waiting for a prior operation lock to clear.
const startConflictRetryInterval = 1 * time.Second

// cancelBestEffortTimeout bounds /operation/cancel attempts. Used by
// both fire-and-forget cancellation (ctx done) and synchronous cleanup
// before returning fatal polling errors.
const cancelBestEffortTimeout = 5 * time.Second

var errNilAsyncPullStatusResponse = errors.New("async pull status poll returned nil response")

// OperationPull starts an async pull against the connector service
// and blocks until a terminal status is reached. On success the
// result zip is read from /operation/result and returned as a single
// PulledFile whose Content is the raw zip bytes — identical in shape
// to the pre-async synchronous response, so downstream callers that
// feed the bytes into irminutils.UnzipFiles do not change.
//
// Parameters:
//   - ctx: Context for the whole lifecycle (start + poll + fetch).
//     Cancellation triggers a best-effort /operation/cancel and
//     returns the ctx error.
//   - path: Connector-specific resource path to pull.
//
// Note: Operation token is required for this operation.
func (c *Client) OperationPull(ctx context.Context, path string) ([]PulledFile, error) {
	reader, err := c.OperationPullStream(ctx, path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = reader.Close() }()

	// Read the zip body in full. Matches the pre-async memory
	// profile exactly — the sync path also materialised the full zip
	// bytes here before handing them to UnzipFiles. Callers that
	// want to avoid the allocation use OperationPullStream directly.
	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read async pull result body: %w", err)
	}

	return []PulledFile{{
		// Filename left empty: the result stream is always a zip and
		// downstream code keys off Content, not Filename. Preserving
		// the old "filename from Content-Disposition" surface would
		// require plumbing headers through FetchOperationResult for
		// no consumer gain.
		Filename: "",
		Content:  content,
	}}, nil
}

// OperationPullStream starts an async pull and returns a streaming
// reader over the result zip. The caller is responsible for closing
// the returned reader. Kept as the low-allocation path for the
// streaming import in engine/dataMovement.go.
//
// The returned reader is tied to the async-pull poll loop only up to
// the point the result starts streaming; once the reader is handed
// back the only governance on the stream is the caller's context.
func (c *Client) OperationPullStream(ctx context.Context, path string) (io.ReadCloser, error) {
	if ctx == nil {
		// An absent context would silently bypass every deadline
		// the caller set up (MaxRuntime especially). Fail loudly
		// rather than inventing a background context.
		return nil, errors.New("OperationPullStream requires a non-nil context")
	}

	sdk := c.asSDKClient()
	connectionID := c.ConnectionID

	startResp, err := c.startOperationPullWithRetry(ctx, sdk, path)
	if err != nil {
		if errors.Is(err, sdkconnectors.ErrLegacySyncPullResponse) {
			// The connector service returned a sync zip (HTTP 200).
			// Per the "no backward-compat shim" decision in the
			// async-pull plan we do not fall back to the old
			// streaming path — surface an actionable message so
			// operators know to upgrade the connector service.
			return nil, fmt.Errorf(
				"connector returned a legacy synchronous pull response; "+
					"the connectors service must be upgraded to the async "+
					"protocol before core can pull from %q: %w",
				path, err,
			)
		}
		return nil, fmt.Errorf("failed to start async pull: %w", err)
	}

	jobID, validationErr := validateStartedAsyncPullJobID(startResp)
	if validationErr != nil {
		return nil, validationErr
	}
	if connectionID != 0 {
		c.rememberAsyncPullJobID(jobID)
	}

	// Poll until terminal. On cancel / failure this calls
	// /operation/cancel best-effort; on success it falls through to
	// the result fetch.
	if pollErr := c.pollOperationJob(ctx, sdk, jobID); pollErr != nil {
		return nil, pollErr
	}

	reader, err := sdk.FetchOperationResult(ctx, jobID)
	if err != nil {
		// The job already reached status=complete (pollOperationJob
		// returned nil). Clear the fallback-cache entry so a
		// subsequent pull against the same client doesn't use a
		// terminal job's id as the "blocker" of a future 409 — the
		// row will age out of the connector-side janitor's TTL on
		// its own. No cancel is issued; cancel on a terminal row is
		// a no-op and would just add an extra round-trip.
		if connectionID != 0 {
			c.clearRememberedAsyncPullJobID(jobID)
		}
		return nil, fmt.Errorf("failed to fetch async pull result for job %s: %w", jobID, err)
	}
	if connectionID != 0 {
		c.clearRememberedAsyncPullJobID(jobID)
	}
	return reader, nil
}

func (c *Client) startOperationPullWithRetry(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	path string,
) (*irminmodels.StartOperationPullResponse, error) {
	retryCtx, retryCancel := context.WithTimeout(ctx, startConflictRetryTimeout)
	defer retryCancel()

	startReq := sdkconnectors.StartOperationPullRequest{Path: path}
	attempts := 0
	var lastErr error

	for {
		attempts++

		startResp, err := sdk.StartOperationPull(retryCtx, startReq)
		if err == nil {
			return startResp, nil
		}
		lastErr = err

		if errors.Is(err, sdkconnectors.ErrLegacySyncPullResponse) {
			return nil, err
		}

		// The SDK now returns a typed *AlreadyRunningError for any
		// 409 that carries the structured AlreadyRunningBody (or the
		// legacy {"error":"Operation is already running"} body with
		// no job_id). Any other 409 surfaces as *APIError and is not
		// retryable from this wrapper's perspective.
		var alreadyErr *sdkconnectors.AlreadyRunningError
		if !errors.As(err, &alreadyErr) {
			return nil, err
		}

		// runningJobID comes straight from the server-populated
		// AlreadyRunningBody.JobID when the connector is on the
		// JobManager.Begin path. Pre-envelope servers return an
		// empty JobID; fall back to the last successfully-started
		// async pull job for this client as a best-effort cleanup
		// target. Retire the cache once 100% of deployed connectors
		// populate JobID.
		runningJobID := alreadyErr.JobID()
		if runningJobID == "" {
			runningJobID = c.LastAsyncPullJobID()
		}

		if runningJobID != "" {
			cancelErr := c.cancelOperationJob(sdk, runningJobID)
			if cancelErr == nil {
				c.clearRememberedAsyncPullJobID(runningJobID)
			} else if c.Logger != nil {
				c.Logger.LogAttrs(ctx, slog.LevelDebug,
					"failed to cancel running job reported by pull start conflict",
					slog.String("running_job_id", runningJobID),
					slog.String("error", cancelErr.Error()),
				)
			}
		}

		if c.Logger != nil {
			c.Logger.LogAttrs(ctx, slog.LevelDebug,
				"async pull start conflict; waiting before retry",
				slog.Int("attempt", attempts),
				slog.String("error", err.Error()),
			)
		}

		select {
		case <-retryCtx.Done():
			return nil, startConflictRetryExitError(ctx, attempts, lastErr)
		case <-time.After(startConflictRetryInterval):
		}
	}
}

// startConflictRetryExitError picks the right error to surface when
// the retry loop's retryCtx fires. If the PARENT ctx is already
// cancelled/expired, wrap its error so callers using errors.Is on
// context.Canceled / DeadlineExceeded classify correctly. Otherwise
// the retry BUDGET expired on its own — surface the last observed
// AlreadyRunningError so operators can see the blocker.
//
// Extracted from startOperationPullWithRetry to keep the main loop
// under the gocognit limit.
func startConflictRetryExitError(ctx context.Context, attempts int, lastErr error) error {
	if parentErr := ctx.Err(); parentErr != nil {
		return fmt.Errorf(
			"async pull start aborted after %d attempts: %w",
			attempts,
			parentErr,
		)
	}
	return fmt.Errorf(
		"failed to start async pull after %d attempts waiting for previous operation cleanup: %w",
		attempts,
		lastErr,
	)
}

func validateStartedAsyncPullJobID(startResp *irminmodels.StartOperationPullResponse) (string, error) {
	if startResp == nil {
		return "", errors.New("connector returned empty async pull start response")
	}

	jobID := strings.TrimSpace(startResp.JobID)
	if jobID == "" {
		return "", errors.New("connector accepted async pull but did not return a job_id")
	}
	return jobID, nil
}

// asSDKClient builds a freshly-configured SDK connectorsclient.Client
// from the in-repo *Client's fields. Done per-call so the SDK client
// inherits whatever ConnectionID / Token / Locale was set on this
// receiver at call time — the in-repo client is often chained with
// WithConnectionID right before an operation, and we want that state
// to propagate.
//
// Important: SDK NewClient keeps a dedicated no-timeout stream client
// for /operation/result reads, so using sdk.FetchOperationResult here
// preserves long-stream behaviour (result body lifetime is governed by
// request context, not DefaultConnectorTimeout).
func (c *Client) asSDKClient() *sdkconnectors.Client {
	sdk := sdkconnectors.NewClient(c.BaseURL, c.Token, c.Locale)
	if c.ConnectionID != 0 {
		sdk = sdk.WithConnectionID(c.ConnectionID)
	}
	return sdk
}

// pollOperationJob drives the status poll loop for a running async
// operation job. Returns nil on terminal status=complete; returns a
// wrapped *sdkconnectors.JobFailedError on failed/cancelled; returns
// the ctx error (after best-effort cancel) on cancellation or
// MaxRuntime expiry.
//
// Progress events are surfaced via slog.Debug with dedup by slice
// index — the connector's progress slice is cumulative, so we only
// log events past the high-water mark we've already seen.
func (c *Client) pollOperationJob(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
) error {
	return c.pollOperationJobWithFetcher(ctx, sdk, jobID, c.fetchJobStatus)
}

type jobStatusFetcher func(
	context.Context,
	*sdkconnectors.Client,
	string,
) (*irminmodels.OperationJobStatusResponse, error)

func (c *Client) pollOperationJobWithFetcher(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
	fetchStatus jobStatusFetcher,
) error {
	// Poll immediately once so short jobs that finish between the 202
	// and the first scheduled wait are observed without waiting a full
	// PollInterval.

	// seenEvents is the number of progress events we've already
	// forwarded to slog. Cumulative slice semantics mean we only
	// need an integer watermark, not a hash set.
	seenEvents := 0
	consecutivePollErrors := 0

	for {
		status, nextConsecutiveErrors, shouldRetry, handleErr := c.processPollFetchResult(
			ctx,
			sdk,
			jobID,
			fetchStatus,
			consecutivePollErrors,
		)
		if handleErr != nil {
			return handleErr
		}
		consecutivePollErrors = nextConsecutiveErrors
		if shouldRetry {
			continue
		}
		if status == nil {
			return errors.New("poll fetch handler returned nil status without retry or terminal error")
		}

		seenEvents = c.forwardProgressEvents(ctx, jobID, status.Progress, seenEvents)

		if status.Status.IsTerminal() {
			return terminalStatusError(status)
		}

		if waitErr := c.waitForRetryTickOrContextDone(ctx, sdk, jobID); waitErr != nil {
			return waitErr
		}
	}
}

func (c *Client) processPollFetchResult(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
	fetchStatus jobStatusFetcher,
	consecutivePollErrors int,
) (*irminmodels.OperationJobStatusResponse, int, bool, error) {
	status, pollErr := fetchStatus(ctx, sdk, jobID)
	if pollErr != nil {
		nextConsecutiveErrors, shouldRetry, handleErr := c.handlePollError(
			ctx,
			sdk,
			jobID,
			pollErr,
			consecutivePollErrors,
		)
		return nil, nextConsecutiveErrors, shouldRetry, handleErr
	}

	if status == nil {
		nextConsecutiveErrors, shouldRetry, handleErr := c.handlePollNonContextError(
			ctx,
			sdk,
			jobID,
			errNilAsyncPullStatusResponse,
			consecutivePollErrors,
		)
		return nil, nextConsecutiveErrors, shouldRetry, handleErr
	}

	return status, 0, false, nil
}

func (c *Client) handlePollError(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
	pollErr error,
	consecutivePollErrors int,
) (int, bool, error) {
	if isPollContextErr(pollErr) {
		return c.handlePollContextError(ctx, sdk, jobID, pollErr, consecutivePollErrors)
	}
	return c.handlePollNonContextError(ctx, sdk, jobID, pollErr, consecutivePollErrors)
}

func isPollContextErr(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

func (c *Client) handlePollContextError(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
	pollErr error,
	consecutivePollErrors int,
) (int, bool, error) {
	// Distinguish parent ctx expiry/cancel from the child poll timeout.
	// fetchJobStatus wraps each call in pollCtx with statusPollTimeout;
	// that child deadline must be retried by this loop, not treated as
	// a job-abort signal.
	if ctxErr := ctx.Err(); ctxErr != nil {
		c.bestEffortCancel(sdk, jobID)
		return consecutivePollErrors, false, ctxErr
	}
	// Poll-specific timeout/cancel while the parent ctx is still active.
	// Treat it as a retryable poll failure with the same bounded budget as
	// non-context status errors, so persistent slow status endpoints do not
	// spin forever until the parent context expires.
	nextConsecutiveErrors := consecutivePollErrors + 1
	if nextConsecutiveErrors < maxConsecutiveStatusPollErrors {
		c.logPollRetry(ctx, jobID, nextConsecutiveErrors, pollErr)
		// Keep the original "retry immediately" behavior for single poll-timeout
		// blips while still bounding persistent timeout storms.
		return nextConsecutiveErrors, true, nil
	}

	c.logSyncCancelFailure(ctx, jobID, c.cancelOperationJob(sdk, jobID))
	return nextConsecutiveErrors, false, fmt.Errorf(
		"failed to poll job %s after %d consecutive status context errors: %w",
		jobID,
		nextConsecutiveErrors,
		pollErr,
	)
}

func (c *Client) handlePollNonContextError(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
	pollErr error,
	consecutivePollErrors int,
) (int, bool, error) {
	// Fail-fast on server-classified non-retryable failures
	// (reason=not_found / corrupted_job_state). Waiting three
	// strikes against a row that will never recover is wasted
	// latency. Transient_db and unknown errors still flow through
	// the consecutive-error budget below.
	var jobErr *sdkconnectors.JobServerError
	if errors.As(pollErr, &jobErr) && !jobErr.Retryable() {
		c.logSyncCancelFailure(ctx, jobID, c.cancelOperationJob(sdk, jobID))
		return consecutivePollErrors, false, fmt.Errorf(
			"poll for job %s returned non-retryable server error (reason=%s): %w",
			jobID, jobErr.Reason(), pollErr,
		)
	}

	// Non-context poll errors (HTTP/network/parse failures) can be
	// transient. Give them a few retries before we abandon the job.
	nextConsecutiveErrors := consecutivePollErrors + 1
	if nextConsecutiveErrors < maxConsecutiveStatusPollErrors {
		c.logPollRetry(ctx, jobID, nextConsecutiveErrors, pollErr)

		if waitErr := c.waitForRetryTickOrContextDone(ctx, sdk, jobID); waitErr != nil {
			return nextConsecutiveErrors, false, waitErr
		}
		return nextConsecutiveErrors, true, nil
	}

	// Sustained non-context polling failures likely mean status checks
	// are down. Synchronously attempt cancel before returning so caller
	// retries do not immediately race a still-running connector job.
	c.logSyncCancelFailure(ctx, jobID, c.cancelOperationJob(sdk, jobID))
	return nextConsecutiveErrors, false, fmt.Errorf(
		"failed to poll job %s after %d consecutive status errors: %w",
		jobID,
		nextConsecutiveErrors,
		pollErr,
	)
}

func (c *Client) waitForRetryTickOrContextDone(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
) error {
	timer := time.NewTimer(PollInterval)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		c.bestEffortCancel(sdk, jobID)
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (c *Client) logPollRetry(
	ctx context.Context,
	jobID string,
	attempt int,
	pollErr error,
) {
	if c.Logger == nil {
		return
	}
	c.Logger.LogAttrs(ctx, slog.LevelDebug,
		"async pull status poll failed; retrying",
		slog.String("job_id", jobID),
		slog.Int("attempt", attempt),
		slog.Int("max_attempts", maxConsecutiveStatusPollErrors),
		slog.String("error", pollErr.Error()),
	)
}

func (c *Client) logSyncCancelFailure(ctx context.Context, jobID string, cancelErr error) {
	if cancelErr == nil || c.Logger == nil {
		return
	}
	c.Logger.LogAttrs(ctx, slog.LevelDebug,
		"async pull cancel after polling failure failed",
		slog.String("job_id", jobID),
		slog.String("error", cancelErr.Error()),
	)
}

// fetchJobStatus performs a single /operation/status call bounded by
// statusPollTimeout so one stuck poll cannot burn the whole
// MaxRuntime. Uses a derived context so cancellation on the parent
// still propagates.
func (c *Client) fetchJobStatus(
	ctx context.Context,
	sdk *sdkconnectors.Client,
	jobID string,
) (*irminmodels.OperationJobStatusResponse, error) {
	pollCtx, cancelPoll := context.WithTimeout(ctx, statusPollTimeout)
	defer cancelPoll()
	return sdk.GetOperationJobStatus(pollCtx, jobID)
}

// terminalStatusError maps a terminal status into the right error
// shape. status=complete returns nil; failed/cancelled return a
// *JobFailedError that unwraps to sdkconnectors.ErrJobFailed so
// callers can errors.Is against the sentinel or errors.As to get
// the detail.
func terminalStatusError(status *irminmodels.OperationJobStatusResponse) error {
	if status.Status == irminmodels.OperationJobStatusComplete {
		return nil
	}
	return &sdkconnectors.JobFailedError{
		Status:  status.Status,
		Message: status.Error,
	}
}

// forwardProgressEvents logs any progress events past the seen
// watermark and returns the new watermark. Progress is cumulative,
// so events[seen:] is the "new since last poll" slice. No-op when
// the slice hasn't grown.
func (c *Client) forwardProgressEvents(
	ctx context.Context,
	jobID string,
	events []observability.ProgressEvent,
	seen int,
) int {
	if len(events) <= seen {
		return seen
	}

	// Guard the hot path behind Enabled so we don't allocate
	// per-event attrs for a logger that's dropping Debug. The poll
	// runs for every pull for the whole MaxRuntime; the log call
	// cost adds up on chatty connectors (paginated Stripe can emit
	// thousands of page events).
	if c.Logger != nil && c.Logger.Enabled(ctx, slog.LevelDebug) {
		for _, ev := range events[seen:] {
			c.Logger.LogAttrs(ctx, slog.LevelDebug,
				"async pull progress event",
				slog.String("job_id", jobID),
				slog.String("kind", ev.Kind),
				slog.String("resource_path", ev.ResourcePath),
				slog.Int("page", ev.Page),
				slog.Int("records_so_far", ev.RecordsSoFar),
				slog.Int("batch", ev.Batch),
				slog.Int("batch_size", ev.BatchSize),
				slog.Int64("rows", ev.Rows),
				slog.String("file", ev.File),
				slog.Int64("bytes_transferred", ev.BytesTransferred),
				slog.Int64("bytes_total", ev.BytesTotal),
			)
		}
	}

	return len(events)
}

// bestEffortCancel fires /operation/cancel in a short-timeout
// background context. Intentionally not blocking on the main ctx:
// the caller's ctx is already cancelled, and the whole point is to
// abandon the job — a hung cancel call must not hold up return.
// Errors are logged at Debug; cancellation is best-effort.
func (c *Client) bestEffortCancel(sdk *sdkconnectors.Client, jobID string) {
	go func(job string) {
		if err := c.cancelOperationJob(sdk, job); err != nil && c.Logger != nil {
			c.Logger.LogAttrs(context.Background(), slog.LevelDebug,
				"best-effort async pull cancel failed",
				slog.String("job_id", job),
				slog.String("error", err.Error()),
			)
		}
	}(jobID)
}

func (c *Client) cancelOperationJob(sdk *sdkconnectors.Client, jobID string) error {
	cancelCtx, cancel := context.WithTimeout(context.Background(), cancelBestEffortTimeout)
	defer cancel()
	return sdk.CancelOperationJob(cancelCtx, jobID)
}
