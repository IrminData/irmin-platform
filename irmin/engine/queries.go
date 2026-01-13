package engine

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"gorm.io/gorm"
)

const (
	operationRead  = "read"
	operationWrite = "write"

	// Generic error message for query execution failures
	genericQueryError = "access denied"
)

// s3URLPattern matches S3 URLs in SQL queries
// Matches patterns like: read_parquet('s3://bucket/path') or read_csv("s3://bucket/path")
// Case-insensitive to match both s3:// and S3://
// Handles SQL standard escaped quotes (doubled quotes)
var s3URLPattern = regexp.MustCompile(`(?i)'s3://((?:[^']|'')*)'|(?i)"s3://((?:[^"]|"")*)"`)

// S3PathComponents represents the parsed components of an S3 path in LakeFS format
type S3PathComponents struct {
	Branch     string // e.g. "main"
	ObjectPath string // e.g. "path/to/file.ext"
}

// ExtractS3Paths extracts all S3 URLs from a SQL query
// Returns unique S3 paths found in the query, with quotes unescaped
func ExtractS3Paths(query string) ([]string, error) {
	matches := s3URLPattern.FindAllStringSubmatch(query, -1)
	if len(matches) == 0 {
		return []string{}, nil
	}

	// Use map to deduplicate paths
	pathMap := make(map[string]bool)
	for _, match := range matches {
		var s3Path string
		// match[0] is the full match
		// match[1] is the content of single-quoted string (if matched)
		// match[2] is the content of double-quoted string (if matched)
		switch {
		case match[1] != "":
			// Single quoted match: unescape '' to '
			s3Path = strings.ReplaceAll(match[1], "''", "'")
		case len(match) > 2 && match[2] != "":
			// Double quoted match: unescape "" to "
			s3Path = strings.ReplaceAll(match[2], `""`, `"`)
		default:
			// Should not happen if regex matches, but handle gracefully
			continue
		}
		pathMap[s3Path] = true
	}

	// Convert map to slice
	paths := make([]string, 0, len(pathMap))
	for path := range pathMap {
		paths = append(paths, path)
	}

	return paths, nil
}

// validateS3PathPermissions validates that the user has permission to access an S3 path
// Returns generic "access denied" error without revealing resource existence
// S3 path format: {lakefs-repo-id}/{branch}/{object-path}
// NOTE: We use database lookup instead of parsing workspace/repository from the repo ID
// because both can contain hyphens, making string parsing ambiguous.
func validateS3PathPermissions(
	c *Client,
	ctx context.Context,
	user *db.User,
	currentWorkspace *db.Workspace,
	s3Path string,
	operation string,
) error {
	// Parse S3 path: lakefs-repo-id/branch/object-path
	parts := strings.SplitN(s3Path, "/", 2) //nolint:mnd // Split into repo ID and rest
	if len(parts) < 2 {                     //nolint:mnd // Need both parts
		c.Logger.WarnContext(ctx, "Invalid S3 path format in query",
			"user_id", user.ID,
			"workspace_id", currentWorkspace.ID,
			"s3_path", s3Path,
		)
		return errors.New(genericQueryError)
	}

	lakeFSRepoID := parts[0]
	keyPath := parts[1]

	// Parse key path: branch/object-path
	keyParts := strings.SplitN(keyPath, "/", 2) //nolint:mnd // Split into branch and object path
	branch := keyParts[0]

	// Validate branch is non-empty (reject paths like "repo/" or "repo//file")
	if branch == "" {
		c.Logger.WarnContext(ctx, "Invalid S3 path: empty branch in query",
			"user_id", user.ID,
			"workspace_id", currentWorkspace.ID,
			"s3_path", s3Path,
		)
		return errors.New(genericQueryError)
	}

	objectPath := ""
	if len(keyParts) > 1 {
		objectPath = keyParts[1]
	}

	// Look up repository by LakeFS repo ID to avoid ambiguous parsing
	// (workspace and repository slugs can both contain hyphens)
	repository, repoErr := c.DB.GetRepositoryByLakeFSRepoID(lakeFSRepoID)
	if repoErr != nil || repository == nil || repository.ID == 0 {
		c.Logger.WarnContext(ctx, "Unauthorized S3 access attempt: repository not found by LakeFS ID",
			"user_id", user.ID,
			"current_workspace_id", currentWorkspace.ID,
			"lakefs_repo_id", lakeFSRepoID,
			"s3_path", s3Path,
		)
		return errors.New(genericQueryError)
	}

	// Get target workspace from repository
	targetWorkspace := &repository.Workspace

	// Check workspace permission (if cross-workspace)
	if targetWorkspace.ID != currentWorkspace.ID && c.PermissionChecker != nil {
		allowed, permErr := c.PermissionChecker.IsAllowed(
			user,
			targetWorkspace,
			db.PolicyResourceWorkspace,
			&targetWorkspace.ID,
			db.PolicyActionRead,
		)
		if permErr != nil || !allowed {
			c.Logger.WarnContext(ctx, "Unauthorized S3 access attempt: no workspace permission",
				"user_id", user.ID,
				"current_workspace_id", currentWorkspace.ID,
				"target_workspace_id", targetWorkspace.ID,
				"s3_path", s3Path,
			)
			return errors.New(genericQueryError)
		}
	}

	// Check repository permission with the correct operation (read or write)
	if permErr := CheckRepositoryPermissions(c, user, targetWorkspace, repository, operation); permErr != nil {
		c.Logger.WarnContext(ctx, "Unauthorized S3 access attempt: no repository permission",
			"user_id", user.ID,
			"workspace_id", targetWorkspace.ID,
			"repository_id", repository.ID,
			"s3_path", s3Path,
		)
		return errors.New(genericQueryError)
	}

	// Validate object access (if object path specified)
	if objectPath != "" {
		if validateErr := validateObjectAccess(c, ctx, user, targetWorkspace, repository, objectPath, branch, s3Path, operation); validateErr != nil {
			return validateErr
		}
	}

	return nil
}

// ResolveTargetWorkspace resolves the workspace from the placeholder or uses the provided workspace.
// Returns generic "access denied" error for both non-existent workspaces and permission issues.
func ResolveTargetWorkspace(
	c *Client,
	user *db.User,
	plWorkspaceSlug string,
	currentWorkspace *db.Workspace,
) (*db.Workspace, error) {
	// If no workspace specified, use current workspace
	if plWorkspaceSlug == "" || plWorkspaceSlug == currentWorkspace.Slug {
		return currentWorkspace, nil
	}

	// Try to resolve the target workspace
	targetWorkspace, workspaceErr := c.DB.GetWorkspaceBySlug(plWorkspaceSlug)
	if workspaceErr != nil || targetWorkspace == nil {
		// Don't reveal if workspace exists or not
		return nil, errors.New("access denied")
	}

	// Check if user has permission to access this workspace
	if c.PermissionChecker != nil {
		allowed, permErr := c.PermissionChecker.IsAllowed(
			user,
			targetWorkspace,
			db.PolicyResourceWorkspace,
			&targetWorkspace.ID,
			db.PolicyActionRead,
		)
		if permErr != nil || !allowed {
			// Don't reveal if permission denied or workspace doesn't exist
			return nil, errors.New("access denied")
		}
	}

	return targetWorkspace, nil
}

