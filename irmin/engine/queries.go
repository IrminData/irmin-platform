package engine

import (
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
		object := strings.Trim(pl.Object, "/")
		ref := pl.Ref

		// If the workspace is not provided in the query, get the workspace from the route.
		if workspace == "" {
			workspace = userWorkspace
		}

		// Get the LakeFS repository name.
		lakeFSRepositoryName := utils.GetLakeFSRepositoryName(workspace, repository)

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
			switch objectPathDetails.ContentType {
			case "application/json":
				objectSelector = fmt.Sprintf("read_json_auto('%s')", objectAddress)
			case "text/csv":
				objectSelector = fmt.Sprintf("read_csv('%s')", objectAddress)
			case "application/vnd.apache.parquet":
				objectSelector = fmt.Sprintf("read_parquet('%s')", objectAddress)
			default:
				return "", fmt.Errorf("unsupported object content type: %s", objectPathDetails.ContentType)
			}
		}

		return objectSelector, nil
	})
}

// ExecuteQuery executes a query in the specified workspace and returns the results.
func (c *Client) ExecuteQuery(userWorkspace, query string) *irminmodels.QueryResult {
	// Collect errors and logs encountered during query execution.
	var errors []error
	var logs []string
	// Parse the query provided by the user.
	parsedQuery, err := parseIrminQuery(c, userWorkspace, query)
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to parse query: %w", err))
	}

	// Create a new query client.
	queryClient, err := duckdb.NewQueryClient()
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to create query client: %w", err))
	}
	defer queryClient.Close()

	// Prepare a slice to hold the resulting rows.
	var data []map[string]any

	// Execute the query.
	startedAt := time.Now()
	rows, err := queryClient.ExecuteQuery(parsedQuery.FormattedQuery)
	if err != nil {
		errors = append(errors, fmt.Errorf("failed to execute query: %w", err))
	}
	finishedAt := time.Now()

	var columns []string

	// Make sure that the rows are not nil before processing.
	// This is important to avoid nil pointer dereference errors.
	if rows != nil {
		// Close the rows after processing.
		defer rows.Close()

		// Retrieve column names.
		columns, err := rows.Columns()
		if err != nil {
			errors = append(errors, fmt.Errorf("failed to retrieve column names: %w", err))
		}

		// Iterate through the rows.
		for rows.Next() {
			// Create a slice of any's to represent each column, and a second slice to hold pointers to each item.
			values := make([]any, len(columns))
			valuePtrs := make([]any, len(columns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			// Scan the row into the value pointers.
			if err := rows.Scan(valuePtrs...); err != nil {
				errors = append(errors, fmt.Errorf("failed to scan row: %w", err))
				continue
			}

			// Create a map to store the column name to value mapping.
			rowMap := make(map[string]any)
			for i, colName := range columns {
				var v any
				v = values[i]
				// Convert []byte to string for readability.
				if b, ok := v.([]byte); ok {
					v = string(b)
				}
				rowMap[colName] = v
			}

			data = append(data, rowMap)
		}

		// Check for any errors encountered during iteration.
		if err := rows.Err(); err != nil {
			errors = append(errors, fmt.Errorf("error encountered during row iteration: %w", err))
		}
	}

	// If there are any errors, log them.
	if len(errors) > 0 {
		for _, err := range errors {
			logs = append(logs, err.Error())
		}
	}

	// Create a QueryResult object to hold the results.
	queryResult := &irminmodels.QueryResult{
		Columns:    columns,
		Data:       data,
		HasErrors:  len(errors) > 0,
		Duration:   finishedAt.Sub(startedAt),
		StartedAt:  startedAt,
		FinishedAt: finishedAt,
		Logs:       logs,
	}

	return queryResult
}
