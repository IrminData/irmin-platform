import { User } from '@/types/core/User';

import { roles } from './roles';
import { workspaces } from './workspaces';

/**
 * Example user profile (eg. currently logged in user)
 *
 * Type: {@link User}
 *
 * @param last - If true, the item will avoid having children
 */
export const profile = (last = false): User => ({
  id: '0',
  clerk_id: 'user_2nIZ9VtXOtJFepRAZUQLXdp7z9L',
  first_name: 'Neil',
  last_name: 'Armstrong',
  company: 'NASA',
  email: 'neil.armstrong@nasa.gov',
  phone: '+1 234 567 890',
  profile_picture: '/ui-assets/images/sign-up/avatar-men-sign-up.png',
  roles: !last ? [roles()[0]] : undefined,
  workspace: !last ? workspaces()[0] : undefined,
});
