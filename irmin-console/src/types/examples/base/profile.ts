import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Profile } from '@/types/api/Profile';

import { exampleRoles, exampleWorkspaces } from '.';

/**
 * Example user profile
 *
 * Type: {@link Profile}
 */
export const profile: Profile = {
  id: 0,
  name: 'Joe Biden',
  company: 'Example Inc.',
  email: 'joe.biden@example.com',
  profile_picture: '/ui-assets/elements/avatar.webp',
  email_verified_at: getRandomDateTimeString(500, 'past', 100),
  workspace: exampleWorkspaces[0],
  roles: [exampleRoles[0]],
  api_token: 'offline',
};
