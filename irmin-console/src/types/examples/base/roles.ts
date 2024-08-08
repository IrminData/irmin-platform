import { IrminRole } from '@/types/api/IrminRole';

/**
 * Example roles
 *
 * Array of {@link IrminRole}
 */
export const roles: IrminRole[] = [
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
  {
    name: 'billing',
    label: 'Billing',
    description: 'Can do billing stuff',
  },
];
