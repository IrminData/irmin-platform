import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Profile } from '@/types/core/Profile';

import { roles } from './roles';
import { workspaces } from './workspaces';

/**
 * Get example user profile
 *
 * Type: {@link Profile}
 *
 * @param last - If true, the item will avoid having children
 */
export const profile = (last = false): Profile => ({
  id: '0',
  name: 'Joe Biden',
  company: 'Example Inc.',
  email: 'joe.biden@example.com',
  profile_picture: null,
  email_verified_at: getRandomDateTimeString(500, 'past', 100),
  workspace: !last ? workspaces()[0] : undefined,
  roles: !last ? [roles()[0]] : undefined,
  api_token: 'offline',
});
