import { ConnectionWithAdditionalData } from '@/types/Connection';
import { User } from '@/types/UserProfile';
import { IrminRole, Workspace } from '@/types/Workspace';

export const offlineUser: User = {
  id: 0,
  name: 'Offline User',
  company: 'Offline Inc.',
  email: 'work.offline@finnair.com',
  email_verified_at: null,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

export const offlineWorkspace: Workspace = {
  id: 0,
  name: 'Offline workspace',
  slug: 'offline-workspace',
  owner_id: 0,
};

export const offlineRoles: IrminRole[] = [
  {
    id: 1,
    name: 'offline-role',
    label: 'Offline Role',
    description: 'Set to everyone if offline mode is enabled',
  },
];

export const offlineConnections: ConnectionWithAdditionalData[] = [
  {
    id: 0,
    name: 'Offline connection',
    logo: null,
    description: 'Set to everyone if offline mode is enabled',
    connector: 'PostgreSQL',
    nextSync: 'in 8 hours',
    nextSyncTimestamp: new Date(),
    status: 'error',
    parts: [
      'ad_units',
      'ad_units_performance',
      'ad_units_performance_by_country',
      'ad_units_performance_by_device',
      'ad_units_performance_by_ad_size',
    ],
  },
  {
    id: 1,
    name: 'Offline MySQL Connection',
    logo: null,
    description: 'Offline MySQL database for testing',
    connector: 'MySQL',
    nextSync: 'in 6 hours',
    nextSyncTimestamp: new Date(),
    status: 'running',
    parts: ['users', 'transactions', 'products', 'orders'],
  },
  {
    id: 2,
    name: 'Offline MongoDB Connection',
    logo: null,
    description: 'Offline MongoDB for data storage',
    connector: 'MongoDB',
    nextSync: 'in 10 hours',
    nextSyncTimestamp: new Date(),
    status: 'error',
    parts: ['sessions', 'logs', 'analytics', 'profiles'],
  },
  {
    id: 3,
    name: 'Offline Oracle Connection',
    logo: null,
    description: 'Offline Oracle database for backup',
    connector: 'Oracle',
    nextSync: 'in 12 hours',
    nextSyncTimestamp: new Date(),
    status: 'paused',
    parts: ['employees', 'salaries', 'departments', 'projects'],
  },
  {
    id: 4,
    name: 'Offline SQLite Connection',
    logo: null,
    description: 'Offline SQLite database for lightweight operations',
    connector: 'SQLite',
    nextSync: 'in 5 hours',
    nextSyncTimestamp: new Date(),
    status: 'running',
    parts: ['configurations', 'preferences', 'cache', 'metadata'],
  },
];
