import {
  convertMcpToLangchainTools,
  SingleMcpServerConfig,
  CommandBasedConfig,
  UrlBasedConfig,
} from '@h1deya/langchain-mcp-tools';
import { defaultMcpConfig } from '@/config/mcp';
import type { StructuredTool } from '@langchain/core/tools';

export class McpService {
  private tools: StructuredTool[] = [];
  private initialized = false;
  private currentAuthToken: string | undefined;

  /**
   * Initialize MCP tools from configuration
   */
  async initializeMcpTools(authToken?: string): Promise<void> {
    try {
      const mcpServers = this.createMcpServers(authToken);

      if (mcpServers.length === 0) {
        console.warn('No MCP servers configured');
        return;
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

      this.tools = allTools;
      this.initialized = true;
      this.currentAuthToken = authToken;
      console.log(
        `Initialized ${this.tools.length} MCP tools from ${mcpServers.length} servers`
      );
    } catch (error) {
      console.error('Failed to initialize MCP tools:', error);
      this.tools = [];
      this.initialized = false;
      this.currentAuthToken = undefined;
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
   * Get initialized tools
   */
  getTools(): StructuredTool[] {
    if (!this.initialized) {
      console.warn('MCP tools not initialized yet');
      return [];
    }
    return this.tools;
  }

  /**
   * Check if MCP tools are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if the auth token has changed since last initialization
   */
  hasAuthTokenChanged(authToken?: string): boolean {
    return this.currentAuthToken !== authToken;
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.length;
  }

  /**
   * Reinitialize MCP tools with new auth token
   */
  async reinitialize(authToken?: string): Promise<void> {
    this.initialized = false;
    this.tools = [];
    await this.initializeMcpTools(authToken);
  }

  /**
   * Get tool names for debugging
   */
  getToolNames(): string[] {
    return this.tools.map((tool) => tool.name || 'unnamed-tool');
  }

  /**
   * Cleanup MCP connections
   */
  async cleanup(): Promise<void> {
    // The @h1deya/langchain-mcp-tools package handles cleanup internally
    this.tools = [];
    this.initialized = false;
    this.currentAuthToken = undefined;
    console.log('MCP tools cleaned up');
  }
}

// Export singleton instance
export const mcpService = new McpService();
