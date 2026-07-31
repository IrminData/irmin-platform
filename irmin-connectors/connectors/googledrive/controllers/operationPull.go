package googledrivecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/googledrive/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
)

const (
	// vendorRequestTimeout caps a single Google Drive API request.
	vendorRequestTimeout = 60 * time.Second

	// driveAPIVersion is the Google Drive API version we target.
	driveAPIVersion = "v3"

	// defaultMaxRecordsPerResource bounds an empty max_records_per_resource setting.
	defaultMaxRecordsPerResource = 100_000

	// maxErrorBodySize caps how many bytes of an error response body we read for diagnostics.
	maxErrorBodySize = 4096

	// defaultMaxFileSizeMB is the fallback per-file size cap when the
	// max_file_size_mb setting is empty/invalid.
	defaultMaxFileSizeMB = 50

	// totalBudgetMultiplier scales the per-file cap into a total-bytes
	// budget for folder walks. Stops runaway pulls before we OOM the
	// worker which buffers all blobs in memory before zipping. With
	// maxFileSizeCapMB = 500 MB this yields a 2 GB upper bound on the
	// total walk budget, even when the user pushes both knobs to their
	// validation ceilings.
	totalBudgetMultiplier = 4

	// safeNameMaxLen trims long Drive file names to keep zip entries
	// portable across filesystems.
	safeNameMaxLen = 80

	// drivePageSizeMax is the largest pageSize Drive v3 accepts on
	// files.list. We clamp downward when the caller-supplied record cap
	// is smaller, to avoid paying for an unnecessary full page.
	drivePageSizeMax = 1000

	// drivePageSizeFolderLookup is the pageSize used when probing for an
	// existing folder by name during push — only ever expect one match,
	// so keep the page tiny.
	drivePageSizeFolderLookup = 10

	// bytesPerMB is a literal used in cap math; the named constant
	// keeps mnd quiet and the intent obvious at call sites.
	bytesPerMB int64 = 1024 * 1024

	// Skip reason markers recorded in files.json when a file is not
	// downloaded. Centralised so callers and downstream consumers agree
	// on the vocabulary.
	skipReasonFilteredMIME    = "filtered_mime"
	skipReasonOverSizeCap     = "over_size_cap"
	skipReasonGoogleSkip      = "google_native_skipped"
	skipReasonGoogleNoExport  = "google_native_no_export_target"
	skipReasonBudgetExhausted = "budget_exhausted"

	// Settings vocabulary for google_native_export. Mirrored in
	// configValidate.go and config/config.go to keep the contract in
	// one place.
	googleNativeExportSkip   = "skip"
	googleNativeExportPDF    = "pdf"
	googleNativeExportOffice = "office"

	// Common MIME types referenced across pull-side code paths.
	mimePDF             = "application/pdf"
	mimeJSON            = "application/json"
	mimeTextPlain       = "text/plain"
	googleNativeMimePfx = "application/vnd.google-apps."

	// safeFileNameFallback is substituted when a Drive file name is
	// empty after sanitisation, so a zip entry never has the empty
	// string as its path.
	safeFileNameFallback = "unnamed"
)

// pullSettings captures every per-Connection setting that affects what a
// pull operation does. Parsed once at the top of GetAllFiles /
// GetFilesByPath via parsePullSettings.
type pullSettings struct {
	googleNativeExport string // "skip" | "pdf" | "office"
	mimeFilter         []mimePattern
	maxFileSizeBytes   int64
	maxTotalBytes      int64
	recursive          bool
	maxRecords         int
}

// mimePattern matches a single comma-separated entry from the
// mime_type_filter setting. Patterns ending in "/*" are prefix-matched
// (e.g. "image/*" matches "image/png"); anything else is exact.
type mimePattern struct {
	raw    string
	isGlob bool
	prefix string // "image/" for "image/*", or the full MIME for exact match
}

// downloadResult is one row in the pull output — either a downloaded
// blob (Bytes set, SkipReason empty) or a skipped record (Bytes nil,
// SkipReason set). Both kinds appear in files.json so the consumer can
// reconcile expected vs delivered.
type downloadResult struct {
	Entry      fileEntry
	LocalPath  string // zip entry name when Bytes != nil, else ""
	Bytes      []byte
	SkipReason string
}

// googleDriveClient wraps interactions with the Google Drive v3 REST API.
type googleDriveClient struct {
	httpClient *http.Client
	baseURL    string
}

// imageMediaMetadata mirrors the nested `imageMediaMetadata` object in
// the Drive v3 `files` resource.
type imageMediaMetadata struct {
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
}

// videoMediaMetadata mirrors the nested `videoMediaMetadata` object in
// the Drive v3 `files` resource. `durationMillis` is an int64 in the API
// but is serialized as a JSON string per Google's encoding convention.
type videoMediaMetadata struct {
	Width          int   `json:"width,omitempty"`
	Height         int   `json:"height,omitempty"`
	DurationMillis int64 `json:"durationMillis,omitempty,string"`
}

// drivePermission mirrors a Drive v3 permission resource.
type drivePermission struct {
	ID           string `json:"id,omitempty"`
	Type         string `json:"type,omitempty"`
	Role         string `json:"role,omitempty"`
	EmailAddress string `json:"emailAddress,omitempty"`
}

// driveUser mirrors a Drive v3 user resource (owners, lastModifyingUser).
// Drive v3's User type has no `id` field — the user identifier is exposed
// as `permissionId`, which matches the `id` field on a permissions row
// belonging to the same user.
type driveUser struct {
	PermissionID string `json:"permissionId,omitempty"`
	DisplayName  string `json:"displayName,omitempty"`
	EmailAddress string `json:"emailAddress,omitempty"`
}

