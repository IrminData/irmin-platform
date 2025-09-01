import {
  CommandBasedConfig,
  convertMcpToLangchainTools,
  SingleMcpServerConfig,
  UrlBasedConfig,
} from '@h1deya/langchain-mcp-tools';
import type { StructuredTool } from '@langchain/core/tools';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { defaultMcpConfig } from '@/config/mcp';

import { type ToolSelection } from '@/types/agents';

class McpService {
  /**
   * Create MCP tools for a specific request with the given auth token and tool selection
   * This is per-request and doesn't maintain global state
   */
  async createMcpTools(
    authToken?: string,
    toolSelection?: ToolSelection
  ): Promise<StructuredTool[]> {
    try {
      const mcpServers = this.createMcpServers(authToken);

      if (mcpServers.length === 0) {
        console.warn('No MCP servers configured');
        return [];
      }

      // Collect tools from all servers
      const allTools: StructuredTool[] = [];

      for (const server of mcpServers) {
        try {
          const langChainTools = await convertMcpToLangchainTools({
            servers: server,
          });
          allTools.push(...langChainTools.tools);
          console.log(
            `Loaded ${langChainTools.tools.length} tools from server`
          );
        } catch (error) {
          console.error('Failed to load tools from server:', error);
        }
      }

      // Filter tools based on selection criteria
      const filteredTools = this.filterTools(allTools, toolSelection);

      console.log(
        `Created ${filteredTools.length} MCP tools from ${mcpServers.length} servers (filtered from ${allTools.length} total tools)`
      );

      return filteredTools;
    } catch (error) {
      console.error('Failed to create MCP tools:', error);
      return [];
    }
  }

  /**
   * Create MCP server parameters from configuration
   */
  private createMcpServers(authToken?: string): SingleMcpServerConfig[] {
    const servers: SingleMcpServerConfig[] = [];

    for (const [serverId, serverConfig] of Object.entries(defaultMcpConfig)) {
      try {
        let serverParams: SingleMcpServerConfig;

        if (this.isCommandBasedConfig(serverConfig)) {
          // Handle command-based server
          const requiresAuth = (serverConfig.args || []).some((arg) =>
            arg.includes('${AUTH_TOKEN}')
          );

          if (requiresAuth && !authToken) {
            console.warn(
              `Skipping ${serverId}: requires auth token but none provided`
            );
            continue;
          }

          serverParams = {
            command: serverConfig.command,
            args: (serverConfig.args || []).map((arg: string) =>
              arg.replace('${AUTH_TOKEN}', authToken || '')
            ),
            env: {
              ...serverConfig.env,
              ...(requiresAuth && { AUTH_TOKEN: authToken || '' }),
            },
          };

          console.log(
            `Configured command-based MCP server: ${serverId} (${requiresAuth ? 'authenticated' : 'unauthenticated'})`
          );
        } else if (this.isUrlBasedConfig(serverConfig)) {
          // Handle URL-based server
          const requiresAuth =
            serverConfig.headers?.Authorization?.includes('${AUTH_TOKEN}');

          if (requiresAuth && !authToken) {
            console.warn(
              `Skipping ${serverId}: requires auth token but none provided`
            );
            continue;
          }

          serverParams = {
            url: serverConfig.url,
            transport: serverConfig.transport,
            type: serverConfig.type,
            headers: {
              ...serverConfig.headers,
              ...(requiresAuth && { Authorization: `Bearer ${authToken}` }),
            },
          };

          console.log(
            `Configured URL-based MCP server: ${serverId} (${requiresAuth ? 'authenticated' : 'unauthenticated'})`
          );
        } else {
          console.warn(`Unknown server config type for ${serverId}, skipping`);
          continue;
        }

        servers.push(serverParams);
      } catch (error) {
        console.error(`Failed to configure MCP server ${serverId}:`, error);
      }
    }

    return servers;
  }

  /**
   * Type guard to check if config is command-based
   */
  private isCommandBasedConfig(
    config: CommandBasedConfig | UrlBasedConfig
  ): config is CommandBasedConfig {
    return 'command' in config;
  }

  /**
   * Type guard to check if config is URL-based
   */
  private isUrlBasedConfig(
    config: CommandBasedConfig | UrlBasedConfig
  ): config is UrlBasedConfig {
    return 'url' in config;
  }

