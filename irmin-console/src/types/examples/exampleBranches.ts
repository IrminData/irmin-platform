import { Branch } from '@/types/internal/Branch';

/**
 * Example branches for testing
 * {@link Branch}
 */
export const exampleBranches: Branch[] = [
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
