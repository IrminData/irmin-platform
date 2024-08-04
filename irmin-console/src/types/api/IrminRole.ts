/**
 * IrminRole
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
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
export type IrminRoleNames = 'admin' | 'editor' | 'billing' | 'viewer';
