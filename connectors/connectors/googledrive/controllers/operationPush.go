package googledrivecontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"

	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/googledrive/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
)

// drivePushClient wraps interactions with the Google Drive v3 REST API for
// push operations (file creation, folder resolution).
type drivePushClient struct {
	httpClient *http.Client
	baseURL    string
}

// folderEntry mirrors a minimal Drive folder resource.
type folderEntry struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// folderListResponse is the Drive v3 list response for folder queries.
type folderListResponse struct {
	Files []folderEntry `json:"files"`
}

// newDrivePushClient creates a Drive API client for push operations.
func newDrivePushClient(httpClient *http.Client) *drivePushClient {
	return &drivePushClient{
		httpClient: httpClient,
		baseURL:    config.APIBaseURL,
	}
}

// findOrCreateFolder resolves a path segment to a folder ID, creating it
// if it doesn't exist.  Searches under the given parent (empty string = root).
func (c *drivePushClient) findOrCreateFolder(ctx context.Context, name, parentID string) (string, error) {
	// Search for an existing folder with this name under the parent.
	driveQuery := fmt.Sprintf(
		"name='%s' and mimeType='%s' and trashed=false",
		escapeQuery(name), driveFolderMime,
	)
	if parentID != "" {
		driveQuery += fmt.Sprintf(" and '%s' in parents", escapeQuery(parentID))
	}
	params := url.Values{}
	params.Set("q", driveQuery)
	params.Set("fields", "files(id,name)")
	params.Set("pageSize", strconv.Itoa(drivePageSizeFolderLookup))
	u := fmt.Sprintf("%s/drive/%s/files?%s", c.baseURL, driveAPIVersion, params.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, http.NoBody)
	if err != nil {
		return "", fmt.Errorf("googledrive: create folder lookup request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("googledrive: folder lookup request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
		return "", fmt.Errorf("googledrive: folder lookup HTTP %d: %s", resp.StatusCode, string(body))
	}

	var listResp folderListResponse
	if decodeErr := json.NewDecoder(resp.Body).Decode(&listResp); decodeErr != nil {
		return "", fmt.Errorf("googledrive: decode folder list: %w", decodeErr)
	}

	if len(listResp.Files) > 0 {
		return listResp.Files[0].ID, nil
	}

	// Folder doesn't exist — create it.
	return c.createFolder(ctx, name, parentID)
}

// createFolder creates a new Google Drive folder with the given name under parentID.
func (c *drivePushClient) createFolder(ctx context.Context, name, parentID string) (string, error) {
	metadata := map[string]any{
		"name":     name,
		"mimeType": driveFolderMime,
	}
	if parentID != "" {
		metadata["parents"] = []string{parentID}
	}

	metaJSON, err := json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("googledrive: marshal folder metadata: %w", err)
	}

	u := fmt.Sprintf("%s/drive/%s/files?fields=id,name", c.baseURL, driveAPIVersion)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(metaJSON))
	if err != nil {
		return "", fmt.Errorf("googledrive: create folder request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("googledrive: create folder: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
		return "", fmt.Errorf("googledrive: create folder HTTP %d: %s", resp.StatusCode, string(body))
	}

	var created folderEntry
	if decodeErr := json.NewDecoder(resp.Body).Decode(&created); decodeErr != nil {
		return "", fmt.Errorf("googledrive: decode created folder: %w", decodeErr)
	}

	return created.ID, nil
}

