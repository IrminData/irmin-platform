import { Commit } from './Commit';
import { Object } from './Object';

/**
 * Interface to represent a diff item.
 */
export interface ChangeItem {
  object: Object;
  type: ChangeType;
  size: number;
}

/**
 * Enum to represent the type of change.
 */
export enum ChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
  CHANGED = 'changed',
  CONFLICT = 'conflict',
  MOVED = 'moved',
}

/**
 * Interface to represent the difference between two refs.
 */
export interface Diff {
  repository: string;
  base_ref: string;
  compare_ref: string;
  items: ChangeItem[];
  commits?: Commit[];
}

/**
 * Enum to represent possible merge strategies.
 */
export enum MergeStrategy {
  DEFAULT = 'default',
  SOURCE_WINS = 'source-wins',
  DEST_WINS = 'dest-wins',
}
