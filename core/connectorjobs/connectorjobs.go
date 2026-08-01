package connectorjobs

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/IrminData/irmin-platform/sdks/go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/IrminData/irmin-platform/sdks/go/observability"
)

// PollInterval controls how often Core polls /operation/status while
// waiting for an async connector job to reach a terminal state.
const PollInterval = 2 * time.Second

// CancelTimeout bounds the best-effort /operation/cancel call made
// when a wait/poll path fails.
const CancelTimeout = 5 * time.Second

// MaxConsecutiveStatusPollErrors is how many back-to-back failures of
// the /operation/status poll Run will tolerate before treating the
// remote as gone. A connector that is healthy but momentarily
// unreachable (network blip, restarting pod, transient 5xx) should
// not kill a long-running pull on the first failed poll. The value
// matches what the pre-consolidation connectors-client used (3) so
// existing operator expectations carry over.
const MaxConsecutiveStatusPollErrors = 3

// WaitError marks failures where the job did not reach a terminal
// status locally. The connector worker may still be using any inputs
// handed to the job — including presigned S3 URLs handed to a push job
// — even after the best-effort cancel request returns. Callers that
// own those inputs (engine.shouldDeletePresignedPushObject is the
// canonical example) inspect WaitError via IsWaitError to decide
// whether it is safe to clean up.
type WaitError struct {
	Err error
}

func (e *WaitError) Error() string {
	return e.Err.Error()
}

func (e *WaitError) Unwrap() error {
	return e.Err
}

// IsWaitError reports whether err came from a failed wait/poll path.
func IsWaitError(err error) bool {
	var waitErr *WaitError
	return errors.As(err, &waitErr)
}

// bestEffortCancel fires a /operation/cancel against the connector in
// a detached goroutine using a fresh, short-lived context so the
// request still goes out even when the caller's ctx has been
// cancelled — and so the caller (Run / RunWithProgress) returns
// immediately instead of blocking on the round-trip. The pre-
// consolidation client made the same choice for the same reason: a
// workflow timeout firing should not have to wait CancelTimeout
// before reporting back to the user. Errors are intentionally
// swallowed — the caller is already in an error path.
func bestEffortCancel(job *connectorsclient.OperationJob) {
	go func() {
		cancelCtx, cancelFn := context.WithTimeout(context.Background(), CancelTimeout)
		defer cancelFn()
		_ = job.Cancel(cancelCtx)
	}()
}

// progressCtxKey is the context-value key used to attach an
// observability.ProgressHandler to a request-scoped ctx so layers
// between the orchestrator (where the sink lives) and connectorjobs
// (where the polling loop runs) don't have to thread a callback
// through every signature. Following the project convention from
// mcp/auth.go, the type's zero value is used as the key directly —
// no package-level var needed (avoids gochecknoglobals).
type progressCtxKey struct{}

// ContextWithProgress returns a copy of ctx that carries the given
// progress handler. The handler is consulted by Run as it polls
// /operation/status and observes new events. Pass nil to clear an
// inherited handler explicitly.
func ContextWithProgress(ctx context.Context, h observability.ProgressHandler) context.Context {
	return context.WithValue(ctx, progressCtxKey{}, h)
}

// ProgressFromContext returns the handler attached via
// ContextWithProgress, or nil if none was set. Exported for callers
// that want to inspect / forward the handler — typical Run / orchestrator
// flow does not need to reach for this directly.
func ProgressFromContext(ctx context.Context) observability.ProgressHandler {
	if ctx == nil {
		return nil
	}
	if h, ok := ctx.Value(progressCtxKey{}).(observability.ProgressHandler); ok {
		return h
	}
	return nil
}

// Run drives an OperationJob handle to terminal state. If the supplied
// ctx carries a progress handler (see ContextWithProgress), every newly
// observed event is fanned to that handler before terminal classification.
// Equivalent to RunWithProgress(ctx, job, ProgressFromContext(ctx)) — see
// RunWithProgress for the full contract.
func Run(ctx context.Context, job *connectorsclient.OperationJob) error {
	return RunWithProgress(ctx, job, ProgressFromContext(ctx))
}

