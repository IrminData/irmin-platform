import { Branch } from '@/types/core/Branch';

/**
 * Example branches for testing
 * {@link Branch}
 */
export const branches: () => Branch[] = () => [
  {
    name: 'main',
    default: true,
    is_immutable: false,
  },
  {
    name: 'dev',
    default: false,
    is_immutable: false,
  },
  {
    name: 'staging',
    default: false,
    is_immutable: false,
  },
  {
    name: 'migration-googlesheets',
    default: false,
    is_immutable: true,
  },
  {
    name: 'convert-format-with-script',
    default: false,
    is_immutable: true,
  },
];
