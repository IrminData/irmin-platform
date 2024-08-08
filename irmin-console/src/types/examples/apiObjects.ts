import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Bucket, BucketFile, BucketFolder } from '@/types/api/Bucket';
import { Connector } from '@/types/api/Connector';
import { Dashboard } from '@/types/api/Dashboard';
import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole } from '@/types/api/IrminRole';
import { Profile } from '@/types/api/Profile';
import { Repository } from '@/types/api/Repository';
import { Widget } from '@/types/api/Widget';
import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
  WorkflowRun,
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';
import exampleActionFiles from '@/types/examples/exampleActionFiles';

/**
 * Example API response base for Irmin API
 */
export const exampleAPIResponse: IrminAPIResponse = {
  metadata: {
    allGood: 'yes',
  },
  message: 'This is example for IrminAPIResponse',
  errors: {
    everythingIsBroken: [
      'You are seeing an example response, instead of the real thing',
    ],
  },
};

/**
 * Example widgets for the dashboard
 */
export const exampleWidgets: Widget[] = [
  {
    id: 0,
    dashboard: 0,
    type: 'metric',
    title: 'Total Sales',
    data: {
      currentValue: 1000,
      label: '2024 Sales in USD',
    },
  },
  {
    id: 1,
    dashboard: 0,
    type: 'line',
    title: 'Monthly Sales 1',
    data: {
      labels: ['January', 'February', 'March', 'April'],
      datasets: [
        {
          label: 'Sales',
          data: [65, 59, 80, 81],
          backgroundColor: '#aec3b0',
          borderColor: '#aec3b0',
        },
      ],
    },
  },
  {
    id: 2,
    dashboard: 0,
    type: 'bar',
    title: 'Monthly Sales 2',
    data: {
      labels: ['January', 'February', 'March', 'April'],
      datasets: [
        {
          label: 'Sales',
          data: [65, 59, 80, 81],
          backgroundColor: '#aec3b0',
          borderColor: '#aec3b0',
        },
      ],
    },
  },
  {
    id: 5,
    dashboard: 0,
    type: 'table',
    title: 'Monthly Sales 5',
    data: {
      labels: ['January', 'February', 'March', 'April'],
      datasets: [
        {
          label: 'Sales',
          data: [65, 59, 80, 81],
        },
        {
          label: 'Expenses',
          data: [28, 48, 40, 19],
        },
        {
          label: 'Profit',
          data: [38, 38, 30, 40],
        },
        {
          label: 'Investments',
          data: [10, 20, 10, 20],
        },
      ],
    },
  },
];

/**
 * Example dashboards
 */
