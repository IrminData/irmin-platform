import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Invite } from '@/types/api/Invite';

import { exampleRoles } from '.';

/**
 * Example invites
 *
 * Array of {@link Invite}
 */
export const invites: Invite[] = [
  {
    id: 0,
    name: 'Petteri Orpo',
    email: 'petteri@example.com',
    role: exampleRoles[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Sanna Marin',
    email: 'sanna@example.com',
    role: exampleRoles[1],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'Juha Sipilä',
    email: 'juha@example.com',
    role: exampleRoles[4],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