// driveCapabilities mirrors the subset of Drive v3 file capabilities we capture.
type driveCapabilities struct {
	CanDownload bool `json:"canDownload,omitempty"`
	CanEdit     bool `json:"canEdit,omitempty"`
	CanShare    bool `json:"canShare,omitempty"`
}

// fileEntry is the subset of Google Drive file metadata we capture.
// Fields match the `files` resource in the Drive v3 API.
type fileEntry struct {
	ID                 string              `json:"id"`
	Name               string              `json:"name"`
	MimeType           string              `json:"mimeType"`
	Size               string              `json:"size,omitempty"`
	CreatedTime        string              `json:"createdTime,omitempty"`
	ModifiedTime       string              `json:"modifiedTime,omitempty"`
	Parents            any                 `json:"parents,omitempty"`
	WebViewLink        string              `json:"webViewLink,omitempty"`
	IconLink           string              `json:"iconLink,omitempty"`
	FileExtension      string              `json:"fileExtension,omitempty"`
	Trashed            bool                `json:"trashed,omitempty"`
	MD5Checksum        string              `json:"md5Checksum,omitempty"`
	Description        string              `json:"description,omitempty"`
	Starred            bool                `json:"starred,omitempty"`
	OwnedByMe          bool                `json:"ownedByMe,omitempty"`
	Shared             bool                `json:"shared,omitempty"`
	HasThumbnail       bool                `json:"hasThumbnail,omitempty"`
	ThumbnailLink      string              `json:"thumbnailLink,omitempty"`
	ImageMediaMetadata *imageMediaMetadata `json:"imageMediaMetadata,omitempty"`
	VideoMediaMetadata *videoMediaMetadata `json:"videoMediaMetadata,omitempty"`
	Permissions        []drivePermission   `json:"permissions,omitempty"`
	Owners             []driveUser         `json:"owners,omitempty"`
	LastModifyingUser  *driveUser          `json:"lastModifyingUser,omitempty"`
	Capabilities       *driveCapabilities  `json:"capabilities,omitempty"`

	// Pull-only sidecar fields populated by this connector, NOT by the
	// Drive API. Marked omitempty so unaffected entries stay clean and
	// downstream consumers can detect skipped files without ambiguity.
	Skipped    bool   `json:"skipped,omitempty"`
	SkipReason string `json:"skipReason,omitempty"`
	LocalPath  string `json:"localPath,omitempty"`
}

// filesListResponse is the top-level list response from Drive v3.
type filesListResponse struct {
	Files            []fileEntry `json:"files"`
	NextPageToken    string      `json:"nextPageToken,omitempty"`
	IncompleteSearch bool        `json:"incompleteSearch,omitempty"`
}

// newDriveClient creates a Google Drive API client with the OAuth-wrapped HTTP client.
func newDriveClient(httpClient *http.Client) *googleDriveClient {
	return &googleDriveClient{
		httpClient: httpClient,
		baseURL:    config.APIBaseURL,
	}
}

// pullFileFields is the Drive API `fields` projection shared by
// listFiles and listChildren. Top-level response fields (nextPageToken,
// incompleteSearch) must appear at the same level as the files(...)
// projection — Drive's fields parser rejects anything it sees outside a
// recognised wrapper. nextPageToken/incompleteSearch first matches the
// canonical order in Google's own examples and avoids parser quirks
// observed when files(...) was listed first with deep nested groups.
const pullFileFields = "nextPageToken,incompleteSearch," +
	"files(id,name,mimeType,size,createdTime,modifiedTime,parents," +
	"webViewLink,iconLink,fileExtension,trashed,md5Checksum,description," +
	"starred,ownedByMe,shared,hasThumbnail,thumbnailLink," +
	"imageMediaMetadata(width,height)," +
	"videoMediaMetadata(width,height,durationMillis)," +
	"permissions(id,type,role,emailAddress)," +
	"owners(permissionId,displayName,emailAddress)," +
	"lastModifyingUser(permissionId,displayName,emailAddress)," +
	"capabilities(canDownload,canEdit,canShare))"

// driveFolderMime is the MIME type the Drive API uses for folder
// resources. Files with this MIME have no binary body and are walked
// rather than downloaded.
const driveFolderMime = "application/vnd.google-apps.folder"

// listFiles fetches file metadata with pagination.  Returns an empty
// slice when no files match — never nil — so json.MarshalIndent emits
// `[]` rather than `null` and downstream consumers can rely on the
// type contract.
func (c *googleDriveClient) listFiles(ctx context.Context, logger *slog.Logger, maxResults int) ([]fileEntry, error) {
	allFiles := []fileEntry{}
	pageToken := ""

	for {
		q := url.Values{}
		q.Set("pageSize", strconv.Itoa(clampedPageSize(maxResults, len(allFiles))))
		q.Set("fields", pullFileFields)
		q.Set("q", "trashed=false")
		if pageToken != "" {
			q.Set("pageToken", pageToken)
		}
		u := fmt.Sprintf("%s/drive/%s/files?%s", c.baseURL, driveAPIVersion, q.Encode())

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, http.NoBody)
		if err != nil {
			return nil, fmt.Errorf("googledrive: create list request: %w", err)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("googledrive: list files request: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
			_ = resp.Body.Close()
			return nil, fmt.Errorf("googledrive: list files HTTP %d: %s", resp.StatusCode, string(body))
		}

		var listResp filesListResponse
		if err = json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
			_ = resp.Body.Close()
			return nil, fmt.Errorf("googledrive: decode list response: %w", err)
		}
		_ = resp.Body.Close()

		if listResp.IncompleteSearch {
			logger.WarnContext(
				ctx,
				"googledrive: Drive API returned incompleteSearch=true — results may be partial (e.g. shared drives excluded)",
			)
		}

		allFiles = append(allFiles, listResp.Files...)

		// Apply the cap before deciding to fetch another page. The check
		// must run on every iteration (including the final page) so the
		// last page can't push allFiles past the limit by up to one
		// pageSize-worth of records.
		if maxResults > 0 && len(allFiles) >= maxResults {
			allFiles = allFiles[:maxResults]
			break
		}

		if listResp.NextPageToken == "" {
			break
		}
		pageToken = listResp.NextPageToken
	}

	return allFiles, nil
}

