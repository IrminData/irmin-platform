/**
 * The types of console search items
 */
export type ConsoleSearchItemType =
  | 'workflow'
  | 'connection'
  | 'repository'
  | 'structured-object'
  | 'binary-object'
  | 'group-object'
  | 'user'
  | 'workspace'
  | 'script'
  | 'query'
  | 'irmin';

/**
 * Interface for a console search item
 */
export interface ConsoleSearchItem {
  /** The title of the search item */
  title: string;
  /** The description of the search item */
  description: string;
  /** The link to the search item */
  link: string;
  /** The type of the search item */
  type: ConsoleSearchItemType;
}
