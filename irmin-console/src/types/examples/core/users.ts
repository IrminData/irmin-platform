import { User } from '@/types/core/User';

import { profile } from './profile';
import { roles } from './roles';

/**
 * Get example workspace users
 *
 * Array of {@link User}
 *
 * @param last - If true, the items will avoid having children
 */
export const workspaceUsers = (last = false): User[] => [
  profile(last),
  {
    id: '1',
    clerk_id: 'clerk-id-1',
    first_name: 'John',
    last_name: 'Doe',
    company: 'Example Inc.',
    email: 'john@example.com',
    phone: '+1 234 567 890',
    profile_picture: '/ui-assets/images/sign-up/avatar-men-sign-up.png',
    roles: !last ? [roles()[1]] : undefined,
  },
  {
    id: '2',
    clerk_id: 'clerk-id-2',
    first_name: 'Jane',
    last_name: 'Doe',
    company: 'Example Inc.',
    email: 'jane@example.com',
    phone: '+1 234 567 890',
    profile_picture: '/ui-assets/images/sign-up/avatar-men-sign-up.png',
    roles: !last ? [roles()[2]] : undefined,
  },
  {
    id: '3',
    clerk_id: 'clerk-id-3',
    first_name: 'Jack',
    last_name: 'Doe',
    company: 'Example Inc.',
    email: 'jack@example.com',
    phone: '+1 234 567 890',
    profile_picture: '/ui-assets/images/sign-up/avatar-men-sign-up.png',
    roles: !last ? [roles()[0]] : undefined,
  },
  {
    id: '4',
    clerk_id: 'clerk-id-4',
    first_name: 'Jill',
    last_name: 'Doe',
    company: 'Example Inc.',
    email: 'jill@example.com',
    phone: '+1 234 567 890',
    profile_picture: '/ui-assets/images/sign-up/avatar-men-sign-up.png',
    roles: !last ? [roles()[3]] : undefined,
  },
];
