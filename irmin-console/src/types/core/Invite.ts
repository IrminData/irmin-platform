import { User } from '@/types/core/User';
import { Workspace } from '@/types/core/Workspace';

import { Role } from './Role';

/**
 * Represents an invitation.
 */
export interface Invite {
  /** Unique identifier of the invite */
  id: string;
  /** Email address of the invitee */
  email: string;
  /** Role assigned in the invitation */
  role: Role;
  /** (optional) Time when the invite was accepted */
  accepted_at?: string;
  /** (optional) Time when the invite was declined */
  declined_at?: string;
  /** Time when the invitation expires */
  expires_at: string;
  /** User who sent the invitation */
  invited_by: User;
  /** Workspace associated with the invite */
  workspace: Workspace;
}
