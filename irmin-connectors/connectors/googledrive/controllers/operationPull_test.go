//nolint:testpackage // white-box test — exercises unexported helpers (parsePullSettings, parseMimeFilter, downloadBinaryFile, walkFolder, etc.) that are deliberately package-private.
package googledrivecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"unicode/utf8"

	"gorm.io/datatypes"

	"irmin-connectors/connectors/common"
	"irmin-connectors/db"
)

// --- parsePullSettings ------------------------------------------------------

func TestParsePullSettings(t *testing.T) {
	t.Parallel()

	makeOp := func(raw string) *db.Operation {
		if raw == "" {
			return nil
		}
		return &db.Operation{Settings: datatypes.JSON([]byte(raw))}
	}

	defaultMaxBytes := int64(defaultMaxFileSizeMB) * bytesPerMB

	tests := []struct {
		name string
		op   *db.Operation
		want pullSettings
	}{
		{
			name: "nil operation falls back to defaults",
			op:   nil,
			want: pullSettings{
				googleNativeExport: googleNativeExportSkip,
				maxFileSizeBytes:   defaultMaxBytes,
				maxTotalBytes:      defaultMaxBytes * totalBudgetMultiplier,
				recursive:          false,
				maxRecords:         defaultMaxRecordsPerResource,
			},
		},
		{
			name: "malformed JSON falls back to defaults",
			op:   makeOp("{not json"),
			want: pullSettings{
				googleNativeExport: googleNativeExportSkip,
				maxFileSizeBytes:   defaultMaxBytes,
				maxTotalBytes:      defaultMaxBytes * totalBudgetMultiplier,
				maxRecords:         defaultMaxRecordsPerResource,
			},
		},
		{
			name: "valid overrides",
			op: makeOp(`{
				"max_records_per_resource": "42",
				"max_file_size_mb": "10",
				"google_native_export": "pdf",
				"mime_type_filter": "application/pdf, image/*",
				"recursive": "true"
			}`),
			want: pullSettings{
				googleNativeExport: googleNativeExportPDF,
				maxFileSizeBytes:   10 * bytesPerMB,
				maxTotalBytes:      10 * bytesPerMB * totalBudgetMultiplier,
				recursive:          true,
				maxRecords:         42,
			},
		},
		{
			name: "unknown export mode falls back to skip",
			op:   makeOp(`{"google_native_export": "docx"}`),
			want: pullSettings{
				googleNativeExport: googleNativeExportSkip,
				maxFileSizeBytes:   defaultMaxBytes,
				maxTotalBytes:      defaultMaxBytes * totalBudgetMultiplier,
				maxRecords:         defaultMaxRecordsPerResource,
			},
		},
		{
			name: "non-positive max_file_size_mb keeps defaults",
			op:   makeOp(`{"max_file_size_mb": "0"}`),
			want: pullSettings{
				googleNativeExport: googleNativeExportSkip,
				maxFileSizeBytes:   defaultMaxBytes,
				maxTotalBytes:      defaultMaxBytes * totalBudgetMultiplier,
				maxRecords:         defaultMaxRecordsPerResource,
			},
		},
		{
			name: "non-truthy recursive stays false",
			op:   makeOp(`{"recursive": "TRUE"}`),
			want: pullSettings{
				googleNativeExport: googleNativeExportSkip,
				maxFileSizeBytes:   defaultMaxBytes,
				maxTotalBytes:      defaultMaxBytes * totalBudgetMultiplier,
				recursive:          false,
				maxRecords:         defaultMaxRecordsPerResource,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := parsePullSettings(tc.op)
			// mimeFilter is compared structurally; everything else by value.
			if got.googleNativeExport != tc.want.googleNativeExport {
				t.Errorf("googleNativeExport = %q, want %q", got.googleNativeExport, tc.want.googleNativeExport)
			}
			if got.maxFileSizeBytes != tc.want.maxFileSizeBytes {
				t.Errorf("maxFileSizeBytes = %d, want %d", got.maxFileSizeBytes, tc.want.maxFileSizeBytes)
			}
			if got.maxTotalBytes != tc.want.maxTotalBytes {
				t.Errorf("maxTotalBytes = %d, want %d", got.maxTotalBytes, tc.want.maxTotalBytes)
			}
			if got.recursive != tc.want.recursive {
				t.Errorf("recursive = %v, want %v", got.recursive, tc.want.recursive)
			}
			if got.maxRecords != tc.want.maxRecords {
				t.Errorf("maxRecords = %d, want %d", got.maxRecords, tc.want.maxRecords)
			}
		})
	}
}

