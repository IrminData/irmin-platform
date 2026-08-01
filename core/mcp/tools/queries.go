package tools

import (
	"context"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listQueriesArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list queries in"`
}

type createQueryArgs struct {
	WorkspaceSlug string                       `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create the query in"`
	Request       irmincore.CreateQueryRequest `json:"request"        jsonschema:"required,Query creation parameters"`
}

type updateQueryArgs struct {
	WorkspaceSlug string                       `json:"workspace_slug" jsonschema:"required,The slug of the workspace"`
	QueryID       string                       `json:"query_id"       jsonschema:"required,The ID (SQID) of the query to update"`
	Request       irmincore.UpdateQueryRequest `json:"request"        jsonschema:"required,Query update parameters"`
}

type executeSQLArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to execute SQL in"`
	SQL           string `json:"sql"            jsonschema:"required,The SQL query to execute"`
}

type executeQueryArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace"`
	QueryID       string `json:"query_id"       jsonschema:"required,The ID (SQID) of the stored query to execute"`
}

// RegisterQueryTools registers all query-related tools.
func (mcpTools *MCPTools) RegisterQueryTools() {
	mcpTools.registerListQueriesTool()
	mcpTools.registerCreateQueryTool()
	mcpTools.registerUpdateQueryTool()
	mcpTools.registerExecuteSQLTool()
	mcpTools.registerExecuteQueryTool()
}

// registerListQueriesTool registers the irmin_list_stored_queries tool for listing stored queries in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListQueriesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_list_stored_queries",
			Description: "List all saved SQL queries in a workspace. Stored queries are reusable SQL statements with names and descriptions for data analysis. Returns an array of query objects with ID, name, SQL statement, and metadata. Requires workspace_slug. Use this to discover available queries before executing them or to find queries to modify.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args listQueriesArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}
			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// List the queries
			queries, err := mcpTools.apiServices.ListWorkspaceQueries(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list queries", "error", err)
				return helpers.MCPError("Failed to list queries"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				queries,
				formatter.FormatStoredQueryResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format queries", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format queries response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerCreateQueryTool registers the irmin_create_query tool for creating a new stored query
//
//nolint:dupl // Similar pattern to create_script tool, but for a different resource type
func (mcpTools *MCPTools) registerCreateQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_create_query",
			Description: "Save a SQL query for reuse with a descriptive name. Stored queries can be shared and executed by ID, making complex analyses reproducible. Requires workspace_slug and query parameters (name, SQL statement, optional description). Returns the created query object with unique ID. Use irmin_retrieve_docs_context with 'duckdb' collection before creating to understand SQL syntax and available functions.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args createQueryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, struct{}{}, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Create the query
			query, err := mcpTools.apiServices.CreateQuery(
				ctx,
				user,
				workspace,
				args.Request,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("query creation failed", "error", err)
				return helpers.MCPError("Query creation failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredQueryResponse(query, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format query", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format query response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerUpdateQueryTool registers the irmin_update_query tool for updating an existing stored query
func (mcpTools *MCPTools) registerUpdateQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_update_query",
			Description: "Modify an existing stored query's SQL statement, name, or description. Useful for refining queries or fixing errors while preserving the query ID. Requires workspace_slug, query_id (SQID), and update parameters. Returns the updated query object. Use irmin_retrieve_docs_context with 'duckdb' collection for SQL syntax reference when modifying queries.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args updateQueryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), struct{}{}, nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the query by SQID
			query, err := mcpTools.apiServices.GetQuery(
				ctx,
				user,
				workspace,
				args.QueryID,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get query", "error", err)
				return helpers.MCPError("Failed to get query"), struct{}{}, nil
			}

			// Update the query
			updatedQuery, err := mcpTools.apiServices.UpdateQuery(
				ctx,
				user,
				workspace,
				query,
				args.Request,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("query update failed", "error", err)
				return helpers.MCPError("Query update failed"), struct{}{}, nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredQueryResponse(updatedQuery, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format query", "error", ferr)
				return nil, struct{}{}, fmt.Errorf("failed to format query response: %w", ferr)
			}

			result, err := helpers.MCPSuccess(formatted)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerExecuteSQLTool registers the irmin_execute_sql tool for executing arbitrary SQL queries
func (mcpTools *MCPTools) registerExecuteSQLTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_execute_sql",
			Description: "Execute ad-hoc SQL queries on workspace data using DuckDB analytics engine. Query any repository object as a table using path-based syntax (e.g., SELECT * FROM 'repo/branch/path/file.json'). Supports JOINs across multiple objects, aggregations, and complex analytics. Returns query results as JSON with automatic response size limiting for MCP. Requires workspace_slug and sql string. Use irmin_retrieve_docs_context with 'duckdb' collection to learn SQL syntax and irmin_get_repository_object_schema to understand table structures.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args executeSQLArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), struct{}{}, nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Execute the SQL (always limit response for MCP)
			sqlResult, err := mcpTools.apiServices.ExecuteSQL(
				ctx,
				"en",
				user,
				workspace,
				irmincore.ExecuteSQLRequest{
					SQL: args.SQL,
				},
				true, // Always limit response for MCP
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("SQL execution failed", "error", err)
				return helpers.MCPError("SQL execution failed"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(sqlResult)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}

// registerExecuteQueryTool registers the irmin_execute_query tool for executing stored queries
func (mcpTools *MCPTools) registerExecuteQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "irmin_execute_query",
			Description: "Execute a previously saved SQL query by its ID. Runs the stored SQL statement against current workspace data and returns results as JSON with automatic response size limiting. Requires workspace_slug and query_id (SQID). Use this for reproducible analyses, scheduled reporting, or executing complex queries without rewriting SQL each time.",
		},
		func(ctx context.Context, _ *sdkmcp.CallToolRequest, args executeQueryArgs) (*sdkmcp.CallToolResult, struct{}, error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), struct{}{}, nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, args.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), struct{}{}, nil
			}

			// Get the query by SQID
			query, err := mcpTools.apiServices.GetQuery(
				ctx,
				user,
				workspace,
				args.QueryID,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get query", "error", err)
				return helpers.MCPError("Failed to get query"), struct{}{}, nil
			}

			// Execute the SQL from the stored query (always limit response for MCP)
			queryResult, err := mcpTools.apiServices.ExecuteSQL(
				ctx,
				"en",
				user,
				workspace,
				irmincore.ExecuteSQLRequest{
					SQL: query.SQL,
				},
				true, // Always limit response for MCP
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("stored query execution failed", "error", err)
				return helpers.MCPError("Stored query execution failed"), struct{}{}, nil
			}

			result, err := helpers.MCPSuccess(queryResult)
			if err != nil {
				return nil, struct{}{}, err
			}
			return result, struct{}{}, nil
		},
	)
}
