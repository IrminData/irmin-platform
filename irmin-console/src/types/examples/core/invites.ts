import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Invite } from '@/types/core/Invite';

import { roles } from './roles';

/**
 * Get example invites
 *
 * Array of {@link Invite}
 */
export const invites: () => Invite[] = () => [
  {
    id: '0',
    first_name: 'Petteri',
    last_name: 'Orpo',
    email: 'petteri@example.com',
    role: roles()[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '1',
    first_name: 'Sanna',
    last_name: 'Marin',
    email: 'sanna@example.com',
    role: roles()[1],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: '2',
    first_name: 'Juha',
    last_name: 'Sipilä',
    email: 'juha@example.com',
    role: roles()[3],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