// getFile fetches metadata for a single Drive ID. Used by
// resolveDriveTarget to figure out whether a user-provided path points
// at a file (download) or a folder (walk).
func (c *googleDriveClient) getFile(ctx context.Context, id string) (*fileEntry, error) {
	params := url.Values{}
	params.Set("fields", "id,name,mimeType,size,fileExtension,parents")
	u := fmt.Sprintf(
		"%s/drive/%s/files/%s?%s",
		c.baseURL, driveAPIVersion, url.PathEscape(id), params.Encode(),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("googledrive: create get-file request: %w", err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("googledrive: get file request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("googledrive: file %q not found", id)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
		return nil, fmt.Errorf("googledrive: get file HTTP %d: %s", resp.StatusCode, string(body))
	}

	var f fileEntry
	if decodeErr := json.NewDecoder(resp.Body).Decode(&f); decodeErr != nil {
		return nil, fmt.Errorf("googledrive: decode get-file response: %w", decodeErr)
	}
	return &f, nil
}

// listChildren fetches the direct children of a Drive folder using the
// same field projection as listFiles. Pass maxResults=0 to consume all
// pages (walk-folder pull path — its global record cap is enforced
// downstream); pass a positive value to stop paginating once that many
// rows have been gathered (schema-time picker — bounds work on huge
// folders).
func (c *googleDriveClient) listChildren(
	ctx context.Context, logger *slog.Logger, parentID string, maxResults int,
) ([]fileEntry, error) {
	children := []fileEntry{}
	pageToken := ""

	for {
		q := url.Values{}
		pageSize := clampedPageSize(maxResults, len(children))
		q.Set("pageSize", strconv.Itoa(pageSize))
		q.Set("fields", pullFileFields)
		q.Set("q", fmt.Sprintf("'%s' in parents and trashed=false", escapeQuery(parentID)))
		if pageToken != "" {
			q.Set("pageToken", pageToken)
		}
		u := fmt.Sprintf("%s/drive/%s/files?%s", c.baseURL, driveAPIVersion, q.Encode())

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, http.NoBody)
		if err != nil {
			return nil, fmt.Errorf("googledrive: create list-children request: %w", err)
		}
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("googledrive: list children request: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
			_ = resp.Body.Close()
			return nil, fmt.Errorf(
				"googledrive: list children HTTP %d (parent %s): %s",
				resp.StatusCode, parentID, string(body),
			)
		}

		var listResp filesListResponse
		if err = json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
			_ = resp.Body.Close()
			return nil, fmt.Errorf("googledrive: decode list-children response: %w", err)
		}
		_ = resp.Body.Close()

		if listResp.IncompleteSearch {
			logger.WarnContext(
				ctx,
				"googledrive: incompleteSearch=true on listChildren — results may be partial",
				slog.String("parent", parentID),
			)
		}

		children = append(children, listResp.Files...)

		if maxResults > 0 && len(children) >= maxResults {
			children = children[:maxResults]
			break
		}
		if listResp.NextPageToken == "" {
			break
		}
		pageToken = listResp.NextPageToken
	}

	return children, nil
}

// googleNativeExportTarget maps a Google-native mimeType plus the
// configured export mode to the export MIME the Drive API should
// convert to. Returns "" when the file cannot or should not be
// exported (caller skips it with the appropriate reason).
func googleNativeExportTarget(sourceMime, mode string) string {
	switch mode {
	case googleNativeExportSkip:
		return ""
	case googleNativeExportPDF:
		return mimePDF
	case googleNativeExportOffice:
		// fall through
	default:
		return ""
	}
	switch sourceMime {
	case googleNativeMimePfx + "document":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case googleNativeMimePfx + "spreadsheet":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case googleNativeMimePfx + "presentation":
		return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	default:
		// Drawings / Forms / Sites etc. have no Office export target;
		// caller records google_native_no_export_target as the reason.
		return ""
	}
}

// downloadBinary fetches the raw bytes of a Drive file via the media
// endpoint. The maxBytes guard reads at most maxBytes+1 from the
// response so the caller can detect "Drive lied about size" cases (the
// fileEntry.Size pre-check covers the common path).
func (c *googleDriveClient) downloadBinary(
	ctx context.Context, fileID string, maxBytes int64,
) ([]byte, error) {
	params := url.Values{}
	params.Set("alt", "media")
	u := fmt.Sprintf(
		"%s/drive/%s/files/%s?%s",
		c.baseURL, driveAPIVersion, url.PathEscape(fileID), params.Encode(),
	)
	return c.readCapped(ctx, http.MethodGet, u, fileID, maxBytes)
}

