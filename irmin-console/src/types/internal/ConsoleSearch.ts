/**
 * Enum for the types of console search items
 */
export enum ConsoleSearchItemType {
  Workflow = 'workflow',
  Connection = 'connection',
  Repository = 'repository',
  Collection = 'collection',
  User = 'user',
  Workspace = 'workspace',
  Irmin = 'irmin',
}

/**
 * Interface for a console search item
 *
 * @param title - The title of the search item
 * @param description - The description of the search item
 * @param link - The link to the search item
 * @param type - The type of the search item
 */
export interface ConsoleSearchItem {
  title: string;
  description: string;
  link: string;
  type: ConsoleSearchItemType;
}