// containsGlobPattern checks if a path contains DuckDB glob patterns (*, ?, [...])
// DuckDB supports glob patterns for reading multiple files, but we need to reject them
// to prevent bypassing object-level permission checks.
func containsGlobPattern(path string) bool {
	// Check for wildcard patterns: *, ?, [...]
	return strings.Contains(path, "*") || strings.Contains(path, "?") || strings.Contains(path, "[")
}

// validateObjectAccess validates object-level permissions for an S3 path.
// Returns generic "access denied" error without revealing resource existence.
func validateObjectAccess(
	c *Client,
	ctx context.Context,
	user *db.User,
	targetWorkspace *db.Workspace,
	repository *db.Repository,
	objectPath string,
	branch string,
	s3Path string,
	operation string,
) error {
	// Reject glob patterns to prevent bypassing object-level permissions
	// DuckDB supports glob patterns (*, ?, [...]) which would allow reading multiple files
	// without proper object-level permission checks for each file.
	if containsGlobPattern(objectPath) {
		c.Logger.WarnContext(ctx, "Unauthorized S3 access attempt: glob patterns not allowed",
			"user_id", user.ID,
			"repository_id", repository.ID,
			"object_path", objectPath,
			"s3_path", s3Path,
		)
		return errors.New(genericQueryError)
	}

	// Validate branch for glob patterns to prevent accessing multiple branches
	// without proper permission checks for each branch.
	if containsGlobPattern(branch) {
		c.Logger.WarnContext(ctx, "Unauthorized S3 access attempt: glob patterns not allowed in branch",
			"user_id", user.ID,
			"repository_id", repository.ID,
			"branch", branch,
			"s3_path", s3Path,
		)
		return errors.New(genericQueryError)
	}

	objectID, objectIDErr := resolveObjectID(c, objectPath, repository.ID, branch)
	if objectIDErr != nil {
		c.Logger.WarnContext(ctx, "Error resolving object for S3 path",
			"user_id", user.ID,
			"repository_id", repository.ID,
			"object_path", objectPath,
			"s3_path", s3Path,
			"error", objectIDErr.Error(),
		)
		return errors.New(genericQueryError)
	}

	if objectID != nil {
		if permErr := CheckObjectPermissions(c, user, targetWorkspace, *objectID, operation); permErr != nil {
			c.Logger.WarnContext(ctx, "Unauthorized S3 access attempt: no object permission",
				"user_id", user.ID,
				"workspace_id", targetWorkspace.ID,
				"repository_id", repository.ID,
				"object_id", *objectID,
				"s3_path", s3Path,
			)
			return errors.New(genericQueryError)
		}
	}

	return nil
}

// resolveObjectID resolves the object ID from the database.
func resolveObjectID(c *Client, object string, repositoryID uint, ref string) (*uint, error) {
	repoObject, objectErr := c.DB.FindObject(&object, &repositoryID, &ref)
	if objectErr == nil && repoObject != nil {
		return &repoObject.ID, nil
	}
	if objectErr != nil && !errors.Is(objectErr, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to resolve object: %w", objectErr)
	}
	// Object not found is a valid state (not an error condition)
	return nil, nil //nolint:nilnil // Not found is expected, not an error
}

// processPlaceholder processes a single query placeholder and returns the object selector.
func processPlaceholder(
	c *Client,
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	pl *utils.ParsedQueryPlaceholder,
) (string, error) {
	plWorkspaceSlug := pl.Workspace
	plRepositorySlug := pl.Repository
	object := strings.TrimPrefix(pl.Object, "/")
	ref := pl.Ref

	// Step 1: Resolve target workspace (supports cross-workspace queries)
	targetWorkspace, workspaceErr := ResolveTargetWorkspace(c, user, plWorkspaceSlug, workspace)
	if workspaceErr != nil {
		return "", workspaceErr
	}

	// Step 2: Parse object details early to validate object type
	objectPathDetails := irminutils.ParseObjectDetailsFromPath(object)
	if objectPathDetails.Type == irminmodels.ObjectTypeBinary {
		c.Logger.WarnContext(ctx, "Access denied: binary objects can't be queried",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"object", object,
		)
		return "", errors.New(genericQueryError)
	}
	if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
		c.Logger.WarnContext(ctx, "Access denied: group objects can't be queried",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"object", object,
		)
		return "", errors.New(genericQueryError)
	}

	// Step 3: Attempt to resolve repository
	repository, repoErr := c.DB.GetRepositoryBySlugAndWorkspaceID(plRepositorySlug, targetWorkspace.ID)
	if repoErr != nil || repository == nil || repository.ID == 0 {
		// Don't reveal if repository exists or not
		return "", errors.New("access denied")
	}

	// Step 4: Check repository-level permissions
	if permErr := CheckRepositoryPermissions(c, user, targetWorkspace, repository, pl.Operation); permErr != nil {
		return "", permErr
	}

	// Step 5: Validate object for glob patterns to prevent bypassing permission checks
	// This ensures consistency with S3 path validation in validateObjectAccess.
	if containsGlobPattern(object) {
		c.Logger.WarnContext(ctx, "Unauthorized placeholder access attempt: glob patterns not allowed in object",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"object", object,
		)
		return "", errors.New(genericQueryError)
	}

	// Step 6: Use default branch if ref not provided
	if ref == "" {
		ref = repository.DefaultBranch
	}

	// Step 7: Validate ref for glob patterns (after default assignment) to prevent bypassing permission checks
	// This validates both user-provided refs and default branch refs for defense in depth.
	if containsGlobPattern(ref) {
		c.Logger.WarnContext(ctx, "Unauthorized placeholder access attempt: glob patterns not allowed in ref",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"ref", ref,
		)
		return "", errors.New(genericQueryError)
	}

	// Step 8: Attempt to resolve object ID (may not exist in DB, which is OK for LakeFS objects)
	objectID, objectIDErr := resolveObjectID(c, object, repository.ID, ref)
	if objectIDErr != nil {
		// Error during resolution (not "not found")
		return "", errors.New("access denied")
	}

	// Step 9: Check object-level permissions (only if object exists in DB)
	// This check must happen before pointer resolution to enforce DENY policies on pointer files
	if objectID != nil {
		if permErr := CheckObjectPermissions(c, user, targetWorkspace, *objectID, pl.Operation); permErr != nil {
			return "", permErr
		}
	}

	// Step 10: Check if object is a pointer and resolve it
	// This must come after permission checks (steps 8-9) to ensure DENY policies on pointer files are enforced
	if IsPointerPath(object) {
		return resolvePointerPlaceholder(c, ctx, user, targetWorkspace, repository, object, ref, pl.Operation)
	}

	// Step 11: Build the object storage path and selector
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(targetWorkspace.Slug, repository.Slug)
	objectAddress := fmt.Sprintf("s3://%s/%s/%s", lakeFSRepositoryName, ref, objectPathDetails.FullPath)

	return buildObjectSelector(objectAddress, objectPathDetails, object, pl.Operation)
}