// exportFile fetches a Google-native file rendered to a target MIME
// via /files/{id}/export. Subject to the same size guard as
// downloadBinary.
func (c *googleDriveClient) exportFile(
	ctx context.Context, fileID, exportMime string, maxBytes int64,
) ([]byte, error) {
	params := url.Values{}
	params.Set("mimeType", exportMime)
	u := fmt.Sprintf(
		"%s/drive/%s/files/%s/export?%s",
		c.baseURL, driveAPIVersion, url.PathEscape(fileID), params.Encode(),
	)
	return c.readCapped(ctx, http.MethodGet, u, fileID, maxBytes)
}

// driveAPIError carries the HTTP status code from a non-2xx Drive
// response so callers can branch on auth failures (401/403) vs other
// transport errors without parsing error strings. The OAuth round-
// tripper retries once on 401 before the error reaches us, so a 401
// here means a fresh token-refresh attempt also failed.
type driveAPIError struct {
	Status int
	FileID string
	Body   string
}

func (e *driveAPIError) Error() string {
	return fmt.Sprintf("googledrive: download HTTP %d for %s: %s", e.Status, e.FileID, e.Body)
}

// isDriveAuthError reports whether err (or anything it wraps) is a
// driveAPIError with an auth-class status code. Used by walkFolder /
// downloadChild to hard-fail a folder pull when the OAuth scope is
// wrong instead of silently recording every file as a skip.
func isDriveAuthError(err error) bool {
	var apiErr *driveAPIError
	if !errors.As(err, &apiErr) {
		return false
	}
	return apiErr.Status == http.StatusUnauthorized || apiErr.Status == http.StatusForbidden
}

// readCapped issues a request and reads up to maxBytes+1 of the
// response body. Returns an error if the body would exceed maxBytes
// (defends against missing/lying Drive Size metadata). Closing the
// body before erroring out matters under HTTP/2 where the stream
// would otherwise stay open.
func (c *googleDriveClient) readCapped(
	ctx context.Context, method, u, fileID string, maxBytes int64,
) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, u, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("googledrive: create download request: %w", err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("googledrive: download request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
		return nil, &driveAPIError{
			Status: resp.StatusCode,
			FileID: fileID,
			Body:   string(body),
		}
	}

	// Read maxBytes+1 so an over-cap response is detectable.
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil {
		return nil, fmt.Errorf("googledrive: read download body for %s: %w", fileID, err)
	}
	if int64(len(body)) > maxBytes {
		return nil, fmt.Errorf(
			"googledrive: download body for %s exceeds %d bytes (max_file_size_mb cap)",
			fileID, maxBytes,
		)
	}
	return body, nil
}

// downloadFile resolves f against the per-Connection pullSettings and
// returns (bytes, ext, skipReason, err). Exactly one of bytes or
// skipReason is set on success; err is set only on transport / parse
// failures (Drive errors that should fail the pull job).
func (c *googleDriveClient) downloadFile(
	ctx context.Context, f *fileEntry, s pullSettings,
) ([]byte, string, string, error) {
	if !mimeFilterAllows(s.mimeFilter, f.MimeType) {
		return nil, "", skipReasonFilteredMIME, nil
	}
	if strings.HasPrefix(f.MimeType, googleNativeMimePfx) {
		// Folders never reach here — walker skips them.
		return c.downloadGoogleNative(ctx, f, s)
	}
	return c.downloadBinaryFile(ctx, f, s)
}

// downloadGoogleNative handles the Docs/Sheets/Slides export branch.
// Returns the same (bytes, ext, skipReason, err) tuple as downloadFile.
func (c *googleDriveClient) downloadGoogleNative(
	ctx context.Context, f *fileEntry, s pullSettings,
) ([]byte, string, string, error) {
	target := googleNativeExportTarget(f.MimeType, s.googleNativeExport)
	if target == "" {
		if s.googleNativeExport == googleNativeExportSkip {
			return nil, "", skipReasonGoogleSkip, nil
		}
		return nil, "", skipReasonGoogleNoExport, nil
	}
	body, err := c.exportFile(ctx, f.ID, target, s.maxFileSizeBytes)
	if err != nil {
		return nil, "", "", err
	}
	ext := extForMime(target)
	if ext == "" {
		ext = "bin"
	}
	return body, ext, "", nil
}

// downloadBinaryFile handles the regular (non-Google-native) download
// branch. The fileEntry.Size pre-check bypasses the request entirely
// for files known to exceed the per-file cap.
func (c *googleDriveClient) downloadBinaryFile(
	ctx context.Context, f *fileEntry, s pullSettings,
) ([]byte, string, string, error) {
	if f.Size != "" {
		if declared, err := strconv.ParseInt(f.Size, 10, 64); err == nil && declared > s.maxFileSizeBytes {
			return nil, "", skipReasonOverSizeCap, nil
		}
	}

	body, err := c.downloadBinary(ctx, f.ID, s.maxFileSizeBytes)
	if err != nil {
		return nil, "", "", err
	}

	ext := f.FileExtension
	if ext == "" {
		ext = extForMime(f.MimeType)
	}
	if ext == "" {
		ext = "bin"
	}
	return body, ext, "", nil
}

// GoogleDrivePullProvider implements common.PullOperationProvider.
type GoogleDrivePullProvider struct {
	dbInstance   *db.Database
	logger       *slog.Logger
	tokenClient  *lib.OAuthTokenClient
	connectionID uint
	ctx          context.Context
}

// ProgressHandler emits per-page events.
func (p *GoogleDrivePullProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandlerWithContext(p.ctx, p.dbInstance, p.logger, operation)
}

