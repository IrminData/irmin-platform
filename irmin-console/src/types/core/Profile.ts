import { IrminRole } from '@/types/core/IrminRole';
import { Workspace } from '@/types/core/Workspace';

/**
 * Irmin user profile type
 *
 * Not to be confused with the WorkspaceUser type.
 * WorkspaceUser is used to represent a user in the context of a workspace - used to access workspace functionality.
 * Profile is used to represent a user's profile in the Irmin system - used for sign in etc.
 *
 * @typeParam id - Profile's ID
 * @typeParam name - Profile's name
 * @typeParam company - Profile's company
 * @typeParam email - Profile's email
 * @typeParam profile_picture - URL of profile picture (can be base64 encoded data URL)
 * @typeParam email_verified_at - Timestamp of email verification
 * @typeParam workspace - The currently active workspace of the user
 * @typeParam roles - Array of roles user has in the currently active workspace
 * @typeParam api_token - API token for the user
 */
export interface Profile {
  id: string;
  name: string;
  company?: string;
  email: string;
  profile_picture?: string;
  email_verified_at?: string;
  workspace?: Workspace;
  roles?: IrminRole[];
  api_token?: string;
}
