package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"irmin-api/db"
	"irmin-api/services"
	"irmin-api/toolregistry"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type MCPTools struct {
	server      *sdkmcp.Server
	apiServices *services.APIServices
	getUser     func(ctx context.Context) (*db.User, bool)
	registry    *toolregistry.Registry
}

func NewMCPTools(
	server *sdkmcp.Server,
	apiServices *services.APIServices,
	getUser func(ctx context.Context) (*db.User, bool),
) *MCPTools {
	mcpTools := &MCPTools{server: server, apiServices: apiServices, getUser: getUser}
	if apiServices == nil {
		mcpTools.registry = toolregistry.New()
	} else {
		mcpTools.registry = toolregistry.New(mcpTools.stageDestructiveOperation)
	}
	return mcpTools
}

// Registry returns the request-scoped canonical execution catalog.
func (mcpTools *MCPTools) Registry() *toolregistry.Registry { return mcpTools.registry }

func (mcpTools *MCPTools) stageDestructiveOperation(
	ctx context.Context,
	descriptor toolregistry.Descriptor,
	_ *sdkmcp.CallToolRequest,
	arguments json.RawMessage,
) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
	user, ok := mcpTools.getUser(ctx)
	if !ok || user == nil {
		return nil, toolregistry.ToolOutput{}, errors.New("authenticated user required to stage operation")
	}
	var input struct {
		WorkspaceSlug string `json:"workspace_slug"`
	}
	if err := json.Unmarshal(arguments, &input); err != nil || input.WorkspaceSlug == "" {
		return nil, toolregistry.ToolOutput{}, errors.New("workspace_slug is required to stage operation")
	}
	workspace, err := mcpTools.apiServices.DB.GetWorkspaceBySlug(input.WorkspaceSlug)
	if err != nil {
		return nil, toolregistry.ToolOutput{}, errors.New("workspace not found")
	}
	if _, err = mcpTools.apiServices.DB.GetWorkspaceUser(workspace.ID, user.ID); err != nil {
		return nil, toolregistry.ToolOutput{}, errors.New("user is not a workspace member")
	}
	operation := &db.MCPPendingOperation{
		WorkspaceID: workspace.ID, RequestedByID: user.ID,
		ToolName: descriptor.Name, Risk: string(descriptor.Risk),
		Capability: descriptor.Capability, ApprovalPreview: descriptor.ApprovalPreview,
		ArgumentsJSON: string(arguments), Status: db.PendingOperationStatusPending,
	}
	if err = mcpTools.apiServices.DB.CreateMCPPendingOperation(operation); err != nil {
		return nil, toolregistry.ToolOutput{}, fmt.Errorf("stage pending operation: %w", err)
	}
	id, err := mcpTools.apiServices.SQIDManager.Encode("mcp_pending_operations", uint64(operation.ID))
	if err != nil {
		return nil, toolregistry.ToolOutput{}, fmt.Errorf("encode pending operation: %w", err)
	}
	data := map[string]any{
		"requires_approval":    true,
		"pending_operation_id": id,
		"tool_name":            descriptor.Name,
		"approval_preview":     descriptor.ApprovalPreview,
		"workspace_slug":       input.WorkspaceSlug,
	}
	encoded, _ := json.Marshal(data)
	return &sdkmcp.CallToolResult{
		Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: string(encoded)}},
	}, toolregistry.ToolOutput{Data: data}, nil
}

// RegisterAll registers all tools in this package.
func (mcpTools *MCPTools) RegisterAll() {
	mcpTools.RegisterWorkspaceTools()
	mcpTools.RegisterConnectorTools()
	mcpTools.RegisterConnectionTools()
	mcpTools.RegisterRepositoryTools()
	mcpTools.RegisterRepositoryBranchesTools()
	mcpTools.RegisterRepositoryCommitsTools()
	mcpTools.RegisterRepositoryCompareTools()
	mcpTools.RegisterRepositoryObjectsTools()
	mcpTools.RegisterQueryTools()
	mcpTools.RegisterWorkflowsTools()
	mcpTools.RegisterWorkflowRunsTools()
	mcpTools.RegisterDocsTools()
	mcpTools.RegisterScriptsTools()
	mcpTools.registerCatalogTool()
}

// Catalog returns the deterministic, handler-free tool catalog.
func (mcpTools *MCPTools) Catalog() []toolregistry.Descriptor {
	return mcpTools.registry.List()
}

func (mcpTools *MCPTools) registerCatalogTool() {
	toolregistry.Register(
		mcpTools.registry,
		mcpTools.server,
		"irmin_tool_catalog_list",
		"List the versioned Irmin tool descriptors available in this workspace.",
		func(
			_ context.Context,
			_ *sdkmcp.CallToolRequest,
			_ struct{},
		) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
			return nil, toolregistry.ToolOutput{Data: mcpTools.Catalog()}, nil
		},
	)
}