// InitializeClient creates the Google Drive API client. The OAuth
// bearer token is resolved transparently by the round-tripper embedded
// in the HTTP transport via WrapHTTPClient.
//
// The returned cleanup func is a no-op — the HTTP client has no
// persistent connection to close.
func (p *GoogleDrivePullProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	p.logger = logger
	p.ctx = ctx

	rawClient := &http.Client{Timeout: vendorRequestTimeout}
	// Wrap with the async OAuth round-tripper so every outbound call
	// carries a fresh Google Drive bearer token resolved from Core,
	// with a one-retry-on-401 path that force-refreshes through Core.
	vendorClient := common.WrapHTTPClientForJob(rawClient, p.tokenClient, p.connectionID)
	driveClient := newDriveClient(vendorClient)

	return driveClient, nil, func() {}, nil
}

// GetAllFiles is the legacy metadata-only pull entry point. It fetches
// file metadata across the user's authorised Drive and returns it as a
// single files.json blob. Content download, recursive folder walks, and
// Google-native format export are handled by GetFilesByPath when a
// non-empty path is supplied; this method preserves the original
// behaviour for the empty-path case so existing workflows are
// unaffected.
func (p *GoogleDrivePullProvider) GetAllFiles(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
) ([]string, [][]byte, error) {
	client, ok := clientAny.(*googleDriveClient)
	if !ok {
		return nil, nil, errors.New("googledrive: invalid client type for pull")
	}

	maxRecords := parseMaxRecords(operation)
	files, err := client.listFiles(ctx, p.logger, maxRecords)
	if err != nil {
		return nil, nil, err
	}

	blob, err := json.MarshalIndent(files, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("googledrive: marshal file list: %w", err)
	}

	p.logEvent(operation, db.LogEventTypeInfo,
		"Google Drive pull succeeded",
		map[string]any{"file_count": len(files)})

	return []string{"files.json"}, [][]byte{blob}, nil
}

// GetFileByPath delegates to GetFilesByPath and returns the single
// (path, blob) result. The framework now prefers GetFilesByPath when a
// provider implements PullByPathMultiProvider, so this method only
// fires if a future framework change calls it explicitly.
//
// If GetFilesByPath produces more than one entry (a folder pull), we
// error rather than silently returning the first blob and dropping the
// rest — losing data without telling the user is the worst failure
// mode for a sync workflow.
func (p *GoogleDrivePullProvider) GetFileByPath(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
	rawPath string,
) (string, []byte, error) {
	paths, blobs, err := p.GetFilesByPath(ctx, clientAny, operation, rawPath)
	if err != nil {
		return "", nil, err
	}
	if len(paths) == 0 || len(blobs) == 0 {
		return "", nil, errors.New("googledrive: GetFilesByPath returned no files")
	}
	if len(paths) > 1 {
		return "", nil, fmt.Errorf(
			"googledrive: path %q resolved to %d files; use GetFilesByPath via PullByPathMultiProvider",
			rawPath, len(paths),
		)
	}
	return paths[0], blobs[0], nil
}

// GetFilesByPath implements common.PullByPathMultiProvider. The path
// semantics are:
//
//   - "" / "files" / "files.json" — metadata-only legacy pull. Identical
//     to the empty-path GetAllFiles output. Kept for back-compat with
//     existing workflows.
//   - any other string — treated as a Drive ID. files.get resolves it;
//     folders are walked (respecting the recursive setting and per-file
//     filters), regular files are downloaded directly. Drive folder
//     paths like "/Backup/Reports" are out of scope for v1; the
//     framework's schema picker passes Drive IDs, not paths.
func (p *GoogleDrivePullProvider) GetFilesByPath(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
	rawPath string,
) ([]string, [][]byte, error) {
	client, ok := clientAny.(*googleDriveClient)
	if !ok {
		return nil, nil, errors.New("googledrive: invalid client type for pull")
	}

	// Legacy: empty path or the literal "files" / "files.json" maps to
	// the metadata-only behaviour. Delegating keeps that surface
	// identical to the pre-content-download world.
	//
	// Strip surrounding slashes so a Drive ID arriving as "<id>/" (the
	// console picker round-trip can leave a trailing slash on group-type
	// selections) resolves the same as "<id>". Push's resolvePath already
	// does this; pull was the missing half of the pair.
	trimmed := strings.Trim(strings.TrimSpace(rawPath), "/")
	stripped := strings.TrimSuffix(trimmed, ".json")
	if trimmed == "" || stripped == "files" {
		return p.GetAllFiles(ctx, clientAny, operation)
	}

	settings := parsePullSettings(operation)
	target, err := client.getFile(ctx, trimmed)
	if err != nil {
		return nil, nil, fmt.Errorf("googledrive: resolve path %q: %w", rawPath, err)
	}

	if target.MimeType == driveFolderMime {
		return p.pullFolder(ctx, client, operation, settings, target)
	}
	return p.pullSingleFile(ctx, client, operation, settings, target)
}

