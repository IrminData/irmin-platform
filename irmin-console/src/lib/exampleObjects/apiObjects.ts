import { Bucket, BucketFile, BucketFolder } from '@/types/api/Bucket';
import { Connector } from '@/types/api/Connector';
import { Dashboard } from '@/types/api/Dashboard';
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
} from '@/types/api/Workflow';
import { Workspace, WorkspaceUser } from '@/types/api/Workspace';

// IrminAPIResponse types

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

// Dashbaord types

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

export const exampleDashboard: Dashboard = {
  id: 0,
  name: 'Test',
  widgets: exampleWidgets,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

// Bucket types

export const exampleFolder: BucketFolder = {
  id: 0,
  name: 'test',
  parent_id: null,
  bucket_id: 0,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

export const exampleFileSQL: BucketFile = {
  id: 0,
  name: 'sales_today.sql',
  path: '/sales_today.sql',
  type: 'sql',
  content: `SELECT * FROM sales WHERE date = CURRENT_DATE;`,
  parent_id: null,
  bucket_id: 0,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

export const exampleFileJS: BucketFile = {
  id: 1,
  name: 'helloworld.js',
  path: '/test/helloworld.js',
  type: 'js',
  content: `console.log("Hello World!");`,
  parent_id: 0,
  bucket_id: 0,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

export const exampleBucket: Bucket = {
  id: 0,
  folders: [exampleFileSQL],
  files: [exampleFileSQL, exampleFileJS],
};

// IrminRole types

export const exampleRole: IrminRole = {
  name: 'admin',
  label: 'Admin',
  description: 'Can do everything',
};

// Profile types

export const exampleProfile: Profile = {
  id: 0,
  name: 'example User',
  company: 'example Inc.',
  email: 'work.example@finnair.com',
  email_verified_at: null,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

// Invite types

export const exampleInvite: Invite = {
  id: 0,
  name: 'Invited User',
  email: 'invited.user@google.com',
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
  role: exampleRole,
};

// Workspace types

export const exampleWorkspace: Workspace = {
  id: 0,
  name: 'example workspace',
  slug: 'example-workspace',
  owner_id: 0,
};

export const exampleWorkspaceUser: WorkspaceUser = {
  id: 0,
  name: 'Mr. Workspace User',
  company: 'Company Inc.',
  email: 'workspace.user@company.co',
  email_verified_at: null,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
  roles: [exampleRole],
};

// Connector types

export const exampleConnector: Connector = {
  id: 0,
  name: 'example connector',
  logo: '/logo.svg',
  description: 'Used for playing around example or filling missing API data',
};

// Dataset types

export const exampleDataset = {
  id: 0,
  name: 'example dataset',
  slug: 'example-data-set',
  description:
    'This an example dataset. It is used to work on planes or to fill up missing API data.',
  documentation: '#Irmin is awesome',
  tables: [],
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

// Workflow types

export const exampleWorkflow: Workflow = {
  id: 0,
  workflowable_id: 0,
  cron_syntax: '0 * 0 0 0',
  status: 'running',
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
  name: 'example workflow',
  description:
    'This an example workflow. It is used to work on planes or to fill up missing API data.',
  documentation: '#Hello World!',
  result: exampleDataset,
  workflowable_type: 'action',
  workflowable: {
    path: '',
  },
};

export const exampleConnection: ConnectionWorkflow = {
  ...exampleWorkflow,
  workflowable_type: 'connection',
  workflowable: {
    details: "{password:'123',username:'admin'}",
    settings: "{category:'movies'}",
    connector: exampleConnector,
  },
};

export const exampleExport: ExportWorkflow = {
  ...exampleWorkflow,
  workflowable_type: 'export',
  workflowable: {
    destination: exampleConnection.workflowable,
    source: exampleDataset,
  },
};

export const exampleAction: ActionWorkflow = {
  ...exampleWorkflow,
  workflowable_type: 'action',
  workflowable: {
    path: '/files/sample.sql',
  },
};
