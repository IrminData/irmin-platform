import { IrminRole } from '@/types/core/IrminRole';

/**
 * Invite type
 *
 * @typeParam id - Invite ID
 * @typeParam first_name - First name of the invitee
 * @typeParam last_name - Last name of the invitee
 * @typeParam email - Email of the invitee
 * @typeParam created_at - Invite creation date
 * @typeParam updated_at - Invite update date
 * @typeParam role - Invitee's role
 */
export interface Invite {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  updated_at: string;
  role: IrminRole;
}