// pullSingleFile downloads one Drive file and returns it as a single
// framework entry. Skip reasons (filter / over-cap / google-native) are
// surfaced as an error so the framework reports them in the operation
// status; for v1 we don't half-succeed a single-file pull.
func (p *GoogleDrivePullProvider) pullSingleFile(
	ctx context.Context,
	client *googleDriveClient,
	operation *db.Operation,
	settings pullSettings,
	target *fileEntry,
) ([]string, [][]byte, error) {
	body, ext, skipReason, err := client.downloadFile(ctx, target, settings)
	if err != nil {
		return nil, nil, fmt.Errorf("googledrive: download %s: %w", target.ID, err)
	}
	if skipReason != "" {
		return nil, nil, fmt.Errorf(
			"googledrive: file %s skipped (%s) — adjust connection settings to include it",
			target.ID, skipReason,
		)
	}
	name := safeFileName(target.Name)
	if ext != "" && !strings.HasSuffix(strings.ToLower(name), "."+strings.ToLower(ext)) {
		name = name + "." + ext
	}

	p.logEvent(operation, db.LogEventTypeInfo,
		"Google Drive single-file pull succeeded",
		map[string]any{"file_id": target.ID, "name": target.Name, "bytes": len(body)})

	return []string{name}, [][]byte{body}, nil
}

// pullFolder walks the target folder, downloads every matching file,
// and returns files.json + one entry per downloaded blob.
func (p *GoogleDrivePullProvider) pullFolder(
	ctx context.Context,
	client *googleDriveClient,
	operation *db.Operation,
	settings pullSettings,
	target *fileEntry,
) ([]string, [][]byte, error) {
	results, truncationReason, err := p.walkFolder(ctx, client, settings, target.ID)
	if err != nil {
		return nil, nil, err
	}

	// Build the response slices in a deterministic order: files.json
	// first, then each downloaded blob in the walk order. Skipped
	// records appear only in files.json, never as a zip entry.
	entries := make([]fileEntry, 0, len(results))
	paths := []string{"files.json"}
	// Reserve the first slot for the marshalled files.json; we fill it
	// at the end once entries is built.
	blobs := make([][]byte, 1, 1+len(results))

	for _, r := range results {
		entry := r.Entry
		if r.SkipReason != "" {
			entry.Skipped = true
			entry.SkipReason = r.SkipReason
		} else {
			entry.LocalPath = r.LocalPath
			paths = append(paths, r.LocalPath)
			blobs = append(blobs, r.Bytes)
		}
		entries = append(entries, entry)
	}

	manifest, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("googledrive: marshal files.json: %w", err)
	}
	blobs[0] = manifest

	if truncationReason != "" {
		truncBlob, mErr := json.MarshalIndent(map[string]any{
			"truncated":          true,
			"reason":             truncationReason,
			"file_count_emitted": len(entries),
		}, "", "  ")
		if mErr == nil {
			paths = append(paths, "_truncated.json")
			blobs = append(blobs, truncBlob)
		}
	}

	downloaded := 0
	for _, r := range results {
		if r.SkipReason == "" {
			downloaded++
		}
	}
	p.logEvent(operation, db.LogEventTypeInfo,
		"Google Drive folder pull succeeded",
		map[string]any{
			"folder_id":    target.ID,
			"folder_name":  target.Name,
			"total_count":  len(results),
			"downloaded":   downloaded,
			"recursive":    settings.recursive,
			"truncated_by": truncationReason,
		})

	return paths, blobs, nil
}

// walkFolder is a BFS over Drive's folder tree rooted at rootID. The
// visited-set guards against the (rare) multi-parent case in shared
// drives. Stops early when the record cap or total-byte budget is
// reached; the caller surfaces that to the user via _truncated.json.
func (p *GoogleDrivePullProvider) walkFolder(
	ctx context.Context,
	client *googleDriveClient,
	settings pullSettings,
	rootID string,
) ([]downloadResult, string, error) {
	queue := []string{rootID}
	visited := map[string]bool{rootID: true}
	results := make([]downloadResult, 0)
	var totalBytes int64

	for len(queue) > 0 {
		folderID := queue[0]
		queue = queue[1:]

		children, err := client.listChildren(ctx, p.logger, folderID, 0)
		if err != nil {
			return nil, "", fmt.Errorf("googledrive: list folder %s: %w", folderID, err)
		}

		var (
			truncation string
			childErr   error
		)
		results, queue, visited, totalBytes, truncation, childErr = p.processChildren(
			ctx, client, settings, children, results, queue, visited, totalBytes,
		)
		if childErr != nil {
			return nil, "", childErr
		}
		if truncation != "" {
			return results, truncation, nil
		}
	}

	return results, "", nil
}

// processChildren applies the walker's per-child logic to one Drive
// folder listing: folders are enqueued (when recursive), files are
// downloaded, and the running counts/budget are advanced. Returns the
// updated state plus a truncation reason when the walk must halt
// mid-folder (empty reason = continue).
func (p *GoogleDrivePullProvider) processChildren(
	ctx context.Context,
	client *googleDriveClient,
	settings pullSettings,
	children []fileEntry,
	results []downloadResult,
	queue []string,
	visited map[string]bool,
	totalBytes int64,
) ([]downloadResult, []string, map[string]bool, int64, string, error) {
	for i := range children {
		child := children[i]

		if child.MimeType == driveFolderMime {
			if settings.recursive && !visited[child.ID] {
				visited[child.ID] = true
				queue = append(queue, child.ID)
			}
			continue
		}

		if settings.maxRecords > 0 && len(results) >= settings.maxRecords {
			return results, queue, visited, totalBytes, "max_records_reached", nil
		}

		result, newBytes, truncation, err := p.downloadChild(ctx, client, settings, child, totalBytes)
		if err != nil {
			return results, queue, visited, totalBytes, "", err
		}
		results = append(results, result)
		totalBytes = newBytes
		if truncation != "" {
			return results, queue, visited, totalBytes, truncation, nil
		}
	}
	return results, queue, visited, totalBytes, "", nil
}

