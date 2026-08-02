import { JSONValue } from '@/types/internal/GenericJSON';

import type { Tag } from './Tag';
import type { User } from './User';

/**
 * StoredScript represents a stored script in the system
 */
export interface StoredScript {
  id: string; // Sqid of the script
  name: string;
  description?: string;
  content?: string;
  language?: string; // js, py, go, etc. (default: go)
  owner: User; // Owner of the script
  tags: Tag[];
  created_at: string; // Timestamp of when the script was created
  updated_at: string; // Timestamp of when the script was last updated
}

/**
 * ScriptResult represents the result of script execution
 */
export interface ScriptResult {
  /** Parsed structured result files */
  structured_results?: Record<string, Record<string, JSONValue>[]>;
  /** Indicates if there were errors */
  has_errors?: boolean;
  /** Duration of the script execution */
  duration?: number;
  /** Timestamp when the script started executing */
  started_at?: string;
  /** Timestamp when the script finished executing */
  finished_at?: string;
  /** Logs generated during the script execution */
  logs?: string[];
}
