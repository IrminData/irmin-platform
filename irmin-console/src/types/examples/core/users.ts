import { WorkspaceUser } from '@/types/core/Workspace';

import { profile } from './profile';
import { roles } from './roles';

/**
 * Get example workspace users
 *
 * Array of {@link WorkspaceUser}
 *
 * @param last - If true, the items will avoid having children
 */
export const workspaceUsers = (last = false): WorkspaceUser[] => [
  profile(last),
  {
    id: 1,
    name: 'John Doe',
    company: 'Apple Inc.',
    email: 'john.doe@example.com',
    profile_picture: null,
    email_verified_at: null,
    roles: !last ? [roles()[1]] : undefined,
  },
  {
    id: 2,
    name: 'Jane Doe',
    company: 'Google Inc.',
    email: 'jane.doe@example.com',
    profile_picture: null,
    email_verified_at: null,
    roles: !last ? [roles()[2]] : undefined,
  },
  {
    id: 3,
    name: 'Jack Doe',
    company: 'Microsoft Inc.',
    email: 'jack.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: !last ? [roles()[0]] : undefined,
  },
  {
    id: 4,
    name: 'Jill Doe',
    company: 'Meta Inc.',
    email: 'jill.doe@example.com',
    profile_picture: null,
    email_verified_at: null,
    roles: !last ? [roles()[3]] : undefined,
  },
];