// downloadChild downloads one child file. The contract:
//   - Always returns a downloadResult (either Bytes-set or
//     SkipReason-set), so the walker can append unconditionally.
//   - Returns the updated byte counter (unchanged for skipped files).
//   - Returns a non-empty truncation reason when this child triggered
//     the byte budget — the walker records the result then halts.
//
// Transport / parse failures from Drive are folded into a download_error
// skip rather than bubbled, so a partial walk is still useful output.
func (p *GoogleDrivePullProvider) downloadChild(
	ctx context.Context,
	client *googleDriveClient,
	settings pullSettings,
	child fileEntry,
	currentBytes int64,
) (downloadResult, int64, string, error) {
	body, ext, skipReason, dlErr := client.downloadFile(ctx, &child, settings)
	if dlErr != nil {
		// Auth failures bubble up as real errors — the OAuth round-
		// tripper has already retried once, so a 401 here means the
		// connection's bearer token is dead. Folding that into a
		// per-file skip would silently turn the entire walk into "all
		// files skipped" with a green job status, masking a real
		// re-authorisation requirement. 403 is treated the same way
		// (almost always indicates the connection's OAuth scope is too
		// narrow for the target folder; partial output would be
		// misleading).
		if isDriveAuthError(dlErr) {
			return downloadResult{}, currentBytes, "", fmt.Errorf(
				"googledrive: auth failure pulling %s: %w", child.ID, dlErr,
			)
		}
		return downloadResult{
			Entry:      child,
			SkipReason: "download_error: " + dlErr.Error(),
		}, currentBytes, "", nil
	}
	if skipReason != "" {
		return downloadResult{Entry: child, SkipReason: skipReason}, currentBytes, "", nil
	}
	if settings.maxTotalBytes > 0 && currentBytes+int64(len(body)) > settings.maxTotalBytes {
		return downloadResult{
			Entry:      child,
			SkipReason: skipReasonBudgetExhausted,
		}, currentBytes, "total_byte_budget_reached", nil
	}

	localPath := "files/" + child.ID + "-" + safeFileName(child.Name)
	if ext != "" && !strings.HasSuffix(strings.ToLower(localPath), "."+strings.ToLower(ext)) {
		localPath += "." + ext
	}
	return downloadResult{
		Entry:     child,
		LocalPath: localPath,
		Bytes:     body,
	}, currentBytes + int64(len(body)), "", nil
}

// logProviderEvent is the package-level, no-op-safe wrapper around
// common.LogOperationEvent shared by both the pull and push providers.
// Keeping a single implementation here avoids the previous body-for-body
// duplication between GoogleDrivePullProvider.logEvent and
// GoogleDrivePushProvider.logEvent.
func logProviderEvent(
	dbInstance *db.Database, logger *slog.Logger,
	operation *db.Operation, evt db.LogEventType, msg string, payload map[string]any,
) {
	if operation == nil || dbInstance == nil || logger == nil {
		return
	}
	common.LogOperationEvent(dbInstance, logger, operation.ID, evt, msg, payload)
}

// logEvent forwards to logProviderEvent with the pull provider's own
// dbInstance and logger.
func (p *GoogleDrivePullProvider) logEvent(
	operation *db.Operation, evt db.LogEventType, msg string, payload map[string]any,
) {
	logProviderEvent(p.dbInstance, p.logger, operation, evt, msg, payload)
}

// parsePullSettings reads every per-Connection setting that affects the
// pull. Each field falls back to a safe default on missing/invalid
// input so a half-configured Connection still does something sensible.
func parsePullSettings(operation *db.Operation) pullSettings {
	out := pullSettings{
		googleNativeExport: googleNativeExportSkip,
		mimeFilter:         nil,
		maxFileSizeBytes:   int64(defaultMaxFileSizeMB) * bytesPerMB,
		recursive:          false,
		maxRecords:         defaultMaxRecordsPerResource,
	}
	out.maxTotalBytes = out.maxFileSizeBytes * totalBudgetMultiplier

	if operation == nil {
		return out
	}
	var raw map[string]any
	if err := json.Unmarshal(operation.Settings, &raw); err != nil {
		return out
	}

	if n := common.ParsePositiveInt(raw["max_records_per_resource"]); n > 0 {
		out.maxRecords = n
	}
	if n := common.ParsePositiveInt(raw["max_file_size_mb"]); n > 0 {
		out.maxFileSizeBytes = int64(n) * bytesPerMB
		out.maxTotalBytes = out.maxFileSizeBytes * totalBudgetMultiplier
	}
	if s := stringFromSettings(raw, "google_native_export"); s != "" {
		switch s {
		case googleNativeExportSkip, googleNativeExportPDF, googleNativeExportOffice:
			out.googleNativeExport = s
		}
	}
	if s := stringFromSettings(raw, "mime_type_filter"); s != "" {
		out.mimeFilter = parseMimeFilter(s)
	}
	if s := stringFromSettings(raw, "recursive"); s != "" {
		if isTruthySetting(s) {
			out.recursive = true
		}
	}
	return out
}

// parseMaxRecords keeps the legacy public-ish name for the metadata-only
// pull path. New code should consume pullSettings via parsePullSettings.
func parseMaxRecords(operation *db.Operation) int {
	return parsePullSettings(operation).maxRecords
}

// stringFromSettings returns the trimmed string value at key, or "" if
// absent or non-string. Empty/whitespace values collapse to "".
func stringFromSettings(settings map[string]any, key string) string {
	raw, ok := settings[key]
	if !ok {
		return ""
	}
	s, isStr := raw.(string)
	if !isStr {
		return ""
	}
	return strings.TrimSpace(s)
}

