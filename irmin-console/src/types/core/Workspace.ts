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

/**
 * Lightweight workspace representation with resource counts.
 * Used by the workspace selection page for faster loading.
 */
export interface WorkspaceSummary {
  /** Unique identifier of the workspace */
  id: string;
  /** Name of the workspace */
  name: string;
  /** Slug for the workspace */
  slug: string;
  /** Description of the workspace */
  description: string;
  /** Owner of the workspace */
  owner?: User;
  /** Number of members in the workspace */
  member_count: number;
  /** Number of repositories in the workspace */
  repository_count: number;
  /** Number of workflows in the workspace */
  workflow_count: number;
  /** Number of connections in the workspace */
  connection_count: number;
  /** ISO timestamp of when the user last accessed this workspace */
  last_accessed_at?: string | null;
}
