/**
 * Irmin role object
 *
 * @typeParam description - Human-readable description
 * @typeParam label - Human-readable name
 * @typeParam name - Slug of the role eg. 'admin', 'editor', 'billing', 'viewer', ...
 */
export interface IrminRole {
  description: string;
  label: string;
  name: string;
}
