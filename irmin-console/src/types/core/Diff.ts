import { Collection } from './Collection';
import { Commit } from './Commit';

export enum ChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
  CHANGED = 'changed',
  CONFLICT = 'conflict',
  MOVED = 'moved',
}

/**
 * Interface to represent a diff item
 *
 * @typeParam collection - The collection the change is referring to
 * @typeParam type - The type of difference
 * @typeParam size - Size of the added/changed/deleted entry in bytes
 */
export interface ChangeItem {
  collection: Collection;
  type: ChangeType;
  size: number;
}

/**
 * Interface to represent the difference between two refs
 *
 * @typeParam repository - The repository the refs are in
 * @typeParam baseRef - The base ref
 * @typeParam compareRef - The ref to compare against
 * @typeParam items - The diff items
 * @typeParam commits - The commits on the compare ref that are not in the base ref
 */
export interface Diff {
  repository: string;
  baseRef: string;
  compareRef: string;
  items: ChangeItem[];
  commits: Commit[];
}
