import { Bucket, BucketFile, BucketFolder } from '@/types/api/Bucket';
import { Connector } from '@/types/api/Connector';
import { Dashboard } from '@/types/api/Dashboard';
import { DataRepo } from '@/types/api/DataRepo';
import { Invite } from '@/types/api/Invite';
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { IrminRole } from '@/types/api/IrminRole';
import { Profile } from '@/types/api/Profile';
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
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 1,
    name: 'Financial Overview',
    widgets: exampleWidgets,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 2,
    name: 'App Analytics',
    widgets: exampleWidgets,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 3,
    name: 'Ad Campaign Performance',
    widgets: exampleWidgets,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
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
    id: 3,
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
  email_verified_at: new Date().toDateString(),
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
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
    role: exampleRoles[2],
  },
  {
    id: 1,
    name: 'Sanna Marin',
    email: 'sanna@example.com',
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
    role: exampleRoles[1],
  },
  {
    id: 2,
    name: 'Juha Sipilä',
    email: 'juha@example.com',
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
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
];

/**
 * Example Data Repositories
 */
export const exampleDataRepos: DataRepo[] = [
  {
    id: 0,
    name: 'KPIs and Performance Metrics',
    slug: 'kpi-and-performance-metrics',
    description:
      'This is an example of a Data Repo that has been created manually.',
    documentation:
      '#Explain here what this data repo is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'excel-kpis.sales',
      'excel-management.inventory',
      'excel-kpis.expenses',
      'excel-kpis.profit_by_month',
      'excel-management.employees',
    ],
    owner: exampleWorkspaceUsers[0],
    workflow: null,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 1,
    name: 'Google Analytics, example.com',
    slug: 'google-analytics-example-com',
    description:
      'This is an example of a Data Repo that has been created by the Google Analytics Connection Workflow.',
    documentation:
      '#Explain here what this data repo is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'google-analytics-example-com.sessions',
      'google-analytics-example-com.users',
      'google-analytics-example-com.pageviews',
      'google-analytics-example-com.events',
    ],
    owner: exampleWorkspaceUsers[0],
    workflow: null,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 2,
    name: 'Mobile app usage and statistics',
    slug: 'mobile-app-usage-and-statistics',
    description:
      'This is an example of a Data Repo that has been created by an Action Workflow.',
    documentation:
      '#Explain here what this data repo is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'mobile-app-usage-and-statistics.users',
      'mobile-app-usage-and-statistics.downloads',
      'mobile-app-usage-and-statistics.sessions',
      'mobile-app-usage-and-statistics.purchase_events',
      'mobile-app-usage-and-statistics.ad_clicks',
      'mobile-app-usage-and-statistics.ad_impressions',
    ],
    owner: exampleWorkspaceUsers[1],
    workflow: null,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 3,
    name: 'Excel KPIs',
    slug: 'excel-kpis',
    description:
      'This is an example of a Data Repo that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this data repo is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'excel-kpis.sales',
      'excel-kpis.expenses',
      'excel-kpis.profit_by_month',
    ],
    owner: exampleWorkspaceUsers[2],
    workflow: null,
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 4,
    name: 'Excel management',
    slug: 'excel-management',
    description:
      'This is an example of a Data Repo that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this data repo is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: ['excel-management.inventory', 'excel-management.employees'],
    workflow: null,
    owner: exampleWorkspaceUsers[3],
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 5,
    name: 'Google Sheets KPIs',
    slug: 'google-sheets-kpis',
    description:
      'This is an example of a Data Repo that has been created by a Connection Workflow.',
    documentation:
      '#Explain here what this data repo is\n\n##Write internal data documentation here.\n\nHow was this repo created, where the data is from, how to update it, where the data from it is used etc...',
    tables: [
      'google-sheets-kpis.sales',
      'google-sheets-kpis.inventory',
      'google-sheets-kpis.expenses',
      'google-sheets-kpis.profit_by_month',
      'google-sheets-kpis.employees',
    ],
    workflow: null,
    owner: exampleWorkspaceUsers[0],
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
];