// --- parseMimeFilter + mimePattern.matches + mimeFilterAllows ---------------

func TestParseMimeFilter(t *testing.T) {
	t.Parallel()

	got := parseMimeFilter("image/*, application/pdf , ,  text/plain")
	if len(got) != 3 {
		t.Fatalf("want 3 patterns, got %d (%+v)", len(got), got)
	}
	if !got[0].isGlob || got[0].prefix != "image/" {
		t.Errorf("first pattern: want glob image/, got %+v", got[0])
	}
	if got[1].isGlob || got[1].prefix != "application/pdf" {
		t.Errorf("second pattern: want exact application/pdf, got %+v", got[1])
	}
	if got[2].isGlob || got[2].prefix != mimeTextPlain {
		t.Errorf("third pattern: want exact text/plain, got %+v", got[2])
	}

	if parseMimeFilter("") != nil {
		t.Errorf("empty filter must return nil")
	}
	if parseMimeFilter("  ,  ,  ") != nil {
		t.Errorf("whitespace-only filter must return nil")
	}
}

func TestMimePatternMatches(t *testing.T) {
	t.Parallel()

	glob := mimePattern{raw: "image/*", isGlob: true, prefix: "image/"}
	if !glob.matches("image/png") {
		t.Error("glob image/* should match image/png")
	}
	if glob.matches("video/mp4") {
		t.Error("glob image/* must not match video/mp4")
	}

	exact := mimePattern{raw: "application/pdf", prefix: "application/pdf"}
	if !exact.matches("application/pdf") {
		t.Error("exact must match itself")
	}
	if exact.matches("application/pdfx") {
		t.Error("exact must not prefix-match")
	}
}

func TestMimeFilterAllows(t *testing.T) {
	t.Parallel()

	if !mimeFilterAllows(nil, "anything/here") {
		t.Error("nil filter must allow everything")
	}

	patterns := parseMimeFilter("application/pdf, image/*")
	if !mimeFilterAllows(patterns, "application/pdf") {
		t.Error("exact match should pass")
	}
	if !mimeFilterAllows(patterns, "image/png") {
		t.Error("glob match should pass")
	}
	if mimeFilterAllows(patterns, "audio/mp3") {
		t.Error("non-matching MIME must not pass")
	}
}

// --- downloadBinaryFile size pre-check --------------------------------------

func TestDownloadBinaryFile_SizePreCheckBypassesHTTP(t *testing.T) {
	t.Parallel()

	called := false
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		_, _ = w.Write([]byte("should not be reached"))
	}))
	t.Cleanup(srv.Close)

	c := &googleDriveClient{httpClient: srv.Client(), baseURL: srv.URL}
	s := pullSettings{maxFileSizeBytes: 1024}
	f := &fileEntry{ID: "x", Name: "big.bin", Size: "99999", MimeType: "application/octet-stream"}

	_, _, reason, err := c.downloadBinaryFile(context.Background(), f, s)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if reason != skipReasonOverSizeCap {
		t.Errorf("want skip reason %q, got %q", skipReasonOverSizeCap, reason)
	}
	if called {
		t.Error("declared size > cap should bypass the HTTP call entirely")
	}
}

// --- googleNativeExportTarget -----------------------------------------------

