import { IrminRole } from '@/types/core/IrminRole';

/**
 * Invite type
 *
 * @typeParam id - Invite ID
 * @typeParam name - Invite name
 * @typeParam email - Invite email
 * @typeParam created_at - Invite creation date
 * @typeParam updated_at - Invite update date
 * @typeParam role - Invite role
 */
export interface Invite {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  role: IrminRole;
}
