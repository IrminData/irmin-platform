package engine

import (
	"database/sql"
	"errors"
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func parseIrminQuery(c *Client, userWorkspace string, query string) (utils.ParsedIrminQuery, error) {
	return utils.ParseIrminQuery(query, func(pl *utils.ParsedQueryPlaceholder) (string, error) {
		workspace := pl.Workspace
		repository := pl.Repository
		object := strings.TrimPrefix(pl.Object, "/")
		ref := pl.Ref

		// If the workspace is not provided in the query, get the workspace from the route.
		if workspace == "" {
			workspace = userWorkspace
		}

		// Get the LakeFS repository name.
		lakeFSRepositoryName := utils.ConstructLakeFSRepositoryName(workspace, repository)

		// If the ref is not provided in the query, get the repository's default branch.
		if ref == "" {
			repository, err := c.LakeFSClient.GetRepository(lakeFSRepositoryName)
			if err != nil {
				return "", fmt.Errorf("failed to get repository: %w", err)
			}
			ref = repository.DefaultBranch
		}

		// Parse the object details from the path.
		objectPathDetails := utils.ParseObjectDetailsFromPath(object)
		if objectPathDetails.Type == irminmodels.ObjectTypeBinary {
			return "", errors.New("binary objects can't be queried")
		}
		if objectPathDetails.Type == irminmodels.ObjectTypeGroup {
			return "", errors.New("group objects can't be queried")
		}

		// Construct object storage path.
		objectAddress := fmt.Sprintf("s3://%s/%s/%s", lakeFSRepositoryName, ref, objectPathDetails.FullPath)

		// Construct the file selector based on the object type.
		objectSelector := fmt.Sprintf("'%s'", objectAddress)
		if pl.Operation == "read" {
			// Use the new readOptions implementation to determine the appropriate read function
			readOptions, err := duckdb.GetDuckDBReadOptionsByMIMEType(objectPathDetails.ContentType)
			if err != nil {
				// If MIME type lookup fails, try using the object path (file extension)
				readOptions, err = duckdb.GetDuckDBReadOptionsFromObject(object)
				if err != nil {
					return "", fmt.Errorf(
						"unsupported object format: %s (content type: %s)",
						object,
						objectPathDetails.ContentType,
					)
				}
			}

			// Build the read query using the readOptions
			objectSelector = duckdb.BuildReadQuery(objectAddress, readOptions)
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
	queryClient *duckdb.QueryClient,
	parsedQuery utils.ParsedIrminQuery,
) (*irminmodels.QueryResult, error) {
	startedAt := time.Now()
	rows, executeQueryErr := queryClient.ExecuteQuery(parsedQuery.FormattedQuery)
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
func (c *Client) ExecuteQuery(userWorkspace, query string) *irminmodels.QueryResult {
	parsedQuery, err := parseIrminQuery(c, userWorkspace, query)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{fmt.Sprintf("failed to parse query: %v", err)},
		}
	}

	queryClient, err := duckdb.NewQueryClient(c.Env, c.Logger)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{fmt.Sprintf("failed to create query client: %v", err)},
		}
	}
	defer queryClient.Close()

	result, err := executeQueryWithClient(queryClient, parsedQuery)
	if err != nil {
		return &irminmodels.QueryResult{
			HasErrors: true,
			Logs:      []string{err.Error()},
		}
	}

	return result
}