func TestGoogleNativeExportTarget(t *testing.T) {
	t.Parallel()

	const (
		docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		pptx = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	)

	tests := []struct {
		mime, mode, want string
	}{
		{googleNativeMimePfx + "document", googleNativeExportSkip, ""},
		{googleNativeMimePfx + "document", googleNativeExportPDF, mimePDF},
		{googleNativeMimePfx + "spreadsheet", googleNativeExportPDF, mimePDF},
		{googleNativeMimePfx + "document", googleNativeExportOffice, docx},
		{googleNativeMimePfx + "spreadsheet", googleNativeExportOffice, xlsx},
		{googleNativeMimePfx + "presentation", googleNativeExportOffice, pptx},
		{googleNativeMimePfx + "drawing", googleNativeExportOffice, ""},
		{googleNativeMimePfx + "form", googleNativeExportOffice, ""},
		{googleNativeMimePfx + "document", "bogus", ""},
	}
	for _, tc := range tests {
		if got := googleNativeExportTarget(tc.mime, tc.mode); got != tc.want {
			t.Errorf("googleNativeExportTarget(%q, %q) = %q, want %q", tc.mime, tc.mode, got, tc.want)
		}
	}
}

// --- safeFileName + extForMime ----------------------------------------------

func TestSafeFileName(t *testing.T) {
	t.Parallel()

	if got := safeFileName(""); got != safeFileNameFallback {
		t.Errorf("empty -> %q, want safeFileNameFallback", got)
	}
	if got := safeFileName("   "); got != safeFileNameFallback {
		t.Errorf("whitespace-only -> %q, want safeFileNameFallback", got)
	}
	if got := safeFileName("a/b\\c"); strings.ContainsAny(got, "/\\") {
		t.Errorf("path separators leaked: %q", got)
	}
	long := strings.Repeat("x", safeNameMaxLen+50)
	if got := safeFileName(long); len(got) > safeNameMaxLen {
		t.Errorf("len=%d, want <= %d", len(got), safeNameMaxLen)
	}

	// Multi-byte UTF-8 truncation must split on a rune boundary, not a
	// byte boundary, or the resulting zip entry name is invalid UTF-8.
	// 100 hiragana "あ" (3 bytes each in UTF-8) -> 300 bytes raw.
	cjk := strings.Repeat("あ", safeNameMaxLen+20)
	got := safeFileName(cjk)
	if !utf8.ValidString(got) {
		t.Errorf("rune truncation produced invalid UTF-8: %q", got)
	}
	if rc := utf8.RuneCountInString(got); rc != safeNameMaxLen {
		t.Errorf("rune count = %d, want %d (CJK trim should be rune-aware)", rc, safeNameMaxLen)
	}

	// Emoji (4-byte UTF-8 runes) — same invariant.
	emoji := strings.Repeat("🐙", safeNameMaxLen+5)
	got = safeFileName(emoji)
	if !utf8.ValidString(got) {
		t.Errorf("emoji truncation produced invalid UTF-8: %q", got)
	}
	if rc := utf8.RuneCountInString(got); rc != safeNameMaxLen {
		t.Errorf("emoji rune count = %d, want %d", rc, safeNameMaxLen)
	}
}

func TestExtForMime(t *testing.T) {
	t.Parallel()

	cases := map[string]string{
		mimePDF:           "pdf",
		"image/png":       "png",
		"image/jpeg":      "jpg",
		"text/csv":        "csv",
		mimeJSON:          "json",
		"unknown/whatevr": "",
	}
	for mime, want := range cases {
		if got := extForMime(mime); got != want {
			t.Errorf("extForMime(%q) = %q, want %q", mime, got, want)
		}
	}
}

// --- walkFolder + auth-failure bubbling -------------------------------------

