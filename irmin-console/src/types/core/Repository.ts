import { User } from './User';

/**
 * Represents the garbage collection rules for a branch.
 */
export interface BranchGarbageCollectionRules {
  /** ID of the branch */
  branch_id: string;
  /** Number of days to retain data */
  retention_days: number;
}

/**
 * Represents the garbage collection rules for a repository.
 */
export interface GarbageCollectionRules {
  /** (optional) Default number of retention days */
  default_retention_days?: number;
  /** (optional) List of garbage collection rules for branches */
  branches?: BranchGarbageCollectionRules[];
}

/**
 * Represents a repository.
 */
export interface Repository {
  /** Unique identifier of the repository */
  id: string;
  /** Name of the repository */
  name: string;
  /** Slug of the repository */
  slug: string;
  /** Description of the repository */
  description: string;
  /** Documentation for the repository */
  documentation: string;
  /** Whether the repository is immutable */
  is_immutable: boolean;
  /** Default branch of the repository */
  default_branch: string;
  /** Owner of the repository */
  owner: User;
  /** (optional) Garbage collection rules for the repository */
  garbage_collection_rules?: GarbageCollectionRules;
  /** Timestamp when the repository was created */
  created_at: string;
  /** Timestamp when the repository was last updated */
  updated_at: string;
}
