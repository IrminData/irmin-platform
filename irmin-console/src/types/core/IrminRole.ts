/**
 * Irmin role object
 */
export interface IrminRole {
  /** Human-readable description */
  description: string;
  /** Human-readable name */
  label: string;
  /** Slug of the role eg. 'admin', 'editor', 'billing', 'viewer', ... */
  name: string;
}
