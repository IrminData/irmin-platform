package engine

import (
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"strings"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// ExecuteQuery executes a query in the specified workspace and returns the results.
func (c *Client) ExecuteQuery(userWorkspace, query string) ([]map[string]any, error) {
	// Parse the query provided by the user.
	parsedQuery, err := utils.ParseIrminQuery(query, func(pl *utils.ParsedQueryPlaceholder) (string, error) {
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
				return "", fmt.Errorf("failed to get repository: %v", err)
			}
			ref = repository.DefaultBranch
		}

		// Parse the object details from the path.
		objectPathDetails := utils.ParseObjectDetailsFromPath(object)
		if objectPathDetails.Type == irminModels.ObjectTypeBinary {
			return "", fmt.Errorf("binary objects can't be queried")
		}
		if objectPathDetails.Type == irminModels.ObjectTypeGroup {
			return "", fmt.Errorf("group objects can't be queried")
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
	if err != nil {
		return nil, fmt.Errorf("failed to parse query: %w", err)
	}

	// Create a new query client.
	queryClient, err := duckdb.NewQueryClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create query client: %w", err)
	}
	defer queryClient.Close()

	// Execute the query.
	rows, err := queryClient.ExecuteQuery(parsedQuery.FormattedQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	// Retrieve column names.
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve column names: %w", err)
	}

	// Prepare a slice to hold the results.
	var results []map[string]interface{}

	// Iterate through the rows.
	for rows.Next() {
		// Create a slice of interface{}'s to represent each column, and a second slice to hold pointers to each item.
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		// Scan the row into the value pointers.
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Create a map to store the column name to value mapping.
		rowMap := make(map[string]interface{})
		for i, colName := range columns {
			var v interface{}
			v = values[i]
			// Convert []byte to string for readability.
			if b, ok := v.([]byte); ok {
				v = string(b)
			}
			rowMap[colName] = v
		}

		results = append(results, rowMap)
	}

	// Check for any errors encountered during iteration.
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to iterate rows: %w", err)
	}

	return results, nil
}