// resolvePointerPlaceholder resolves a pointer object to its target and returns the target's object selector.
// This function is called when a placeholder references a pointer file (_ptr.*).
func resolvePointerPlaceholder(
	c *Client,
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	pointerPath string,
	ref string,
	operation string,
) (string, error) {
	// Fetch the pointer file content from LakeFS
	lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace.Slug, repository.Slug)
	pointerContent, err := c.LakeFSClient.GetFullObjectContent(lakeFSRepositoryName, ref, pointerPath)
	if err != nil {
		c.Logger.WarnContext(ctx, "Failed to fetch pointer content",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"repository_id", repository.ID,
			"pointer_path", pointerPath,
			"error", err,
		)
		return "", errors.New(genericQueryError)
	}

	// Parse the pointer content
	var pointerTarget irminmodels.PointerTarget
	if parseErr := json.Unmarshal(pointerContent, &pointerTarget); parseErr != nil {
		c.Logger.WarnContext(ctx, "Failed to parse pointer content",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"repository_id", repository.ID,
			"pointer_path", pointerPath,
			"error", parseErr,
		)
		return "", errors.New(genericQueryError)
	}

	// Validate required fields
	if pointerTarget.Repository == "" || pointerTarget.Path == "" || pointerTarget.Ref == "" {
		c.Logger.WarnContext(ctx, "Pointer missing required target fields",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"pointer_path", pointerPath,
		)
		return "", errors.New(genericQueryError)
	}

	// Cross-workspace pointers are not yet supported
	if pointerTarget.Workspace != "" {
		c.Logger.WarnContext(ctx, "Cross-workspace pointers are not yet supported",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"pointer_path", pointerPath,
			"target_workspace", pointerTarget.Workspace,
		)
		return "", errors.New("cross-workspace pointers are not yet supported")
	}

	// Validate pointer target path for glob patterns to prevent bypassing object-level permissions
	// A malicious pointer file could contain glob patterns like "data/*.json" to access multiple files
	if containsGlobPattern(pointerTarget.Path) {
		c.Logger.WarnContext(ctx, "Unauthorized pointer access attempt: glob patterns not allowed in target path",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"pointer_path", pointerPath,
			"target_path", pointerTarget.Path,
		)
		return "", errors.New(genericQueryError)
	}

	// Validate pointer target ref for glob patterns to prevent bypassing permission checks
	if containsGlobPattern(pointerTarget.Ref) {
		c.Logger.WarnContext(ctx, "Unauthorized pointer access attempt: glob patterns not allowed in target ref",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"pointer_path", pointerPath,
			"target_ref", pointerTarget.Ref,
		)
		return "", errors.New(genericQueryError)
	}

	// Resolve the target repository (must be in the same workspace for now)
	targetRepository, repoErr := c.DB.GetRepositoryBySlugAndWorkspaceID(pointerTarget.Repository, workspace.ID)
	if repoErr != nil || targetRepository == nil || targetRepository.ID == 0 {
		c.Logger.WarnContext(ctx, "Pointer target repository not found",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"target_repository", pointerTarget.Repository,
			"pointer_path", pointerPath,
		)
		return "", errors.New(genericQueryError)
	}

	// Check permissions on the target repository
	if permErr := CheckRepositoryPermissions(c, user, workspace, targetRepository, operation); permErr != nil {
		c.Logger.WarnContext(ctx, "No permission to access pointer target repository",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"target_repository", pointerTarget.Repository,
		)
		return "", permErr
	}

	// Parse target object details
	targetObjectPath := strings.TrimPrefix(pointerTarget.Path, "/")
	targetObjectDetails := irminutils.ParseObjectDetailsFromPath(targetObjectPath)

	// Validate target object type (must be queryable)
	if targetObjectDetails.Type == irminmodels.ObjectTypeBinary {
		c.Logger.WarnContext(ctx, "Pointer target is a binary object which can't be queried",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"target_path", pointerTarget.Path,
		)
		return "", errors.New(genericQueryError)
	}
	if targetObjectDetails.Type == irminmodels.ObjectTypeGroup {
		c.Logger.WarnContext(ctx, "Pointer target is a group object which can't be queried",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"target_path", pointerTarget.Path,
		)
		return "", errors.New(genericQueryError)
	}

	// Check object-level permissions on target
	targetObjectID, objectIDErr := resolveObjectID(c, targetObjectPath, targetRepository.ID, pointerTarget.Ref)
	if objectIDErr != nil {
		return "", errors.New(genericQueryError)
	}
	if targetObjectID != nil {
		if permErr := CheckObjectPermissions(c, user, workspace, *targetObjectID, operation); permErr != nil {
			return "", permErr
		}
	}

	// Build the target object's S3 path and selector
	targetLakeFSRepoName := utils.ConstructLakeFSRepositoryName(workspace.Slug, targetRepository.Slug)
	targetObjectAddress := fmt.Sprintf(
		"s3://%s/%s/%s",
		targetLakeFSRepoName,
		pointerTarget.Ref,
		targetObjectDetails.FullPath,
	)

	return buildObjectSelector(targetObjectAddress, targetObjectDetails, targetObjectPath, operation)
}

// CheckRepositoryPermissions checks if the user has permission to access the repository.
// Returns generic error to prevent information leakage.
func CheckRepositoryPermissions(
	c *Client,
	user *db.User,
	workspace *db.Workspace,
	repository *db.Repository,
	operation string,
) error {
	if c.PermissionChecker == nil {
		return nil
	}

	// Determine action based on operation
	action := db.PolicyActionRead
	if operation == operationWrite {
		action = db.PolicyActionUpdate
	}

	allowed, permErr := c.PermissionChecker.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepository,
		&repository.ID,
		action,
	)
	if permErr != nil {
		return errors.New("access denied")
	}
	if !allowed {
		return errors.New("access denied")
	}
	return nil
}

// CheckObjectPermissions checks if the user has permission to access the object.
// Returns generic error to prevent information leakage.
// Only called when object exists in the database.
func CheckObjectPermissions(
	c *Client,
	user *db.User,
	workspace *db.Workspace,
	objectID uint,
	operation string,
) error {
	if c.PermissionChecker == nil {
		return nil
	}

	// Determine action based on operation
	action := db.PolicyActionRead
	if operation == operationWrite {
		action = db.PolicyActionUpdate
	}

	allowed, permErr := c.PermissionChecker.IsAllowed(
		user,
		workspace,
		db.PolicyResourceRepositoryObject,
		&objectID,
		action,
	)
	if permErr != nil {
		return errors.New("access denied")
	}
	if !allowed {
		return errors.New("access denied")
	}
	return nil
}

// MaskStringLiterals masks the contents of string literals by replacing them with spaces,
// preserving the quote delimiters. This prevents pattern matching from matching keywords
// that appear inside string literals (as data values) rather than as SQL commands.
// Handles both single-quoted ('...') and double-quoted ("...") strings with proper
// escaping (doubled quotes: ” or "").
func MaskStringLiterals(sql string) string {
	masker := &sqlStringMasker{sql: sql}
	return masker.process()
}

// sqlStringMasker is a helper struct to maintain state while masking string literals
type sqlStringMasker struct {
	sql           string
	result        strings.Builder
	inSingleQuote bool
	inDoubleQuote bool
	currentIdx    int
}

func (s *sqlStringMasker) process() string {
	s.result.Grow(len(s.sql))

	for s.currentIdx = 0; s.currentIdx < len(s.sql); s.currentIdx++ {
		if s.inSingleQuote {
			s.handleSingleQuote()
			continue
		}

		if s.inDoubleQuote {
			s.handleDoubleQuote()
			continue
		}

		s.handleNormalState()
	}

	return s.result.String()
}

