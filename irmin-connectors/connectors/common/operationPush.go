package common

import (
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// presignedDownloadTimeout is the maximum time allowed for downloading a file from a presigned URL.
const presignedDownloadTimeout = 10 * time.Minute

// dnsLookupTimeout is the maximum time allowed for resolving a hostname during SSRF validation.
const dnsLookupTimeout = 5 * time.Second

// maxPresignedRedirects is the maximum number of HTTP redirects allowed when downloading from a presigned URL.
const maxPresignedRedirects = 10

// maxDirectUploadSize is the maximum allowed size for direct file uploads (500 MB).
const maxDirectUploadSize = 500 * 1024 * 1024

// maxPresignedDownloadBytes is the maximum file size accepted from a presigned URL download (5 GB).
const maxPresignedDownloadBytes int64 = 5 * 1024 * 1024 * 1024

// maxDecompressedEntryBytes is the maximum decompressed size per zip entry (1 GB).
// Prevents zip bomb attacks where a small compressed entry expands to exhaust memory.
const maxDecompressedEntryBytes int64 = 1024 * 1024 * 1024

// maxTotalDecompressedBytes is the maximum total decompressed size across all zip entries (5 GB).
// Prevents zip bombs with many small entries that collectively exhaust memory.
const maxTotalDecompressedBytes int64 = 5 * 1024 * 1024 * 1024

// PushOperationProvider defines the interface for connector-specific
// push operation handling.
//
// Under the async protocol the push body runs in a worker goroutine
// detached from the fiber request lifecycle, so providers receive an
// explicit context.Context (derived from the job's cancel scope) and
// the preloaded *db.Operation rather than a fiber.Ctx. Providers that
// previously reached for c.Locals("operation") or c.Context() inside
// each method now get both passed in explicitly.
type PushOperationProvider interface {
	// InitializeClient initializes the client for push operations.
	// ctx is the job-scoped context — cancellation flows to the
	// underlying vendor client via this ctx when the job is cancelled.
	InitializeClient(
		ctx context.Context,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)

	// ProcessFiles processes the extracted files and uploads/inserts
	// them. Must honour ctx — long-running inserts/uploads should pass
	// ctx through to the underlying driver so /operation/cancel takes
	// effect.
	ProcessFiles(
		ctx context.Context,
		client any,
		operation *db.Operation,
		files map[string][]byte,
		targetPath string,
	) error

	// ProgressHandler returns the observability callback this
	// provider wires into its client for per-batch / per-file
	// events. Return nil only if the underlying operations are
	// short enough not to need progress events — the common push
	// worker always wraps the provider call with a baseline
	// heartbeat, so returning nil does not leave the operation
	// silent.
	ProgressHandler(operation *db.Operation) ProgressHandler
}

// HandleOperationPush starts an async push job and returns HTTP 202
// Accepted with {"job_id": "..."}. The actual push runs in a
// background worker owned by the app's JobManager; callers poll
// /operation/status/:job_id and observe status=complete when the job
// finishes. Push produces no result artifact so /operation/result
// returns 204 No Content; the status row alone is the success signal.
//
// The request body (file upload or presigned URL) is consumed in the
// HTTP goroutine before the worker is launched because fiber.Ctx is
// not safe to dereference once the response has been written. Form
// parsing failures surface as structured 4xx before the guard is
// taken, so a malformed request does not hold the lock.
func HandleOperationPush(
	c fiber.Ctx,
	provider PushOperationProvider,
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

	// Parse form fields + materialise the upload BEFORE taking the
	// guard. fiber.Ctx is bound to the HTTP request goroutine; once
	// this handler returns, the body reader is gone and any worker
	// reaching for it crashes. Both error paths fail the request with
	// a 4xx before any DB row exists — no lock held, no cleanup owed.
	fields, parseErr := utils.ParseFormFields(c, nil, []string{"path"})
	if parseErr != nil {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			fmt.Errorf("parse form fields: %w", parseErr),
			"",
		)
	}
	rawPath := fields["path"]

	source, srcErr := acquirePushSource(c)
	if srcErr != nil {
		return RespondJobError(
			c,
			fiber.StatusBadRequest,
			sdkmodels.JobErrorReasonInvalidRequest,
			srcErr,
			"",
		)
	}

	guard, alreadyErr, beginErr := manager.Begin(BeginOperationJobInput{
		OperationID:             operation.ID,
		ConnectorRegistrationID: operation.ConnectorRegistrationID,
		ConnectorName:           connectorName,
		Kind:                    operationKindPush,
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

	fn := buildPushWorker(provider, logger, dbInstance, operation, source, rawPath)
	job := manager.StartJobWithGuard(guard, fn)

	return c.Status(fiber.StatusAccepted).JSON(sdkmodels.StartOperationJobResponse{
		JobID:          job.JobID,
		OperationToken: guard.OperationToken(),
	})
}

// pushSource captures one of two ways the worker will obtain the
// files to push. Direct-upload files have to be pre-extracted in the
// HTTP request goroutine because fiber.Ctx's body reader is invalid
// once the handler returns. The presigned-URL path is just a string
// — the actual S3 download happens inside the worker so the 202
// response is not held up by a multi-minute fetch and concurrent
// duplicate requests don't each pay the full download cost before
// one of them is rejected with 409.
type pushSource struct {
	// files holds the pre-extracted zip contents. Set when the
	// caller used the multipart `file` field. nil when presignedURL
	// is set instead.
	files map[string][]byte

	// presignedURL is the URL the worker should fetch the zip from.
	// Set when the caller passed `presigned_url`; nil otherwise.
	presignedURL string
}

// buildPushWorker composes the WorkerFunc the JobManager runs for a
// push job. The worker body runs outside the fiber request lifecycle,
// so every value it dereferences (source, operation, provider) is
// pre-captured from the HTTP goroutine. Providers MUST NOT reach for
// fiber.Ctx state from inside the worker.
//
// When the caller supplied a presigned URL, the actual S3 download
// happens inside the worker rather than in the HTTP goroutine. This
// keeps the 202 response fast even on a slow connector and prevents
// concurrent duplicate requests from each paying the full 10-minute
// download cost before one of them is rejected with 409.
//
// Push has no result artifact — the worker returns nil on success and
// does not write to resultPath. /operation/result handles this by
// returning 204 No Content when the status row says complete and
// ResultPath is empty.
func buildPushWorker(
	provider PushOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
	operation *db.Operation,
	source pushSource,
	rawPath string,
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
			"Push operation execution started",
			nil,
		)

		// Heartbeat — push can silently spend minutes inside
		// ProcessFiles (bulk inserts, large uploads) so a floor-level
		// cadence keeps the progress slice moving and the janitor's
		// stuck-reclaim pass from false-positiving.
		heartbeatStop := make(chan struct{})
		go startJobHeartbeat(ctx, "operation/push", appendProgress, heartbeatStop)
		defer close(heartbeatStop)

		// Inject the job's appendProgress into ctx so that
		// NewProgressHandlerWithContext picks it up and fans every
		// vendor-originated batch / file event into the job's
		// cumulative Progress slice. Mirrors the pull worker — the
		// provider's OperationLog path is unchanged; this is purely
		// an additional sink.
		jobCtx := WithJobProgress(ctx, appendProgress)

		// Materialise the files inside the worker. Direct-upload
		// callers passed pre-extracted bytes; presigned-URL callers
		// only passed the URL — fetching it here keeps the original
		// 202 response fast and lets two duplicate concurrent calls
		// hit the 409-already-running guard before either pays the
		// full S3 download cost.
		files, srcErr := source.materialize(jobCtx)
		if srcErr != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to acquire push source",
				map[string]any{"error": srcErr.Error()},
			)
			return fmt.Errorf("acquire push source: %w", srcErr)
		}

		client, _, cleanup, err := provider.InitializeClient(jobCtx, logger, operation)
		if err != nil {
			LogOperationEvent(
				dbInstance,
				logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to initialize client for push operation",
				map[string]any{"error": err.Error()},
			)
			return fmt.Errorf("initialize client: %w", err)
		}
		defer cleanup()

		if procErr := provider.ProcessFiles(jobCtx, client, operation, files, rawPath); procErr != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to process files during push operation",
				map[string]any{"error": procErr.Error(), "path": rawPath},
			)
			return fmt.Errorf("process files: %w", procErr)
		}

		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Push operation completed successfully",
			map[string]any{
				"file_count": len(files),
				"path":       rawPath,
			},
		)
		return nil
	}
}

