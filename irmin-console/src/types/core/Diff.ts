import type { Commit } from '@/types/core/Commit';
import type { RepositoryObject } from '@/types/core/RepositoryObject';

/**
 * Represents the type of change in a diff, eg. what kind of change was made to the object
 */
type ChangeType = 'added' | 'changed' | 'conflict' | 'moved' | 'removed';

/**
 * Represents possible merge strategies, eg. how to resolve conflicts when merging two branches
 */
export type MergeStrategy = 'default' | 'dest-wins' | 'source-wins';

/**
 * Represents a single change in a diff.
 */
export interface ChangeItem {
  /** Object affected by the change */
  object: RepositoryObject;
  /** Type of the change (e.g., added, removed, changed, etc.) */
  type: ChangeType;
  /** Size of the change */
  size: number;
}

/**
 * Represents the difference between two refs.
 */
export interface Diff {
  /** Name of the repository */
  repository: string;
  /** Base reference */
  base_ref: string;
  /** Compare reference */
  compare_ref: string;
  /** List of changes in the diff */
  items: ChangeItem[];
  /** (optional) List of commits between the refs */
  commits?: Commit[];
}
