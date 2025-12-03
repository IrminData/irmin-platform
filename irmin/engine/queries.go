package engine

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"gorm.io/gorm"
)

// resolveQueryWorkspace resolves the workspace from the placeholder or uses the provided workspace.
func resolveQueryWorkspace(
	c *Client,
	plWorkspaceSlug string,
	workspace *db.Workspace,
) (*db.Workspace, error) {
	if plWorkspaceSlug == "" || plWorkspaceSlug == workspace.Slug {
		return workspace, nil
	}

	targetWorkspace, workspaceErr := c.DB.GetWorkspaceBySlug(plWorkspaceSlug)
	if workspaceErr != nil {
		return nil, fmt.Errorf("failed to get workspace '%s': %w", plWorkspaceSlug, workspaceErr)
	}
	if targetWorkspace == nil {
		return nil, fmt.Errorf("workspace '%s' not found", plWorkspaceSlug)
	}
	return targetWorkspace, nil
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

// checkQueryPermissions checks if the user has permission to access the object in the query.
func checkQueryPermissions(
	c *Client,
	user *db.User,
	targetWorkspace *db.Workspace,
	repository *db.Repository,
	objectID *uint,
	operation string,
	objectPath string,
) error {
	if c.PermissionChecker == nil {
		return nil
	}

	// Determine resource and ID
	var resource db.PolicyResource
	var resID *uint

	if objectID != nil {
		resource = db.PolicyResourceRepositoryObject
		resID = objectID
	} else {
		// Fallback to repository permissions if object not found
		resource = db.PolicyResourceRepository
		resID = &repository.ID
	}

	// Determine action
	action := db.PolicyActionRead
	if operation == "write" {
		action = db.PolicyActionUpdate
		if objectID == nil && resource == db.PolicyResourceRepository {
			action = db.PolicyActionUpdate
		}
	}

	allowed, permErr := c.PermissionChecker.IsAllowed(user, targetWorkspace, resource, resID, action)
	if permErr != nil {
		return fmt.Errorf("error checking permissions: %w", permErr)
	}
	if !allowed {
		return fmt.Errorf("permission denied for %s '%s'", resource, objectPath)
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
	if operation != "read" {
		return fmt.Sprintf("'%s'", objectAddress), nil
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

func parseIrminQuery(
	c *Client,
	user *db.User,
	workspace *db.Workspace,
	query string,
) (utils.ParsedIrminQuery, error) {
	return utils.ParseIrminQuery(query, func(pl *utils.ParsedQueryPlaceholder) (string, error) {
		plWorkspaceSlug := pl.Workspace
		plRepositorySlug := pl.Repository
		object := strings.TrimPrefix(pl.Object, "/")
		ref := pl.Ref

		// Resolve workspace
		targetWorkspace, workspaceErr := resolveQueryWorkspace(c, plWorkspaceSlug, workspace)
		if workspaceErr != nil {
			return "", workspaceErr
		}

		// Get the repository by slug and workspace ID.
		repository, repoErr := c.DB.GetRepositoryBySlugAndWorkspaceID(plRepositorySlug, targetWorkspace.ID)
		if repoErr != nil {
			return "", fmt.Errorf("failed to get repository '%s': %w", plRepositorySlug, repoErr)
		}
		if repository == nil || repository.ID == 0 {
			return "", fmt.Errorf("repository '%s' not found in workspace '%s'", plRepositorySlug, targetWorkspace.Slug)
		}

		// If the ref is not provided in the query, get the repository's default branch.
		if ref == "" {
			ref = repository.DefaultBranch
		}

		// Parse the object details from the path.
		objectPathDetails := irminutils.ParseObjectDetailsFromPath(object)
		if objectPathDetails.Type == irminmodels.ObjectTypeBinary {
			return "", errors.New("binary objects can't be queried")
		}
		if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
			return "", errors.New("group objects can't be queried")
		}

		// Resolve object ID
		objectID, objectIDErr := resolveObjectID(c, object, repository.ID, ref)
		if objectIDErr != nil {
			return "", objectIDErr
		}

		// Check permissions
		permErr := checkQueryPermissions(c, user, targetWorkspace, repository, objectID, pl.Operation, object)
		if permErr != nil {
			return "", permErr
		}

		// Get the LakeFS repository name.
		lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(targetWorkspace.Slug, repository.Slug)

		// Construct object storage path.
		objectAddress := fmt.Sprintf("s3://%s/%s/%s", lakeFSRepositoryName, ref, objectPathDetails.FullPath)

		// Build the object selector
		objectSelector, selectorErr := buildObjectSelector(objectAddress, objectPathDetails, object, pl.Operation)
		if selectorErr != nil {
			return "", selectorErr
		}

		return objectSelector, nil
	})
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

// executeQueryWithClient executes a query using the provided query client and returns the results.
func executeQueryWithClient(
	ctx context.Context,
	queryClient *duckdb.QueryClient,
	parsedQuery utils.ParsedIrminQuery,
) (*irminmodels.QueryResult, error) {
	startedAt := time.Now()
	rows, executeQueryErr := queryClient.ExecuteQuery(ctx, parsedQuery.FormattedQuery)
	if executeQueryErr != nil {
		return nil, fmt.Errorf("failed to execute query: %w", executeQueryErr)
	}
	defer rows.Close()

	data, logs, columns, errors := processQueryRows(rows)
	finishedAt := time.Now()

	return &irminmodels.QueryResult{
		Columns:    columns,
		Data:       data,
		HasErrors:  len(errors) > 0,
		Duration:   finishedAt.Sub(startedAt),
		StartedAt:  startedAt,
		FinishedAt: finishedAt,
		Logs:       logs,
	}, nil
}

// ExecuteQuery executes a query in the specified workspace and returns the results.
func (c *Client) ExecuteQuery(
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	query string,
) *irminmodels.QueryResult {
	parsedQuery, err := parseIrminQuery(c, user, workspace, query)
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

	result, err := executeQueryWithClient(ctx, queryClient, parsedQuery)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{err.Error()},
		}
	}

	return result
}
