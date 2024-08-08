import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Profile } from '@/types/api/Profile';

import { roles } from './roles';
import { workspaces } from './workspaces';

/**
 * Get example user profile
 *
 * Type: {@link Profile}
 */
export const profile: () => Profile = () => ({
  id: 0,
  name: 'Joe Biden',
  company: 'Example Inc.',
  email: 'joe.biden@example.com',
  profile_picture: '/ui-assets/elements/avatar.webp',
  email_verified_at: getRandomDateTimeString(500, 'past', 100),
  workspace: workspaces()[0],
  roles: [roles()[0]],
  api_token: 'offline',
});
