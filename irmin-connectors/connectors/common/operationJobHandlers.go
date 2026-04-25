package common

import (
	"crypto/subtle"
	"errors"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"os"
	"strings"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// RegisterJobHandlers mounts the top-level async-job HTTP endpoints on
// the provided fiber app. Called from main at startup, once. Routes
// are top-level (not under a connector slug) because the SDK client
// addresses them by job_id alone — the connector slug is a server-side
// detail that lives inside the persisted OperationJob row.
//
// Routes:
//
//	GET  /operation/status/:job_id   — job status snapshot
//	GET  /operation/result/:job_id   — result zip stream (409 until ready)
//	POST /operation/cancel/:job_id   — cancel an in-flight job
//
// All routes require the operation token associated with the job's
// backing operation row (Authorization: Bearer <operation-token>).
// The job_id remains opaque, but is no longer an auth secret.
func RegisterJobHandlers(app *fiber.App, connectorsApp *models.ConnectorsApp) {
	manager := mustJobManager(connectorsApp)
	operationStore := mustOperationStore(connectorsApp)

	registerJobHandlers(app, manager, operationStore)
}

type operationStore interface {
	GetOperationByID(id uint) (*db.Operation, error)
}

func mustOperationStore(app *models.ConnectorsApp) operationStore {
	if app.DB == nil {
		panic("operation job handlers require app.DB to be initialized")
	}
	return app.DB
}

func registerJobHandlers(app *fiber.App, manager *JobManager, operationStore operationStore) {
	auth := func(c fiber.Ctx) error {
		return validateJobOperationToken(c, manager, operationStore)
	}
	app.Get("/operation/status/:job_id", auth, func(c fiber.Ctx) error {
		return handleJobStatus(c, manager)
	})
	app.Get("/operation/result/:job_id", auth, func(c fiber.Ctx) error {
		return handleJobResult(c, manager)
	})
	app.Post("/operation/cancel/:job_id", auth, func(c fiber.Ctx) error {
		return handleJobCancel(c, manager)
	})
}

func validateJobOperationToken(c fiber.Ctx, manager *JobManager, operationStore operationStore) error {
	jobID := c.Params("job_id")
	if jobID == "" {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			errors.New("job_id is required"),
			"",
		)
	}

	token := strings.TrimSpace(c.Get("Authorization"))
	token = strings.TrimSpace(strings.TrimPrefix(token, "Bearer "))
	if token == "" {
		return RespondJobError(
			c,
			fiber.StatusUnauthorized,
			sdkmodels.JobErrorReasonInvalidRequest,
			errors.New("missing bearer token"),
			jobID,
		)
	}

	row, err := manager.getJob(jobID)
	if err != nil {
		status, reason := ClassifyJobReadError(err)
		return RespondJobError(c, status, reason, err, jobID)
	}

	operation, err := operationStore.GetOperationByID(row.OperationID)
	if err != nil {
		status, reason := ClassifyJobReadError(err)
		return RespondJobError(c, status, reason, err, jobID)
	}

	if subtle.ConstantTimeCompare([]byte(token), []byte(operation.Token)) != 1 {
		return RespondJobError(
			c,
			fiber.StatusUnauthorized,
			sdkmodels.JobErrorReasonInvalidRequest,
			errors.New("unauthorized"),
			jobID,
		)
	}

	return c.Next()
}

// mustJobManager pulls the *JobManager off the app or panics with a
// descriptive message. A misconfigured startup would otherwise
// surface as a silent 500 on the first poll.
func mustJobManager(app *models.ConnectorsApp) *JobManager {
	manager, ok := app.JobManager.(*JobManager)
	if !ok || manager == nil {
		panic("operation job handlers require app.JobManager to be a *common.JobManager")
	}
	return manager
}

// handleJobStatus serves GET /operation/status/:job_id. Returns the
// SDK's OperationJobStatusResponse shape. The cumulative progress
// slice comes from the manager's live in-memory snapshot so a poll
// arriving between an append and the DB flush doesn't lose events.
func handleJobStatus(c fiber.Ctx, manager *JobManager) error {
	jobID := c.Params("job_id")
	if jobID == "" {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			errors.New("job_id is required"),
			"",
		)
	}

	row, progress, err := manager.Snapshot(jobID)
	if err != nil {
		status, reason := ClassifyJobReadError(err)
		return RespondJobError(c, status, reason, err, jobID)
	}

	response := sdkmodels.OperationJobStatusResponse{
		JobID:    row.JobID,
		Status:   sdkmodels.OperationJobStatus(row.Status),
		Progress: progress,
		Error:    row.Error,
	}
	return c.Status(fiber.StatusOK).JSON(response)
}

