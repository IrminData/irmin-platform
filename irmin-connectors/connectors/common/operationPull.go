package common

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"log/slog"
	"os"
	"strings"
	"time"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
	"github.com/gofiber/fiber/v3"
)

// PullOperationProvider defines the interface for connector-specific pull operation handling.
//
// Under the async protocol the pull body runs in a worker goroutine
// detached from the fiber request lifecycle, so providers receive an
// explicit context.Context (derived from the job's cancel scope) and
// the preloaded *db.Operation rather than a fiber.Ctx. Providers that
// previously grabbed these off c.Context() / c.Locals("operation")
// inside each method are adjusted to accept them as arguments.
type PullOperationProvider interface {
	// InitializeClient initializes the client for pull operations.
	// ctx is the job-scoped context — cancellation flows to the
	// underlying vendor client via this ctx when the job is
	// cancelled.
	InitializeClient(
		ctx context.Context,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)

	// GetAllFiles retrieves all available data as files.
	GetAllFiles(
		ctx context.Context,
		client any,
		operation *db.Operation,
	) (filePaths []string, fileContents [][]byte, err error)

	// GetFileByPath retrieves a specific file by path.
	GetFileByPath(
		ctx context.Context,
		client any,
		operation *db.Operation,
		path string,
	) (filePath string, fileContent []byte, err error)

	// ProgressHandler returns the observability callback this
	// provider wires into its client for per-page / per-batch /
	// per-file events.
	ProgressHandler(operation *db.Operation) ProgressHandler
}

// PullByPathMultiProvider is an optional capability mixin. A connector
// implements it when a single path can resolve to multiple output files
// (e.g. a folder of PDFs in a cloud-storage connector). The framework
// prefers GetFilesByPath over GetFileByPath via a type assertion in
// collectPullResults, so existing single-file implementations are
// unaffected — they simply don't satisfy this interface.
//
// Contract: the returned filePaths and fileContents slices MUST have
// the same length, paired by index. collectPullResults validates this
// and surfaces a job error rather than panicking on mismatch.
type PullByPathMultiProvider interface {
	GetFilesByPath(
		ctx context.Context,
		client any,
		operation *db.Operation,
		path string,
	) (filePaths []string, fileContents [][]byte, err error)
}

// HandleOperationPull starts an async pull job and returns
// HTTP 202 Accepted with {"job_id": "..."}. The actual pull runs in a
// background worker owned by the app's JobManager; callers poll
// /operation/status/:job_id and fetch /operation/result/:job_id when
// it reaches status=complete.
//
// Streaming is intentionally avoided here. The pre-async handler
// buffered the full zip in memory because SendStreamWriter's callback
// runs after the handler returns, which deadlocks against the
// session-scoped advisory lock held by WithOperationExecutionLock.
// Under the async protocol we go one step further: the zip is written
// to a tmpfile inside the worker goroutine and served from disk via
// /operation/result/:job_id, so neither the accept path nor the
// result path holds the advisory lock across a long file transfer.
func HandleOperationPull(
	c fiber.Ctx,
	provider PullOperationProvider,
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

	// Parse form fields up front so the accept response can fail
	// fast on a malformed request (path is optional; the provider
	// decides). Extra form fields are captured as a map so the
	// provider gets them inside the worker. Done before Begin so
	// we don't take the lock and then reject the request on a bad
	// form field.
	rawPath, formFields, err := parsePullFormFields(c)
	if err != nil {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			err,
			"",
		)
	}

	guard, alreadyErr, err := manager.Begin(BeginOperationJobInput{
		OperationID:             operation.ID,
		ConnectorRegistrationID: operation.ConnectorRegistrationID,
		ConnectorName:           connectorName,
		Kind:                    operationKindPull,
	})
	if alreadyErr != nil {
		return RespondAlreadyRunning(c, alreadyErr)
	}
	if err != nil {
		logger.Error("failed to acquire operation execution lock", "error", err, "operation_id", operation.ID)
		return RespondJobError(
			c,
			fiber.StatusInternalServerError,
			sdkmodels.JobErrorReasonTransientDB,
			err,
			"",
		)
	}

	fn := buildPullWorker(provider, logger, dbInstance, operation, rawPath, formFields)
	job := manager.StartJobWithGuard(guard, fn)

	return c.Status(fiber.StatusAccepted).JSON(sdkmodels.StartOperationJobResponse{
		JobID:          job.JobID,
		OperationToken: guard.OperationToken(),
	})
}