// materialize resolves a pushSource into the actual file map. Direct
// uploads return the pre-extracted contents unchanged; presigned-URL
// sources fetch from S3 here, inside the worker goroutine, so the HTTP
// 202 path stays fast. The worker's ctx (job-scoped, cancelled by
// /operation/cancel/:job_id) is threaded through so a cancel issued
// while the URL download is still in flight aborts the fetch instead
// of letting it run to the 10-minute presignedDownloadTimeout ceiling.
func (s pushSource) materialize(ctx context.Context) (map[string][]byte, error) {
	if s.files != nil {
		return s.files, nil
	}
	if s.presignedURL == "" {
		return nil, errors.New("push source has neither files nor presigned URL")
	}
	files, err := handlePresignedURLFile(ctx, s.presignedURL)
	if err != nil {
		return nil, fmt.Errorf("presigned download: %w", err)
	}
	if len(files) == 0 {
		return nil, errors.New("presigned download returned no files")
	}
	return files, nil
}

// acquirePushSource picks between the presigned-URL and direct-upload
// source for a push request. The direct-upload path materialises the
// zip in the HTTP goroutine because fiber.Ctx's body reader cannot be
// dereferenced from a worker. The presigned-URL path captures only the
// URL string — the actual S3 download is deferred to the worker so
// the 202 response is not held up by the fetch (which can run for the
// full presignedDownloadTimeout, currently 10 minutes).
func acquirePushSource(c fiber.Ctx) (pushSource, error) {
	if presignedURL := c.FormValue("presigned_url"); presignedURL != "" {
		return pushSource{presignedURL: presignedURL}, nil
	}
	files, err := handleUploadedFile(c)
	if err != nil {
		return pushSource{}, fmt.Errorf("upload: %w", err)
	}
	if len(files) == 0 {
		return pushSource{}, errors.New("upload: no files found in uploaded zip")
	}
	return pushSource{files: files}, nil
}

