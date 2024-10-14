import type { UserResource } from '@clerk/types';

import { IrminRole } from '@/types/core/IrminRole';
import { Workspace } from '@/types/core/Workspace';

/**
 * Irmin user type
 *
 * @typeParam id - ID of the user in Irmin
 * @typeParam clerk_id - ID of the user in Clerk
 * @typeParam email - User's primary email
 * @typeParam name - User's name
 * @typeParam company - User's company
 * @typeParam profile_picture - User's profile picture URL
 * @typeParam roles - Array of roles user has in the currently active workspace
 * @typeParam workspace - (current user only) The currently active workspace of the user
 * @typeParam user - (current user only) Clerk's user resource (always provided by Clerk and not the Irmin API)
 */
export interface User {
  // General user information
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  company?: string;
  profile_picture?: string;
  roles?: IrminRole[];
  // Properties only available for the current user
  workspace?: Workspace;
  user?: UserResource;
}