func (s *sqlStringMasker) handleSingleQuote() {
	ch := s.sql[s.currentIdx]
	if ch == '\'' {
		// Check for escaped quote (doubled: '')
		if s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '\'' {
			s.result.WriteByte(ch)
			s.result.WriteByte(s.sql[s.currentIdx+1])
			s.currentIdx++ // Skip next quote
		} else {
			s.inSingleQuote = false
			s.result.WriteByte(ch)
		}
	} else {
		// Replace content with space to preserve positions
		s.result.WriteByte(' ')
	}
}

func (s *sqlStringMasker) handleDoubleQuote() {
	ch := s.sql[s.currentIdx]
	if ch == '"' {
		// Check for escaped quote (doubled: "")
		if s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '"' {
			s.result.WriteByte(ch)
			s.result.WriteByte(s.sql[s.currentIdx+1])
			s.currentIdx++ // Skip next quote
		} else {
			s.inDoubleQuote = false
			s.result.WriteByte(ch)
		}
	} else {
		// Replace content with space to preserve positions
		s.result.WriteByte(' ')
	}
}

func (s *sqlStringMasker) handleNormalState() {
	ch := s.sql[s.currentIdx]

	// Check for Single Quote Start
	if ch == '\'' {
		s.inSingleQuote = true
		s.result.WriteByte(ch)
		return
	}

	// Check for Double Quote Start
	if ch == '"' {
		s.inDoubleQuote = true
		s.result.WriteByte(ch)
		return
	}

	// Just a normal character
	s.result.WriteByte(ch)
}

// ValidateQuerySecurity checks if query contains blacklisted commands that could
// compromise security or stability. Returns generic error to prevent information leakage.
func ValidateQuerySecurity(query string) error {
	// Normalize query to prevent bypasses via comments
	// Remove comments respecting string literals to ensure we don't miss commands hidden in what looks like comments
	// or remove parts of strings that look like comments.
	normalizedQuery := RemoveSQLComments(query)

	// Mask string literals to prevent false positives when blacklisted keywords appear
	// as data values inside strings rather than as SQL commands
	maskedQuery := MaskStringLiterals(normalizedQuery)
	upperQuery := strings.ToUpper(maskedQuery)

	// Blacklisted commands that could compromise security or stability
	blacklistedPatterns := []struct {
		pattern string
		reason  string // For logging only, not exposed to user
	}{
		{"ATTACH", "could attach external databases, bypassing permissions"},
		{"CREATE SECRET", "could expose or modify S3/LakeFS credentials"},
		{"DROP SECRET", "could drop LakeFS authentication"},
		{"INSTALL", "could install malicious extensions"},
		{"LOAD", "could load malicious extensions"},
		{"EXPORT DATABASE", "could export entire DB with credentials"},
		{"IMPORT DATABASE", "could import malicious database state"},
	}

	for _, bl := range blacklistedPatterns {
		// Use word boundary matching to avoid false positives
		// Replace literal spaces with [[:space:]]+ to match all whitespace including \v (vertical tab)
		regexPattern := strings.ReplaceAll(bl.pattern, " ", `[[:space:]]+`)
		pattern := regexp.MustCompile(`\b` + regexPattern + `\b`)
		if pattern.MatchString(upperQuery) {
			return errors.New(genericQueryError)
		}
	}

	// For S3 path checks, use the original normalized query (not masked) since we need to
	// detect S3:// patterns even when they appear in string literals
	upperQueryForS3 := strings.ToUpper(normalizedQuery)

	// Block string concatenation with S3:// to prevent permission bypass
	// ANY use of || operator when S3:// appears in the query indicates dynamic path construction
	// Examples: 's3://' || 'path' OR 's3://repo/file' || '.ext' OR 'prefix' || 's3://path'
	// Use original query (not masked) since we need to detect S3:// patterns in strings
	if strings.Contains(upperQueryForS3, "S3://") && strings.Contains(upperQueryForS3, "||") {
		return errors.New(genericQueryError)
	}

	// Block string functions that could dynamically construct S3 paths
	// Use [[:space:]] instead of \s to match all whitespace including vertical tab (\v)
	// Use original query (not masked) since we need to detect S3:// patterns in strings
	s3ConcatPatterns := []string{
		`CONCAT[[:space:]]*\(.*S3://`,     // concat(..., 's3://...', ...)
		`FORMAT[[:space:]]*\(.*S3://`,     // format('s3://...{}', ...)
		`PRINTF[[:space:]]*\(.*S3://`,     // printf('s3://...%s', ...)
		`STRING_AGG[[:space:]]*\(.*S3://`, // string_agg with S3 paths
		`REPLACE[[:space:]]*\(.*S3://`,    // replace('s3://...', ...)
		`SUBSTRING[[:space:]]*\(.*S3://`,  // substring('s3://...')
		// Block split S3 protocol construction (e.g. CONCAT('s3', '://', ...))
		`['"]S3['"][[:space:]]*,[[:space:]]*['"]://`,
		// Block split S3 protocol with pipes (e.g. 's3' || '://')
		`['"]S3['"][[:space:]]*\|\|[[:space:]]*['"]://`,
	}

	for _, pattern := range s3ConcatPatterns {
		matched, _ := regexp.MatchString(pattern, upperQueryForS3)
		if matched {
			return errors.New(genericQueryError)
		}
	}

	// Ensure CREATE TABLE/VIEW are TEMPORARY only (prevent persistent tables)
	// Use precise regex matching to ensure TEMPORARY/TEMP appears in the CREATE clause, not in strings
	// Account for optional OR REPLACE: CREATE [OR REPLACE] [TEMPORARY|TEMP] TABLE/VIEW
	// Use [[:space:]] to match all whitespace including \v (vertical tab) which \s misses in Go regex
	// Use masked query to avoid matching CREATE TABLE/VIEW inside string literals
	createTablePattern := regexp.MustCompile(`\bCREATE[[:space:]]+(?:OR[[:space:]]+REPLACE[[:space:]]+)?TABLE\b`)
	createViewPattern := regexp.MustCompile(`\bCREATE[[:space:]]+(?:OR[[:space:]]+REPLACE[[:space:]]+)?VIEW\b`)

	hasCreateTable := createTablePattern.MatchString(upperQuery)
	hasCreateView := createViewPattern.MatchString(upperQuery)

	// If persistent CREATE TABLE/VIEW exists, reject it
	// Note: The patterns above only match persistent creation because they don't match
	// when TEMPORARY/TEMP is present between CREATE/REPLACE and TABLE/VIEW.
	if hasCreateTable || hasCreateView {
		return errors.New(genericQueryError)
	}

	return nil
}

// buildObjectSelector builds the DuckDB read selector for the object.
func buildObjectSelector(
	objectAddress string,
	objectPathDetails irminutils.ObjectDetails,
	object string,
	operation string,
) (string, error) {
	if operation != operationRead {
		// Escape the object address to prevent SQL injection
		escapedAddress := duckdb.EscapeSQLString(objectAddress)
		return fmt.Sprintf("'%s'", escapedAddress), nil
	}

	// Use the new readOptions implementation to determine the appropriate read function
	readOptions, optsErr := duckdb.GetDuckDBReadOptionsByMIMEType(objectPathDetails.ContentType)
	if optsErr != nil {
		// If MIME type lookup fails, try using the object path (file extension)
		var fallbackErr error
		readOptions, fallbackErr = duckdb.GetDuckDBReadOptionsFromObject(object)
		if fallbackErr != nil {
			return "", fmt.Errorf(
				"unsupported object format: %s (content type: %s)",
				object,
				objectPathDetails.ContentType,
			)
		}
	}

	// Build the read query using the readOptions
	return duckdb.BuildReadQuery(objectAddress, readOptions), nil
}

