import {
  CommandBasedConfig,
  UrlBasedConfig,
} from '@h1deya/langchain-mcp-tools';
import { env } from './env';

/**
 * Default MCP configuration with support for both authentication models:
 * - Static API keys (from environment variables)
 * - Dynamic JWT tokens (from user requests)
 */
export const defaultMcpConfig: Record<
  string,
  CommandBasedConfig | UrlBasedConfig
> = {
  // Irmin MCP server - requires user JWT token for authentication
  irmin: {
    url: env.IRMIN_API_BASE_URL + '/mcp',
    transport: 'sse',
    type: 'mcp',
    headers: {
      Authorization: 'Bearer ${AUTH_TOKEN}', // Will be replaced with user's JWT
    },
  },

  // Example: Static API key server (uncomment and configure as needed)
  // 'static-api-server': {
  //   url: 'https://api.example.com/mcp',
  //   transport: 'sse',
  //   type: 'mcp',
  //   headers: {
  //     'X-API-Key': env.EXAMPLE_API_KEY // Static key from environment
  //   }
  // },

  // Example: Command-based server with static API key
  // 'command-static-key': {
  //   command: 'npx',
  //   args: [
  //     '-y',
  //     'mcp-remote@latest',
  //     'https://api.example.com/mcp',
  //     '--header',
  //     `X-API-Key: ${env.EXAMPLE_API_KEY}`,
  //   ],
  //   env: {
  //     EXAMPLE_API_KEY: env.EXAMPLE_API_KEY,
  //   },
  // },
};
