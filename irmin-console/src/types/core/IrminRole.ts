export type IrminRole = 'admin' | 'editor' | 'viewer';

/**
 * Represents a role in the system
 */
export interface Role {
  /** Description of the role */
  description: string;
  /** Label of the role */
  label: string;
  /** Name of the role  */
  name: IrminRole;
}
