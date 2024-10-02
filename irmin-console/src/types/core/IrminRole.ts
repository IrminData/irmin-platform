/**
 * Irmin role object
 *
 * @typeParam description - Human-readable description
 * @typeParam label - Human-readable name
 * @typeParam name - Slug of the role
 */
export interface IrminRole {
  description: string;
  label: string;
  name: IrminRoleNames;
}

/**
 * All currently available roles in Irmin
 */
export type IrminRoleNames = 'admin' | 'editor' | 'billing' | 'viewer';