export const exampleDashboards: Dashboard[] = [
  {
    id: 0,
    name: 'Main Dashboard',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Financial Overview',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'App Analytics',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Ad Campaign Performance',
    widgets: exampleWidgets,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];

/**
 * Example BucketFolder objects
 */
export const exampleFolders: BucketFolder[] = [
  {
    bucket: 'example-bucket',
    name: 'folder1',
    path: '/folder1',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  },
  {
    bucket: 'example-bucket',
    name: 'folder2',
    path: '/folder1/folder2',
    created_at: '2024-01-02T12:00:00Z',
    updated_at: '2024-01-02T12:00:00Z',
  },
];

/**
 * Example BucketFile objects
 */
export const exampleFiles: BucketFile[] = [
  {
    bucket: 'example-bucket',
    name: 'file1.js',
    path: '/folder1/file1.js',
    type: 'js',
    contents: 'console.log("Hello, world!");',
    is_draft: false,
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  },
  {
    bucket: 'example-bucket',
    name: 'file2.py',
    path: '/folder1/folder2/file2.py',
    type: 'py',
    contents: 'print("Hello, world!")',
    is_draft: true,
    created_at: '2024-01-02T12:00:00Z',
    updated_at: '2024-01-02T12:00:00Z',
  },
  {
    bucket: 'example-bucket',
    name: 'file3.sql',
    path: '/folder1/file3.sql',
    type: 'sql',
    contents: 'SELECT * FROM users;',
    is_draft: false,
    created_at: '2024-01-03T12:00:00Z',
    updated_at: '2024-01-03T12:00:00Z',
  },
  {
    bucket: 'example-bucket',
    name: 'fetch-app-usage-data.js',
    path: '/fetch-app-usage-data.js',
    type: 'js',
    contents: exampleActionFiles.fetchAppUsageData,
    is_draft: false,
    created_at: '2024-01-03T12:00:00Z',
    updated_at: '2024-01-03T12:00:00Z',
  },
  {
    bucket: 'example-bucket',
    name: 'send-receipt-on-order.js',
    path: '/send-receipt-on-order.js',
    type: 'js',
    contents: exampleActionFiles.sendReceiptOnOrder,
    is_draft: false,
    created_at: '2024-01-03T12:00:00Z',
    updated_at: '2024-01-03T12:00:00Z',
  },
];

/**
 * Example Workspace Bucket object
 */
export const exampleBucket: Bucket = {
  slug: 'example-bucket',
  folders: exampleFolders,
  files: exampleFiles,
};

/**
 * Example roles
 */
export const exampleRoles: IrminRole[] = [
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

/**
 * Example workspaces
 */
export const exampleWorkspaces: Workspace[] = [
  {
    id: 0,
    name: 'Example Core',
    slug: 'example-core',
    description:
      'Main workspace for Example company. Financials, HR, other admin stuff',
    owner_id: 0,
  },
  {
    id: 1,
    name: 'Example Finland',
    slug: 'example-finland',
    description: 'The Finnish branch of Example company. Sales and marketing',
    owner_id: 0,
  },
  {
    id: 2,
    name: 'Example Sweden',
    slug: 'example-sweden',
    description: 'The Swedish branch of Example company. Sales and marketing',
    owner_id: 0,
  },
  {
    id: 3,
    name: 'Example Norway',
    slug: 'example-norway',
    description: 'The Norwegian branch of Example company. Sales and marketing',
    owner_id: 0,
  },
  {
    id: 4,
    name: 'Example App',
    slug: 'example-app',
    description:
      'Workspace for the Example App. Usage data, user data, and other app-related data',
    owner_id: 0,
  },
];

/**
 * Example user profile
 */
export const exampleProfile: Profile = {
  id: 0,
  name: 'Joe Biden',
  company: 'Example Inc.',
  email: 'joe.biden@example.com',
  profile_picture: '/ui-assets/elements/avatar.webp',
  email_verified_at: getRandomDateTimeString(500, 'past', 100),
  workspace: exampleWorkspaces[0],
  roles: [exampleRoles[0]],
  api_token: 'offline',
};

/**
 * Example invites
 */
export const exampleInvites: Invite[] = [
  {
    id: 0,
    name: 'Petteri Orpo',
    email: 'petteri@example.com',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    role: exampleRoles[2],
  },
  {
    id: 1,
    name: 'Sanna Marin',
    email: 'sanna@example.com',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    role: exampleRoles[1],
  },
  {
    id: 2,
    name: 'Juha Sipilä',
    email: 'juha@example.com',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    role: exampleRoles[4],
  },
];

/**
 * Example workspace users
 */
export const exampleWorkspaceUsers: WorkspaceUser[] = [
  exampleProfile,
  {
    id: 1,
    name: 'John Doe',
    company: 'Apple Inc.',
    email: 'john.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [exampleRoles[1]],
  },
  {
    id: 2,
    name: 'Jane Doe',
    company: 'Google Inc.',
    email: 'jane.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [exampleRoles[2]],
  },
  {
    id: 3,
    name: 'Jack Doe',
    company: 'Microsoft Inc.',
    email: 'jack.doe@example.com',
    profile_picture: '/ui-assets/elements/avatar.webp',
    email_verified_at: null,
    roles: [exampleRoles[3]],
  },
];

/**
 * Example connectors
 */
export const exampleConnectors: Connector[] = [
  {
    id: 0,
    name: 'PostgreSQL',
    logo: '/logo.svg',
    description: 'Sync data to and from PostgreSQL databases',
  },
  {
    id: 1,
    name: 'MySQL',
    logo: '/logo.svg',
    description: 'Sync data to and from MySQL databases',
  },
  {
    id: 2,
    name: 'MongoDB',
    logo: '/logo.svg',
    description: 'Sync data to and from MongoDB databases',
  },
  {
    id: 3,
    name: 'Google Sheets',
    logo: '/logo.svg',
    description: 'Sync data to and from Google Sheets',
  },
  {
    id: 4,
    name: 'Google Analytics',
    logo: '/logo.svg',
    description: 'Sync data from Google Analytics',
  },
  {
    id: 5,
    name: 'Excel',
    logo: '/logo.svg',
    description: 'Upload a local Excel file to Irmin',
  },
  {
    id: 6,
    name: 'Google Analytics',
    logo: '/logo.svg',
    description: 'Sync data from Google Analytics',
  },
  {
    id: 7,
    name: 'Pipedrive',
    logo: '/logo.svg',
    description: 'Sync data to and from Pipedrive CRM',
  },
  {
    id: 8,
    name: 'HubSpot',
    logo: '/logo.svg',
    description: 'Sync data to and from HubSpot CRM',
  },
  {
    id: 9,
    name: 'Microsoft Dynamics',
    logo: '/logo.svg',
    description: 'Sync data to and from Microsoft Dynamics CRM',
  },
  {
    id: 10,
    name: 'Salesforce',
    logo: '/logo.svg',
    description: 'Sync data to and from Salesforce CRM',
  },
  {
    id: 11,
    name: 'Shopify',
    logo: '/logo.svg',
    description: 'Sync data to and from Shopify',
  },
  {
    id: 12,
    name: 'Stripe',
    logo: '/logo.svg',
    description: 'Sync data to and from Stripe',
  },
  {
    id: 13,
    name: 'Mailchimp',
    logo: '/logo.svg',
    description: 'Sync data to and from Mailchimp',
  },
  {
    id: 14,
    name: 'SendGrid',
    logo: '/logo.svg',
    description: 'Sync data to and from SendGrid',
  },
];

/**
 * Example Repositories
 */
export const exampleRepositories: Repository[] = [
  {
    id: 0,
    name: 'KPIs and Performance Metrics',
    slug: 'kpi-and-performance-metrics',
    description:
      'This is an example of a Repository that has been created manually.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'excel-kpis.sales',
      'excel-management.inventory',
      'excel-kpis.expenses',
      'excel-kpis.profit_by_month',
      'excel-management.employees',
    ],
    owner: exampleWorkspaceUsers[0],
    workflow: null,
    immutable: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 1,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    description:
      'This is an example of a Repository that has been created by the Google Analytics Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'main-google-analytics.sessions',
      'main-google-analytics.users',
      'main-google-analytics.pageviews',
      'main-google-analytics.events',
    ],
    owner: exampleWorkspaceUsers[0],
    workflow: null,
    immutable: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 2,
    name: 'App usage data',
    slug: 'app-usage-data',
    description:
      'This is an example of a Repository that has been created by an Action Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'app-usage-data.users',
      'app-usage-data.downloads',
      'app-usage-data.sessions',
      'app-usage-data.purchase_events',
      'app-usage-data.ad_clicks',
      'app-usage-data.ad_impressions',
    ],
    owner: exampleWorkspaceUsers[1],
    workflow: null,
    immutable: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 3,
    name: 'Excel KPIs',
    slug: 'excel-kpis',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'excel-kpis.sales',
      'excel-kpis.expenses',
      'excel-kpis.profit_by_month',
    ],
    owner: exampleWorkspaceUsers[2],
    workflow: null,
    immutable: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 4,
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'management-data-from-excel.inventory',
      'management-data-from-excel.employees',
    ],
    workflow: null,
    immutable: true,
    owner: exampleWorkspaceUsers[3],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    description:
      'This is an example of a Repository that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this repository is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'google-sheets-kpis.sales',
      'google-sheets-kpis.inventory',
      'google-sheets-kpis.expenses',
      'google-sheets-kpis.profit_by_month',
      'google-sheets-kpis.employees',
    ],
    workflow: null,
    immutable: true,
    owner: exampleWorkspaceUsers[0],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 6,
    name: 'Export KPIs to Google Sheets',
    slug: 'export-kpis-to-google-sheets',
    description: '',
    documentation: '',
    tables: [],
    workflow: null,
    immutable: true,
    owner: exampleWorkspaceUsers[1],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 7,
    name: 'Send receipt on order',
    slug: 'send-receipt-on-order',
    description: '',
    documentation: '',
    tables: [],
    workflow: null,
    immutable: true,
    owner: exampleWorkspaceUsers[2],
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];