  /**
   * Filter tools based on selection criteria
   */
  private filterTools(
    tools: StructuredTool[],
    toolSelection?: ToolSelection
  ): StructuredTool[] {
    if (!toolSelection) {
      return tools;
    }

    const { includeTools, excludeTools, includeAll } = toolSelection;

    // If includeAll is true, return all tools (no filtering)
    if (includeAll) {
      return tools;
    }

    let filteredTools = [...tools];

    // Filter by specific tools to include
    if (includeTools && includeTools.length > 0) {
      filteredTools = filteredTools.filter((tool) =>
        includeTools.includes(tool.name)
      );
    }

    // Filter by specific tools to exclude
    if (excludeTools && excludeTools.length > 0) {
      filteredTools = filteredTools.filter(
        (tool) => !excludeTools.includes(tool.name)
      );
    }

    // Note: includeServers filtering would require mapping tools to their source servers
    // This is more complex and would need additional metadata from the MCP conversion
    // For now, we'll focus on tool-level filtering

    return filteredTools;
  }

  /**
   * Get detailed MCP tools information for a specific user
   */
  async getTools(authToken?: string) {
    try {
      const configKeys = Object.keys(defaultMcpConfig);
      const enabled = configKeys.length > 0;

      if (!enabled) {
        return {
          enabled: false,
          tools: [],
          count: 0,
          servers: [],
          totalServers: 0,
        };
      }

      const servers: Array<{
        id: string;
        type: 'command' | 'url';
        requiresAuth: boolean;
        toolCount: number;
      }> = [];

      const allTools: Array<{
        name: string;
        description: string;
        type: string;
        schema?: unknown;
        serverId?: string;
        requiresAuth?: boolean;
      }> = [];

      // Process each server configuration
      for (const [serverId, serverConfig] of Object.entries(defaultMcpConfig)) {
        try {
          let serverType: 'command' | 'url';
          let requiresAuth = false;

          if (this.isCommandBasedConfig(serverConfig)) {
            serverType = 'command';
            requiresAuth = (serverConfig.args || []).some((arg) =>
              arg.includes('${AUTH_TOKEN}')
            );
          } else if (this.isUrlBasedConfig(serverConfig)) {
            serverType = 'url';
            requiresAuth =
              serverConfig.headers?.Authorization?.includes('${AUTH_TOKEN}') ||
              false;
          } else {
            console.warn(
              `Unknown server config type for ${serverId}, skipping`
            );
            continue;
          }

          // Skip servers that require auth but no token provided
          if (requiresAuth && !authToken) {
            servers.push({
              id: serverId,
              type: serverType,
              requiresAuth: true,
              toolCount: 0,
            });
            continue;
          }

          // Try to get tools from this server
          let serverTools: Array<{
            name: string;
            description: string;
            type: string;
            schema?: unknown;
            serverId?: string;
            requiresAuth?: boolean;
          }> = [];

          try {
            const serverParams = this.createMcpServers(authToken).find(
              (server) => {
                if (this.isCommandBasedConfig(serverConfig)) {
                  return server.command === serverConfig.command;
                } else if (this.isUrlBasedConfig(serverConfig)) {
                  return server.url === serverConfig.url;
                }
                return false;
              }
            );

            if (serverParams) {
              const langChainTools = await convertMcpToLangchainTools({
                servers: serverParams,
              });

              serverTools = langChainTools.tools.map((tool) => ({
                name: tool.name,
                description: tool.description || `Tool: ${tool.name}`,
                type: 'mcp',
                schema:
                  tool.schema &&
                  typeof tool.schema === 'object' &&
                  '_def' in tool.schema
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      zodToJsonSchema(tool.schema as any)
                    : tool.schema,
                serverId,
                requiresAuth,
              }));
            }
          } catch (error) {
            console.error(
              `Failed to load tools from server ${serverId}:`,
              error
            );
          }

          servers.push({
            id: serverId,
            type: serverType,
            requiresAuth,
            toolCount: serverTools.length,
          });

          allTools.push(...serverTools);
        } catch (error) {
          console.error(`Failed to process server ${serverId}:`, error);
        }
      }

      return {
        enabled,
        tools: allTools,
        count: allTools.length,
        servers,
        totalServers: servers.length,
      };
    } catch (error) {
      console.error('Failed to get detailed MCP tools:', error);
      return {
        enabled: false,
        tools: [],
        count: 0,
        servers: [],
        totalServers: 0,
      };
    }
  }
}

// Export service instance (not singleton)
export const mcpService = new McpService();