// clampedPageSize returns the Drive pageSize to request, clamping
// downward when the caller-supplied record cap means a full page would
// over-fetch. maxResults <= 0 (no cap) returns the v3 maximum; if
// already-fetched >= maxResults the loop will exit at the next cap
// check so any positive value is safe to return here.
func clampedPageSize(maxResults, alreadyFetched int) int {
	if maxResults <= 0 {
		return drivePageSizeMax
	}
	remaining := maxResults - alreadyFetched
	if remaining <= 0 || remaining > drivePageSizeMax {
		return drivePageSizeMax
	}
	return remaining
}

// isTruthySetting maps the limited set of strings the framework's form
// encoding can send for a checkbox to a Go bool. Mirrors the truthy set
// validateRecursive accepts but keeps the matching set narrow on the
// pull-time side so a typo'd "TRUE" silently falls back to off (the
// safer default for a destructive-by-quota setting like recursive).
func isTruthySetting(s string) bool {
	switch s {
	case "true", "on", "1":
		return true
	default:
		return false
	}
}

// parseMimeFilter compiles a comma-separated MIME-type list into a set
// of matchers. Trailing "/*" means glob-prefix (e.g. "image/*"); other
// entries are exact-match. Whitespace and empty entries are ignored.
func parseMimeFilter(s string) []mimePattern {
	var out []mimePattern
	for raw := range strings.SplitSeq(s, ",") {
		entry := strings.TrimSpace(raw)
		if entry == "" {
			continue
		}
		if strings.HasSuffix(entry, "/*") {
			out = append(out, mimePattern{
				raw: entry, isGlob: true, prefix: strings.TrimSuffix(entry, "*"),
			})
			continue
		}
		out = append(out, mimePattern{raw: entry, isGlob: false, prefix: entry})
	}
	return out
}

// matches reports whether mime is accepted by this pattern.
func (m mimePattern) matches(mime string) bool {
	if m.isGlob {
		return strings.HasPrefix(mime, m.prefix)
	}
	return mime == m.prefix
}

// mimeFilterAllows reports whether mime passes the configured filter.
// An empty filter list accepts everything.
func mimeFilterAllows(patterns []mimePattern, mime string) bool {
	if len(patterns) == 0 {
		return true
	}
	for _, p := range patterns {
		if p.matches(mime) {
			return true
		}
	}
	return false
}

// safeFileName trims and sanitises a Drive file name for use as a zip
// entry. Strips path separators and clips to safeNameMaxLen runes so
// the zip stays portable.
//
// Truncation walks runes (not bytes) — Drive file names routinely
// contain CJK characters, emoji, and accented letters whose UTF-8
// encoding spans multiple bytes, so a byte-slice at safeNameMaxLen
// could split the middle of a code point and produce a garbled or
// invalid-UTF-8 entry name.
func safeFileName(name string) string {
	clean := strings.ReplaceAll(strings.ReplaceAll(name, "/", "_"), "\\", "_")
	clean = strings.TrimSpace(clean)
	if clean == "" {
		return safeFileNameFallback
	}
	// Fast path: byte length within the cap means rune count is too,
	// since every rune occupies at least one byte. Skips the
	// rune-counting scan for the common ASCII case.
	if len(clean) <= safeNameMaxLen {
		return clean
	}
	if utf8.RuneCountInString(clean) > safeNameMaxLen {
		runes := []rune(clean)
		clean = string(runes[:safeNameMaxLen])
	}
	return clean
}

// extForMime maps a Drive MIME type to a conventional file extension.
// The empty string means "no good extension known"; callers should fall
// back to the existing FileExtension on the fileEntry or to "bin".
func extForMime(mime string) string {
	switch mime {
	case mimePDF:
		return "pdf"
	case "image/png":
		return "png"
	case "image/jpeg":
		return "jpg"
	case "image/gif":
		return "gif"
	case "image/svg+xml":
		return "svg"
	case "image/webp":
		return "webp"
	case mimeTextPlain:
		return "txt"
	case "text/csv":
		return "csv"
	case "text/html":
		return "html"
	case "text/markdown":
		return "md"
	case mimeJSON:
		return "json"
	case "application/zip":
		return "zip"
	case "application/x-yaml", "text/yaml":
		return "yaml"
	case "application/xml", "text/xml":
		return "xml"
	case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return "docx"
	case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
		return "xlsx"
	case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
		return "pptx"
	default:
		return ""
	}
}

// OperationPull godoc
// @Summary Pull files from Google Drive
// @Description Starts an asynchronous pull job that fetches file metadata from Google Drive as a JSON file. The connection ID is captured from the request before the async worker starts so the worker can resolve OAuth tokens without a fiber.Ctx.
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce application/zip
// @Param path formData string false "What to pull. Empty or 'files' / 'files.json' returns metadata for every accessible file as files.json. A Drive file ID downloads that single file. A Drive folder ID walks the folder (recursive per connection settings) and returns files.json plus one blob per downloaded file at files/<driveId>-<safeName>.<ext>."
// @Success 202 {object} fiber.Map "Pull job started"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 428 {object} fiber.Map "OAuth not connected"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	connectionID, err := lib.ConnectionIDFromRequestHeader(func(k string) string { return c.Get(k) })
	if err != nil {
		return cs.WriteResolveError(c, err)
	}

	provider := &GoogleDrivePullProvider{
		dbInstance:   cs.DB,
		logger:       cs.Logger,
		tokenClient:  cs.OAuthConnector.TokenClient,
		connectionID: connectionID,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB, cs.App)
}
