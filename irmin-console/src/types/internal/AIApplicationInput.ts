import type {
  AIApplicationDataSource,
  AIApplicationToolConfig,
} from '@/types/core/AIApplication';

/**
 * Input type for creating an AI Application
 */
export interface CreateAIApplicationInput {
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
 * Input type for updating an AI Application
 */
export interface UpdateAIApplicationInput {
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
