package tools

import (
	"context"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
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

// registerListQueriesTool registers the list_stored_queries tool for listing stored queries in a workspace
//
//nolint:dupl // This tool is similar to other tools which list things, but for a different resource
func (mcpTools *MCPTools) registerListQueriesTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "list_stored_queries", Description: "List stored queries in a workspace"},
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

// registerCreateQueryTool registers the create_query tool for creating a new stored query
func (mcpTools *MCPTools) registerCreateQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_query",
			Description: "Create a new stored query in a workspace. It's recommended to read the documentation for queries first, use `retrieve_docs_context` tool for more information.",
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

// registerUpdateQueryTool registers the update_query tool for updating an existing stored query
func (mcpTools *MCPTools) registerUpdateQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "update_query",
			Description: "Update an existing stored query. It's recommended to read the documentation for queries first, use `retrieve_docs_context` tool for more information.",
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

// registerExecuteSQLTool registers the execute_sql tool for executing arbitrary SQL queries
func (mcpTools *MCPTools) registerExecuteSQLTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "execute_sql",
			Description: "Execute an arbitrary SQL query on the workspace data. It's recommended to read the documentation for queries first, use `retrieve_docs_context` tool for more information.",
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

			// Execute the SQL
			sqlResult, err := mcpTools.apiServices.ExecuteSQL(
				ctx,
				"en",
				user,
				workspace,
				irmincore.ExecuteSQLRequest{
					SQL: args.SQL,
				},
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

// registerExecuteQueryTool registers the execute_query tool for executing stored queries
func (mcpTools *MCPTools) registerExecuteQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "execute_query", Description: "Execute a stored query and return the results"},
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

			// Execute the SQL from the stored query
			queryResult, err := mcpTools.apiServices.ExecuteSQL(
				ctx,
				"en",
				user,
				workspace,
				irmincore.ExecuteSQLRequest{
					SQL: query.SQL,
				},
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