//nolint:gocognit // Complexity is necessary for comprehensive security validation of S3 paths and placeholders
func parseIrminQuery(
	c *Client,
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	query string,
) (utils.ParsedIrminQuery, error) {
	// Step 0: Validate query security (blacklist dangerous commands)
	if securityErr := ValidateQuerySecurity(query); securityErr != nil {
		previewLen := 100
		if len(query) < previewLen {
			previewLen = len(query)
		}
		c.Logger.WarnContext(ctx, "Blocked potentially dangerous SQL command",
			"user_id", user.ID,
			"workspace_id", workspace.ID,
			"query_preview", query[:previewLen],
		)
		return utils.ParsedIrminQuery{}, errors.New(genericQueryError)
	}

	// Step 1: Extract all S3 paths from the query
	s3Paths, extractErr := ExtractS3Paths(query)
	if extractErr != nil {
		return utils.ParsedIrminQuery{}, errors.New(genericQueryError)
	}

	// Step 2: Validate permissions for each S3 path
	// Find ALL occurrences of each path (not just first) to detect all operations
	for _, s3Path := range s3Paths {
		// Track if any occurrence requires write permission
		hasWriteOperation := false
		hasReadOperation := false

		// Find all occurrences and their operations
		operations := findPathOccurrences(query, s3Path)
		for _, op := range operations {
			if op == operationWrite {
				hasWriteOperation = true
			} else {
				hasReadOperation = true
			}
		}

		// Validate permissions - check both read and write independently if both exist
		// If no specific operation was detected (e.g. edge case in finding occurrences),
		// default to validating read permission as a fail-safe.
		if !hasWriteOperation && !hasReadOperation {
			hasReadOperation = true
		}

		// Validate write permission if any write operation exists
		if hasWriteOperation {
			if validateErr := validateS3PathPermissions(c, ctx, user, workspace, s3Path, operationWrite); validateErr != nil {
				return utils.ParsedIrminQuery{}, validateErr
			}
		}

		// Validate read permission if any read operation exists
		// Note: This is checked independently, not in an else-if, because the same path
		// can be used in both read and write contexts within a single query.
		if hasReadOperation {
			if validateErr := validateS3PathPermissions(c, ctx, user, workspace, s3Path, operationRead); validateErr != nil {
				return utils.ParsedIrminQuery{}, validateErr
			}
		}
	}

	// Step 3: Try to process Irmin placeholders
	parsedQuery, parseErr := utils.ParseIrminQuery(query, func(pl *utils.ParsedQueryPlaceholder) (string, error) {
		return processPlaceholder(c, ctx, user, workspace, pl)
	})

	// If no placeholders found, that's OK - return the original query as-is
	// This allows native DuckDB syntax with S3 paths (already validated above)
	if parseErr != nil && errors.Is(parseErr, utils.ErrNoPlaceholders) {
		return utils.ParsedIrminQuery{
			Placeholders:   []utils.ParsedQueryPlaceholder{},
			OriginalQuery:  query,
			FormattedQuery: query,
		}, nil
	}

	// For other errors, return them
	if parseErr != nil {
		return utils.ParsedIrminQuery{}, parseErr
	}

	return parsedQuery, nil
}

// processQueryRows processes the rows from a query execution and returns the data, logs, columns and any errors encountered.
func processQueryRows(rows *sql.Rows) ([]map[string]any, []string, []string, []error) {
	var data []map[string]any
	var logs []string
	var columns []string
	var errors []error

	columns, columnsErr := rows.Columns()
	if columnsErr != nil {
		errors = append(errors, fmt.Errorf("failed to retrieve column names: %w", columnsErr))
		return data, logs, columns, errors
	}

	for rows.Next() {
		rowMap, scanErr := scanRow(rows, columns)
		if scanErr != nil {
			errors = append(errors, scanErr)
			continue
		}
		data = append(data, rowMap)
	}

	if iterErr := rows.Err(); iterErr != nil {
		errors = append(errors, fmt.Errorf("error encountered during row iteration: %w", iterErr))
	}

	for _, e := range errors {
		logs = append(logs, e.Error())
	}

	return data, logs, columns, errors
}