// resolveConnectorName pulls the connector identifier out of request
// context and force-lowercases the result so OperationJob.ConnectorName
// is canonical regardless of which signal was available. The fallback
// order is middleware-stamped connector info → registration label →
// route slug. connectorInfo wins because it survives the route layout —
// a future shared prefix (an API version like /v1/pinecone/...) or a
// hand-mounted hand-wired route would mis-identify the connector if we
// keyed off the path's first segment. The route slug stays as the last
// resort so tests and any path that bypasses the validate middleware
// still get a sensible label.
//
// All three signals produce different casings in the wild — slugs are
// lowercase, info.Name is "Pinecone", registration labels vary — so the
// strings.ToLower on each path is what makes the column safe for
// downstream filters / log greps / dashboards. Existing mixed-case rows
// from before this PR live their 15-min OperationJob TTL and disappear,
// so the column converges on a single canonical casing.
func resolveConnectorName(c fiber.Ctx) string {
	if info, ok := c.Locals("connectorInfo").(*models.ConnectorDetails); ok &&
		info != nil &&
		strings.TrimSpace(info.Name) != "" {
		return strings.ToLower(info.Name)
	}
	if registration, ok := c.Locals("registration").(*db.ConnectorRegistration); ok &&
		registration != nil &&
		strings.TrimSpace(registration.ConnectorName) != "" {
		return strings.ToLower(registration.ConnectorName)
	}
	if firstSegment := strings.Split(strings.Trim(c.Path(), "/"), "/")[0]; firstSegment != "" {
		return strings.ToLower(firstSegment)
	}
	return ""
}

// parsePullFormFields captures the path and any additional form
// fields. Extra captures whatever the connector provider may consume
// inside the worker — the common handler doesn't look at them, but
// they need to be lifted out of the request context now because
// Fiber's request body is not safe to read from a background
// goroutine.
func parsePullFormFields(c fiber.Ctx) (string, map[string]string, error) {
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		return "", nil, err
	}
	// ParseFormFields only returns the fields we asked about. That
	// matches the legacy handler's shape, and the worker re-reads
	// additional fields from c.Locals / fiber's form as needed —
	// the providers currently only inspect "path", so an
	// additional-fields map is reserved for future extensions.
	return fields["path"], fields, nil
}

// buildPullWorker composes the WorkerFunc the JobManager runs. The
// closure holds references to the provider, the request-time fiber
// context (captured so providers that inspect c.Locals still work),
// and the parsed form fields. The worker body runs outside the fiber
// request lifecycle, so every reference it reaches must be safe to
// dereference after the accept response has been written — providers
// that rely on c.Locals for values other than "operation" need to
// ensure those values are also pre-captured here in the future.
//
// Unlike the pre-guard implementation this no longer takes the
// advisory lock internally — JobManager.Begin now holds it on the
// guard's pinned PG session for the whole job lifetime. The
// worker purely runs provider code.
func buildPullWorker(
	provider PullOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
	operation *db.Operation,
	rawPath string,
	_ map[string]string,
) WorkerFunc {
	return func(
		ctx context.Context,
		appendProgress func(sdkprogress.ProgressEvent),
		resultPath string,
	) error {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Pull operation execution started",
			nil,
		)

		// Heartbeat — fires every heartbeatInterval for the
		// duration of the job so idle clients still see motion in
		// the progress slice even when the provider's own handler
		// is silent. The heartbeat goes through appendProgress →
		// UpdateOperationJobProgress, which bumps updated_at and
		// keeps the janitor's stuck-reclaim pass from false-
		// positiving on live-but-quiet workers.
		heartbeatStop := make(chan struct{})
		go startJobHeartbeat(ctx, "operation/pull", appendProgress, heartbeatStop)
		defer close(heartbeatStop)

		// Inject the job's appendProgress into ctx so that
		// NewProgressHandlerWithContext — called from every
		// provider's InitializeClient via NewProgressHandler — picks
		// it up and fans every vendor-originated page / batch /
		// rate-limit event into the job's cumulative Progress slice.
		// The provider's own OperationLog path is unchanged; this is
		// purely an additional sink.
		jobCtx := WithJobProgress(ctx, appendProgress)

		client, _, cleanup, err := provider.InitializeClient(jobCtx, logger, operation)
		if err != nil {
			LogOperationEvent(
				dbInstance,
				logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to initialize client for pull operation",
				map[string]any{"error": err.Error()},
			)
			return fmt.Errorf("initialize client: %w", err)
		}
		defer cleanup()

		resultFiles, err := collectPullResults(jobCtx, provider, client, operation, rawPath, dbInstance, logger)
		if err != nil {
			return err
		}

		if writeErr := writeZipToPath(resultPath, resultFiles); writeErr != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to write zip archive for pull operation",
				map[string]any{"error": writeErr.Error()},
			)
			return writeErr
		}

		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Pull operation completed successfully",
			map[string]any{
				"file_count": len(resultFiles),
				"path":       rawPath,
			},
		)
		return nil
	}
}