// driveTestMux returns an http.Handler that mocks the subset of the Drive v3
// API exercised by walkFolder/downloadChild and the schema provider:
// list children by q="'<id>' in parents", binary download by
// /files/{id}?alt=media, and metadata lookup by /files/{id} without
// alt=media. fileMetadata is consulted for files.get; missing entries
// 404. fileBodies holds the binary bytes for alt=media downloads.
func driveTestMux(
	t *testing.T,
	folders map[string][]fileEntry,
	fileBodies map[string][]byte,
	fileMetadata map[string]fileEntry,
) http.Handler {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/drive/v3/files/", func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/drive/v3/files/")
		if r.URL.Query().Get("alt") == "media" {
			body, ok := fileBodies[id]
			if !ok {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			_, _ = w.Write(body)
			return
		}
		// files.get — return metadata JSON.
		meta, ok := fileMetadata[id]
		if !ok {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		_ = json.NewEncoder(w).Encode(meta)
	})
	mux.HandleFunc("/drive/v3/files", func(w http.ResponseWriter, r *http.Request) {
		// listChildren — extract '<parentID>' in parents from q
		q := r.URL.Query().Get("q")
		var parentID string
		if idx := strings.Index(q, "' in parents"); idx >= 0 {
			start := strings.Index(q, "'")
			if start >= 0 && start < idx {
				parentID = q[start+1 : idx]
			}
		}
		children, ok := folders[parentID]
		if !ok {
			children = nil
		}
		resp := filesListResponse{Files: children}
		_ = json.NewEncoder(w).Encode(resp)
	})
	return mux
}

func newTestProvider(t *testing.T, srv *httptest.Server) (*GoogleDrivePullProvider, *googleDriveClient) {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	client := &googleDriveClient{httpClient: srv.Client(), baseURL: srv.URL}
	p := &GoogleDrivePullProvider{logger: logger, ctx: context.Background()}
	return p, client
}

func TestWalkFolder_RespectsMaxRecords(t *testing.T) {
	t.Parallel()

	folders := map[string][]fileEntry{
		"root": {
			{ID: "f1", Name: "a.pdf", MimeType: mimePDF, Size: "10"},
			{ID: "f2", Name: "b.pdf", MimeType: mimePDF, Size: "10"},
			{ID: "f3", Name: "c.pdf", MimeType: mimePDF, Size: "10"},
			{ID: "f4", Name: "d.pdf", MimeType: mimePDF, Size: "10"},
			{ID: "f5", Name: "e.pdf", MimeType: mimePDF, Size: "10"},
		},
	}
	fileBodies := map[string][]byte{
		"f1": []byte("aaaaaaaaaa"),
		"f2": []byte("bbbbbbbbbb"),
		"f3": []byte("cccccccccc"),
		"f4": []byte("dddddddddd"),
		"f5": []byte("eeeeeeeeee"),
	}

	srv := httptest.NewServer(driveTestMux(t, folders, fileBodies, nil))
	t.Cleanup(srv.Close)

	p, client := newTestProvider(t, srv)
	settings := pullSettings{
		googleNativeExport: googleNativeExportSkip,
		maxFileSizeBytes:   1 << 20,
		maxTotalBytes:      1 << 30,
		maxRecords:         3,
	}

	results, trunc, err := p.walkFolder(context.Background(), client, settings, "root")
	if err != nil {
		t.Fatalf("walkFolder error: %v", err)
	}
	if trunc != "max_records_reached" {
		t.Errorf("truncation = %q, want max_records_reached", trunc)
	}
	if len(results) != 3 {
		t.Errorf("len(results) = %d, want 3", len(results))
	}
}

func TestWalkFolder_ByteBudgetReached(t *testing.T) {
	t.Parallel()

	folders := map[string][]fileEntry{
		"root": {
			{ID: "f1", Name: "a.bin", MimeType: "application/octet-stream", Size: "100"},
			{ID: "f2", Name: "b.bin", MimeType: "application/octet-stream", Size: "100"},
			{ID: "f3", Name: "c.bin", MimeType: "application/octet-stream", Size: "100"},
		},
	}
	fileBodies := map[string][]byte{
		"f1": make([]byte, 100),
		"f2": make([]byte, 100),
		"f3": make([]byte, 100),
	}

	srv := httptest.NewServer(driveTestMux(t, folders, fileBodies, nil))
	t.Cleanup(srv.Close)

	p, client := newTestProvider(t, srv)
	settings := pullSettings{
		maxFileSizeBytes: 1024,
		maxTotalBytes:    150, // budget allows 1 full file; 2nd will exceed
		maxRecords:       0,
	}

	results, trunc, err := p.walkFolder(context.Background(), client, settings, "root")
	if err != nil {
		t.Fatalf("walkFolder error: %v", err)
	}
	if trunc != "total_byte_budget_reached" {
		t.Errorf("truncation = %q, want total_byte_budget_reached", trunc)
	}
	// Expect: f1 downloaded, f2 recorded as skipped with budget_exhausted.
	if len(results) != 2 {
		t.Fatalf("len(results) = %d, want 2", len(results))
	}
	if results[0].SkipReason != "" || len(results[0].Bytes) != 100 {
		t.Errorf("first result should be downloaded; got %+v", results[0])
	}
	if results[1].SkipReason != skipReasonBudgetExhausted {
		t.Errorf("second result skip reason = %q, want %q", results[1].SkipReason, skipReasonBudgetExhausted)
	}
}

