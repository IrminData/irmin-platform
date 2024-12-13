/**
 * Enum for the types of console search items
 */
export enum ConsoleSearchItemType {
  Workflow = 'workflow',
  Connection = 'connection',
  Repository = 'repository',
  StructuredObject = 'structured-object',
  BinaryObject = 'binary-object',
  GroupObject = 'group-object',
  User = 'user',
  Workspace = 'workspace',
  Irmin = 'irmin',
}

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
