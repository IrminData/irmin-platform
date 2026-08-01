import type { Tag } from '@/types/core/Tag';
import type { User } from '@/types/core/User';

/**
 * Data source for an AI Application
 */
export interface AIApplicationDataSource {
  /** Repository slug */
  repository: string;
  /** Branch name */
  branch: string;
  /** Path within the repository */
  path: string;
}

/**
 * Write configuration for an AI Application
 */
export interface AIApplicationWriteConfig {
  /** Whether file upload is enabled */
  file_upload_enabled: boolean;
  /** Whether file update is enabled */
  file_update_enabled: boolean;
  /** Whether JSON patch operations are enabled */
  patch_enabled: boolean;
  /** Whether changes are automatically committed */
  auto_commit: boolean;
  /** Whether commit messages are required */
  require_commit_message: boolean;
  /** Prefix added to all commit messages */
  commit_message_prefix?: string;
  /** Whether human approval is required for writes */
  require_approval: boolean;
}

/**
 * Tool configuration for an AI Application
 */
export interface AIApplicationToolConfig {
  /** Whether SQL query tool is enabled */
  query_enabled: boolean;
  /** Whether schema tool is enabled */
  schema_enabled: boolean;
  /** Whether list objects tool is enabled */
  list_objects_enabled: boolean;
  /** Whether get content tool is enabled */
  get_content_enabled: boolean;
  /** Whether vector search tool is enabled */
  vector_search_enabled: boolean;
  /** Whether documentation tool is enabled */
  docs_enabled: boolean;
  /** Whether write operations are enabled */
  write_enabled?: boolean;
  /** Write operation configuration */
  write_config?: AIApplicationWriteConfig;
}

/**
 * Custom tool types
 */
export type CustomToolType = 'stored_query' | 'workflow' | 'embedding_search';

/**
 * Custom tool for an AI Application
 */
