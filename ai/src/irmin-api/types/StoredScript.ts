import type { Tag } from './Tag';
import type { User } from './user';

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
