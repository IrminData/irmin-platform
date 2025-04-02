import { User } from '@/types/core/User';

import { roles } from './roles';

/**
 * Example user profile (eg. currently logged in user)
 *
 * Type: {@link User}
 *
 * @param last - If true, the item will avoid having children
 */
export const profile = (last = false): User => ({
  id: 'user-0',
  first_name: 'Neil',
  last_name: 'Armstrong',
  company: 'NASA',
  email: 'neil.armstrong@nasa.gov',
  phone: '+12014270935',
  profile_picture: '/ui-assets/elements/avatar-men-sign-up.png',
  roles: !last ? [roles()[0]] : undefined,
});