// handleUploadedFile processes the uploaded ZIP file and returns the extracted files.
func handleUploadedFile(c fiber.Ctx) (map[string][]byte, error) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve form file: %w", err)
	}

	// Enforce size limit to prevent zip bombs and excessive memory usage
	if fileHeader.Size > maxDirectUploadSize {
		return nil, fmt.Errorf("uploaded file exceeds maximum allowed size of %d bytes", maxDirectUploadSize)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open form file: %w", err)
	}
	defer file.Close()

	bytesData, err := io.ReadAll(io.LimitReader(file, maxDirectUploadSize+1))
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}
	if int64(len(bytesData)) > maxDirectUploadSize {
		return nil, fmt.Errorf("uploaded file exceeds maximum allowed size of %d bytes", maxDirectUploadSize)
	}

	files, err := irminutils.UnzipFiles(bytesData)
	if err != nil {
		return nil, fmt.Errorf("failed to unzip file: %w", err)
	}

	return files, nil
}

// NotSupportedPushProvider provides a default implementation for connectors that don't support push operations.
type NotSupportedPushProvider struct{}

// InitializeClient returns an error indicating push operations are not supported.
func (p *NotSupportedPushProvider) InitializeClient(
	_ context.Context,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New("push operations are not supported by this connector")
}

// ProcessFiles returns an error indicating push operations are not supported.
func (p *NotSupportedPushProvider) ProcessFiles(
	_ context.Context,
	_ any,
	_ *db.Operation,
	_ map[string][]byte,
	_ string,
) error {
	return errors.New("push operations are not supported by this connector")
}

