import { IrminRole } from '@/types/core/IrminRole';

/**
 * Invite type
 */
export interface Invite {
  /** Invite ID */
  id: string;
  /** First name of the invitee */
  first_name: string;
  /** Last name of the invitee */
  last_name: string;
  /** Email of the invitee */
  email: string;
  /** Phone number of the invitee */
  phone: string;
  /** Company of the invitee */
  company?: string;
  /** Invitee's role object */
  role: IrminRole;
  /** Invite created date */
  invited_at: string;
  /** Invite expired date */
  expired_at: string | null;
  /** Invite deleted date */
  deleted_at: string | null;
}

/**
 * Invite signed URL payload
 */
export interface InviteSignedURLPayload {
  /** Invite hash ID */
  invite: string;
  /** First name of the invitee */
  first_name: string;
  /** Last name of the invitee */
  last_name: string;
  /** Email of the invitee */
  email: string;
  /** Phone number of the invitee */
  phone: string;
  /** (optional) Company name of the invitee */
  company?: string;
  /** Name of the workspace the invite is for */
  workspace: string;
  /** Inviter's full name */
  inviter: string;
  /** Whether the invitee has an account */
  has_an_account: boolean;
}
