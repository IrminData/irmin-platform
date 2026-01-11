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