// ProgressHandler returns nil — providers that reject every push
// call have nothing to observe. The common push worker's baseline
// heartbeat is still installed anyway.
func (p *NotSupportedPushProvider) ProgressHandler(
	_ *db.Operation,
) ProgressHandler {
	return nil
}

// handlePresignedURLFile downloads a zip from a presigned URL to a temp file,
// then extracts entries directly from disk. Only individual file contents are held
// in memory; the full zip is never loaded at once.
// validatePresignedURL checks that the URL uses an allowed scheme and does not target internal addresses.
func validatePresignedURL(rawURL string) error {
	parsed, parseErr := url.Parse(rawURL)
	if parseErr != nil {
		return fmt.Errorf("invalid presigned URL: %w", parseErr)
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "https" && scheme != "http" {
		return fmt.Errorf("presigned URL must use HTTPS or HTTP scheme, got %q", parsed.Scheme)
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" {
		return errors.New("presigned URL must not target internal addresses")
	}
	if ip := net.ParseIP(host); ip != nil {
		// Literal IP address — check directly.
		if isInternalIP(ip) {
			return errors.New("presigned URL must not target internal addresses")
		}
		return nil
	}
	// Hostname — resolve and check every returned IP to prevent SSRF via
	// hostnames that resolve to internal addresses (e.g. 169.254.169.254.nip.io).
	ctx, cancel := context.WithTimeout(context.Background(), dnsLookupTimeout)
	defer cancel()
	addrs, lookupErr := net.DefaultResolver.LookupHost(ctx, host)
	if lookupErr != nil {
		return fmt.Errorf("failed to resolve presigned URL host %q: %w", host, lookupErr)
	}
	for _, addr := range addrs {
		if ip := net.ParseIP(addr); ip != nil && isInternalIP(ip) {
			return errors.New("presigned URL must not target internal addresses")
		}
	}
	return nil
}

// isInternalIP returns true if the IP address belongs to a loopback, private,
// link-local, or otherwise non-public range.
func isInternalIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}

// ssrfSafeDialContext is a custom dial function that validates the resolved IP
// address at connect time, closing the TOCTOU gap between DNS pre-validation
// and the actual TCP connection (DNS rebinding defense).
func ssrfSafeDialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, splitErr := net.SplitHostPort(addr)
	if splitErr != nil {
		return nil, fmt.Errorf("invalid address %q: %w", addr, splitErr)
	}

	// Resolve the hostname to IPs and validate each one.
	addrs, lookupErr := net.DefaultResolver.LookupHost(ctx, host)
	if lookupErr != nil {
		return nil, fmt.Errorf("failed to resolve host %q: %w", host, lookupErr)
	}

	var dialer net.Dialer
	var lastDialErr error
	allInternal := true
	for _, resolved := range addrs {
		if ip := net.ParseIP(resolved); ip != nil && isInternalIP(ip) {
			continue // skip internal IPs
		}
		allInternal = false
		conn, dialErr := dialer.DialContext(ctx, network, net.JoinHostPort(resolved, port))
		if dialErr == nil {
			return conn, nil
		}
		lastDialErr = dialErr
	}
	if allInternal {
		return nil, errors.New("presigned URL must not target internal addresses")
	}
	return nil, fmt.Errorf("failed to connect to %s: %w", host, lastDialErr)
}