// createFile uploads a file to Google Drive using the multipart upload API.
// If parentID is non-empty, the file is created inside that folder.
func (c *drivePushClient) createFile(ctx context.Context, fileName, parentID, mimeType string, content []byte) error {
	// Build multipart/related body per Google Drive API spec.
	metadata := map[string]any{
		"name":     fileName,
		"mimeType": mimeType,
	}
	if parentID != "" {
		metadata["parents"] = []string{parentID}
	}

	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	// Part 1: resource metadata (JSON).
	h := make(textproto.MIMEHeader)
	h.Set("Content-Type", "application/json; charset=UTF-8")
	metaPart, err := w.CreatePart(h)
	if err != nil {
		return fmt.Errorf("googledrive: create metadata part: %w", err)
	}
	if encodeErr := json.NewEncoder(metaPart).Encode(metadata); encodeErr != nil {
		return fmt.Errorf("googledrive: encode metadata: %w", encodeErr)
	}

	// Part 2: file content.
	h2 := make(textproto.MIMEHeader)
	h2.Set("Content-Type", mimeType)
	contentPart, err := w.CreatePart(h2)
	if err != nil {
		return fmt.Errorf("googledrive: create content part: %w", err)
	}
	if _, writeErr := contentPart.Write(content); writeErr != nil {
		return fmt.Errorf("googledrive: write content: %w", writeErr)
	}

	if closeErr := w.Close(); closeErr != nil {
		return fmt.Errorf("googledrive: close multipart writer: %w", closeErr)
	}

	u := fmt.Sprintf("%s/upload/drive/%s/files?uploadType=multipart&fields=id,name", c.baseURL, driveAPIVersion)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, &b)
	if err != nil {
		return fmt.Errorf("googledrive: create upload request: %w", err)
	}
	req.Header.Set("Content-Type", "multipart/related; boundary="+w.Boundary())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("googledrive: upload request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodySize))
		return fmt.Errorf("googledrive: upload HTTP %d for %q: %s", resp.StatusCode, fileName, string(body))
	}

	return nil
}

// resolvePath converts a raw path into a Drive folder ID. Three modes:
//
//   - Empty / "/" → root (returns empty string, push lands at My Drive root).
//   - Drive folder ID (alphanumeric, matches driveIDPattern) → used directly
//     as the parent folder, no walk-and-create. The schema picker now
//     hands push a Drive ID when the user selects a folder visually;
//     without this short-circuit the code below would split the ID on
//     '/' (no slashes → one segment) and try to create a single folder
//     literally named "<long-id>", which is a confusing UX failure.
//   - Slash-path like "/Backup/Reports" → walks segment by segment,
//     creating each missing folder under the previous one.
func (c *drivePushClient) resolvePath(ctx context.Context, rawPath string) (string, error) {
	rawPath = strings.Trim(rawPath, "/")
	if rawPath == "" {
		return "", nil
	}

	// Drive ID short-circuit. Drive IDs are alphanumeric/underscore/
	// dash and never contain slashes; if the input matches the ID
	// shape, treat it as a pre-resolved parent folder.
	if driveIDPattern.MatchString(rawPath) {
		return rawPath, nil
	}

	segments := strings.Split(rawPath, "/")
	parentID := ""
	for _, segment := range segments {
		segment = strings.TrimSpace(segment)
		if segment == "" {
			continue
		}
		id, err := c.findOrCreateFolder(ctx, segment, parentID)
		if err != nil {
			return "", fmt.Errorf("googledrive: resolve path segment %q: %w", segment, err)
		}
		parentID = id
	}
	return parentID, nil
}

