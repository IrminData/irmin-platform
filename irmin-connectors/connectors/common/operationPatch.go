package common

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"log/slog"
	"net/http"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
	"github.com/gofiber/fiber/v3"
)

// PatchOperationProvider defines the interface for connector-specific
// patch operation handling.
//
// Under the async protocol the patch body runs in a worker goroutine
// detached from the fiber request lifecycle, so providers receive an
// explicit context.Context (derived from the job's cancel scope) and
// the preloaded *db.Operation rather than a fiber.Ctx.
type PatchOperationProvider interface {
	// InitializeClient initializes the database client for patch operations.
	InitializeClient(
		ctx context.Context,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, cleanup func(), err error)

	// ExecutePatchOperation executes a single patch operation within a transaction.
	ExecutePatchOperation(
		ctx context.Context,
		client any,
		op sdkmodels.PatchOperation,
		tableName, rowIdentifier, columnName string,
		fromDB, fromTable, fromRow, fromColumn string,
	) error
}

// HandleOperationPatch starts an async patch job and returns HTTP 202
// Accepted with {"job_id": "..."}. The patch body (upload parsing +
// per-operation execution) runs in a background worker owned by the
// JobManager; callers poll /operation/status/:job_id. Patch produces
// no result artifact — the status row is the success signal.
//
// The uploaded patch file is read in the HTTP goroutine before the
// worker is launched because fiber.Ctx is not safe to dereference once
// the response has been written.
func HandleOperationPatch(
	c fiber.Ctx,
	provider PatchOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
	app *models.ConnectorsApp,
) error {
	manager, managerOK := app.JobManager.(*JobManager)
	if !managerOK || manager == nil {
		return RespondJobError(
			c,
			fiber.StatusInternalServerError,
			sdkmodels.JobErrorReasonInternal,
			errors.New("job manager not configured"),
			"",
		)
	}

	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return RespondJobError(
			c,
			fiber.StatusInternalServerError,
			sdkmodels.JobErrorReasonInternal,
			errors.New("invalid operation type in context"),
			"",
		)
	}

	connectorName := resolveConnectorName(c)

	// Read the uploaded patch file + parse operations BEFORE the
	// guard so a malformed upload fails fast without holding the
	// advisory lock. fiber.Ctx is request-scoped; the worker cannot
	// reach back to c.FormFile once this handler returns.
	operations, parseErr := parsePatchOperations(c)
	if parseErr != nil {
		// Classify by status so clients can key off reason correctly:
		// 400 means the caller sent a bad request (missing/invalid
		// JSON file), 5xx means the server failed to read/open the
		// upload. Mixing them up would confuse retry logic that keys
		// off JobErrorBody.reason.
		reason := sdkmodels.JobErrorReasonInvalidRequest
		if parseErr.status >= fiber.StatusInternalServerError {
			reason = sdkmodels.JobErrorReasonInternal
		}
		return RespondJobError(
			c,
			parseErr.status,
			reason,
			parseErr.err,
			"",
		)
	}

	guard, alreadyErr, beginErr := manager.Begin(BeginOperationJobInput{
		OperationID:             operation.ID,
		ConnectorRegistrationID: operation.ConnectorRegistrationID,
		ConnectorName:           connectorName,
		Kind:                    operationKindPatch,
	})
	if alreadyErr != nil {
		return RespondAlreadyRunning(c, alreadyErr)
	}
	if beginErr != nil {
		logger.Error("failed to acquire operation execution lock",
			"error", beginErr, "operation_id", operation.ID)
		return RespondJobError(
			c,
			fiber.StatusInternalServerError,
			sdkmodels.JobErrorReasonTransientDB,
			beginErr,
			"",
		)
	}

	fn := buildPatchWorker(provider, logger, dbInstance, operation, operations)
	job := manager.StartJobWithGuard(guard, fn)

	return c.Status(fiber.StatusAccepted).JSON(sdkmodels.StartOperationJobResponse{
		JobID:          job.JobID,
		OperationToken: guard.OperationToken(),
	})
}

// patchParseError carries both the HTTP status and the underlying
// error so the handler can emit a differentiated 400 (bad upload) vs
// 500 (couldn't read form) without each parse-site duplicating the
// RespondJobError glue.
type patchParseError struct {
	status int
	err    error
}

// parsePatchOperations reads the uploaded "patches" file and
// unmarshals the JSON array into a slice of PatchOperation. All
// filesystem/body reads happen while fiber.Ctx is still live; the
// result is safely usable in a background worker.
func parsePatchOperations(c fiber.Ctx) ([]sdkmodels.PatchOperation, *patchParseError) {
	fileHeader, err := c.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		return nil, &patchParseError{
			status: fiber.StatusBadRequest,
			err:    errors.New("no JSON patch file uploaded with form field 'patches'"),
		}
	}
	if err != nil {
		return nil, &patchParseError{
			status: fiber.StatusInternalServerError,
			err:    fmt.Errorf("retrieve form file: %w", err),
		}
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, &patchParseError{
			status: fiber.StatusInternalServerError,
			err:    fmt.Errorf("open form file: %w", err),
		}
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, &patchParseError{
			status: fiber.StatusInternalServerError,
			err:    fmt.Errorf("read uploaded file: %w", err),
		}
	}

	var operations []sdkmodels.PatchOperation
	if err = json.Unmarshal(fileBytes, &operations); err != nil {
		return nil, &patchParseError{
			status: fiber.StatusBadRequest,
			err:    fmt.Errorf("parse JSON patch operations: %w", err),
		}
	}
	return operations, nil
}