// scanRow scans a single row from the query results into a map.
func scanRow(rows *sql.Rows, columns []string) (map[string]any, error) {
	values := make([]any, len(columns))
	valuePtrs := make([]any, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	if err := rows.Scan(valuePtrs...); err != nil {
		return nil, fmt.Errorf("failed to scan row: %w", err)
	}

	rowMap := make(map[string]any)
	for i, colName := range columns {
		v := values[i]
		if b, ok := v.([]byte); ok {
			v = string(b)
		}
		rowMap[colName] = v
	}

	return rowMap, nil
}

// RemoveSQLComments removes comments from SQL query while respecting string literals.
// It handles both block comments (/* ... */) and line comments (-- ...).
// It replaces comments with spaces to avoid accidental token merging.
//
// RemoveSQLComments removes comments from SQL query while respecting string literals.
// It handles both block comments (/* ... */) and line comments (-- ...).
// It replaces comments with spaces to avoid accidental token merging.
func RemoveSQLComments(sql string) string {
	remover := &sqlCommentRemover{sql: sql}
	return remover.process()
}

// sqlCommentRemover is a helper struct to maintain state while removing comments
type sqlCommentRemover struct {
	sql            string
	result         strings.Builder
	inSingleQuote  bool
	inDoubleQuote  bool
	inBlockComment bool
	inLineComment  bool
	currentIdx     int
}

func (s *sqlCommentRemover) process() string {
	s.result.Grow(len(s.sql))

	for s.currentIdx = 0; s.currentIdx < len(s.sql); s.currentIdx++ {
		if s.inBlockComment {
			s.handleBlockComment()
			continue
		}

		if s.inLineComment {
			s.handleLineComment()
			continue
		}

		if s.inSingleQuote {
			s.handleSingleQuote()
			continue
		}

		if s.inDoubleQuote {
			s.handleDoubleQuote()
			continue
		}

		s.handleNormalState()
	}

	return s.result.String()
}

func (s *sqlCommentRemover) handleBlockComment() {
	if s.sql[s.currentIdx] == '*' && s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '/' {
		s.inBlockComment = false
		s.currentIdx++          // Skip the slash
		s.result.WriteByte(' ') // Replace comment with space
	}
}

func (s *sqlCommentRemover) handleLineComment() {
	if s.sql[s.currentIdx] == '\n' {
		s.inLineComment = false
		s.result.WriteByte(s.sql[s.currentIdx]) // Keep the newline
	}
}

func (s *sqlCommentRemover) handleSingleQuote() {
	ch := s.sql[s.currentIdx]
	if ch == '\'' {
		// Check for escaped quote (doubled: '')
		if s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '\'' {
			s.result.WriteByte(ch)
			s.result.WriteByte(s.sql[s.currentIdx+1])
			s.currentIdx++ // Skip next quote
		} else {
			s.inSingleQuote = false
			s.result.WriteByte(ch)
		}
	} else {
		s.result.WriteByte(ch)
	}
}

func (s *sqlCommentRemover) handleDoubleQuote() {
	ch := s.sql[s.currentIdx]
	if ch == '"' {
		// Check for escaped quote (doubled: "")
		if s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '"' {
			s.result.WriteByte(ch)
			s.result.WriteByte(s.sql[s.currentIdx+1])
			s.currentIdx++ // Skip next quote
		} else {
			s.inDoubleQuote = false
			s.result.WriteByte(ch)
		}
	} else {
		s.result.WriteByte(ch)
	}
}

func (s *sqlCommentRemover) handleNormalState() {
	ch := s.sql[s.currentIdx]

	// Check for Block Comment Start
	if ch == '/' && s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '*' {
		s.inBlockComment = true
		s.currentIdx++          // Skip the asterisk
		s.result.WriteByte(' ') // Replace start with space
		return
	}

	// Check for Line Comment Start
	if ch == '-' && s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '-' {
		s.inLineComment = true
		s.currentIdx++          // Skip the second dash
		s.result.WriteByte(' ') // Replace start with space
		return
	}

	// Check for Single Quote Start
	if ch == '\'' {
		s.inSingleQuote = true
		s.result.WriteByte(ch)
		return
	}

	// Check for Double Quote Start
	if ch == '"' {
		s.inDoubleQuote = true
		s.result.WriteByte(ch)
		return
	}

	// Just a normal character
	s.result.WriteByte(ch)
}

// SplitSQLStatements splits SQL into individual statements, respecting strings, quotes, and comments.
// Handles semicolons inside strings/quotes/comments properly to avoid false splits.
// Uses SQL standard quote escaping (doubled quotes: " or ""), not backslash escaping.
func SplitSQLStatements(sql string) []string {
	splitter := &sqlStatementSplitter{sql: sql}
	return splitter.process()
}

// sqlStatementSplitter is a helper struct to maintain state while splitting SQL statements
type sqlStatementSplitter struct {
	sql            string
	statements     []string
	currentStmt    strings.Builder
	inSingleQuote  bool
	inDoubleQuote  bool
	inBlockComment bool
	inLineComment  bool
	currentIdx     int
}

func (s *sqlStatementSplitter) process() []string {
	s.currentStmt.Grow(len(s.sql))

	for s.currentIdx = 0; s.currentIdx < len(s.sql); s.currentIdx++ {
		if s.inBlockComment {
			s.handleBlockComment()
			continue
		}

		if s.inLineComment {
			s.handleLineComment()
			continue
		}

		if s.inSingleQuote {
			s.handleSingleQuote()
			continue
		}

		if s.inDoubleQuote {
			s.handleDoubleQuote()
			continue
		}

		s.handleNormalState()
	}

	// Add the last statement if any
	stmt := strings.TrimSpace(s.currentStmt.String())
	if stmt != "" {
		s.statements = append(s.statements, stmt)
	}

	return s.statements
}

func (s *sqlStatementSplitter) handleBlockComment() {
	ch := s.sql[s.currentIdx]
	if ch == '*' && s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '/' {
		s.inBlockComment = false
		s.currentIdx++               // Skip the closing slash
		s.currentStmt.WriteByte(' ') // Replace comment with space
	} else {
		s.currentStmt.WriteByte(ch)
	}
}

func (s *sqlStatementSplitter) handleLineComment() {
	ch := s.sql[s.currentIdx]
	if ch == '\n' {
		s.inLineComment = false
		s.currentStmt.WriteByte(ch) // Keep the newline
	} else {
		s.currentStmt.WriteByte(ch)
	}
}

func (s *sqlStatementSplitter) handleSingleQuote() {
	ch := s.sql[s.currentIdx]
	if ch == '\'' {
		// Check if this is an escaped quote (doubled: '')
		if s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '\'' {
			// This is an escaped quote, write both and skip next
			s.currentStmt.WriteByte(ch)
			s.currentStmt.WriteByte(s.sql[s.currentIdx+1])
			s.currentIdx++ // Skip the next quote
			// Stay in quote state
		} else {
			// Toggle quote state
			s.inSingleQuote = false
			s.currentStmt.WriteByte(ch)
		}
	} else {
		s.currentStmt.WriteByte(ch)
	}
}

func (s *sqlStatementSplitter) handleDoubleQuote() {
	ch := s.sql[s.currentIdx]
	if ch == '"' {
		// Check if this is an escaped quote (doubled: "")
		if s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '"' {
			// This is an escaped quote, write both and skip next
			s.currentStmt.WriteByte(ch)
			s.currentStmt.WriteByte(s.sql[s.currentIdx+1])
			s.currentIdx++ // Skip the next quote
			// Stay in quote state
		} else {
			// Toggle quote state
			s.inDoubleQuote = false
			s.currentStmt.WriteByte(ch)
		}
	} else {
		s.currentStmt.WriteByte(ch)
	}
}

func (s *sqlStatementSplitter) handleNormalState() {
	ch := s.sql[s.currentIdx]

	// Check for block comment start (/*)
	if ch == '/' && s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '*' {
		s.inBlockComment = true
		s.currentIdx++               // Skip the asterisk
		s.currentStmt.WriteByte(' ') // Replace comment start with space
		return
	}

	// Check for line comment start (--)
	if ch == '-' && s.currentIdx+1 < len(s.sql) && s.sql[s.currentIdx+1] == '-' {
		s.inLineComment = true
		s.currentIdx++               // Skip the second dash
		s.currentStmt.WriteByte(' ') // Replace comment start with space
		return
	}

	// Check for single quote start
	if ch == '\'' {
		s.inSingleQuote = true
		s.currentStmt.WriteByte(ch)
		return
	}

	// Check for double quote start
	if ch == '"' {
		s.inDoubleQuote = true
		s.currentStmt.WriteByte(ch)
		return
	}

	// Split on semicolon if not inside quotes or comments
	if ch == ';' {
		stmt := strings.TrimSpace(s.currentStmt.String())
		if stmt != "" {
			s.statements = append(s.statements, stmt)
		}
		s.currentStmt.Reset()
		return
	}

	// Just a normal character
	s.currentStmt.WriteByte(ch)
}

// IsRowReturningStatement checks if a SQL statement returns rows.
func IsRowReturningStatement(stmt string) bool {
	// Remove comments first to ensure we check the actual statement start
	// This handles cases like "/* comment */ SELECT ..."
	cleanStmt := RemoveSQLComments(stmt)
	upperStmt := strings.ToUpper(strings.TrimSpace(cleanStmt))
	rowReturningPrefixes := []string{
		"SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN", "PRAGMA",
		"WITH", // CTEs that typically end with SELECT
	}
	for _, prefix := range rowReturningPrefixes {
		if strings.HasPrefix(upperStmt, prefix) {
			return true
		}
	}
	return false
}

// DetectOperationType extracts the operation type from a SQL statement.
func DetectOperationType(stmt string) string {
	// Remove comments to correctly identify operation type even if it starts with a comment
	cleanStmt := RemoveSQLComments(stmt)
	upperStmt := strings.ToUpper(strings.TrimSpace(cleanStmt))
	operations := []string{
		"INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER",
		"COPY", "TRUNCATE", "MERGE",
	}
	for _, op := range operations {
		if strings.HasPrefix(upperStmt, op) {
			return op
		}
	}
	return "UNKNOWN"
}

// SanitizeQueryError removes sensitive information from query execution errors.
// This prevents leaking internal URLs, repository structures, and file paths.
// The actual error is logged server-side for debugging purposes.
func SanitizeQueryError(err error, logger *slog.Logger, ctx context.Context) error {
	if err == nil {
		return nil
	}

	errMsg := err.Error()
	errMsgLower := strings.ToLower(errMsg)

	// Check for common patterns that indicate resource access issues
	// These patterns suggest the user doesn't have access or the resource doesn't exist
	// Note: All patterns are lowercase for case-insensitive matching
	sensitivePatterns := []string{
		"http error",
		"unable to connect to url",
		"404",
		"403",
		"401",
		// "not found", // Too broad - blocks legitimate SQL errors like "table not found"
		"forbidden",
		"unauthorized",
		"lakefs",
		"s3://",
		"https://",
		"http://",
	}

	// Check if error contains sensitive patterns (case-insensitive)
	isSensitive := false
	for _, pattern := range sensitivePatterns {
		if strings.Contains(errMsgLower, pattern) {
			isSensitive = true
			break
		}
	}

	// If the error contains sensitive patterns, log the actual error and return generic error
	if isSensitive {
		// Log the actual error for server-side debugging
		if logger != nil {
			logger.WarnContext(ctx, "Query error sanitized for user",
				"actual_error", errMsg,
				"user_facing_error", genericQueryError,
			)
		}
		return errors.New(genericQueryError)
	}

	// Return the original error if it doesn't contain sensitive information
	return err
}

// executeQueryWithClient executes a query using the provided query client and returns the results.
// Supports mixed queries with multiple statements (both row-returning and non-row-returning).
//
//nolint:gocognit // Complexity is reasonable for handling mixed query execution with proper resource cleanup
func executeQueryWithClient(
	ctx context.Context,
	queryClient *duckdb.QueryClient,
	parsedQuery utils.ParsedIrminQuery,
	logger *slog.Logger,
) (*irminmodels.QueryResult, error) {
	startedAt := time.Now()

	// Remove SQL comments before executing the query
	queryWithoutComments := RemoveSQLComments(parsedQuery.FormattedQuery)

	// Split query into statements (handle multiple statements separated by semicolons)
	statements := SplitSQLStatements(queryWithoutComments)

	var allData []map[string]any
	var allLogs []string
	var columns []string
	var allErrors []error

	// Pre-scan for row-returning statements to determine result schema mode
	// If ANY statement returns rows, the result schema will be based on those rows.
	// Metadata from non-query statements will only be in Logs, not Data.
	hasRowReturningStatement := false
	for _, stmt := range statements {
		if strings.TrimSpace(stmt) != "" && IsRowReturningStatement(stmt) {
			hasRowReturningStatement = true
			break
		}
	}

	for i, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		// Determine if statement returns rows (SELECT, DESCRIBE, SHOW, etc.)
		isQueryStatement := IsRowReturningStatement(stmt)

		//nolint:nestif // Complexity is reasonable for handling both query and non-query statements
		if isQueryStatement {
			// Execute query that returns rows
			rows, err := queryClient.ExecuteQuery(ctx, stmt)
			if err != nil {
				return nil, SanitizeQueryError(err, logger, ctx)
			}

			data, logs, cols, errors := processQueryRows(rows)

			// Close rows immediately after processing to avoid resource leak in loops
			//nolint:sqlclosecheck // Intentionally closing immediately instead of defer to prevent resource accumulation
			closeErr := rows.Close()
			if closeErr != nil {
				logger.WarnContext(ctx, "Failed to close rows", "error", closeErr)
			}

			allData = append(allData, data...)
			allLogs = append(allLogs, logs...)
			if len(columns) == 0 {
				columns = cols
			}
			allErrors = append(allErrors, errors...)
		} else {
			// Execute non-query statement (INSERT, UPDATE, DELETE, CREATE, etc.)
			result, err := queryClient.ExecuteNonQuery(ctx, stmt)
			if err != nil {
				return nil, SanitizeQueryError(err, logger, ctx)
			}

			// Get rows affected (if available)
			rowsAffected, _ := result.RowsAffected()

			// Create metadata about the operation
			operationType := DetectOperationType(stmt)

			// Log the operation details
			logger.InfoContext(ctx, "Non-query SQL statement executed",
				"statement_number", i+1,
				"operation", operationType,
				"rows_affected", rowsAffected,
				"query_preview", stmt[:min(100, len(stmt))], //nolint:mnd // Log first 100 chars
			)
			allLogs = append(allLogs, fmt.Sprintf("%s: %d rows affected", operationType, rowsAffected))

			// Store metadata row for potential return
			// Only include metadata in results if query has NO row-returning statements
			metadataRow := map[string]any{
				"statement_number": i + 1,
				"operation":        operationType,
				"rows_affected":    rowsAffected,
				"status":           "success",
			}

			// For now, always append metadata (will be filtered later if needed)
			if !hasRowReturningStatement {
				allData = append(allData, metadataRow)
				// Set columns only once for metadata
				if len(columns) == 0 {
					columns = []string{"statement_number", "operation", "rows_affected", "status"}
				}
			}
			// If hasRowReturningStatement is true, metadata goes to Logs only (prevents schema mismatch)
		}
	}

	finishedAt := time.Now()

	return &irminmodels.QueryResult{
		Columns:    columns,
		Data:       allData,
		HasErrors:  len(allErrors) > 0,
		Duration:   finishedAt.Sub(startedAt),
		StartedAt:  startedAt,
		FinishedAt: finishedAt,
		Logs:       allLogs,
	}, nil
}