func handlePresignedURLFile(parent context.Context, presignedURL string) (map[string][]byte, error) {
	if err := validatePresignedURL(presignedURL); err != nil {
		return nil, err
	}

	// Cap the download at presignedDownloadTimeout but inherit from
	// the worker's ctx so /operation/cancel/:job_id (which cancels the
	// worker ctx) tears down an in-flight download promptly. Without
	// the parent inheritance, a cancelled push job continued downloading
	// from a slow / unreachable URL until the 10-minute ceiling.
	ctx, cancel := context.WithTimeout(parent, presignedDownloadTimeout)
	defer cancel()

	req, reqErr := http.NewRequestWithContext(ctx, http.MethodGet, presignedURL, nil)
	if reqErr != nil {
		return nil, fmt.Errorf("failed to create presigned URL request: %w", reqErr)
	}

	// Use a client with a custom dialer that validates resolved IPs at connect
	// time, preventing DNS rebinding attacks (TOCTOU between pre-flight DNS
	// check and the actual HTTP connection).
	client := &http.Client{
		Transport: &http.Transport{
			DialContext: ssrfSafeDialContext,
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxPresignedRedirects {
				return fmt.Errorf("presigned URL exceeded maximum of %d redirects", maxPresignedRedirects)
			}
			return validatePresignedURL(req.URL.String())
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download from presigned URL: %w", err)
	}
	defer func() {
		// Drain remaining body so the underlying connection can be reused.
		_, _ = io.Copy(io.Discard, resp.Body)
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("presigned URL returned status %d", resp.StatusCode)
	}

	// Write to temp file — individual entries are read from disk, avoiding
	// loading the full zip into memory.
	tempFile, tempErr := os.CreateTemp("", "connector-push-*.zip")
	if tempErr != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", tempErr)
	}
	defer tempFile.Close()
	defer os.Remove(tempFile.Name())

	// Limit download size to prevent resource exhaustion
	limited := io.LimitReader(resp.Body, maxPresignedDownloadBytes+1)
	written, copyErr := io.Copy(tempFile, limited)
	if copyErr != nil {
		return nil, fmt.Errorf("failed to write presigned URL response to temp file: %w", copyErr)
	}
	if written > maxPresignedDownloadBytes {
		return nil, fmt.Errorf("presigned URL response exceeds maximum size of %d bytes", maxPresignedDownloadBytes)
	}

	// Close the file so zip.OpenReader can open it cleanly
	if closeErr := tempFile.Close(); closeErr != nil {
		return nil, fmt.Errorf("failed to close temp file: %w", closeErr)
	}

	// Extract entries directly from disk using zip.OpenReader (seekable, no full read)
	zipReader, zipErr := zip.OpenReader(tempFile.Name())
	if zipErr != nil {
		return nil, fmt.Errorf("failed to open downloaded zip: %w", zipErr)
	}
	defer zipReader.Close()

	files := make(map[string][]byte, len(zipReader.File))
	var totalDecompressed int64
	for _, f := range zipReader.File {
		if f.FileInfo().IsDir() {
			continue
		}
		data, readErr := readZipEntry(f)
		if readErr != nil {
			return nil, readErr
		}
		totalDecompressed += int64(len(data))
		if totalDecompressed > maxTotalDecompressedBytes {
			return nil, fmt.Errorf(
				"total decompressed size exceeds maximum of %d bytes", maxTotalDecompressedBytes,
			)
		}
		files[f.Name] = data
	}

	return files, nil
}

// readZipEntry reads a single zip entry with a decompressed size limit.
// Uses defer to ensure the entry reader is closed even on panic.
func readZipEntry(f *zip.File) ([]byte, error) {
	rc, openErr := f.Open()
	if openErr != nil {
		return nil, fmt.Errorf("failed to open zip entry %s: %w", f.Name, openErr)
	}
	defer rc.Close()

	limited := io.LimitReader(rc, maxDecompressedEntryBytes+1)
	data, readErr := io.ReadAll(limited)
	if readErr != nil {
		return nil, fmt.Errorf("failed to read zip entry %s: %w", f.Name, readErr)
	}
	if int64(len(data)) > maxDecompressedEntryBytes {
		return nil, fmt.Errorf(
			"zip entry %s exceeds maximum decompressed size of %d bytes",
			f.Name, maxDecompressedEntryBytes,
		)
	}
	return data, nil
}

// HandleNotSupportedPush provides a common handler for connectors that don't support push operations.
func HandleNotSupportedPush(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support push operations.",
	})
}
