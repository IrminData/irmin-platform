package toolregistry_test

import (
	"context"
	"encoding/json"
	"testing"

	"irmin-api/toolregistry"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type echoInput struct {
	Value         string `json:"value"`
	WorkspaceSlug string `json:"workspace_slug,omitempty"`
}

func TestRegistryRejectsWorkspaceConfusion(t *testing.T) {
	t.Parallel()
	registry := toolregistry.New()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "test", Version: "1"}, nil)
	called := false
	toolregistry.Register(registry, server, "irmin_test_echo", "Echo a value", func(
		_ context.Context,
		_ *sdkmcp.CallToolRequest,
		input echoInput,
	) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
		called = true
		return nil, toolregistry.ToolOutput{Data: input}, nil
	})
	ctx := toolregistry.WithWorkspaceBinding(t.Context(), "workspace-a")
	_, _, err := registry.Execute(
		ctx,
		"irmin_test_echo",
		nil,
		json.RawMessage(`{"value":"secret","workspace_slug":"workspace-b"}`),
	)
	if err == nil || called {
		t.Fatalf("cross-workspace call executed: called=%v err=%v", called, err)
	}
}

func TestDestructiveToolStagesUntilApproved(t *testing.T) {
	t.Parallel()
	staged := false
	executed := false
	registry := toolregistry.New(func(
		_ context.Context,
		_ toolregistry.Descriptor,
		_ *sdkmcp.CallToolRequest,
		_ json.RawMessage,
	) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
		staged = true
		return nil, toolregistry.ToolOutput{Data: map[string]any{"requires_approval": true}}, nil
	})
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "test", Version: "1"}, nil)
	toolregistry.Register(registry, server, "irmin_test_delete", "Delete a value", func(
		_ context.Context,
		_ *sdkmcp.CallToolRequest,
		input echoInput,
	) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
		executed = true
		return nil, toolregistry.ToolOutput{Data: input}, nil
	})

	arguments := json.RawMessage(`{"value":"ok"}`)
	bound := toolregistry.WithWorkspaceBinding(t.Context(), "workspace-a")
	if _, _, err := registry.Execute(
		bound,
		"irmin_test_delete",
		nil,
		json.RawMessage(`{"value":"ok","workspace_slug":"workspace-b"}`),
	); err == nil || staged {
		t.Fatalf("cross-workspace destructive call was staged: staged=%v err=%v", staged, err)
	}
	if _, _, err := registry.Execute(t.Context(), "irmin_test_delete", nil, arguments); err != nil {
		t.Fatal(err)
	}
	if !staged || executed {
		t.Fatalf("destructive call was not staged: staged=%v executed=%v", staged, executed)
	}
	if _, _, err := registry.Execute(
		toolregistry.WithApproval(t.Context()), "irmin_test_delete", nil, arguments,
	); err != nil {
		t.Fatal(err)
	}
	if !executed {
		t.Fatal("approved destructive call did not execute")
	}
}

func TestRegistryDeterministicStrictAndExecutable(t *testing.T) {
	t.Parallel()
	registry := toolregistry.New()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "test", Version: "1"}, nil)
	toolregistry.Register(registry, server, "irmin_test_echo", "Echo a value", func(
		_ context.Context,
		_ *sdkmcp.CallToolRequest,
		input echoInput,
	) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
		return nil, toolregistry.ToolOutput{Data: input}, nil
	})

	descriptors := registry.List()
	if len(descriptors) != 1 || descriptors[0].Name != "irmin_test_echo" {
		t.Fatalf("unexpected descriptors: %#v", descriptors)
	}
	schemaJSON, err := json.Marshal(descriptors[0].InputSchema)
	if err != nil {
		t.Fatal(err)
	}
	if string(schemaJSON) == "" || !contains(string(schemaJSON), `"additionalProperties":false`) {
		t.Fatalf("input schema is not strict: %s", schemaJSON)
	}
	_, output, err := registry.Execute(context.Background(), "irmin_test_echo", nil, json.RawMessage(`{"value":"ok"}`))
	if err != nil {
		t.Fatal(err)
	}
	if output.Data.(echoInput).Value != "ok" {
		t.Fatalf("unexpected output: %#v", output)
	}
}

func TestRedactForAuditUsesDescriptorPolicy(t *testing.T) {
	t.Parallel()
	redacted := toolregistry.RedactForAudit(map[string]any{
		"path": "safe/path",
		"nested": map[string]any{
			"token":   "secret-value",
			"content": "customer payload",
		},
	}, toolregistry.AuditRedactionFor("irmin_repository_object_write")).(map[string]any)
	nested := redacted["nested"].(map[string]any)
	if nested["token"] != "[REDACTED]" || nested["content"] != "[REDACTED]" {
		t.Fatalf("secret fields were not redacted: %#v", redacted)
	}
	if redacted["path"] != "safe/path" {
		t.Fatalf("non-secret field was changed: %#v", redacted)
	}
}

func TestCanonicalCustomName(t *testing.T) {
	t.Parallel()
	if got := toolregistry.CanonicalCustomName("Revenue Export (EU)"); got != "irmin_custom_revenue_export_eu" {
		t.Fatalf("canonical custom name = %q", got)
	}
}

func TestRegisteredToolConformsToMCPListAndCall(t *testing.T) {
	t.Parallel()
	ctx := t.Context()
	registry := toolregistry.New()
	server := sdkmcp.NewServer(&sdkmcp.Implementation{Name: "server", Version: "1"}, nil)
	toolregistry.Register(registry, server, "irmin_test_echo", "Echo a value", func(
		_ context.Context,
		_ *sdkmcp.CallToolRequest,
		input echoInput,
	) (*sdkmcp.CallToolResult, toolregistry.ToolOutput, error) {
		return nil, toolregistry.ToolOutput{Data: input}, nil
	})
	clientTransport, serverTransport := sdkmcp.NewInMemoryTransports()
	serverSession, err := server.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer serverSession.Close()
	client := sdkmcp.NewClient(&sdkmcp.Implementation{Name: "client", Version: "1"}, nil)
	clientSession, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer clientSession.Close()
	listed, err := clientSession.ListTools(ctx, nil)
	if err != nil || len(listed.Tools) != 1 || listed.Tools[0].Name != "irmin_test_echo" {
		t.Fatalf("list tools = %#v, error = %v", listed, err)
	}
	called, err := clientSession.CallTool(ctx, &sdkmcp.CallToolParams{
		Name: "irmin_test_echo", Arguments: map[string]any{"value": "ok"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if called.IsError || called.StructuredContent == nil {
		t.Fatalf("call result = %#v", called)
	}
}

func contains(value, fragment string) bool {
	for i := 0; i+len(fragment) <= len(value); i++ {
		if value[i:i+len(fragment)] == fragment {
			return true
		}
	}
	return false
}
