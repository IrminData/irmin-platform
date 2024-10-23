import { User } from '@/types/core/User';

/**
 * Workspace type
 *
 * @typeParam id - Workspace ID
 * @typeParam name - Workspace name
 * @typeParam slug - Workspace slug
 * @typeParam owner_id - Workspace owner ID
 * @typeParam description - Workspace description to be displayed
 * @typeParam users - Array of users in the workspace (optional)
 * @typeParam created_at - Timestamp of workspace creation
 * @typeParam updated_at - Timestamp of workspace update
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description: string;
  users?: User[];
  created_at: string;
  updated_at: string;
}
