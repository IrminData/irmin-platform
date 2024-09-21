import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Workspace } from '@/types/core/Workspace';

import { workspaceUsers } from './users';

/**
 * Get example workspaces
 *
 * Array of {@link Workspace}
 */
export const workspaces: () => Workspace[] = () => [
  {
    id: 0,
    name: 'Example Core',
    slug: 'example-core',
    description:
      'Main workspace for Example company. Financials, HR, other admin stuff',
    owner_id: 0,
    users: workspaceUsers(true),
    created_at: getRandomDateTimeString(800, 'past', 500),
    updated_at: getRandomDateTimeString(400, 'past', 100),
  },
  {
    id: 1,
    name: 'Example Finland',
    slug: 'example-finland',
    description: 'The Finnish branch of Example company. Sales and marketing',
    owner_id: 0,
    users: workspaceUsers(true),
    created_at: getRandomDateTimeString(800, 'past', 500),
    updated_at: getRandomDateTimeString(400, 'past', 100),
  },
  {
    id: 2,
    name: 'Example Sweden',
    slug: 'example-sweden',
    description: 'The Swedish branch of Example company. Sales and marketing',
    owner_id: 0,
    users: workspaceUsers(true),
    created_at: getRandomDateTimeString(800, 'past', 500),
    updated_at: getRandomDateTimeString(400, 'past', 100),
  },
  {
    id: 3,
    name: 'Example Norway',
    slug: 'example-norway',
    description: 'The Norwegian branch of Example company. Sales and marketing',
    owner_id: 0,
    users: workspaceUsers(true),
    created_at: getRandomDateTimeString(800, 'past', 500),
    updated_at: getRandomDateTimeString(400, 'past', 100),
  },
  {
    id: 4,
    name: 'Example App',
    slug: 'example-app',
    description:
      'Workspace for the Example App. Usage data, user data, and other app-related data',
    owner_id: 0,
    users: workspaceUsers(true),
    created_at: getRandomDateTimeString(800, 'past', 500),
    updated_at: getRandomDateTimeString(400, 'past', 100),
  },
];
