import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Invite, InviteSignedURLPayload } from '@/types/core/Invite';

import { roles } from './roles';

/**
 * Get example invites
 *
 * Array of {@link Invite}
 */
export const invites: () => Invite[] = () => [
  {
    id: 'inv-0',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+12014270935',
    company: 'Example Inc.',
    role: roles()[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 'inv-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: '+12014270935',
    role: roles()[1],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 'inv-2',
    first_name: 'Nick',
    last_name: 'Doe',
    email: 'nick@example.com',
    phone: '+12014270935',
    role: roles()[3],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];

/**
 * Get example invite signed URL payload
 */
export const inviteSignedURLPayload: InviteSignedURLPayload = {
  invite: 'inv-0',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+12014270935',
  company: 'Example Inc.',
  workspace: 'Example workspace',
  inviter: 'Neil Armstrong',
  has_an_account: false,
};
