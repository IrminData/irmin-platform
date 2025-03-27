import { Connection } from '@/types/core/Connection';

import { connectors } from './connectors';
import { workspaceUsers } from './users';

/**
 * Get example Connections
 *
 * Array of {@link Connection}
 */
export const connections = (): Connection[] => [
  {
    id: 'connection-0',
    name: 'Main Google Analytics',
    owner: workspaceUsers()[0],
    description: 'This an example Connection to Google Analytics.',
    documentation: '# Hello World! \n This is a test documentation.',
    details: {
      googleApiKey: 'pk-13123123',
      username: 'admin',
    },
    settings: { views: 'sessions,users,pageviews,events' },
    connector: connectors().find((c) => c.name === 'Google Analytics')!,
  },
  {
    id: 'connection-1',
    name: 'KPIs spreadsheet',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to an Excel spreadheet with KPIs.',
    documentation:
      '# Excel connection explanation... \n Manually imported Excel file with KPIs and performance metrics.',
    details: { file: 'kpis.xlsx' },
    settings: {},
    connector: connectors().find((c) => c.name === 'Excel')!,
  },
  {
    id: 'connection-2',
    name: 'HR spreadsheet',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to an Excel spreadheet with HR and management info.',
    documentation:
      '# Excel connection explanation... \n Manually imported Excel file with HR information.',
    details: { file: 'management-and-hr.xlsx' },
    settings: {},
    connector: connectors().find((c) => c.name === 'Excel')!,
  },
  {
    id: 'connection-3',
    name: 'Google Sheets KPIs',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to an Google Sheets with KPIs.',
    documentation: '# Google Sheets connection explanation... ',
    details: { googleApiKey: 'pk-123123', username: 'admin' },
    settings: { path: '/business/financials/KPIs.xlsx' },
    connector: connectors().find((c) => c.name === 'Google Sheets')!,
  },
  {
    id: 'connection-4',
    name: 'App database production',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to a production PostgreSQL database.',
    documentation: '# PostgreSQL connection explanation... ',
    details: {
      host: '123.123.123.123',
      port: '5432',
      user: 'example',
      password: 'hello-world',
      database: 'app',
    },
    settings: {},
    connector: connectors().find((c) => c.name === 'PostgreSQL')!,
  },
];
