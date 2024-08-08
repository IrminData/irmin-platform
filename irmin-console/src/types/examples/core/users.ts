import { WorkspaceUser } from '@/types/api/Workspace';

import { profile } from './profile';
import { roles } from './roles';

/**
 * Get example workspace users
 *
 * Array of {@link WorkspaceUser}
 */
export const workspaceUsers: () => WorkspaceUser[] = () => [
  profile(),
  {
    id: 1,
    name: 'John Doe',
    company: 'Apple Inc.',
    email: 'john.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [roles()[1]],
  },
  {
    id: 2,
    name: 'Jane Doe',
    company: 'Google Inc.',
    email: 'jane.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [roles()[2]],
  },
  {
    id: 3,
    name: 'Jack Doe',
    company: 'Microsoft Inc.',
    email: 'jack.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [roles()[0]],
  },
  {
    id: 4,
    name: 'Jill Doe',
    company: 'Meta Inc.',
    email: 'jill.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [roles()[2]],
  },
];
