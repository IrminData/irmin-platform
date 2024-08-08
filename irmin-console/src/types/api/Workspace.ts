import { IrminRole } from '@/types/api/IrminRole';

/**
 * Workspace type
 *
 * @typeParam id - Workspace ID
 * @typeParam name - Workspace name
 * @typeParam slug - Workspace slug
 * @typeParam owner_id - Workspace owner ID
 * @typeParam description - Workspace description to be displayed (optional)
 */
export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Workspace User type
 *
 * Not to be confused with the Profile type.
 * WorkspaceUser is used to represent a user in the context of a workspace - used to access workspace functionality.
 * Profile is used to represent a user's profile in the Irmin system - used for sign in etc.
 *
 * @typeParam id - User's ID
 * @typeParam name - User's name
 * @typeParam company - User's company
 * @typeParam email - User's email
 * @typeParam profile_picture - URL of user's profile picture (can be base64 encoded data URL)
 * @typeParam email_verified_at - Timestamp of email verification
 * @typeParam roles - Array of IrminRole objects assigned to the user
 */
export interface WorkspaceUser {
  id: number;
  name: string;
  company?: string | null;
  email: string;
  profile_picture?: string | null;
  email_verified_at?: string | null;
  roles?: IrminRole[] | null;
}
