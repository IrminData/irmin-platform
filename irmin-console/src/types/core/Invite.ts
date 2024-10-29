import { IrminRole } from '@/types/core/IrminRole';

/**
 * Invite type
 *
 * @typeParam id - Invite ID
 * @typeParam first_name - First name of the invitee
 * @typeParam last_name - Last name of the invitee
 * @typeParam email - Email of the invitee
 * @typeParam phone - Phone number of the invitee
 * @typeParam company - (optional) Company name of the invitee
 * @typeParam created_at - Invite creation date
 * @typeParam updated_at - Invite update date
 * @typeParam role - Invitee's role
 */
export interface Invite {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
  created_at: string;
  updated_at: string;
  role: IrminRole;
}

/**
 * Invite signed URL payload
 *
 * @typeParam invite - Invite hash ID
 * @typeParam first_name - First name of the invitee
 * @typeParam last_name - Last name of the invitee
 * @typeParam email - Email of the invitee
 * @typeParam phone - Phone number of the invitee
 * @typeParam company - (optional) Company name of the invitee
 * @typeParam workspace - Name of the workspace the invite is for
 * @typeParam inviter - Inviter's full name
 * @typeParam has_an_account - Whether the invitee has an account
 */
export interface InviteSignedURLPayload {
  invite: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
  workspace: string;
  inviter: string;
  has_an_account: boolean;
}