func TestWalkFolder_NonRecursiveSkipsSubfolders(t *testing.T) {
	t.Parallel()

	folders := map[string][]fileEntry{
		"root": {
			{ID: "f1", Name: "a.pdf", MimeType: mimePDF, Size: "1"},
			{ID: "sub", Name: "subfolder", MimeType: driveFolderMime},
		},
		"sub": {
			{ID: "f2", Name: "should-not-appear.pdf", MimeType: mimePDF, Size: "1"},
		},
	}
	fileBodies := map[string][]byte{
		"f1": []byte("x"),
		"f2": []byte("y"),
	}

	srv := httptest.NewServer(driveTestMux(t, folders, fileBodies, nil))
	t.Cleanup(srv.Close)

	p, client := newTestProvider(t, srv)
	settings := pullSettings{
		maxFileSizeBytes: 1024,
		maxTotalBytes:    1024,
		recursive:        false,
		maxRecords:       100,
	}

	results, _, err := p.walkFolder(context.Background(), client, settings, "root")
	if err != nil {
		t.Fatalf("walkFolder error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("non-recursive should produce 1 result, got %d", len(results))
	}
	if results[0].Entry.ID != "f1" {
		t.Errorf("got file ID %q, want f1", results[0].Entry.ID)
	}
}

func TestWalkFolder_AuthFailureBubbles(t *testing.T) {
	t.Parallel()

	folders := map[string][]fileEntry{
		"root": {
			{ID: "f1", Name: "a.pdf", MimeType: mimePDF, Size: "10"},
		},
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/drive/v3/files/", func(w http.ResponseWriter, _ *http.Request) {
		// Simulate auth-broken token: 403 on every download.
		http.Error(w, "Insufficient Permission", http.StatusForbidden)
	})
	mux.HandleFunc("/drive/v3/files", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query().Get("q")
		var parentID string
		if idx := strings.Index(q, "' in parents"); idx >= 0 {
			start := strings.Index(q, "'")
			if start >= 0 && start < idx {
				parentID = q[start+1 : idx]
			}
		}
		_ = json.NewEncoder(w).Encode(filesListResponse{Files: folders[parentID]})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)

	p, client := newTestProvider(t, srv)
	settings := pullSettings{
		maxFileSizeBytes: 1024,
		maxTotalBytes:    1024,
		maxRecords:       100,
	}

	_, _, err := p.walkFolder(context.Background(), client, settings, "root")
	if err == nil {
		t.Fatal("expected auth failure to bubble as an error, got nil")
	}
	var apiErr *driveAPIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("error chain missing *driveAPIError: %v", err)
	}
	if apiErr.Status != http.StatusForbidden {
		t.Errorf("got status %d, want 403", apiErr.Status)
	}
}

// --- clampedPageSize --------------------------------------------------------

func TestClampedPageSize(t *testing.T) {
	t.Parallel()

	cases := []struct {
		maxResults, fetched, want int
	}{
		{0, 0, drivePageSizeMax},
		{-5, 0, drivePageSizeMax},
		{50, 0, 50},
		{50, 25, 25},
		{50, 50, drivePageSizeMax}, // already at cap; safe to ask for max — walker will exit at next cap check
		{2000, 0, drivePageSizeMax},
	}
	for _, tc := range cases {
		if got := clampedPageSize(tc.maxResults, tc.fetched); got != tc.want {
			t.Errorf("clampedPageSize(%d, %d) = %d, want %d",
				tc.maxResults, tc.fetched, got, tc.want)
		}
	}
}

