import { Commit } from '@/types/core/Commit';
import { Object } from '@/types/core/Object';

/**
 * Represents the type of change in a diff.
 */
export type ChangeType = 'added' | 'removed' | 'changed' | 'conflict' | 'moved';

/**
 * Represents possible merge strategies.
 */
export type MergeStrategy = 'default' | 'source-wins' | 'dest-wins';

/**
 * Represents a single change in a diff.
 */
export interface ChangeItem {
  /** Object affected by the change */
  object: Object;
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
