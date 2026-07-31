/**
 * Represents a role in the system
 */
export interface Role {
  /** ID of the role */
  id: string;
  /** Role name */
  role: string;
  /** Description of the role */
  description: string;
  /** Whether the role is the owner role */
  isOwner: boolean;
  /** Whether the role is the default role */
  isDefault: boolean;
}
