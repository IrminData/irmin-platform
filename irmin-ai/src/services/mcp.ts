import {
  CommandBasedConfig,
  convertMcpToLangchainTools,
  SingleMcpServerConfig,
  UrlBasedConfig,
} from '@h1deya/langchain-mcp-tools';
import type { StructuredTool } from '@langchain/core/tools';

import { defaultMcpConfig } from '@/config/mcp';

export class McpService {
  /**
   * Create MCP tools for a specific request with the given auth token
   * This is per-request and doesn't maintain global state
   */
  async createMcpTools(authToken?: string): Promise<StructuredTool[]> {
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

      console.log(
        `Created ${allTools.length} MCP tools from ${mcpServers.length} servers`
      );

      return allTools;
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
   * Get MCP configuration status (for health checks)
   */
  getConfigStatus(): {
    enabled: boolean;
    serverCount: number;
    configKeys: string[];
  } {
    const configKeys = Object.keys(defaultMcpConfig);
    return {
      enabled: configKeys.length > 0,
      serverCount: configKeys.length,
      configKeys,
    };
  }
}

// Export service instance (not singleton)
export const mcpService = new McpService();
