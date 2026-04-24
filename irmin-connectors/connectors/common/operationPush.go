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

// PushOperationProvider defines the interface for connector-specific push operation handling.
type PushOperationProvider interface {
	// InitializeClient initializes the client for push operations
	InitializeClient(
		c fiber.Ctx,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)

	// ProcessFiles processes the extracted files and uploads/inserts them
	ProcessFiles(c fiber.Ctx, client any, files map[string][]byte, targetPath string) error

	// ProgressHandler returns the observability callback this
	// provider wires into its client for per-batch / per-file
	// events. Return nil only if the underlying operations are
	// short enough not to need progress events — the common push
	// handler always wraps the provider call with a baseline
	// heartbeat, so returning nil does not leave the operation
	// silent.
	ProgressHandler(operation *db.Operation) ProgressHandler
}

// HandleOperationPush provides a common HTTP handler for push operation endpoints.
//
// Under the unified Guard API the push handler is synchronous but
// still persists an OperationJob row via manager.Begin so concurrent
// pushes against the same operation get a structured 409 carrying
// the blocking job_id. Release is deferred; a provider panic is
// recovered so the row never sticks at status=running.
func HandleOperationPush(
	c fiber.Ctx,
	provider PushOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
	app *models.ConnectorsApp,
) (retErr error) {
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

	// Get the operation from the context
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

	guard, alreadyErr, beginErr := manager.Begin(BeginOperationJobInput{
		OperationID:             operation.ID,
		ConnectorRegistrationID: operation.ConnectorRegistrationID,
		ConnectorName:           connectorName,
		Kind:                    "push",
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

	// Pessimistic default — only overwritten on successful
	// completion. Release deferred so any early return (panic,
	// error path) still marks the row terminal and frees the
	// advisory lock.
	outcome := JobOutcome{
		Status: sdkmodels.OperationJobStatusFailed,
		Error:  "handler exited without setting outcome",
	}
	defer func() {
		// Recover any panic inside the handler body so we can emit
		// a structured 500 via RespondJobError (overwriting retErr
		// on the named return) instead of re-panicking and letting
		// fiber's panic middleware produce a generic body. The
		// guard's terminal-status write still happens synchronously
		// below so /operation/status observes the failure.
		if r := recover(); r != nil {
			logger.Error("push handler panic recovered",
				"error", fmt.Sprintf("%v", r), "operation_id", operation.ID)
			outcome = JobOutcome{
				Status: sdkmodels.OperationJobStatusFailed,
				Error:  fmt.Sprintf("handler panic: %v", r),
			}
			retErr = RespondJobError(
				c,
				fiber.StatusInternalServerError,
				sdkmodels.JobErrorReasonInternal,
				fmt.Errorf("handler panic: %v", r),
				guard.JobID(),
			)
		}
		guard.Release(outcome)
	}()

	// Log operation execution start
	LogOperationEvent(
		dbInstance,
		logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Push operation execution started",
		nil,
	)

	// Baseline heartbeat — fires every heartbeatInterval for the
	// duration of the push, even if the provider's ProgressHandler
	// is nil. Push can silently spend minutes inside ProcessFiles or
	// inside the presigned-URL download path (10-minute timeout), so
	// a floor-level cadence is essential.
	heartbeatStop := make(chan struct{})
	go startHeartbeat(dbInstance, logger, operation.ID, "operation/push", heartbeatStop)
	defer close(heartbeatStop)

	client, _, cleanup, err := provider.InitializeClient(c, logger, operation)
	if err != nil {
		logPushFailure(dbInstance, logger, operation.ID,
			"Failed to initialize client for push operation", err)
		return MarkFailedAndRespond(c, &outcome, fiber.StatusInternalServerError, "initialize client", err)
	}
	defer cleanup()

	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		logPushFailure(dbInstance, logger, operation.ID,
			"Failed to parse form fields for push operation", err)
		return MarkFailedAndRespond(c, &outcome, fiber.StatusBadRequest, "parse form fields", err)
	}

	// Pass raw path to provider for connector-specific processing
	rawPath := fields["path"]

	files, srcStage, srcErr := acquirePushFiles(c)
	if srcErr != nil {
		logPushFailure(dbInstance, logger, operation.ID,
			"Failed to acquire files for push operation", srcErr)
		return MarkFailedAndRespond(c, &outcome, fiber.StatusBadRequest, srcStage, srcErr)
	}

	if len(files) == 0 {
		LogOperationEvent(dbInstance, logger, operation.ID,
			db.LogEventTypeError, "No files found in uploaded ZIP", nil)
		return MarkFailedAndRespond(c, &outcome, fiber.StatusBadRequest,
			"upload", errors.New("no files found in uploaded zip"))
	}

	if procErr := provider.ProcessFiles(c, client, files, rawPath); procErr != nil {
		logger.Error("failed to process files", "error", procErr)
		LogOperationEvent(dbInstance, logger, operation.ID,
			db.LogEventTypeError, "Failed to process files during push operation",
			map[string]any{"error": procErr.Error(), "path": rawPath})
		return MarkFailedAndRespond(c, &outcome, fiber.StatusInternalServerError,
			"process files", procErr)
	}

	// Log successful completion
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

	outcome = JobOutcome{Status: sdkmodels.OperationJobStatusComplete}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Successfully pushed data",
		"status":  "completed",
	})
}

// logPushFailure emits the canonical error-level operation log
// entry used throughout HandleOperationPush. Centralised so the log
// shape stays consistent and the handler body stays short.
func logPushFailure(dbInstance *db.Database, logger *slog.Logger, operationID uint, msg string, err error) {
	LogOperationEvent(
		dbInstance,
		logger,
		operationID,
		db.LogEventTypeError,
		msg,
		map[string]any{"error": err.Error()},
	)
}

// acquirePushFiles picks between the presigned-URL and direct-upload
// source for a push request. Returns (files, "", nil) on success; on
// failure the second return is a short stage label ("presigned
// download" / "upload") used for the handler's outcome message so
// operators can tell the two paths apart without re-reading the
// error.
func acquirePushFiles(c fiber.Ctx) (map[string][]byte, string, error) {
	if presignedURL := c.FormValue("presigned_url"); presignedURL != "" {
		files, err := handlePresignedURLFile(presignedURL)
		if err != nil {
			return nil, "presigned download", err
		}
		return files, "", nil
	}
	files, err := handleUploadedFile(c)
	if err != nil {
		return nil, "upload", err
	}
	return files, "", nil
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
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New("push operations are not supported by this connector")
}

// ProcessFiles returns an error indicating push operations are not supported.
func (p *NotSupportedPushProvider) ProcessFiles(
	_ fiber.Ctx,
	_ any,
	_ map[string][]byte,
	_ string,
) error {
	return errors.New("push operations are not supported by this connector")
}

// ProgressHandler returns nil — providers that reject every push
// call have nothing to observe. The common push handler's baseline
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

func handlePresignedURLFile(presignedURL string) (map[string][]byte, error) {
	if err := validatePresignedURL(presignedURL); err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), presignedDownloadTimeout)
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
