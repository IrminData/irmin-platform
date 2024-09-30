import { Branch } from '@/types/core/Branch';

/**
 * Example branches for testing
 * {@link Branch}
 */
export const branches: () => Branch[] = () => [
  {
    name: 'main',
    default: true,
  },
  {
    name: 'dev',
    default: false,
  },
  {
    name: 'staging',
    default: false,
  },
];