// Compile-time guard: GoogleDrivePullProvider must satisfy the
// PullByPathMultiProvider interface from connectors/common. If it stops
// implementing GetFilesByPath the build fails here, instead of /ship
// silently falling back to the single-file GetFileByPath path and
// dropping all-but-the-first blob of a folder pull.
var _ common.PullByPathMultiProvider = (*GoogleDrivePullProvider)(nil)

// --- schema provider --------------------------------------------------------

// newTestSchemaClient stands up an httptest.Server mocking the Drive
// endpoints the schema provider uses and returns a googleDriveClient
// pointed at it. Tests construct googledriveSchemaProvider directly
// (no fiber.Ctx) and call the builder helpers with a real context.
// The server is closed via t.Cleanup so the caller doesn't need it.
func newTestSchemaClient(
	t *testing.T,
	folders map[string][]fileEntry,
	fileMetadata map[string]fileEntry,
) *googleDriveClient {
	t.Helper()
	srv := httptest.NewServer(driveTestMux(t, folders, nil, fileMetadata))
	t.Cleanup(srv.Close)
	return &googleDriveClient{httpClient: srv.Client(), baseURL: srv.URL}
}

func TestSchema_EmptyPathBuildsRoot(t *testing.T) {
	t.Parallel()

	folders := map[string][]fileEntry{
		"root": {
			{ID: "fld1", Name: "Reports", MimeType: driveFolderMime},
			{ID: "f1pdf01234567890abcdef", Name: "annual.pdf", MimeType: mimePDF, Size: "100"},
		},
	}
	client := newTestSchemaClient(t, folders, nil)
	p := &googledriveSchemaProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	got, err := p.buildRootSchema(context.Background(), client, operationTypePull)
	if err != nil {
		t.Fatalf("buildRootSchema error: %v", err)
	}
	if got.Type != "group" {
		t.Errorf("root type = %q, want group", got.Type)
	}
	// Expect: 1 legacy files.json child + 2 drive children = 3.
	if len(got.Children) != 3 {
		t.Fatalf("len(children) = %d, want 3 (legacy + 2 drive items)", len(got.Children))
	}
	if got.Children[0].Path != legacyMetadataPath {
		t.Errorf("first child path = %q, want %q", got.Children[0].Path, legacyMetadataPath)
	}
	if got.Children[1].Path != "fld1" || got.Children[1].Type != "group" {
		t.Errorf("second child should be folder fld1, got %+v", got.Children[1])
	}
	if got.Children[2].Path != "f1pdf01234567890abcdef" || got.Children[2].Type != "binary" {
		t.Errorf("third child should be binary file, got %+v", got.Children[2])
	}
}

func TestSchema_FilesJSONPathReturnsLegacy(t *testing.T) {
	t.Parallel()

	p := &googledriveSchemaProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	got := p.buildLegacyMetadataSchema(operationTypePull)
	if got.Path != legacyMetadataPath {
		t.Errorf("legacy path = %q, want %q", got.Path, legacyMetadataPath)
	}
	if got.Schema == nil || got.Schema.Type != "array" {
		t.Errorf("legacy pull schema must be array, got %+v", got.Schema)
	}
}

func TestSchema_FolderIDListsChildren(t *testing.T) {
	t.Parallel()

	folders := map[string][]fileEntry{
		"folder1xxxxxxxxxxxxxx": {
			{ID: "sub1xxxxxxxxxxxxxxxxx", Name: "subfolder", MimeType: driveFolderMime},
			{
				ID:       "doc1xxxxxxxxxxxxxxxxx",
				Name:     "report.docx",
				MimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				Size:     "5000",
			},
		},
	}
	client := newTestSchemaClient(t, folders, nil)
	p := &googledriveSchemaProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	got, err := p.buildFolderSchema(
		context.Background(),
		client,
		"folder1xxxxxxxxxxxxxx",
		"MyFolder",
		operationTypePull,
	)
	if err != nil {
		t.Fatalf("buildFolderSchema error: %v", err)
	}
	if got.Path != "folder1xxxxxxxxxxxxxx" {
		t.Errorf("folder path = %q, want folder1xxxxxxxxxxxxxx", got.Path)
	}
	if len(got.Children) != 2 {
		t.Fatalf("len(children) = %d, want 2", len(got.Children))
	}
	if got.Children[0].Type != "group" {
		t.Errorf("subfolder child should be group, got %q", got.Children[0].Type)
	}
	if got.Children[1].Type != "binary" {
		t.Errorf("docx child should be binary, got %q", got.Children[1].Type)
	}
}

