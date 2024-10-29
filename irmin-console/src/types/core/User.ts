import { IrminRole } from '@/types/core/IrminRole';
import { Workspace } from '@/types/core/Workspace';

/**
 * Irmin user type
 *
 * @typeParam id - ID of the user in Irmin
 * @typeParam email - User's primary email
 * @typeParam first_name - User's first name
 * @typeParam last_name - User's last name
 * @typeParam phone - User's phone number
 * @typeParam company - User's company name
 * @typeParam profile_picture - User's profile picture URL
 * @typeParam roles - Array of roles user has in the currently active workspace
 * @typeParam clerk_id - (optional) ID of the user in Clerk, set internally
 * @typeParam workspace - (current user only) The currently active workspace of the user
 */
export interface User {
  // General user information
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company?: string;
  profile_picture?: string;
  roles?: IrminRole[];
  // Properties only available for the current user
  clerk_id?: string;
  workspace?: Workspace;
}
