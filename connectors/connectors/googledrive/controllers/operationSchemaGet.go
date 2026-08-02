package googledrivecontrollers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"

	"irmin-connectors/connectors/common"
	googledriveconfig "irmin-connectors/connectors/googledrive/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// legacyMetadataPath is the reserved virtual path the schema endpoint
// emits as a sibling of real Drive resources. Selecting it routes to
// the metadata-only legacy code path in GetAllFiles. "files" is a
// reserved literal at the same level as Drive IDs (which never equal
// "files"), so the two namespaces don't collide.
const legacyMetadataPath = "files"

// operationTypePull / operationTypePush are the values
// HandleOperationSchemaGet hands GetSchema for the two ops we support.
// Named so the goconst lint stays quiet and the dispatch sites stay
// readable.
const (
	operationTypePull = "pull"
	operationTypePush = "push"
)

// driveRootAlias is the literal string the Drive API accepts as an
// alias for the authenticated user's My Drive root folder. We surface
// it in the root schema so the picker has an obvious "browse my Drive"
// entry, and listChildren uses the alias unchanged when called with it.
const driveRootAlias = "root"

// driveIDPattern matches the alphanumeric/underscore/dash strings Drive
// uses as resource IDs. The Drive docs don't pin an exact length;
// real-world IDs run ~28 to ~44 characters. We accept 20+ to leave
// headroom and reject obvious mis-routed input ("files", "/", short
// typos).
var driveIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{20,}$`)

// googledriveSchemaProvider builds an Irmin ObjectSchema response from
// the connected user's Drive. Each schema call performs at most one
// Drive `files.list` (folder browse) or `files.get` (single-resource
// resolve), so the picker can drill the tree one level at a time. The
// console's existing tree-picker pre-renders whatever depth we return;
// deeper browsing flows through the free-text path field today, and
// becomes interactive once the Phase 2 console work lands.
type googledriveSchemaProvider struct {
	dbInstance   *db.Database
	logger       *slog.Logger
	tokenClient  *lib.OAuthTokenClient
	connectionID uint
}

// InitializeClient wires the OAuth-wrapped Drive client used during
// schema browsing. Mirrors the pull/push providers — same round-tripper
// + same one-retry-on-401 token-refresh path through Core.
func (p *googledriveSchemaProvider) InitializeClient(
	_ fiber.Ctx, logger *slog.Logger, _ *db.Operation,
) (any, *string, func(), error) {
	raw := &http.Client{Timeout: vendorRequestTimeout}
	wrapped := common.WrapHTTPClientForJob(raw, p.tokenClient, p.connectionID)
	driveClient := newDriveClient(wrapped)
	if p.logger == nil {
		p.logger = logger
	}
	return driveClient, nil, func() {}, nil
}

// GetSupportedOperationTypes is computed from the connector's
// declared capabilities.
func (p *googledriveSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(googledriveconfig.GetConnectorInfo().Capabilities)
}

// GetSchema returns a path-aware ObjectSchema describing what the user
// can pull from (or push to) the connected Drive at this level of the
// tree. See the rules table in
// `connectors/googledrive/docs/console-lazy-browse.md` for the full
// path → response mapping.
func (p *googledriveSchemaProvider) GetSchema(
	c fiber.Ctx,
	clientAny any,
	operationType string,
	path *string,
) (*irminmodels.ObjectSchema, error) {
	if operationType != operationTypePull && operationType != operationTypePush {
		return &irminmodels.ObjectSchema{}, nil
	}

	rawPath := ""
	if path != nil {
		rawPath = strings.TrimSpace(*path)
	}
	// Strip a trailing slash so a Drive ID arriving as "<id>/" — the
	// console can leave one on group-type selections — resolves the same
	// as "<id>". A leading slash is preserved on push so slash-paths like
	// "/Backup/Reports" still route through the slash-path branch.
	if rawPath != "/" {
		rawPath = strings.TrimRight(rawPath, "/")
	}

	ctx := c.Context()

	// "files" / "files.json" / empty-suffix variants always route to the
	// legacy metadata catalogue, regardless of operation type.
	stripped := strings.TrimSuffix(rawPath, ".json")
	if rawPath == "" {
		return p.buildRootSchema(ctx, clientAny, operationType)
	}
	if stripped == legacyMetadataPath {
		return p.buildLegacyMetadataSchema(operationType), nil
	}

	client, ok := clientAny.(*googleDriveClient)
	if !ok {
		return nil, errors.New("googledrive: invalid client type for schema")
	}

	// Drive root alias — list My Drive's top-level children.
	if rawPath == driveRootAlias {
		return p.buildFolderSchema(ctx, client, driveRootAlias, "My Drive", operationType)
	}

	// Drive ID — resolve and branch on whether it's a folder or a file.
	if driveIDPattern.MatchString(rawPath) {
		return p.resolveAndBuildSchema(ctx, client, rawPath, operationType)
	}

	// Slash-path on push (e.g. "/Backup/Reports") — the existing
	// resolvePath in operationPush.go handles these at push-time. At
	// schema-time we don't pre-walk the hierarchy; return a virtual
	// folder leaf the picker can show.
	if operationType == operationTypePush && strings.Contains(rawPath, "/") {
		return p.buildPushSlashPathLeaf(rawPath), nil
	}

	// Anything else — fall back to the legacy metadata schema so the
	// picker stays robust against stale state.
	return p.buildLegacyMetadataSchema(operationType), nil
}

// buildRootSchema returns the response for an empty or missing path:
// the legacy `files.json` catalogue plus every immediate child of the
// authenticated user's My Drive. The console renders the children as
// a one-level tree; deeper browsing flows through the path field
// today (Phase 1) and through lazy-fetch on expand once Phase 2 ships.
func (p *googledriveSchemaProvider) buildRootSchema(
	ctx context.Context, clientAny any, operationType string,
) (*irminmodels.ObjectSchema, error) {
	client, ok := clientAny.(*googleDriveClient)
	if !ok {
		return nil, errors.New("googledrive: invalid client type for schema")
	}

	root, err := p.buildFolderSchema(ctx, client, driveRootAlias, "My Drive", operationType)
	if err != nil {
		return nil, err
	}

	// Prepend the legacy metadata catalogue so existing workflows that
	// pull files.json keep working unchanged.
	legacy := p.buildLegacyMetadataSchema(operationType)
	children := make([]irminmodels.ObjectSchema, 0, len(root.Children)+1)
	children = append(children, *legacy)
	children = append(children, root.Children...)

	return &irminmodels.ObjectSchema{
		Name:        "Google Drive",
		Path:        "",
		Type:        irminmodels.ObjectTypeGroup,
		Description: strPtr(rootDescription(operationType)),
		Children:    children,
	}, nil
}

// rootDescription tells the user what the picker is showing them.
// Kept simple — the console renders Description under the tree label.
func rootDescription(operationType string) string {
	if operationType == operationTypePush {
		return "Pick a folder to push files into. Subfolders shown one level at a time; paste a folder ID into the path field to drill deeper, or use a slash-path like '/Backup/Reports' to create folders on the fly."
	}
	return "Pick `files.json` for a metadata-only export, or pick a folder/file to pull its contents. Subfolders shown one level at a time; paste a folder ID into the path field to drill deeper."
}

// buildLegacyMetadataSchema returns the static files.json ObjectSchema
// the connector has emitted since v1. Selecting this entry from the
// picker routes pull to GetAllFiles' metadata-only branch (push doesn't
// have a meaningful "metadata-only" target, but we still surface the
// entry so back-compat for existing workflows is uniform).
func (p *googledriveSchemaProvider) buildLegacyMetadataSchema(operationType string) *irminmodels.ObjectSchema {
	jsonCT := mimeJSON

	if operationType == operationTypePush {
		// Push schema: any number of named files under this entry,
		// each carrying raw bytes. Uses standard JSON Schema
		// additionalProperties so the console can render it as
		// "accepts any filename" instead of treating the literal "*"
		// as a property name.
		return &irminmodels.ObjectSchema{
			Name:        "files.json",
			Path:        legacyMetadataPath,
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: &jsonCT,
			Description: strPtr(
				"Legacy uniform entry. For push, prefer picking a Drive folder so files land in a known location.",
			),
			Schema: &irminmodels.JSONSchema{
				Type: "object",
				Description: strPtr(
					"Map of filename to base64-encoded file content. Filenames are free-form; any MIME type accepted.",
				),
				AdditionalProperties: &irminmodels.JSONSchema{
					Type:            "string",
					ContentEncoding: strPtr("base64"),
					Description:     strPtr("File content as base64-encoded bytes."),
				},
			},
		}
	}

	record := driveFileRecordSchema()
	filesSchema := irminmodels.JSONSchema{
		Type:        "array",
		Description: strPtr("Array of Google Drive file metadata records pulled via the Drive v3 API."),
		Items:       &record,
	}
	return &irminmodels.ObjectSchema{
		Name:        "files.json",
		Path:        legacyMetadataPath,
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: &jsonCT,
		Description: strPtr(
			"Drive-wide metadata catalogue (no file contents). Back-compat entry — picking this keeps workflows that depend on the metadata-only output working.",
		),
		Schema: &filesSchema,
	}
}

// resolveAndBuildSchema dispatches a Drive ID to the right builder. It
// uses files.get to determine whether the ID points at a folder (walk
// its children for the picker) or a file (return a single leaf).
func (p *googledriveSchemaProvider) resolveAndBuildSchema(
	ctx context.Context, client *googleDriveClient, driveID, operationType string,
) (*irminmodels.ObjectSchema, error) {
	target, err := client.getFile(ctx, driveID)
	if err != nil {
		return nil, fmt.Errorf("googledrive: resolve path %q: %w", driveID, err)
	}
	if target.MimeType == driveFolderMime {
		return p.buildFolderSchema(ctx, client, target.ID, target.Name, operationType)
	}
	return p.buildFileSchema(target, operationType), nil
}

// buildFolderSchema lists the direct children of a Drive folder and
// returns them as ObjectSchema.Children. Subfolders show up as
// Type=group with Children=nil — non-expandable in the current picker,
// pre-wired for Phase 2 lazy-fetch on expand.
func (p *googledriveSchemaProvider) buildFolderSchema(
	ctx context.Context, client *googleDriveClient, folderID, folderName, operationType string,
) (*irminmodels.ObjectSchema, error) {
	logger := p.logger
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(noopWriter{}, nil))
	}
	children, err := client.listChildren(ctx, logger, folderID, drivePageSizeMax)
	if err != nil {
		return nil, fmt.Errorf("googledrive: list folder %s: %w", folderID, err)
	}

	objects := make([]irminmodels.ObjectSchema, 0, len(children))
	for i := range children {
		child := children[i]
		objects = append(objects, *driveEntryToObjectSchema(&child, operationType))
	}

	// listChildren consumes all pages, so `objects` already contains
	// every direct child. A folder with thousands of children makes the
	// picker unwieldy — emit an advisory marker at the page-cap threshold
	// pointing users at the path field for deeper subtree navigation.
	if len(children) >= drivePageSizeMax {
		objects = append(objects, irminmodels.ObjectSchema{
			Name: fmt.Sprintf(
				"(large folder: %d items — paste a folder ID into the path field to drill into a specific subtree)",
				len(children),
			),
			Path: "",
			Type: irminmodels.ObjectTypeStructured,
			Description: strPtr(
				"This folder has many direct children. All of them are listed above; paste a specific Drive folder ID into the path field to navigate into a subtree without scrolling the full list.",
			),
		})
	}

	displayName := folderName
	if displayName == "" {
		displayName = folderID
	}

	return &irminmodels.ObjectSchema{
		Name:     displayName,
		Path:     folderID,
		Type:     irminmodels.ObjectTypeGroup,
		Children: objects,
		Description: strPtr(
			folderDescription(operationType, folderID),
		),
	}, nil
}

// folderDescription documents what picking the folder (vs. one of its
// children) does for pull vs. push.
func folderDescription(operationType, folderID string) string {
	if operationType == operationTypePush {
		return fmt.Sprintf(
			"Drive folder %s. Picking the folder itself makes it the push destination; pushed files land directly inside it.",
			folderID,
		)
	}
	return fmt.Sprintf(
		"Drive folder %s. Picking the folder pulls its contents per the connection's recursive / mime filter / size cap settings.",
		folderID,
	)
}

// buildFileSchema returns the leaf ObjectSchema for a single Drive file
// the user pinned via path. Folders never reach here; the caller
// dispatches on MimeType.
func (p *googledriveSchemaProvider) buildFileSchema(
	f *fileEntry, operationType string,
) *irminmodels.ObjectSchema {
	return driveEntryToObjectSchema(f, operationType)
}

// buildPushSlashPathLeaf describes a slash-path push destination
// (e.g. "/Backup/Reports") without pre-walking it. resolvePath in
// operationPush.go owns the actual folder-creation at push time.
func (p *googledriveSchemaProvider) buildPushSlashPathLeaf(
	rawPath string,
) *irminmodels.ObjectSchema {
	return &irminmodels.ObjectSchema{
		Name: rawPath,
		Path: rawPath,
		Type: irminmodels.ObjectTypeGroup,
		Description: strPtr(
			"Slash-path push destination. Missing folders along the path are created on the fly when the push runs.",
		),
	}
}

// driveEntryToObjectSchema is the single Drive-resource → ObjectSchema
// mapper used by every other builder in this file. Folders become
// groups with nil Children (lazy-expand placeholder); Google-native
// docs become structured leaves; regular binary files become binary
// leaves with size + content type.
func driveEntryToObjectSchema(f *fileEntry, operationType string) *irminmodels.ObjectSchema {
	name := f.Name
	if name == "" {
		name = f.ID
	}
	modified := f.ModifiedTime

	if f.MimeType == driveFolderMime {
		return &irminmodels.ObjectSchema{
			Name:         name,
			Path:         f.ID,
			Type:         irminmodels.ObjectTypeGroup,
			Description:  strPtr(folderDescription(operationType, f.ID)),
			LastModified: nullableString(modified),
		}
	}

	contentType := f.MimeType
	if strings.HasPrefix(f.MimeType, googleNativeMimePfx) {
		return &irminmodels.ObjectSchema{
			Name:         name,
			Path:         f.ID,
			Type:         irminmodels.ObjectTypeStructured,
			ContentType:  &contentType,
			LastModified: nullableString(modified),
			Description: strPtr(
				"Google-native document. Pulled via the export endpoint per the connection's google_native_export setting (skip / pdf / office).",
			),
		}
	}

	leaf := &irminmodels.ObjectSchema{
		Name:         name,
		Path:         f.ID,
		Type:         irminmodels.ObjectTypeBinary,
		ContentType:  &contentType,
		LastModified: nullableString(modified),
		Description: strPtr(
			"Drive file. Pulling fetches its raw bytes via the media endpoint (subject to the connection's size cap).",
		),
	}
	if size := parseDriveSize(f.Size); size != nil {
		leaf.Size = size
	}
	return leaf
}

// parseDriveSize parses Drive's string-encoded int64 size into an *int
// for the ObjectSchema.Size field. Returns nil for empty / unparseable
// values (folders and Google-native files have no size).
func parseDriveSize(s string) *int {
	if s == "" {
		return nil
	}
	var n int
	if _, err := fmt.Sscanf(s, "%d", &n); err != nil {
		return nil
	}
	if n < 0 {
		return nil
	}
	return &n
}

// nullableString promotes a possibly-empty time string to a *string so
// ObjectSchema.LastModified is omitted from JSON when Drive returned
// no value.
func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// noopWriter is an io.Writer that discards everything. Used as a
// fallback for the schema-time logger when the provider hasn't been
// wired with one yet (path that shouldn't happen in production but
// keeps the unit tests robust).
type noopWriter struct{}

func (noopWriter) Write(p []byte) (int, error) { return len(p), nil }

func strPtr(s string) *string { return &s }

// driveFileRecordSchema describes one element of files.json — the on-disk
// shape produced by GetAllFiles. Mirrors the fileEntry struct in
// operationPull.go field-for-field. AdditionalProperties stays true so
// future Drive API additions don't have to wait for a schema bump.
func driveFileRecordSchema() irminmodels.JSONSchema {
	dateTime := "date-time"
	uri := "uri"

	userSchema := irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"permissionId": {
				Type: "string",
				Description: strPtr(
					"Drive-assigned user identifier. Matches the 'id' field on the corresponding permissions row.",
				),
			},
			"displayName": {Type: "string", Description: strPtr("Human-readable user display name.")},
			"emailAddress": {
				Type:        "string",
				Description: strPtr("User email address (may be absent if hidden by Drive privacy settings)."),
			},
		},
		AdditionalProperties: true,
	}

	permissionSchema := irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "string", Description: strPtr("Drive-assigned permission ID.")},
			"type": {Type: "string", Description: strPtr("Grantee type: user, group, domain, or anyone.")},
			"role": {
				Type:        "string",
				Description: strPtr("Granted role: owner, organizer, fileOrganizer, writer, commenter, or reader."),
			},
			"emailAddress": {
				Type:        "string",
				Description: strPtr("Grantee email address (present for user/group permissions)."),
			},
		},
		AdditionalProperties: true,
	}

	imageMediaSchema := irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"width":  {Type: "integer", Description: strPtr("Image width in pixels.")},
			"height": {Type: "integer", Description: strPtr("Image height in pixels.")},
		},
		AdditionalProperties: true,
	}

	videoMediaSchema := irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"width":          {Type: "integer", Description: strPtr("Video width in pixels.")},
			"height":         {Type: "integer", Description: strPtr("Video height in pixels.")},
			"durationMillis": {Type: "integer", Description: strPtr("Video duration in milliseconds.")},
		},
		AdditionalProperties: true,
	}

	capabilitiesSchema := irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"canDownload": {
				Type:        "boolean",
				Description: strPtr("Whether the authenticated user can download the file."),
			},
			"canEdit":  {Type: "boolean", Description: strPtr("Whether the authenticated user can edit the file.")},
			"canShare": {Type: "boolean", Description: strPtr("Whether the authenticated user can share the file.")},
		},
		AdditionalProperties: true,
	}

	return irminmodels.JSONSchema{
		Type:        "object",
		Description: strPtr("A single Google Drive file or folder record."),
		Required:    []string{"id", "name", "mimeType"},
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "string", Description: strPtr("Drive-assigned unique file ID.")},
			"name": {Type: "string", Description: strPtr("File or folder name.")},
			"mimeType": {
				Type: "string",
				Description: strPtr(
					"MIME type. Folders use 'application/vnd.google-apps.folder'; Google-native files use 'application/vnd.google-apps.*' (document, spreadsheet, presentation, etc.).",
				),
			},
			"size": {
				Type: "string",
				Description: strPtr(
					"File size in bytes (string-encoded int64 per the Drive API). Empty for folders and Google-native files.",
				),
			},
			"createdTime": {
				Type:        "string",
				Format:      &dateTime,
				Description: strPtr("RFC 3339 timestamp of file creation."),
			},
			"modifiedTime": {
				Type:        "string",
				Format:      &dateTime,
				Description: strPtr("RFC 3339 timestamp of the most recent modification."),
			},
			"parents": {
				Type:  "array",
				Items: &irminmodels.JSONSchema{Type: "string"},
				Description: strPtr(
					"Parent folder IDs. Drive files have exactly one parent in v3; the array form is preserved for forward compatibility.",
				),
			},
			"webViewLink": {
				Type:        "string",
				Format:      &uri,
				Description: strPtr("Browser URL to open the file in the Drive web UI."),
			},
			"iconLink": {
				Type:        "string",
				Format:      &uri,
				Description: strPtr("Drive-hosted icon URL for the file's MIME type."),
			},
			"fileExtension": {
				Type:        "string",
				Description: strPtr("Extension extracted from the file name (no leading dot)."),
			},
			"trashed": {
				Type:        "boolean",
				Description: strPtr("True if the file is in the user's trash. Pull filters trashed=false by default."),
			},
			"md5Checksum": {
				Type: "string",
				Description: strPtr(
					"MD5 of the file content. Empty for folders and Google-native files (which have no binary blob).",
				),
			},
			"description": {Type: "string", Description: strPtr("User-supplied file description.")},
			"starred":     {Type: "boolean", Description: strPtr("True if the user has starred the file.")},
			"ownedByMe":   {Type: "boolean", Description: strPtr("True if the authenticated user owns the file.")},
			"shared": {
				Type:        "boolean",
				Description: strPtr("True if the file is shared with anyone besides the owner."),
			},
			"hasThumbnail": {
				Type:        "boolean",
				Description: strPtr("True if Drive has generated a thumbnail for the file."),
			},
			"thumbnailLink": {
				Type:        "string",
				Format:      &uri,
				Description: strPtr("Short-lived thumbnail URL (expires hourly)."),
			},

			"imageMediaMetadata": imageMediaSchema,
			"videoMediaMetadata": videoMediaSchema,
			"permissions": {
				Type: "array",
				Description: strPtr(
					"Permissions granted on the file. Only populated when the authenticated user has permission-read access.",
				),
				Items: &permissionSchema,
			},
			"owners": {
				Type:        "array",
				Description: strPtr("File owners (typically one for personal Drive, multiple for shared drives)."),
				Items:       &userSchema,
			},
			"lastModifyingUser": userSchema,
			"capabilities":      capabilitiesSchema,

			// Pull-only sidecar fields. The connector adds these when a
			// folder pull is requested via GetFilesByPath — they are not
			// present in the underlying Drive API response.
			"skipped": {
				Type: "boolean",
				Description: strPtr(
					"True when this record represents a file the pull intentionally did not download (filtered MIME, over size cap, Google-native with export=skip, total-byte budget exhausted, or per-file download error). Absent for downloaded files.",
				),
			},
			"skipReason": {
				Type: "string",
				Description: strPtr(
					"Why a skipped file was not downloaded. One of: filtered_mime, over_size_cap, google_native_skipped, google_native_no_export_target, budget_exhausted, or download_error: <message>.",
				),
			},
			"localPath": {
				Type: "string",
				Description: strPtr(
					"Zip-entry path of the downloaded blob inside the operation result, e.g. 'files/<driveId>-<safeName>.<ext>'. Absent for skipped files.",
				),
			},
		},
		AdditionalProperties: true,
	}
}

// OperationSchemaGet godoc
// @Summary Get Google Drive operation schema
// @Description Returns the schema describing what files a pull operation produces and what a push operation accepts. The schema is path-aware: an empty path returns the legacy files.json catalogue alongside the user's My Drive root; a Drive folder ID returns that folder's direct children; a Drive file ID returns a single leaf.
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull,push)
// @Param path query string false "Drive resource to inspect. Empty / 'files' / 'files.json' returns the legacy metadata catalogue; 'root' returns My Drive's top level; any Drive folder/file ID is resolved via files.get."
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	connectionID, err := lib.ConnectionIDFromRequestHeader(func(k string) string { return c.Get(k) })
	if err != nil {
		return cs.WriteResolveError(c, err)
	}

	provider := &googledriveSchemaProvider{
		dbInstance:   cs.DB,
		logger:       cs.Logger,
		tokenClient:  cs.OAuthConnector.TokenClient,
		connectionID: connectionID,
	}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger, cs.DB, cs.App)
}

// SubscribeToChanges is not supported.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Subscribe to changes is not supported by the Google Drive connector",
	})
}

// UnsubscribeFromChanges is not supported.
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "Unsubscribe from changes is not supported by the Google Drive connector",
	})
}