func TestSchema_FileIDReturnsLeaf(t *testing.T) {
	t.Parallel()

	// driveEntryToObjectSchema is tested directly so we don't need the
	// HTTP mux here.
	regular := &fileEntry{
		ID:           "file12345678901234567",
		Name:         "report.pdf",
		MimeType:     mimePDF,
		Size:         "12345",
		ModifiedTime: "2025-01-01T00:00:00Z",
	}
	got := driveEntryToObjectSchema(regular, operationTypePull)
	if got.Type != "binary" {
		t.Errorf("regular file type = %q, want binary", got.Type)
	}
	if got.Size == nil || *got.Size != 12345 {
		t.Errorf("size = %v, want 12345", got.Size)
	}
	if got.ContentType == nil || *got.ContentType != mimePDF {
		t.Errorf("contentType = %v, want %q", got.ContentType, mimePDF)
	}

	googleDoc := &fileEntry{
		ID:       "doc12345678901234567x",
		Name:     "Untitled",
		MimeType: googleNativeMimePfx + "document",
	}
	got = driveEntryToObjectSchema(googleDoc, operationTypePull)
	if got.Type != "structured" {
		t.Errorf("google doc type = %q, want structured (export-on-demand)", got.Type)
	}

	folder := &fileEntry{
		ID:       "fld12345678901234567x",
		Name:     "Backup",
		MimeType: driveFolderMime,
	}
	got = driveEntryToObjectSchema(folder, operationTypePull)
	if got.Type != "group" {
		t.Errorf("folder type = %q, want group", got.Type)
	}
	if got.Children != nil {
		t.Errorf("folder must have nil Children (lazy-expand placeholder), got %d", len(got.Children))
	}
}

func TestSchema_TruncationMarkerAtCap(t *testing.T) {
	t.Parallel()

	// Build a folder with drivePageSizeMax children — listChildren
	// returns them all in one page, schema appends the truncation marker.
	bigFolder := make([]fileEntry, drivePageSizeMax)
	for i := range bigFolder {
		bigFolder[i] = fileEntry{
			ID:       fmt.Sprintf("file%016dxx", i),
			Name:     fmt.Sprintf("doc-%d.pdf", i),
			MimeType: mimePDF,
			Size:     "100",
		}
	}
	folders := map[string][]fileEntry{
		"bigfolder111111111111": bigFolder,
	}
	client := newTestSchemaClient(t, folders, nil)
	p := &googledriveSchemaProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}

	got, err := p.buildFolderSchema(context.Background(), client, "bigfolder111111111111", "Big", operationTypePull)
	if err != nil {
		t.Fatalf("buildFolderSchema error: %v", err)
	}
	if len(got.Children) != drivePageSizeMax+1 {
		t.Fatalf("len(children) = %d, want %d (cap + truncation marker)", len(got.Children), drivePageSizeMax+1)
	}
	marker := got.Children[len(got.Children)-1]
	if !strings.Contains(marker.Name, "items") || !strings.Contains(marker.Name, "path field") {
		t.Errorf("truncation marker name doesn't look right: %q", marker.Name)
	}
}