// detectMimeType returns a best-guess MIME type for the given filename.
func detectMimeType(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".json":
		return "application/json"
	case ".csv":
		return "text/csv"
	case ".xml":
		return "text/xml"
	case ".txt":
		return mimeTextPlain
	case ".html", ".htm":
		return "text/html"
	case ".md":
		return "text/markdown"
	case ".yaml", ".yml":
		return "application/x-yaml"
	case ".zip":
		return "application/zip"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

// escapeQuery escapes backslashes and single quotes in Drive API query strings.
// Backslashes must be escaped first so the quote-escape sequences aren't
// double-escaped (e.g. "test\" → "test\\" → "test\\'" not "test\'").
func escapeQuery(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	return strings.ReplaceAll(s, "'", "\\'")
}

// GoogleDrivePushProvider implements common.PushOperationProvider for
// Google Drive.  Files from the uploaded ZIP are pushed to the connected
// user's Drive as new Drive files using the multipart upload API.
type GoogleDrivePushProvider struct {
	dbInstance   *db.Database
	logger       *slog.Logger
	tokenClient  *lib.OAuthTokenClient
	connectionID uint
	ctx          context.Context
}

// ProgressHandler emits per-file events.
func (p *GoogleDrivePushProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandlerWithContext(p.ctx, p.dbInstance, p.logger, operation)
}

// InitializeClient creates the OAuth-wrapped HTTP client for Drive API calls.
func (p *GoogleDrivePushProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	p.logger = logger
	p.ctx = ctx

	rawClient := &http.Client{Timeout: vendorRequestTimeout}
	vendorClient := common.WrapHTTPClientForJob(rawClient, p.tokenClient, p.connectionID)
	pushClient := newDrivePushClient(vendorClient)

	return pushClient, nil, func() {}, nil
}

// ProcessFiles uploads each file from the push ZIP to Google Drive.
// rawPath is treated as a folder path — files are created under the
// resolved folder hierarchy (created if missing).
func (p *GoogleDrivePushProvider) ProcessFiles(
	ctx context.Context,
	clientAny any,
	operation *db.Operation,
	files map[string][]byte,
	rawPath string,
) error {
	pushClient, ok := clientAny.(*drivePushClient)
	if !ok {
		return errors.New("googledrive: invalid client type for push")
	}

	// Resolve the target folder path.
	parentID, err := pushClient.resolvePath(ctx, rawPath)
	if err != nil {
		return fmt.Errorf("googledrive: resolve path: %w", err)
	}

	if parentID != "" {
		p.logEvent(operation, db.LogEventTypeInfo,
			"Resolved target folder",
			map[string]any{"parent_folder_id": parentID, "path": rawPath})
	}

	if len(files) == 0 {
		return errors.New("googledrive: no files to push")
	}

	var created int
	for name, content := range files {
		mimeType := detectMimeType(name)

		if uploadErr := pushClient.createFile(ctx, name, parentID, mimeType, content); uploadErr != nil {
			p.logEvent(operation, db.LogEventTypeError,
				"Failed to push file",
				map[string]any{"file": name, "error": uploadErr.Error()})
			return fmt.Errorf("googledrive: push file %q: %w", name, uploadErr)
		}

		created++

		p.logEvent(operation, db.LogEventTypeInfo,
			"Pushed file to Google Drive",
			map[string]any{"file": name, "mime_type": mimeType})
	}

	p.logEvent(operation, db.LogEventTypeInfo,
		"Google Drive push completed",
		map[string]any{"files_created": created, "path": rawPath})

	return nil
}

// logEvent forwards to logProviderEvent (defined in operationPull.go)
// with the push provider's own dbInstance and logger.
func (p *GoogleDrivePushProvider) logEvent(
	operation *db.Operation, evt db.LogEventType, msg string, payload map[string]any,
) {
	logProviderEvent(p.dbInstance, p.logger, operation, evt, msg, payload)
}

// OperationPush godoc
// @Summary Push files to Google Drive
// @Description Upload files to the connected user's Google Drive as new files. The uploaded ZIP contents are created as individual Drive files under the optional path (treated as a folder hierarchy created on the fly).
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "ZIP file containing files to push to Google Drive"
// @Param path formData string false "Target folder path in Google Drive (e.g., '/Irmin/backup' — created if missing)"
// @Success 202 {object} fiber.Map "Push job started"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 428 {object} fiber.Map "OAuth not connected"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	connectionID, err := lib.ConnectionIDFromRequestHeader(func(k string) string { return c.Get(k) })
	if err != nil {
		return cs.WriteResolveError(c, err)
	}

	provider := &GoogleDrivePushProvider{
		dbInstance:   cs.DB,
		logger:       cs.Logger,
		tokenClient:  cs.OAuthConnector.TokenClient,
		connectionID: connectionID,
	}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB, cs.App)
}
