import {
  type ClientConfig,
  MultiServerMCPClient,
} from '@langchain/mcp-adapters';

import { env } from '@/config/env';

class ToolsService {
  createClient(mcpServers: ClientConfig['mcpServers']) {
    // Create client and connect to server
    return new MultiServerMCPClient({
      // Global tool configuration options
      // Whether to throw on errors if a tool fails to load (optional, default: true)
      throwOnLoadError: false,
      // Whether to prefix tool names with the server name (optional, default: false)
      prefixToolNameWithServerName: false,
      // Optional additional prefix for tool names (optional, default: "")
      additionalToolNamePrefix: '',

      // Use standardized content block format in tool outputs
      useStandardContentBlocks: true,

      // Server configuration
      mcpServers,
    });
  }

  async getTools(client: MultiServerMCPClient) {
    return await client.getTools();
  }

  getIrminMCPConfig(authToken?: string) {
    if (!authToken) {
      throw new Error('Auth token is required for Irmin MCP server');
    }
    return {
      irmin: {
        // Uses Streamable HTTP transport (MCP spec PR #206)
        // The adapter automatically handles POST for requests and GET for SSE streaming
        url: env.IRMIN_API_BASE_URL + '/mcp',
        transport: 'http' as const,
        type: 'http' as const,
        headers: {
          Authorization: `Bearer ${authToken}`,
          // Accept header is automatically added by the adapter for SSE connections
        },
      },
    };
  }
}

export const toolsService = new ToolsService();
