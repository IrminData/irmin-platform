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
 * Example dashboard
 */
export const exampleDashboard: Dashboard = {
  id: 1,
  name: 'Test',
  widgets: exampleWidgets,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

/**
 * Example BucketFolder object
 */
export const exampleFolder1: BucketFolder = {
  bucket: 'example-bucket',
  name: 'folder1',
  path: '/folder1',
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
};

/**
 * Example BucketFolder object
 */
export const exampleFolder2: BucketFolder = {
  bucket: 'example-bucket',
  name: 'folder2',
  path: '/folder1/folder2',
  created_at: '2024-01-02T12:00:00Z',
  updated_at: '2024-01-02T12:00:00Z',
};

/**
 * Example BucketFile object
 */
export const exampleFile1: BucketFile = {
  bucket: 'example-bucket',
  name: 'file1.js',
  path: '/folder1/file1.js',
  type: 'js',
  contents: 'console.log("Hello, world!");',
  is_draft: false,
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
};

/**
 * Example BucketFile object
 */
export const exampleFile2: BucketFile = {
  bucket: 'example-bucket',
  name: 'file2.py',
  path: '/folder1/folder2/file2.py',
  type: 'py',
  contents: 'print("Hello, world!")',
  is_draft: true,
  created_at: '2024-01-02T12:00:00Z',
  updated_at: '2024-01-02T12:00:00Z',
};

/**
 * Example BucketFile object
 */
export const exampleFile3: BucketFile = {
  bucket: 'example-bucket',
  name: 'file3.sql',
  path: '/file3.sql',
  type: 'sql',
  contents: 'SELECT * FROM users;',
  is_draft: false,
  created_at: '2024-01-03T12:00:00Z',
  updated_at: '2024-01-03T12:00:00Z',
};

/**
 * Example Bucket object
 */
export const exampleBucket: Bucket = {
  slug: 'example-bucket',
  folders: [exampleFolder1, exampleFolder2],
  files: [exampleFile1, exampleFile2],
};

/**
 * Example role
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
 * Example user profile
 */
export const exampleProfile: Profile = {
  id: 0,
  name: 'John Doe',
  company: 'Example Inc.',
  email: 'john.doe@example.com',
  email_verified_at: null,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

/**
 * Example invite
 */
export const exampleInvite: Invite = {
  id: 0,
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
  role: exampleRoles[2],
};

/**
 * Example workspace
 */
export const exampleWorkspace: Workspace = {
  id: 0,
  name: 'Example workspace',
  slug: 'example-workspace',
  description: 'This is an example workspace',
  owner_id: 0,
};

/**
 * Example workspace user
 */
export const exampleWorkspaceUser: WorkspaceUser = {
  id: 0,
  name: 'Mr. Workspace User',
  company: 'Company Inc.',
  email: 'workspace.user@company.co',
  email_verified_at: null,
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
  roles: exampleRoles,
};

/**
 * Example connector
 */
export const exampleConnector: Connector = {
  id: 0,
  name: 'example connector',
  logo: '/logo.svg',
  description: 'Used for playing around example or filling missing API data',
};

/**
 * Example dataRepo
 */
export const exampleDataset = {
  id: 0,
  name: 'example dataRepo',
  slug: 'example-data-set',
  description:
    'This an example dataRepo. It is used to work on planes or to fill up missing API data.',
  documentation: '# Irmin is awesome',
  tables: ['users', 'sales', 'products'],
  created_at: new Date().toDateString(),
  updated_at: new Date().toDateString(),
};

/**
 * Example workflow
 */
export const exampleWorkflow: Workflow = {
  id: 0,
  workflowable_id: 0,
  cron_syntax: '0 * 0 0 0',
  next_run_at: new Date().toDateString(),
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

/**
 * Example connection workflow
 */
export const exampleConnection: ConnectionWorkflow = {
  ...exampleWorkflow,
  workflowable_type: 'connection',
  workflowable: {
    details: "{password:'123',username:'admin'}",
    settings: "{category:'movies'}",
    connector: exampleConnector,
  },
};

/**
 * Example export workflow
 */
export const exampleExport: ExportWorkflow = {
  ...exampleWorkflow,
  workflowable_type: 'export',
  workflowable: {
    destination: exampleConnection.workflowable,
    source: exampleDataset,
  },
};

/**
 * Example action workflow
 */
export const exampleAction: ActionWorkflow = {
  ...exampleWorkflow,
  workflowable_type: 'action',
  workflowable: {
    path: '/files/sample.sql',
  },
};