// RunWithProgress drives an OperationJob handle to terminal state and,
// while polling, fans every newly-observed progress event to onProgress.
// This is the seam through which long-running connector operations
// surface page / batch / file / rate-limit events into orchestrator
// log streams or any other operator-facing sink. The vocabulary is
// observability.ProgressEvent — defined in the SDK so connectors,
// Core, and AI all see the same shapes on the wire.
//
// Semantics:
//   - onProgress may be nil; the function then behaves as a plain
//     Wait+terminal-classifier loop.
//   - onProgress is called synchronously from the polling loop, in the
//     order events appear in OperationJobStatusResponse.Progress.
//     Implementations must return quickly — typically by enqueueing
//     the event into a buffered channel or appending to a log slice.
//   - Each event is delivered exactly once across the lifetime of one
//     RunWithProgress call. The connector service publishes a
//     cumulative slice; we diff against the count of events seen so
//     far to avoid duplicating earlier events on each poll.
//   - Polling cadence is PollInterval (2s).
//
// On any path that does NOT see a terminal status — Status() error,
// ctx cancellation, or a final status that is neither complete /
// failed / cancelled — RunWithProgress issues a best-effort cancel
// against the server-side worker (otherwise it would hold the
// operation lock until the janitor reaped it) and wraps the failure
// in *WaitError. Callers that own inputs the worker might still be
// reading (e.g., presigned S3 URLs handed to a push job) check
// IsWaitError to decide whether premature cleanup is safe — see
// engine.shouldDeletePresignedPushObject.
func RunWithProgress(
	ctx context.Context,
	job *connectorsclient.OperationJob,
	onProgress observability.ProgressHandler,
) error {
	if job == nil {
		return errors.New("nil OperationJob handle")
	}

	const minPoll = 500 * time.Millisecond
	pollInterval := PollInterval
	if pollInterval < minPoll {
		pollInterval = minPoll
	}

	emittedSoFar := 0
	consecutiveStatusErrors := 0
	for {
		status, statusErr := job.Status(ctx)
		if statusErr != nil {
			retryErr := handleStatusPollError(ctx, job, statusErr, &consecutiveStatusErrors, pollInterval)
			if retryErr != nil {
				return retryErr
			}
			continue
		}
		consecutiveStatusErrors = 0

		// Stream new events to the handler before classifying the
		// terminal state — operators see the last few page / batch
		// events even on a failed run, which is exactly when those
		// events matter most for diagnosis.
		emittedSoFar = streamNewProgress(onProgress, status.Progress, emittedSoFar)

		if status.Status.IsTerminal() {
			return classifyTerminal(job, status)
		}

		select {
		case <-ctx.Done():
			bestEffortCancel(job)
			return &WaitError{Err: ctx.Err()}
		case <-time.After(pollInterval):
		}
	}
}

// handleStatusPollError applies the transient-failure tolerance to a
// failed /operation/status call. Returns a non-nil error if Run should
// give up and propagate; nil if Run should retry on the next iteration.
func handleStatusPollError(
	ctx context.Context,
	job *connectorsclient.OperationJob,
	statusErr error,
	consecutive *int,
	pollInterval time.Duration,
) error {
	// Context errors (cancel / deadline) are by definition not
	// transient — propagate immediately.
	if errors.Is(statusErr, context.Canceled) ||
		errors.Is(statusErr, context.DeadlineExceeded) {
		bestEffortCancel(job)
		return &WaitError{Err: statusErr}
	}
	*consecutive++
	if *consecutive >= MaxConsecutiveStatusPollErrors {
		bestEffortCancel(job)
		return &WaitError{
			Err: fmt.Errorf(
				"status poll failed %d consecutive times: %w",
				*consecutive, statusErr,
			),
		}
	}
	// Sleep one poll interval before retrying so we don't hammer a
	// recovering connector. A ctx cancel during the sleep aborts.
	select {
	case <-ctx.Done():
		bestEffortCancel(job)
		return &WaitError{Err: ctx.Err()}
	case <-time.After(pollInterval):
	}
	return nil
}

// streamNewProgress fans out progress events the caller has not yet
// seen. Returns the new "seen so far" count.
func streamNewProgress(
	onProgress observability.ProgressHandler,
	events []observability.ProgressEvent,
	emittedSoFar int,
) int {
	if onProgress == nil || emittedSoFar >= len(events) {
		return emittedSoFar
	}
	for _, evt := range events[emittedSoFar:] {
		onProgress(evt)
	}
	return len(events)
}

// classifyTerminal turns a terminal-state OperationJobStatusResponse
// into the final error Run returns. complete is success (nil error);
// failed / cancelled surface as a typed *JobFailedError; anything
// else (including pending/running which IsTerminal claims to have
// excluded) wraps in WaitError after a best-effort cancel — the
// connector worker may still be running.
func classifyTerminal(
	job *connectorsclient.OperationJob,
	status *irminmodels.OperationJobStatusResponse,
) error {
	switch status.Status {
	case irminmodels.OperationJobStatusComplete:
		return nil
	case irminmodels.OperationJobStatusFailed,
		irminmodels.OperationJobStatusCancelled:
		return &connectorsclient.JobFailedError{
			Status:  status.Status,
			Message: status.Error,
		}
	case irminmodels.OperationJobStatusPending,
		irminmodels.OperationJobStatusRunning:
		bestEffortCancel(job)
		return &WaitError{
			Err: fmt.Errorf(
				"operation job returned non-terminal status %q after IsTerminal=true",
				status.Status,
			),
		}
	default:
		bestEffortCancel(job)
		return &WaitError{
			Err: fmt.Errorf("operation job returned unknown terminal status %q", status.Status),
		}
	}
}
