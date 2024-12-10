import { IrminRole } from '@/types/core/IrminRole';
import { Workspace } from '@/types/core/Workspace';

/**
 * Irmin user type
 */
export interface User {
  /** ID of the user in Irmin */
  id: string;
  /** ID of the user in Clerk */
  clerk_id: string;
  /** User's first name */
  first_name: string;
  /** User's last name */
  last_name: string;
  /** User's email */
  email: string;
  /** User's phone number */
  phone: string;
  /** User's company */
  company?: string;
  /** URL of the user's avatar */
  profile_picture?: string;
  /** (current user only) The currently active workspace of the user */
  workspace?: Workspace;
  /** Array of roles user has in the currently active workspace */
  roles?: IrminRole[];
}