/** Example Workflows, don't cast to a type just yet. */
export const exampleWorkflows: Workflow[] = [
  {
    id: 0,
    name: 'Main Google Analytics',
    slug: 'main-google-analytics',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example Connection Workflow for syncing Google Analytics data to a Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[1],
    workflowable_type: 'connection',
    workflowable: {
      details: "{googleApiKey:'pk-13123123',username:'admin'}",
      settings: "{views:'sessions,users,pageviews,events'}",
      connector: exampleConnectors[5],
    },
  },
  {
    id: 1,
    name: 'Export KPIs to Google Sheets',
    slug: 'export-kpis-to-google-sheets',
    owner: exampleWorkspaceUsers[1],
    description:
      'This an example Export Workflow for exporting a Repository to Google Sheets Connection.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[6],
    workflowable_type: 'export',
    workflowable: {
      destination: {} as ConnectionWorkflow, // This is assigned later
      source: exampleRepositories[0],
    },
  },
  {
    id: 2,
    name: 'App usage data',
    slug: 'app-usage-data',
    owner: exampleWorkspaceUsers[2],
    description:
      'This an example of an Action Workflow for fetching app usage data and storing results in a Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    last_run_at: getRandomDateTimeString(2, 'past', 0),
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[2],
    workflowable_type: 'action',
    workflowable: {
      path: '/fetch-app-usage-data.js',
    },
  },
  {
    id: 3,
    name: 'Send receipt on order',
    slug: 'send-receipt-on-order',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example of an Action Workflow for sending receipts on orders. Results in no Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'error',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
    repository: exampleRepositories[7],
    workflowable_type: 'action',
    workflowable: {
      path: '/send-receipt-on-order.js',
    },
  },
  {
    id: 4,
    name: 'KPIs from Excel',
    slug: 'kpis-from-excel',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example Connection Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
    cron_syntax: null,
    last_run_at: getRandomDateTimeString(40, 'past', 10),
    next_run_at: null,
    status: 'running',
    repository: exampleRepositories[4],
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'kpis.xlsx'}",
      settings: '{}',
      connector: exampleConnectors[6],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 5,
    name: 'Management data from Excel',
    slug: 'management-data-from-excel',
    owner: exampleWorkspaceUsers[3],
    description:
      'This an example Connection Workflow for syncing an Excel Sheet to a Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
    cron_syntax: '2 * 0 0 0',
    next_run_at: getRandomDateTimeString(2, 'future', 0),
    status: 'running',
    repository: exampleRepositories[4],
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'management-and-hr.xlsx'}",
      settings: '{}',
      connector: exampleConnectors[6],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    id: 6,
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example Connection Workflow for syncing KPIs from Google Sheets',
    documentation:
      'This workflow is not scheduled and should be ran manually when needed. It is used as the destination for the Export Workflow example.',
    cron_syntax: null,
    last_run_at: getRandomDateTimeString(10, 'past', 2),
    next_run_at: null,
    status: 'paused',
    repository: exampleRepositories[5],
    workflowable_type: 'connection',
    workflowable: {
      details: "{googleApiKey:'pk-123123',username:'admin'}",
      settings: "{path:'/business/financials/KPIs.xlsx'}",
      connector: exampleConnectors[4],
    },
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
(exampleWorkflows[1] as ExportWorkflow).workflowable.destination =
  exampleWorkflows[6] as ConnectionWorkflow; // Assign destination to Export Workflow, handled here due to circular dependency