// ExecuteQuery executes a query in the specified workspace and returns the results.
func (c *Client) ExecuteQuery(
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	query string,
) *irminmodels.QueryResult {
	parsedQuery, err := parseIrminQuery(c, ctx, user, workspace, query)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{fmt.Sprintf("failed to parse query: %v", err)},
		}
	}

	queryClient, err := duckdb.NewQueryClient(ctx, c.Env, c.Logger)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{fmt.Sprintf("failed to create query client: %v", err)},
		}
	}
	defer queryClient.Close()

	result, err := executeQueryWithClient(ctx, queryClient, parsedQuery, c.Logger)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{err.Error()},
		}
	}

	return result
}

// findPathOccurrences finds all occurrences of an S3 path in the query and returns the operation context for each.
func findPathOccurrences(query string, s3Path string) []string {
	var operations []string
	upperQuery := strings.ToUpper(query)
	upperS3Path := strings.ToUpper("S3://" + s3Path)

	searchQuery := upperQuery
	offset := 0

	// Prepare search strings for both quote types (escaped)
	// Since we are searching in UPPERCASE query, we need UPPERCASE search strings.
	// We escape quotes because the query will have escaped quotes.
	singleQuoteSearch := "'" + strings.ReplaceAll(upperS3Path, "'", "''") + "'"
	doubleQuoteSearch := "\"" + strings.ReplaceAll(upperS3Path, "\"", "\"\"") + "\""

	for {
		// Find next occurrence of either single or double quoted path
		idxSingle := strings.Index(searchQuery, singleQuoteSearch)
		idxDouble := strings.Index(searchQuery, doubleQuoteSearch)

		pathIndex := -1
		matchLen := 0

		// Determine which one appears first
		switch {
		case idxSingle != -1 && idxDouble != -1:
			if idxSingle < idxDouble {
				pathIndex = idxSingle
				matchLen = len(singleQuoteSearch)
			} else {
				pathIndex = idxDouble
				matchLen = len(doubleQuoteSearch)
			}
		case idxSingle != -1:
			pathIndex = idxSingle
			matchLen = len(singleQuoteSearch)
		case idxDouble != -1:
			pathIndex = idxDouble
			matchLen = len(doubleQuoteSearch)
		}

		if pathIndex == -1 {
			break // No more occurrences found
		}

		// Calculate actual position in original query
		actualIndex := offset + pathIndex

		// Detect operation context for this occurrence
		// We pass the index of the start of the quoted string
		operation := utils.DetectContext(query, actualIndex)
		operations = append(operations, operation)

		// Move past this occurrence to find next one
		offset = actualIndex + matchLen
		searchQuery = upperQuery[offset:]
	}

	return operations
}