// handleJobResult serves GET /operation/result/:job_id. Streams the
// zip via http.ServeFile semantics (Fiber's SendFile) once the job is
// complete; returns 409 Conflict until the worker has written the
// file, 404 for an unknown job, and 410 Gone when the result file is
// missing on disk even though the row says complete (i.e., the
// janitor reaped it early or the tmpfs was wiped).
func handleJobResult(c fiber.Ctx, manager *JobManager) error {
	jobID := c.Params("job_id")
	if jobID == "" {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			errors.New("job_id is required"),
			"",
		)
	}

	row, _, err := manager.Snapshot(jobID)
	if err != nil {
		status, reason := ClassifyJobReadError(err)
		return RespondJobError(c, status, reason, err, jobID)
	}

	if row.Status != string(sdkmodels.OperationJobStatusComplete) {
		// 409 is the SDK-contracted "not ready" signal. Core's poll
		// wrapper treats this as "keep polling status"; any other
		// non-2xx is a hard error. Deliberately NOT wrapped as a
		// JobErrorBody — the SDK client keys off 409 to return
		// ErrResultNotReady, which would be muddled if the body
		// carried a retry-advisory reason.
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error":  "job not ready",
			"status": row.Status,
		})
	}

	if row.ResultPath == "" {
		if row.Kind == operationKindPull {
			// Distinct from the os.Stat 410 below: that path means the
			// file existed on disk and was reaped (TTL signal). This
			// path means the worker reached status=complete without
			// ever populating ResultPath — a worker bug, not a TTL
			// expiry. Operators should be able to tell them apart in
			// the connector logs.
			return c.Status(fiber.StatusGone).JSON(fiber.Map{
				"error": "result path not recorded",
			})
		}
		// Some operation kinds (push, patch, schema) have no artifact —
		// their success signal is status=complete on the job row, not a
		// downloadable file. Surface 204 No Content so the SDK client
		// distinguishes "succeeded, nothing to download" from "result
		// expired" (410) or "not ready yet" (409).
		return c.SendStatus(fiber.StatusNoContent)
	}
	if _, statErr := os.Stat(row.ResultPath); statErr != nil {
		// The DB still claims we have a zip, but it's gone from
		// disk. Treat as expired / reaped early and surface 410 so
		// Core emits a distinct operator message instead of a
		// confusing "success" + empty body.
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"error": "result expired",
		})
	}

	c.Set(fiber.HeaderContentType, "application/zip")
	c.Set(
		fiber.HeaderContentDisposition,
		`attachment; filename="result.zip"`,
	)
	return c.SendFile(row.ResultPath)
}

// handleJobCancel serves POST /operation/cancel/:job_id. Cancel is
// fire-and-forget: a 200 means "we have signalled the worker", not
// "the worker has already exited". Unknown job IDs return 404.
//
// The 200 body carries the SDK's CancelOperationJobResponse shape,
// including was_active so callers can distinguish "we signalled a
// running worker" from "no-op against a terminal row".
func handleJobCancel(c fiber.Ctx, manager *JobManager) error {
	jobID := c.Params("job_id")
	if jobID == "" {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			errors.New("job_id is required"),
			"",
		)
	}

	// Check the row exists first so unknown IDs get a clean 404
	// instead of a 200 for silently no-opping. Cancel()'s in-memory
	// map lookup returns false for both "unknown" and "already
	// reaped", so we need the store check to disambiguate.
	if _, err := manager.getJob(jobID); err != nil {
		status, reason := ClassifyJobReadError(err)
		return RespondJobError(c, status, reason, err, jobID)
	}

	// manager.CancelWithOutcome reports whether a live worker was
	// actually signalled. Callers use this (via WasActive on the
	// response) to tell "we cancelled a running worker" apart from
	// "no-op against a terminal / already-reaped row".
	active, _ := manager.CancelWithOutcome(jobID)

	// Re-read the row AFTER cancel so the response status reflects
	// the state post-signal rather than a pre-cancel snapshot. For
	// already-terminal rows this is the same row; for in-flight
	// workers the ctx cancellation may not have fully propagated yet
	// and the status will still read "running", which the SDK
	// documents as the expected behaviour when WasActive=true
	// (cancel is fire-and-forget; poll /operation/status to observe
	// the terminal transition). Best-effort: if the re-read fails we
	// fall back to the pre-cancel row status rather than failing the
	// whole response — cancel already succeeded at the signal layer.
	response := sdkmodels.CancelOperationJobResponse{
		JobID:     jobID,
		WasActive: active,
		Message:   "cancellation requested",
	}
	if fresh, freshErr := manager.getJob(jobID); freshErr == nil {
		response.Status = sdkmodels.OperationJobStatus(fresh.Status)
	}
	return c.Status(fiber.StatusOK).JSON(response)
}
