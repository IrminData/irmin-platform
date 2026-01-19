package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// QueryScenarios returns test cases for SQL query operations.
func QueryScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Query_Execute_SQL",
			Description: "Upload data and execute SQL queries on it",
			Run:         testExecuteSQL,
		},
		{
			Name:        "Query_Stored_Create_Execute_Delete",
			Description: "Create a stored query, execute it, then delete it",
			Run:         testStoredQueryLifecycle,
		},
		{
			Name:        "Query_Stored_List_Get_Update",
			Description: "List stored queries, get details, and update",
			Run:         testStoredQueryListGetUpdate,
		},
		{
			Name:        "Query_List_Templates",
			Description: "List available query templates",
			Run:         testQueryListTemplates,
		},
	}
}

func testExecuteSQL(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("query-test-%d", suffix)

	// Upload CSV data
	csvContent := `id,name,age,city
1,Alice,28,New York
2,Bob,34,Los Angeles
3,Charlie,45,Chicago
4,Diana,31,Seattle
5,Edward,52,Boston`

	files := map[string][]byte{
		"users.csv": []byte(csvContent),
	}
	_, _, err := client.UploadObject(
		ctx, cfg.Workspace, cfg.TestRepository, "main",
		fmt.Sprintf("%s/users.csv", basePath), files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload CSV: %w", err)
	}

	// Commit the changes
	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add users data for query test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Execute SQL query using $["repo;path@branch"] syntax
	sqlQuery := fmt.Sprintf(
		`SELECT * FROM $["%s;%s/users.csv@main"] WHERE age > 30`,
		cfg.TestRepository, basePath,
	)
	result, _, err := client.ExecuteSQL(ctx, cfg.Workspace, false, irmincore.ExecuteSQLRequest{
		SQL: sqlQuery,
	})
	if err != nil {
		return fmt.Errorf("failed to execute SQL: %w", err)
	}

	// Should have 3 results (Bob, Charlie, Edward - all over 30)
	if len(result.Data) < 3 {
		return fmt.Errorf("expected at least 3 rows, got %d", len(result.Data))
	}

	return nil
}

func testStoredQueryLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("stored-query-test-%d", suffix)

	// Upload some data first
	csvContent := `product,price,quantity
Laptop,999.99,10
Mouse,29.99,50
Keyboard,79.99,30`

	files := map[string][]byte{
		"products.csv": []byte(csvContent),
	}
	_, _, err := client.UploadObject(
		ctx, cfg.Workspace, cfg.TestRepository, "main",
		fmt.Sprintf("%s/products.csv", basePath), files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload CSV: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add products data for stored query test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Create stored query using $["repo;path@branch"] syntax
	queryName := fmt.Sprintf("e2e-query-%d", suffix)
	sqlQuery := fmt.Sprintf(
		`SELECT product, price FROM $["%s;%s/products.csv@main"]`,
		cfg.TestRepository, basePath,
	)

	storedQuery, _, err := client.CreateStoredQuery(ctx, cfg.Workspace, irmincore.CreateQueryRequest{
		Name:        queryName,
		Description: "E2E test stored query",
		SQL:         sqlQuery,
	})
	if err != nil {
		return fmt.Errorf("failed to create stored query: %w", err)
	}

	// Execute stored query
	result, _, err := client.ExecuteStoredQuery(ctx, cfg.Workspace, storedQuery.ID, false)
	if err != nil {
		return fmt.Errorf("failed to execute stored query: %w", err)
	}

	if len(result.Data) != 3 {
		return fmt.Errorf("expected 3 rows, got %d", len(result.Data))
	}

	// Delete stored query
	_, err = client.DeleteStoredQuery(ctx, cfg.Workspace, storedQuery.ID)
	if err != nil {
		return fmt.Errorf("failed to delete stored query: %w", err)
	}

	return nil
}

func testStoredQueryListGetUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("query-list-test-%d", suffix)

	// Upload some data first
	csvContent := `item,cost
Item1,100
Item2,200`

	files := map[string][]byte{
		"items.csv": []byte(csvContent),
	}
	_, _, err := client.UploadObject(
		ctx, cfg.Workspace, cfg.TestRepository, "main",
		fmt.Sprintf("%s/items.csv", basePath), files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload CSV: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add items data for query list test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Create stored query using $["repo;path@branch"] syntax
	queryName := fmt.Sprintf("e2e-query-list-%d", suffix)
	sqlQuery := fmt.Sprintf(
		`SELECT * FROM $["%s;%s/items.csv@main"]`,
		cfg.TestRepository, basePath,
	)

	storedQuery, _, err := client.CreateStoredQuery(ctx, cfg.Workspace, irmincore.CreateQueryRequest{
		Name:        queryName,
		Description: "E2E list/get/update test query",
		SQL:         sqlQuery,
	})
	if err != nil {
		return fmt.Errorf("failed to create stored query: %w", err)
	}

	defer func() {
		_, _ = client.DeleteStoredQuery(ctx, cfg.Workspace, storedQuery.ID)
	}()

	// List stored queries
	queries, _, err := client.ListStoredQueries(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list stored queries: %w", err)
	}

	found := false
	for _, q := range queries {
		if q.ID == storedQuery.ID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created query not found in list")
	}

	// Get stored query details
	fetchedQuery, _, err := client.GetStoredQuery(ctx, cfg.Workspace, storedQuery.ID)
	if err != nil {
		return fmt.Errorf("failed to get stored query: %w", err)
	}

	if fetchedQuery.Name != queryName {
		return fmt.Errorf("query name mismatch: expected %q, got %q", queryName, fetchedQuery.Name)
	}

	// Update stored query
	updatedName := fmt.Sprintf("e2e-updated-query-%d", suffix)
	updatedDescription := "Updated description"
	_, _, err = client.UpdateStoredQuery(ctx, cfg.Workspace, storedQuery.ID, irmincore.UpdateQueryRequest{
		Name:        &updatedName,
		Description: &updatedDescription,
	})
	if err != nil {
		return fmt.Errorf("failed to update stored query: %w", err)
	}

	// Verify update
	updatedQuery, _, err := client.GetStoredQuery(ctx, cfg.Workspace, storedQuery.ID)
	if err != nil {
		return fmt.Errorf("failed to get updated query: %w", err)
	}

	if updatedQuery.Name != updatedName {
		return fmt.Errorf("query name not updated: expected %q, got %q", updatedName, updatedQuery.Name)
	}

	return nil
}

func testQueryListTemplates(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// List query templates
	templates, _, err := client.ListQueryTemplates(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list query templates: %w", err)
	}

	// Templates may be empty, but the API should respond successfully
	_ = templates

	return nil
}
