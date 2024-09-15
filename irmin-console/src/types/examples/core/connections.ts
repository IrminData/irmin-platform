import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Connection } from '@/types/api/Connection';

import { connectors } from './connectors';
import { workspaceUsers } from './users';

/**
 * Get example Connections
 *
 * Array of {@link Connection}
 */
export const connections = (): Connection[] => [
  {
    id: 0,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    owner: workspaceUsers()[0],
    description: 'This an example Connection to Google Analytics.',
    documentation: '# Hello World! \n This is a test documentation.',
    details: JSON.stringify({
      googleApiKey: 'pk-13123123',
      username: 'admin',
    }),
    settings: JSON.stringify({ views: 'sessions,users,pageviews,events' }),
    connector: connectors().find((c) => c.name === 'Google Analytics')!,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'KPIs spreadsheet',
    slug: 'kpis-spreadsheet',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to an Excel spreadheet with KPIs.',
    documentation:
      '# Excel connection explanation... \n Manually imported Excel file with KPIs and performance metrics.',
    details: JSON.stringify({ file: 'kpis.xlsx' }),
    settings: '{}',
    connector: connectors().find((c) => c.name === 'Excel')!,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'HR spreadsheet',
    slug: 'hr-spreadsheet',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to an Excel spreadheet with HR and management info.',
    documentation:
      '# Excel connection explanation... \n Manually imported Excel file with HR information.',
    details: JSON.stringify({ file: 'management-and-hr.xlsx' }),
    settings: '{}',
    connector: connectors().find((c) => c.name === 'Excel')!,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to an Google Sheets with KPIs.',
    documentation: '# Google Sheets connection explanation... ',
    details: JSON.stringify({ googleApiKey: 'pk-123123', username: 'admin' }),
    settings: JSON.stringify({ path: '/business/financials/KPIs.xlsx' }),
    connector: connectors().find((c) => c.name === 'Google Sheets')!,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 4,
    name: 'App database production',
    slug: 'app-database-production',
    owner: workspaceUsers()[0],
    description:
      'This an example Connection for syncing to a production PostgreSQL database.',
    documentation: '# PostgreSQL connection explanation... ',
    details: JSON.stringify({
      host: '123.123.123.123',
      port: 5432,
      user: 'example',
      password: 'hello-world',
      database: 'app',
    }),
    settings: '{}',
    connector: connectors().find((c) => c.name === 'PostgreSQL')!,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