/** Example Connection Workflow */
export const exampleConnections = [
  exampleWorkflows[0],
  exampleWorkflows[4],
  exampleWorkflows[5],
  exampleWorkflows[6],
] as ConnectionWorkflow[];

/** Example Export Workflow */
export const exampleExports = [exampleWorkflows[1]] as ExportWorkflow[];

/** Example Action Workflow */
export const exampleActions = [
  exampleWorkflows[2],
  exampleWorkflows[3],
] as ActionWorkflow[];

/** Assign Repositories to example Workflows */
exampleRepositories[0].workflow = null;
exampleRepositories[1].workflow = exampleWorkflows[0] as ConnectionWorkflow;
exampleRepositories[2].workflow = exampleWorkflows[2] as ActionWorkflow;
exampleRepositories[3].workflow = exampleWorkflows[4] as ConnectionWorkflow;
exampleRepositories[4].workflow = exampleWorkflows[5] as ConnectionWorkflow;
exampleRepositories[5].workflow = exampleWorkflows[6] as ConnectionWorkflow;

/** Base properties to fake Workflow Runs for every Workflow with */
const fakeRuns: Array<{
  status: string;
  started_at: string;
  finished_at?: string;
}> = [
  {
    status: 'running',
    started_at: getRandomDateTimeString(2, 'past', 0),
  },
  {
    status: 'complete',
    started_at: getRandomDateTimeString(2, 'past', 0),
    finished_at: getRandomDateTimeString(1, 'past', 0),
  },
  {
    status: 'error',
    started_at: getRandomDateTimeString(2, 'past', 0),
    finished_at: getRandomDateTimeString(1, 'past', 0),
  },
  {
    status: 'pending',
    started_at: getRandomDateTimeString(2, 'past', 0),
  },
  {
    status: 'paused',
    started_at: getRandomDateTimeString(2, 'past', 0),
  },
  {
    status: 'initiating',
    started_at: getRandomDateTimeString(1, 'past', 0),
  },
  {
    status: 'complete',
    started_at: getRandomDateTimeString(2, 'past', 1),
    finished_at: getRandomDateTimeString(1, 'past', 0),
  },
];

/** Example Workflow Runs */
export const exampleWorkflowRuns: WorkflowRun[] = exampleWorkflows.flatMap(
  (workflow, workflowIdx) =>
    fakeRuns.map((run, runIdx) => {
      const baseRun = {
        id: workflowIdx * fakeRuns.length + runIdx, // Fake unique ID
        workflow_id: workflow.id,
        owner: workflow.owner,
        status: run.status,
        started_at: run.started_at,
      };

      if (run.finished_at) {
        return { ...baseRun, finished_at: run.finished_at } as WorkflowRun;
      }

      return baseRun as WorkflowRun;
    })
);
