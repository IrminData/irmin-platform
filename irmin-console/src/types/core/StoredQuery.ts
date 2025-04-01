import { User } from '@/types/core/User';
import { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Represents a stored query in the system.
 */
export interface StoredQuery {
  /** Unique identifier of the stored query */
  id: string;
  /** Name of the stored query */
  name: string;
  /** Description of the stored query */
  description: string;
  /** SQL string of the stored query */
  sql: string;
  /** Owner of the stored query */
  owner: User;
  /** Timestamp when the stored query was created */
  created_at: string;
  /** Timestamp when the stored query was last updated */
  updated_at: string;
}

/**
 * Represents the result of a query execution.
 */
export interface QueryResult {
  columns?: string[];
  data?: Record<string, JSONValue>[];
  has_errors?: boolean;
  duration?: number;
  started_at?: string;
  finished_at?: string;
  logs?: string[];
}
