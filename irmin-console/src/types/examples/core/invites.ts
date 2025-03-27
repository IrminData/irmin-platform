import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Invite } from '@/types/core/Invite';

import { roles } from './roles';
import { workspaceUsers } from './users';
import { workspaces } from './workspaces';

/**
 * Get example invites
 *
 * Array of {@link Invite}
 */
export const invites: () => Invite[] = () => [
  {
    id: 'inv-0',
    email: 'john@example.com',
    role: roles()[2],
    expires_at: getRandomDateTimeString(10, 'future', 2),
    invited_by: workspaceUsers().find((c) => c.email === 'jane@example.com')!,
    workspace: workspaces().find((c) => c.slug === 'example-core')!,
  },
  {
    id: 'inv-1',
    email: 'alice@example.com',
    role: roles()[1],
    expires_at: getRandomDateTimeString(10, 'future', 3),
    invited_by: workspaceUsers().find((c) => c.email === 'jane@example.com')!,
    workspace: workspaces().find((c) => c.slug === 'example-core')!,
  },
  {
    id: 'inv-2',
    email: 'bob@example.com',
    role: roles()[0],
    expires_at: getRandomDateTimeString(5, 'future', 5),
    invited_by: workspaceUsers().find((c) => c.email === 'jane@example.com')!,
    workspace: workspaces().find((c) => c.slug === 'example-core')!,
  },
  {
    id: 'inv-3',
    email: 'charlie@example.com',
    role: roles()[2],
    expires_at: getRandomDateTimeString(15, 'future', 1),
    invited_by: workspaceUsers().find((c) => c.email === 'jane@example.com')!,
    workspace: workspaces().find((c) => c.slug === 'example-core')!,
  },
];