// collectPullResults dispatches to GetAllFiles or GetFileByPath based
// on rawPath and returns the file map. Honours ctx cancellation via
// an early check — providers themselves are expected to consult ctx
// too, but a short-circuit here avoids doing any work if the job was
// cancelled before the worker ran far enough to call the provider.
func collectPullResults(
	ctx context.Context,
	provider PullOperationProvider,
	client any,
	operation *db.Operation,
	rawPath string,
	dbInstance *db.Database,
	logger *slog.Logger,
) (map[string][]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	resultFiles := make(map[string][]byte)
	if rawPath == "" {
		paths, contents, err := provider.GetAllFiles(ctx, client, operation)
		if err != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to get all files during pull operation",
				map[string]any{"error": err.Error()},
			)
			return nil, fmt.Errorf("get all files: %w", err)
		}
		for i, p := range paths {
			resultFiles[p] = contents[i]
		}
		return resultFiles, nil
	}

	// Prefer GetFilesByPath when the provider implements it — a single
	// path can resolve to multiple output files (e.g. a folder pull in
	// a cloud-storage connector). Providers without this capability
	// fall back to the original single-file path.
	if multi, ok := provider.(PullByPathMultiProvider); ok {
		paths, contents, err := multi.GetFilesByPath(ctx, client, operation, rawPath)
		if err != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to get files by path during pull operation",
				map[string]any{"error": err.Error(), "path": rawPath},
			)
			return nil, fmt.Errorf("get files by path: %w", err)
		}
		if len(paths) != len(contents) {
			// Defensive: a misbehaving provider must not panic the worker.
			// The interface contract is now documented to require
			// equal-length slices; surface a job error so the failure is
			// visible instead of an index-out-of-range crash.
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Provider returned mismatched paths/contents lengths",
				map[string]any{
					"paths_len":    len(paths),
					"contents_len": len(contents),
					"path":         rawPath,
				},
			)
			return nil, fmt.Errorf(
				"get files by path: provider returned %d paths but %d contents",
				len(paths), len(contents),
			)
		}
		for i, p := range paths {
			resultFiles[p] = contents[i]
		}
		return resultFiles, nil
	}

	path, content, err := provider.GetFileByPath(ctx, client, operation, rawPath)
	if err != nil {
		LogOperationEvent(
			dbInstance, logger, operation.ID,
			db.LogEventTypeError,
			"Failed to get file during pull operation",
			map[string]any{"error": err.Error(), "path": rawPath},
		)
		return nil, fmt.Errorf("get file by path: %w", err)
	}
	resultFiles[path] = content
	return resultFiles, nil
}

// writeZipToPath streams the collected files into a zip at dest. If
// an error occurs mid-way the partial file is removed so the result
// endpoint's stat check surfaces 410 rather than serving a corrupted
// zip.
func writeZipToPath(dest string, files map[string][]byte) error {
	f, err := os.Create(dest)
	if err != nil {
		return fmt.Errorf("create result file: %w", err)
	}
	cleanup := func(closeErr error) error {
		if cerr := f.Close(); cerr != nil && closeErr == nil {
			closeErr = cerr
		}
		if closeErr != nil {
			_ = os.Remove(dest)
		}
		return closeErr
	}

	zw := zip.NewWriter(f)
	for filePath, content := range files {
		entry, createErr := zw.Create(filePath)
		if createErr != nil {
			_ = zw.Close()
			return cleanup(fmt.Errorf("create zip entry %q: %w", filePath, createErr))
		}
		if _, writeErr := entry.Write(content); writeErr != nil {
			_ = zw.Close()
			return cleanup(fmt.Errorf("write zip entry %q: %w", filePath, writeErr))
		}
	}
	if closeErr := zw.Close(); closeErr != nil {
		return cleanup(fmt.Errorf("close zip writer: %w", closeErr))
	}
	return cleanup(nil)
}

// startJobHeartbeat emits a ProgressKindHeartbeat every
// heartbeatInterval until stop is closed or ctx is cancelled. Mirrors
// the pre-async startHeartbeat but targets the job's progress slice
// instead of the OperationLog directly.
func startJobHeartbeat(
	ctx context.Context,
	resourcePath string,
	appendProgress func(sdkprogress.ProgressEvent),
	stop <-chan struct{},
) {
	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-stop:
			return
		case <-ticker.C:
			appendProgress(sdkprogress.ProgressEvent{
				Kind:         sdkprogress.ProgressKindHeartbeat,
				ResourcePath: resourcePath,
			})
		}
	}
}

// NotSupportedPullProvider provides a default implementation for connectors that don't support pull operations.
type NotSupportedPullProvider struct{}

// InitializeClient returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) InitializeClient(
	_ context.Context,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New(
		"pull operations are not supported by this connector",
	)
}

// GetAllFiles returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) GetAllFiles(
	_ context.Context,
	_ any,
	_ *db.Operation,
) ([]string, [][]byte, error) {
	return nil, nil, errors.New(
		"pull operations are not supported by this connector",
	)
}

// GetFileByPath returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) GetFileByPath(
	_ context.Context,
	_ any,
	_ *db.Operation,
	_ string,
) (string, []byte, error) {
	return "", nil, errors.New(
		"pull operations are not supported by this connector",
	)
}

// ProgressHandler returns nil — providers that reject every pull call have nothing to observe.
func (p *NotSupportedPullProvider) ProgressHandler(_ *db.Operation) ProgressHandler {
	return nil
}

// HandleNotSupportedPull provides a common handler for connectors that don't support pull operations.
func HandleNotSupportedPull(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support pull operations.",
	})
}
