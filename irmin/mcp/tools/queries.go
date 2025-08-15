package tools

import (
	"context"
	"fmt"

	"irmin-api/formatter"
	"irmin-api/mcp/helpers"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type listQueriesArgs struct {
	WorkspaceSlug string `json:"workspace_slug" jsonschema:"required,The slug of the workspace to list queries in"`
}

type createQueryArgs struct {
	WorkspaceSlug string                       `json:"workspace_slug" jsonschema:"required,The slug of the workspace to create the query in"`
	Query         irmincore.CreateQueryRequest `json:"query"          jsonschema:"required,Query creation parameters"`
}

type updateQueryArgs struct {
	WorkspaceSlug string                       `json:"workspace_slug" jsonschema:"required,The slug of the workspace"`
	QueryID       string                       `json:"query_id"       jsonschema:"required,The ID (SQID) of the query to update"`
	Query         irmincore.UpdateQueryRequest `json:"query"          jsonschema:"required,Query update parameters"`
}

type executeSQLArgs struct {
	WorkspaceSlug string                      `json:"workspace_slug" jsonschema:"required,The slug of the workspace to execute SQL in"`
	SQL           irmincore.ExecuteSQLRequest `json:"sql"            jsonschema:"required,SQL query to execute"`
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
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[listQueriesArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}
			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
			}

			// List the queries
			queries, err := mcpTools.apiServices.ListWorkspaceQueries(ctx, user, workspace)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to list queries", "error", err)
				return helpers.MCPError("Failed to list queries"), nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatIndexResponse(
				queries,
				formatter.FormatStoredQueryResponse,
				mcpTools.apiServices.SQIDManager,
			)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format queries", "error", ferr)
				return nil, fmt.Errorf("failed to format queries response: %w", ferr)
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}

// registerCreateQueryTool registers the create_query tool for creating a new stored query
func (mcpTools *MCPTools) registerCreateQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "create_query",
			Description: "Create a new stored query in a workspace. It's recommended to read the documentation for queries first, use `list_docs` tool for more information.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[createQueryArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			// Validate user
			user, err := helpers.ValidateUser(ctx, mcpTools.getUser)
			if err != nil {
				return nil, err
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
			}

			// Create the query
			query, err := mcpTools.apiServices.CreateQuery(
				ctx,
				user,
				workspace,
				params.Arguments.Query,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("query creation failed", "error", err)
				return helpers.MCPError("Query creation failed"), nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredQueryResponse(query, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format query", "error", ferr)
				return nil, fmt.Errorf("failed to format query response: %w", ferr)
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}

// registerUpdateQueryTool registers the update_query tool for updating an existing stored query
func (mcpTools *MCPTools) registerUpdateQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "update_query",
			Description: "Update an existing stored query. It's recommended to read the documentation for queries first, use `list_docs` tool for more information.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[updateQueryArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
			}

			// Get the query by SQID
			query, err := mcpTools.apiServices.GetQuery(
				ctx,
				user,
				workspace,
				params.Arguments.QueryID,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get query", "error", err)
				return helpers.MCPError("Failed to get query"), nil
			}

			// Update the query
			updatedQuery, err := mcpTools.apiServices.UpdateQuery(
				ctx,
				user,
				workspace,
				query,
				params.Arguments.Query,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("query update failed", "error", err)
				return helpers.MCPError("Query update failed"), nil
			}

			// Format the response using the same formatter as the API
			formatted, ferr := formatter.FormatStoredQueryResponse(updatedQuery, mcpTools.apiServices.SQIDManager)
			if ferr != nil {
				mcpTools.apiServices.Logger.Error("Failed to format query", "error", ferr)
				return nil, fmt.Errorf("failed to format query response: %w", ferr)
			}

			return helpers.MCPSuccess(formatted)
		},
	)
}

// registerExecuteSQLTool registers the execute_sql tool for executing arbitrary SQL queries
func (mcpTools *MCPTools) registerExecuteSQLTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{
			Name:        "execute_sql",
			Description: "Execute an arbitrary SQL query on the workspace data. It's recommended to read the documentation for queries first, use `list_docs` tool for more information.",
		},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[executeSQLArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
			}

			// Execute the SQL
			result, err := mcpTools.apiServices.ExecuteSQL(
				ctx,
				"en",
				user,
				workspace,
				params.Arguments.SQL,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("SQL execution failed", "error", err)
				return helpers.MCPError("SQL execution failed"), nil
			}

			return helpers.MCPSuccess(result)
		},
	)
}

// registerExecuteQueryTool registers the execute_query tool for executing stored queries
func (mcpTools *MCPTools) registerExecuteQueryTool() {
	sdkmcp.AddTool(
		mcpTools.server,
		&sdkmcp.Tool{Name: "execute_query", Description: "Execute a stored query and return the results"},
		func(ctx context.Context, _ *sdkmcp.ServerSession, params *sdkmcp.CallToolParamsFor[executeQueryArgs]) (*sdkmcp.CallToolResultFor[struct{}], error) {
			user, ok := mcpTools.getUser(ctx)
			if !ok || user == nil || user.ID == 0 {
				return helpers.MCPError("Unauthorized"), nil
			}

			// Get the workspace first
			workspace, err := mcpTools.apiServices.GetWorkspace(ctx, user, params.Arguments.WorkspaceSlug)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get workspace", "error", err)
				return helpers.MCPError("Failed to get workspace"), nil
			}

			// Get the query by SQID
			query, err := mcpTools.apiServices.GetQuery(
				ctx,
				user,
				workspace,
				params.Arguments.QueryID,
			)
			if err != nil {
				mcpTools.apiServices.Logger.Error("Failed to get query", "error", err)
				return helpers.MCPError("Failed to get query"), nil
			}

			// Execute the SQL from the stored query
			result, err := mcpTools.apiServices.ExecuteSQL(
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
				return helpers.MCPError("Stored query execution failed"), nil
			}

			return helpers.MCPSuccess(result)
		},
	)
}
