/**
 * Centralized timeout configuration for the AI service
 *
 * All timeouts are defined here to ensure consistency across the application
 * and make it easy to adjust timeout values based on different environments.
 */

export const TIMEOUTS = {
  // MCP and tool execution timeouts
  MCP_TOOL_EXECUTION: 30000, // 30 seconds for MCP tool execution
  MCP_ATTACH_TIMEOUT: 30000, // 30 seconds for MCP attach operations

  // HTTP request timeouts for Irmin API
  IRMIN_API_DEFAULT: 30000, // 30 seconds for general API requests
  IRMIN_API_MIDDLEWARE: 30000, // 30 seconds for middleware requests (auth, workspace)

  // Database operation timeouts
  DATABASE_OPERATION: 5000, // 5 seconds for database operations

  // LLM and streaming timeouts
  LLM_REQUEST: 60000, // 60 seconds for LLM requests
  STREAM_PROCESSING: 30000, // 30 seconds for stream processing

  // Agent execution timeouts
  AGENT_EXECUTION: 120000, // 2 minutes for complete agent execution
  AGENT_TOOL_CALLS: 30000, // 30 seconds per tool call
} as const;
