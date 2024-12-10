import { User } from '@/types/core/User';

/**
 * Workspace type
 */
export interface Workspace {
  /** Workspace ID */
  id: string;
  /** Workspace name */
  name: string;
  /** Workspace slug */
  slug: string;
  /** Workspace owner ID */
  owner_id: string;
  /** Workspace description to be displayed */
  description: string;
  /** Array of users in the workspace */
  users: User[];
  /** Timestamp of workspace creation */
  created_at: string;
  /** Timestamp of workspace update */
  updated_at: string;
}
