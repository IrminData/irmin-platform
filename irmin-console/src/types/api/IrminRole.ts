export interface IrminRole {
  description: string; // Human-readable description
  label: string; // Human-readable name
  name: IrminRoleNames; // Has been reffered to as 'slug' in internal communication
}
export type IrminRoleNames = 'admin' | 'editor' | 'billing' | 'viewer';