export interface AIApplicationCustomTool {
  /** Custom tool ID */
  id?: string;
  /** Tool name (must be unique within the AI Application) */
  name: string;
  /** Tool description shown to consuming LLMs */
  description: string;
  /** Type of custom tool */
  type: CustomToolType;
  /** Whether the tool is enabled */
  enabled: boolean;
  /** Stored query ID (for stored_query type) */
  stored_query_id?: string;
  /** Workflow ID (for workflow type) */
  workflow_id?: string;
  /** Embedding path (for embedding_search type) */
  embedding_path?: string;
  /** Top K results (for embedding_search type) */
  embedding_top_k?: number;
  /** Metadata filter (for embedding_search type) */
  embedding_filter?: Record<string, string>;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * AI Application object
 */
export interface AIApplication {
  /** AI Application hash ID */
  id: string;
  /** AI Application name */
  name: string;
  /** AI Application description */
  description: string;
  /** AI Application documentation as a markdown string */
  documentation: string;
  /** Allowed origins for CORS */
  allowed_origins: string[];
  /** Tool configuration */
  tools?: AIApplicationToolConfig;
  /** Custom tools */
  custom_tools?: AIApplicationCustomTool[];
  /** Data sources (repositories and paths) */
  data_sources: AIApplicationDataSource[];
  /** API key (only returned on creation) */
  api_key?: string;
  /** The workspace user that owns this AI Application */
  owner: User;
  /** Tags associated with this AI Application */
  tags?: Tag[];
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Request body for creating a custom tool
 */
interface CreateCustomToolRequest {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Type of custom tool */
  type: CustomToolType;
  /** Whether the tool is enabled */
  enabled: boolean;
  /** Stored query ID (for stored_query type) */
  stored_query_id?: string;
  /** Workflow ID (for workflow type) */
  workflow_id?: string;
  /** Embedding path (for embedding_search type) */
  embedding_path?: string;
  /** Top K results (for embedding_search type) */
  embedding_top_k?: number;
  /** Metadata filter (for embedding_search type) */
  embedding_filter?: Record<string, string>;
}

/**
 * Request body for updating a custom tool
 */
export interface UpdateCustomToolRequest extends CreateCustomToolRequest {
  /** Custom tool ID (if updating existing tool) */
  id?: string;
}

/**
 * Request body for creating an AI Application
 */
export interface CreateAIApplicationRequest {
  /** AI Application name */
  name: string;
  /** AI Application description */
  description?: string;
  /** AI Application documentation */
  documentation?: string;
  /** Allowed origins for CORS */
  allowed_origins?: string[];
  /** Tool configuration */
  tools?: AIApplicationToolConfig;
  /** Custom tools */
  custom_tools?: CreateCustomToolRequest[];
  /** Data sources */
  data_sources?: AIApplicationDataSource[];
  /** Tag IDs */
  tags?: string[];
}

/**
 * Request body for updating an AI Application
 */
export interface UpdateAIApplicationRequest {
  /** AI Application name */
  name?: string;
  /** AI Application description */
  description?: string;
  /** AI Application documentation */
  documentation?: string;
  /** Allowed origins for CORS */
  allowed_origins?: string[];
  /** Tool configuration */
  tools?: AIApplicationToolConfig;
  /** Custom tools */
  custom_tools?: UpdateCustomToolRequest[];
  /** Data sources */
  data_sources?: AIApplicationDataSource[];
  /** Tag IDs */
  tags?: string[];
}

/**
 * Request body for transferring AI Application ownership
 */
export interface TransferAIApplicationOwnershipRequest {
  /** New owner user ID */
  new_owner_id: string;
}

/**
 * Tool log protocol type
 */
type AIApplicationToolLogProtocol = 'mcp' | 'rest';

/**
 * AI Application tool log entry
 */
export interface AIApplicationToolLog {
  /** Log entry ID */
  id: number;
  /** Tool name that was called */
  tool_name: string;
  /** Tool type (built-in or custom) */
  tool_type: string;
  /** JSON string of inputs passed to the tool */
  inputs_json: string;
  /** Protocol used (MCP or REST) */
  protocol: AIApplicationToolLogProtocol;
  /** IP address of the request origin */
  request_ip: string;
  /** User agent of the request */
  user_agent: string;
  /** Origin header of the request */
  origin: string;
  /** Duration of the tool call in milliseconds */
  duration_ms: number;
  /** Whether the tool call was successful */
  success: boolean;
  /** Error message if the tool call failed */
  error_msg: string;
  /** Creation timestamp */
  created_at: string;
}

/**
 * Response for listing tool logs
 */
export interface AIApplicationToolLogsResponse {
  /** Tool log entries */
  logs: AIApplicationToolLog[];
  /** Total number of logs */
  total: number;
  /** Current limit */
  limit: number;
  /** Current offset */
  offset: number;
}

/**
 * Statistics for a specific tool
 */
interface AIApplicationToolStat {
  /** Tool name */
  tool_name: string;
  /** Number of calls */
  count: number;
  /** Average duration in milliseconds */
  avg_duration_ms: number;
  /** Number of successful calls */
  success_count: number;
  /** Number of failed calls */
  error_count: number;
}

/**
 * Aggregated statistics for tool logs
 */
export interface AIApplicationToolLogStats {
  /** Total number of tool calls */
  total_calls: number;
  /** Number of successful calls */
  successful_calls: number;
  /** Number of failed calls */
  failed_calls: number;
  /** Average duration in milliseconds */
  avg_duration_ms: number;
  /** Per-tool statistics */
  by_tool: AIApplicationToolStat[];
}

/**
 * Status of a pending write operation
 */
export type PendingWriteStatus = 'pending' | 'approved' | 'rejected';

/**
 * Pending write operation awaiting approval
 */
export interface AIApplicationPendingWrite {
  /** Pending write ID */
  id: string;
  /** AI Application ID */
  ai_application_id: string;
  /** Repository slug */
  repository: string;
  /** Path within the repository */
  path: string;
  /** Branch/ref name */
  ref: string;
  /** Operation type: upload, update, or patch */
  operation: 'upload' | 'update' | 'patch';
  /** Preview of the content (truncated) */
  content_preview?: string;
  /** JSON patch operations if applicable */
  patch_json?: string;
  /** Commit message */
  commit_message: string;
  /** Current status */
  status: PendingWriteStatus;
  /** User who reviewed the pending write */
  reviewed_by?: User;
  /** Timestamp when reviewed */
  reviewed_at?: string;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Response for listing pending writes
 */
export interface AIApplicationPendingWritesResponse {
  /** Pending write entries */
  pending_writes: AIApplicationPendingWrite[];
  /** Total number of pending writes */
  total: number;
  /** Current limit */
  limit: number;
  /** Current offset */
  offset: number;
}
