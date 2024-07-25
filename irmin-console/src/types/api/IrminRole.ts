/**
 * IrminRole
 * @typeParam description - Human-readable description
 * @typeParam label - Human-readable name
 * @typeParam name - Slug of the role
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface IrminRole {
  description: string;
  label: string;
  name: IrminRoleNames;
}
export type IrminRoleNames = 'admin' | 'editor' | 'billing' | 'viewer';