func TestSchema_PushLegacyUsesAdditionalProperties(t *testing.T) {
	t.Parallel()

	p := &googledriveSchemaProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	got := p.buildLegacyMetadataSchema(operationTypePush)
	if got.Schema == nil {
		t.Fatal("push legacy schema must have a Schema body")
	}
	// AdditionalProperties is `any` in the model; for our usage it must
	// be a *JSONSchema describing the per-file value shape — never the
	// literal `*` property the v1 code emitted.
	if got.Schema.AdditionalProperties == nil {
		t.Errorf("push schema AdditionalProperties must be set (we no longer use the literal '*' property)")
	}
	if len(got.Schema.Properties) != 0 {
		t.Errorf("push schema must not declare named Properties (the v1 '*' bug); got %v", got.Schema.Properties)
	}
}

func TestSchema_PushSlashPathLeaf(t *testing.T) {
	t.Parallel()

	p := &googledriveSchemaProvider{}
	got := p.buildPushSlashPathLeaf("/Backup/Reports")
	if got.Path != "/Backup/Reports" || got.Type != "group" {
		t.Errorf("slash-path leaf = %+v, want group at path /Backup/Reports", got)
	}
}

func TestSchema_NonPullPushReturnsEmpty(t *testing.T) {
	t.Parallel()

	p := &googledriveSchemaProvider{
		logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	// patch op isn't supported — provider must return an empty schema,
	// never call into Drive (no client wired here so a call would panic).
	got, err := p.GetSchema(nil, nil, "patch", nil)
	if err != nil {
		t.Fatalf("GetSchema(patch) error: %v", err)
	}
	if got.Name != "" || got.Type != "" {
		t.Errorf("unsupported operation should return empty ObjectSchema, got %+v", got)
	}
}

// TestPull_TrailingSlashOnDriveID guards against a regression where the
// console hands the pull layer a Drive ID with a trailing slash (e.g.
// "1-8LU...j72i/") on group-type selections. Core only trims the leading
// slash, so the connector has to be slash-tolerant on both ends. Without
// the trim in GetFilesByPath the Drive API 404s with the literal slash
// in the path and the workflow run errors out.
func TestPull_TrailingSlashOnDriveID(t *testing.T) {
	t.Parallel()

	folderID := "1aB2cD3eF4gH5iJ6kL7mN8oP" // 24-char Drive-shaped ID
	folders := map[string][]fileEntry{
		folderID: {
			{ID: "f1pdf01234567890abcdef", Name: "doc.pdf", MimeType: mimePDF, Size: "100"},
		},
	}
	fileMetadata := map[string]fileEntry{
		folderID: {ID: folderID, Name: "Folder", MimeType: driveFolderMime},
	}
	client := newTestSchemaClient(t, folders, fileMetadata)

	p := &GoogleDrivePullProvider{logger: slog.New(slog.NewTextHandler(io.Discard, nil))}
	op := &db.Operation{Settings: []byte(`{}`)}

	paths, blobs, err := p.GetFilesByPath(context.Background(), client, op, folderID+"/")
	if err != nil {
		t.Fatalf("GetFilesByPath with trailing slash errored: %v", err)
	}
	if len(paths) == 0 || len(blobs) == 0 {
		t.Fatalf("expected at least one file pulled, got paths=%d blobs=%d", len(paths), len(blobs))
	}
}

// --- driveIDPattern ---------------------------------------------------------

func TestDriveIDPattern(t *testing.T) {
	t.Parallel()

	// Real Drive IDs are typically 28-44 chars of [A-Za-z0-9_-].
	matches := []string{
		"1aB2cD3eF4gH5iJ6kL7mN8oP",                   // 24 chars
		"1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT",             // 30 chars
		"1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT-_AbCdEfGhIj", // with - and _
	}
	for _, m := range matches {
		if !driveIDPattern.MatchString(m) {
			t.Errorf("driveIDPattern should match real-shape ID %q", m)
		}
	}
	rejects := []string{
		"",
		"files",
		"files.json",
		"too-short",
		"/Backup/Reports",
		"abc def ghi jkl mno pqr stu", // spaces
		"abc!@#$%^&*()def0123456",     // illegal chars
	}
	for _, r := range rejects {
		if driveIDPattern.MatchString(r) {
			t.Errorf("driveIDPattern should reject %q (not Drive-ID shaped)", r)
		}
	}
}