// ExecuteQueryWithInputs executes a query with input files loaded as virtual tables.
//
//nolint:funlen // Function is complex but it's ok for now.
func (c *Client) ExecuteQueryWithInputs(
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	query string,
	inputFiles map[string][]byte,
) *irminmodels.QueryResult {
	parsedQuery, err := parseIrminQuery(c, ctx, user, workspace, query)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{fmt.Sprintf("failed to parse query: %v", err)},
		}
	}

	queryClient, err := duckdb.NewQueryClient(ctx, c.Env, c.Logger)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{fmt.Sprintf("failed to create query client: %v", err)},
		}
	}
	defer queryClient.Close()

	var logs []string

	// Filter and load input files
	filteredInputs := filterSQLInputFiles(inputFiles, &logs)

	// Create a temporary directory for input files
	tempDir, err := os.MkdirTemp("", "irmin-sql-inputs-*")
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      append(logs, fmt.Sprintf("failed to create temp directory: %v", err)),
		}
	}
	defer os.RemoveAll(tempDir) // Clean up temp dir

	// First pass: collect all paths and detect collisions
	// Map from base sanitized name to list of paths that sanitize to it
	nameToPaths := make(map[string][]string)
	pathToBaseName := make(map[string]string)

	for path := range filteredInputs {
		baseTableName := sanitizePathForName(path, "input")
		pathToBaseName[path] = baseTableName
		nameToPaths[baseTableName] = append(nameToPaths[baseTableName], path)
	}

	// Determine unique names for each path
	// If a base name has collisions (multiple paths), add hash suffix to all of them
	// If no collision, use the simple base name (for template compatibility)
	pathToTableName := make(map[string]string)
	pathToFileName := make(map[string]string)

	for path, baseTableName := range pathToBaseName {
		ext := strings.ToLower(filepath.Ext(path))
		pathsWithSameName := nameToPaths[baseTableName]

		if len(pathsWithSameName) > 1 {
			// Collision detected - add hash suffix to make it unique
			// This ensures each path gets a unique name even when they sanitize to the same base name
			hash := sha256.Sum256([]byte(path))
			hashSuffix := hex.EncodeToString(hash[:])[:8]
			pathToTableName[path] = fmt.Sprintf("%s_%s", baseTableName, hashSuffix)
			pathToFileName[path] = fmt.Sprintf("%s_%s%s", baseTableName, hashSuffix, ext)
		} else {
			// No collision - use simple name (works with templates)
			// Templates can reference these predictable names like "data_sales_data_csv"
			pathToTableName[path] = baseTableName
			pathToFileName[path] = baseTableName + ext
		}
	}

	// Second pass: create virtual tables with the determined names
	for path, content := range filteredInputs {
		tableName := pathToTableName[path]
		fileName := pathToFileName[path]
		tempFilePath := filepath.Join(tempDir, fileName)

		// Write content to temp file
		if writeTempFileErr := os.WriteFile(tempFilePath, content, 0600); writeTempFileErr != nil {
			logs = append(logs, fmt.Sprintf("Failed to write input file %s: %v", path, writeTempFileErr))
			continue
		}

		// Escape the file path to prevent SQL injection
		escapedFilePath := duckdb.EscapeSQLString(tempFilePath)

		// Create virtual table based on file extension
		ext := strings.ToLower(filepath.Ext(path))
		var createViewSQL string

		switch ext {
		case extCSV, extTSV:
			createViewSQL = fmt.Sprintf(
				"CREATE OR REPLACE TEMPORARY VIEW \"%s\" AS SELECT * FROM read_csv_auto('%s');",
				tableName,
				escapedFilePath,
			)
		case extJSON:
			createViewSQL = fmt.Sprintf(
				"CREATE OR REPLACE TEMPORARY VIEW \"%s\" AS SELECT * FROM read_json_auto('%s');",
				tableName,
				escapedFilePath,
			)
		case extParquet:
			createViewSQL = fmt.Sprintf(
				"CREATE OR REPLACE TEMPORARY VIEW \"%s\" AS SELECT * FROM read_parquet('%s');",
				tableName,
				escapedFilePath,
			)
		default:
			// Should be filtered out already, but just in case
			logs = append(logs, fmt.Sprintf("Skipping unsupported file extension for %s", path))
			continue
		}

		if _, createViewErr := queryClient.ExecuteNonQuery(ctx, createViewSQL); createViewErr != nil {
			logs = append(logs, fmt.Sprintf("Failed to create view for %s: %v", path, createViewErr))
			continue
		}

		logs = append(logs, fmt.Sprintf("Created virtual table '%s' from input '%s'", tableName, path))
	}

	result, err := executeQueryWithClient(ctx, queryClient, parsedQuery, c.Logger)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      append(logs, err.Error()),
		}
	}

	// Prepend logs from input loading
	result.Logs = append(logs, result.Logs...)

	return result
}

// filterSQLInputFiles filters input files to only include SQL-compatible formats.
func filterSQLInputFiles(inputFiles map[string][]byte, logs *[]string) map[string][]byte {
	supportedExtensions := map[string]bool{
		extCSV: true, extJSON: true, extParquet: true, extTSV: true,
	}

	filtered := make(map[string][]byte)
	for path, content := range inputFiles {
		ext := strings.ToLower(filepath.Ext(path))
		if supportedExtensions[ext] {
			filtered[path] = content
		} else {
			*logs = append(*logs, fmt.Sprintf("Skipping unsupported file for SQL input: %s", path))
		}
	}
	return filtered
}

// sanitizePathForName creates a safe identifier from a file path.
// Replaces non-alphanumeric characters with underscores and ensures it starts with a letter.
func sanitizePathForName(path string, defaultPrefix string) string {
	// Clean the path
	cleanPath := strings.Trim(path, "/")

	// Replace non-alphanumeric characters with underscores
	reg := regexp.MustCompile(`[^a-zA-Z0-9]`)
	sanitized := reg.ReplaceAllString(cleanPath, "_")

	// Ensure it starts with a letter (prepend prefix if needed)
	if len(sanitized) > 0 && !regexp.MustCompile(`^[a-zA-Z]`).MatchString(sanitized) {
		sanitized = defaultPrefix + "_" + sanitized
	}

	// Add prefix if empty
	if sanitized == "" {
		sanitized = defaultPrefix + "_data"
	}

	return sanitized
}
