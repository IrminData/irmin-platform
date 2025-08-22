package ai_test

import (
	"slices"
	"testing"

	"irmin-api/ai"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/zeebo/assert"
)

func TestConfigureMCPServers_DocsToolsOnly(t *testing.T) {
	// Create a mock AI instance with base MCP servers
	aiInstance := &ai.AI{}
	// Set the mcpServers field directly for testing
	aiInstance.SetMCPServers([]anthropic.BetaRequestMCPServerURLDefinitionParam{
		{
			URL:  "http://test.com",
			Name: "test-mcp",
			ToolConfiguration: anthropic.BetaRequestMCPServerToolConfigurationParam{
				Enabled: anthropic.Bool(true),
			},
		},
	})

	// Test case 1: DocsToolsOnly = false (should allow all tools)
	opts := &ai.MessageOptions{
		DocsToolsOnly: false,
	}

	mcpServers := aiInstance.ConfigureMCPServers(opts)

	// Should have the same configuration as base (no restrictions)
	assert.Equal(t, 1, len(mcpServers))
	assert.Equal(t, "test-mcp", mcpServers[0].Name)
	assert.True(t, mcpServers[0].ToolConfiguration.Enabled.Value)
	assert.Nil(t, mcpServers[0].ToolConfiguration.AllowedTools)

	// Test case 2: DocsToolsOnly = true (should restrict to docs tools only)
	opts.DocsToolsOnly = true
	mcpServers = aiInstance.ConfigureMCPServers(opts)

	// Should have restricted tool configuration
	assert.Equal(t, 1, len(mcpServers))
	assert.Equal(t, "test-mcp", mcpServers[0].Name)
	assert.True(t, mcpServers[0].ToolConfiguration.Enabled.Value)
	assert.NotNil(t, mcpServers[0].ToolConfiguration.AllowedTools)
	assert.Equal(t, 2, len(mcpServers[0].ToolConfiguration.AllowedTools))
	assert.True(t, slices.Contains(mcpServers[0].ToolConfiguration.AllowedTools, "list_docs"))
	assert.True(t, slices.Contains(mcpServers[0].ToolConfiguration.AllowedTools, "get_docs"))
}

func TestConfigureMCPServers_MultipleServers(t *testing.T) {
	// Create a mock AI instance with multiple MCP servers
	aiInstance := &ai.AI{}
	// Set the mcpServers field directly for testing
	aiInstance.SetMCPServers([]anthropic.BetaRequestMCPServerURLDefinitionParam{
		{
			URL:  "http://test1.com",
			Name: "test-mcp-1",
			ToolConfiguration: anthropic.BetaRequestMCPServerToolConfigurationParam{
				Enabled: anthropic.Bool(true),
			},
		},
		{
			URL:  "http://test2.com",
			Name: "test-mcp-2",
			ToolConfiguration: anthropic.BetaRequestMCPServerToolConfigurationParam{
				Enabled: anthropic.Bool(true),
			},
		},
	})

	// Test with DocsToolsOnly = true
	opts := &ai.MessageOptions{
		DocsToolsOnly: true,
	}

	mcpServers := aiInstance.ConfigureMCPServers(opts)

	// Both servers should have restricted tool configuration
	assert.Equal(t, 2, len(mcpServers))

	for _, server := range mcpServers {
		assert.True(t, server.ToolConfiguration.Enabled.Value)
		assert.NotNil(t, server.ToolConfiguration.AllowedTools)
		assert.Equal(t, 2, len(server.ToolConfiguration.AllowedTools))
		assert.True(t, slices.Contains(server.ToolConfiguration.AllowedTools, "list_docs"))
		assert.True(t, slices.Contains(server.ToolConfiguration.AllowedTools, "get_docs"))
	}
}

func TestAITypeSystemPrompt(t *testing.T) {
	// Test with AssistantAI type
	systemPrompt := ai.GetSystemPrompt(ai.AssistantAI)
	assert.NotEqual(t, systemPrompt, "")
	assert.True(t, len(systemPrompt) > 0)

	// Test with QueryAI type
	systemPrompt = ai.GetSystemPrompt(ai.QueryAI)
	assert.NotEqual(t, systemPrompt, "")
	assert.True(t, len(systemPrompt) > 0)

	// Test with empty string (should return empty)
	systemPrompt = ai.GetSystemPrompt("")
	assert.Equal(t, systemPrompt, "")
}
