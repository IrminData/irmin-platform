import {
  type ClientConfig,
  MultiServerMCPClient,
} from '@langchain/mcp-adapters';

import { env } from '@/config/env';
import { TIMEOUTS } from '@/config/timeouts';

type IrminToolDescriptor = Record<string, unknown> & {
  name: string;
  risk?: 'read' | 'write' | 'destructive';
};

/** Rejects model-selected workspace arguments outside the active request. */
export function bindToolArgsToWorkspace(
  args: unknown,
  selectedWorkspaceSlug: string
): { args: Record<string, unknown> } | undefined {
  if (typeof args !== 'object' || args === null) return;
  const values = args as Record<string, unknown>;
  if (
    Object.hasOwn(values, 'workspace_slug') &&
    values.workspace_slug !== selectedWorkspaceSlug
  ) {
    throw new Error('Tool workspace does not match the selected workspace');
  }
  if (Object.hasOwn(values, 'workspace_slug')) {
    return { args: { ...values, workspace_slug: selectedWorkspaceSlug } };
  }
}

class ToolsService {
  createClient(
    mcpServers: ClientConfig['mcpServers'],
    selectedWorkspaceSlug: string
  ) {
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

      // A model may choose arguments, but it may never switch the workspace
      // selected by the authenticated application request.
      beforeToolCall: ({ args }) =>
        bindToolArgsToWorkspace(args, selectedWorkspaceSlug),

      // Server configuration
      mcpServers,
    });
  }

  async getTools(client: MultiServerMCPClient) {
    const tools = await client.getTools();
    const catalogTool = tools.find(
      (tool) => tool.name === 'irmin_tool_catalog_list'
    );
    if (!catalogTool) {
      throw new Error('Irmin MCP did not publish its canonical tool catalog');
    }
    const result = await catalogTool.invoke({});
    const descriptors = this.extractDescriptors(result);
    if (descriptors.length === 0) {
      throw new Error('Irmin MCP returned an empty or malformed tool catalog');
    }
    const byName = new Map(
      descriptors.map((descriptor) => [descriptor.name, descriptor])
    );
    for (const tool of tools) {
      const descriptor = byName.get(tool.name);
      if (descriptor) {
        tool.metadata = { ...tool.metadata, irminDescriptor: descriptor };
      }
    }
    return tools;
  }

  private extractDescriptors(value: unknown): IrminToolDescriptor[] {
    const found: IrminToolDescriptor[] = [];
    const visit = (candidate: unknown) => {
      if (Array.isArray(candidate)) {
        for (const item of candidate) visit(item);
        return;
      }
      if (typeof candidate !== 'object' || candidate === null) return;
      const record = candidate as Record<string, unknown>;
      if (
        typeof record.name === 'string' &&
        typeof record.capability === 'string' &&
        typeof record.catalog_version === 'number'
      ) {
        found.push(record as IrminToolDescriptor);
        return;
      }
      for (const child of Object.values(record)) visit(child);
    };
    visit(value);
    return found;
  }

  getIrminMCPConfig(authToken?: string, workspaceSlug?: string) {
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
          ...(workspaceSlug ? { 'X-Irmin-Workspace': workspaceSlug } : {}),
          // Accept header is automatically added by the adapter for SSE connections
        },
        // Enforce tool execution timeout
        // Note: The adapter might not support this directly in all versions,
        // but passing it in config is the standard way if supported.
        defaultToolTimeout: TIMEOUTS.MCP_TOOL_EXECUTION,
      },
    };
  }
}

export const toolsService = new ToolsService();
