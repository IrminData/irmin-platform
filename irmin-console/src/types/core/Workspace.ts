import type { User } from '@/types/core/User';

/**
 * Represents a workspace.
 */
export interface Workspace {
  /** Unique identifier of the workspace */
  id: string;
  /** Name of the workspace */
  name: string;
  /** Slug for the workspace */
  slug: string;
  /** Description of the workspace */
  description: string;
  /** (optional) Owner of the workspace */
  owner?: User;
  /** (optional) List of users in the workspace */
  users?: User[];
}