// buildPatchWorker composes the WorkerFunc the JobManager runs for a
// patch job. Operations are applied sequentially; on first failure the
// worker returns the error (which the JobManager surfaces via job
// status=failed) and subsequent ops are not applied. Already-applied
// ops are NOT rolled back — patch is best-effort, same semantic as the
// sync-era handler, but now the failure is observable on the job row
// rather than in a discarded HTTP response.
//
//nolint:gocognit // Patch operation handling requires multiple validation and processing steps
func buildPatchWorker(
	provider PatchOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
	operation *db.Operation,
	operations []sdkmodels.PatchOperation,
) WorkerFunc {
	return func(
		ctx context.Context,
		appendProgress func(sdkprogress.ProgressEvent),
		_ string,
	) error {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Patch operation execution started",
			nil,
		)

		// Baseline heartbeat — patch over many ops can run minutes
		// silently, and the janitor's stuck-reclaim pass needs to see
		// updated_at bumps to tell "live worker" from "crashed worker".
		heartbeatStop := make(chan struct{})
		go startJobHeartbeat(ctx, "operation/patch", appendProgress, heartbeatStop)
		defer close(heartbeatStop)

		client, cleanup, err := provider.InitializeClient(ctx, logger, operation)
		if err != nil {
			LogOperationEvent(
				dbInstance,
				logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to initialize database client for patch operation",
				map[string]any{"error": err.Error()},
			)
			return fmt.Errorf("initialize client: %w", err)
		}
		defer cleanup()

		for i, op := range operations {
			if ctxErr := ctx.Err(); ctxErr != nil {
				return ctxErr
			}

			_, tableName, rowIdentifier, columnName := utils.ExtractPathComponents(op.Path)

			var fromDB, fromTable, fromRow, fromColumn string
			if op.Op == "move" || op.Op == "copy" {
				if op.From == nil {
					LogOperationEvent(
						dbInstance,
						logger,
						operation.ID,
						db.LogEventTypeError,
						"Move or copy operation missing 'from' field",
						map[string]any{
							"operation": op.Op,
							"path":      op.Path,
						},
					)
					return fmt.Errorf("move and copy operations require a 'from' field (op index %d)", i)
				}
				fromDB, fromTable, fromRow, fromColumn = utils.ExtractPathComponents(*op.From)
			}

			isBinary := utils.IsBinaryContentType(op.ContentType)
			if isBinary {
				contentType := ""
				if op.ContentType != nil {
					contentType = *op.ContentType
				}
				LogOperationEvent(
					dbInstance,
					logger,
					operation.ID,
					db.LogEventTypeInfo,
					"Processing binary patch operation",
					map[string]any{
						"operation":    op.Op,
						"path":         op.Path,
						"content_type": contentType,
					},
				)
			}

			if err = provider.ExecutePatchOperation(
				ctx, client, op, tableName, rowIdentifier, columnName,
				fromDB, fromTable, fromRow, fromColumn,
			); err != nil {
				LogOperationEvent(
					dbInstance,
					logger,
					operation.ID,
					db.LogEventTypeError,
					"Failed to execute patch operation",
					map[string]any{
						"error":            err.Error(),
						"operation":        op.Op,
						"path":             op.Path,
						"is_binary":        isBinary,
						"operation_index":  i,
						"total_operations": len(operations),
					},
				)
				return fmt.Errorf("execute patch op %d: %w", i, err)
			}
		}

		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Patch operation completed successfully",
			map[string]any{
				"operation_count": len(operations),
			},
		)
		return nil
	}
}

// NotSupportedPatchProvider provides a default implementation for connectors that don't support patch operations.
type NotSupportedPatchProvider struct{}

// InitializeClient returns an error indicating patch operations are not supported.
func (p *NotSupportedPatchProvider) InitializeClient(
	_ context.Context,
	_ *slog.Logger,
	_ *db.Operation,
) (any, func(), error) {
	return nil, func() {}, errors.New("patch operations are not supported by this connector")
}

// ExecutePatchOperation returns an error indicating patch operations are not supported.
func (p *NotSupportedPatchProvider) ExecutePatchOperation(
	_ context.Context,
	_ any,
	_ sdkmodels.PatchOperation,
	_, _, _ string,
	_, _, _, _ string,
) error {
	return errors.New("patch operations are not supported by this connector")
}

// HandleNotSupportedPatch provides a common handler for connectors that don't support patch operations.
func HandleNotSupportedPatch(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support patch operations.",
	})
}