/** Example Google Sheets connection workflow */
const exampleGoogleSheetsConnection: ConnectionWorkflow = {
  id: 6,
  name: 'Google Sheets KPIs sync',
  owner: exampleWorkspaceUsers[0],
  description:
    'This an example connection workflow for syncing KPIs from Google Sheets',
  documentation:
    'This workflow is not scheduled and should be ran manually when needed. It is used as the destination for the export workflow example.',
  cron_syntax: null,
  next_run_at: null,
  status: 'paused',
  result: exampleDataRepos[6],
  workflowable_id: 0,
  workflowable_type: 'connection',
  workflowable: {
    details: "{googleApiKey:'pk-123123',username:'admin'}",
    settings: "{path:'/business/financials/KPIs.xlsx'}",
    connector: exampleConnectors[4],
  },
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};
/** Example Workflows */
export const exampleWorkflows: Workflow[] = [
  {
    id: 0,
    name: 'Main Google Analytics sync',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example connection workflow for syncing Google Analytics data to a Data Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: new Date().toDateString(),
    status: 'running',
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
    result: exampleDataRepos[1],
    workflowable_id: 0,
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
    owner: exampleWorkspaceUsers[1],
    description:
      'This an example export workflow for exporting a Data Repository to Google Sheets Connection.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: new Date().toDateString(),
    status: 'running',
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
    workflowable_id: 0,
    workflowable_type: 'export',
    workflowable: {
      destination: exampleGoogleSheetsConnection,
      source: exampleDataRepos[0],
    },
  },
  {
    id: 2,
    name: 'Fetch app usage data',
    owner: exampleWorkspaceUsers[2],
    description:
      'This an example of an action workflow for fetching app usage data and storing results in a Data Repo.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: new Date().toDateString(),
    status: 'running',
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
    result: exampleDataRepos[2],
    workflowable_id: 0,
    workflowable_type: 'action',
    workflowable: {
      path: '/fetch-app-usage-data.js',
    },
  },
  {
    id: 3,
    name: 'Send receipt on order',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example of an action workflow for sending receipts on orders. Results in no Data Repository.',
    documentation: '#Hello World!',
    cron_syntax: '2 * 0 0 0',
    next_run_at: new Date().toDateString(),
    status: 'running',
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
    workflowable_id: 0,
    workflowable_type: 'action',
    workflowable: {
      path: '/send-receipt-on-order.js',
    },
  },
  {
    id: 4,
    name: 'KPIs from Excel',
    owner: exampleWorkspaceUsers[0],
    description:
      'This an example connection workflow for syncing an Excel Sheet to a Data Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed.',
    cron_syntax: null,
    next_run_at: null,
    status: 'running',
    result: exampleDataRepos[4],
    workflowable_id: 0,
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'kpis.xlsx'}",
      settings: '{}',
      connector: exampleConnectors[6],
    },
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  {
    id: 5,
    name: 'Management data from Excel',
    owner: exampleWorkspaceUsers[3],
    description:
      'This an example connection workflow for syncing an Excel Sheet to a Data Repository.',
    documentation:
      'Manually imported Excel file with KPIs and performance metrics. This workflow is not scheduled and should be ran manually when needed. ',
    cron_syntax: '2 * 0 0 0',
    next_run_at: new Date().toDateString(),
    status: 'running',
    result: exampleDataRepos[5],
    workflowable_id: 0,
    workflowable_type: 'connection',
    workflowable: {
      details: "{file: 'management-and-hr.xlsx'}",
      settings: '{}',
      connector: exampleConnectors[6],
    },
    created_at: new Date().toDateString(),
    updated_at: new Date().toDateString(),
  },
  exampleGoogleSheetsConnection,
];

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

/** Assign Workflows to example Data Repositories */
exampleDataRepos[0].workflow = null;
exampleDataRepos[1].workflow = exampleWorkflows[0] as ConnectionWorkflow;
exampleDataRepos[2].workflow = exampleWorkflows[2] as ActionWorkflow;
exampleDataRepos[3].workflow = exampleWorkflows[4] as ConnectionWorkflow;
exampleDataRepos[4].workflow = exampleWorkflows[5] as ConnectionWorkflow;
exampleDataRepos[5].workflow = exampleWorkflows[6] as ConnectionWorkflow;

/** Base properties to fake Workflow Runs for every Workflow with */
const fakeRuns: Array<{
  status: string;
  started_at: string;
  finished_at?: string;
}> = [
  {
    status: 'running',
    started_at: new Date().toISOString(),
  },
  {
    status: 'complete',
    started_at: new Date(new Date().getTime() - 3600 * 1000).toISOString(), // 1 hour ago
    finished_at: new Date(new Date().getTime() - 1800 * 1000).toISOString(), // 30 minutes ago
  },
  {
    status: 'error',
    started_at: new Date(new Date().getTime() - 7200 * 1000).toISOString(), // 2 hours ago
    finished_at: new Date(new Date().getTime() - 7100 * 1000).toISOString(), // 1 hour 59 minutes ago
  },
  {
    status: 'pending',
    started_at: new Date().toISOString(),
  },
  {
    status: 'paused',
    started_at: new Date(new Date().getTime() - 86400 * 1000).toISOString(), // 1 day ago
  },
  {
    status: 'initiating',
    started_at: new Date().toISOString(),
  },
  {
    status: 'complete',
    started_at: new Date(new Date().getTime() - 2 * 86400 * 1000).toISOString(), // 2 days ago
    finished_at: new Date(
      new Date().getTime() - 1.5 * 86400 * 1000
    ).toISOString(), // 1.5 days ago
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
