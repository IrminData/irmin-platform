import { Role } from '@/types/core/IrminRole';

/**
 * Get example roles
 *
 * Array of {@link Role}
 */
export const roles: () => Role[] = () => [
  {
    name: 'admin',
    label: 'Admin',
    description: 'Can do everything',
  },
  {
    name: 'editor',
    label: 'Editor',
    description: 'Can edit stuff',
  },
  {
    name: 'viewer',
    label: 'Viewer',
    description: 'Can view stuff',
  },
];
