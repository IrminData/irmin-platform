import { Branch } from '@/types/core/Branch';

/**
 * Example branches for testing
 * {@link Branch}
 */
export const branches: () => Branch[] = () => [
  {
    id: 1,
    name: 'main',
    default: true,
  },
  {
    id: 2,
    name: 'dev',
    default: false,
  },
  {
    id: 3,
    name: 'staging',
    default: false,
  },
];
