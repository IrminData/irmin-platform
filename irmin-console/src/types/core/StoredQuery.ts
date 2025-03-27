import { User } from '@/types/core/User';

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
