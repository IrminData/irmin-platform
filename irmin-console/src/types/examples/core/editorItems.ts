import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { EditorItem, ScriptResult } from '@/types/core/EditorItems';

import exampleActionFiles from '../exampleActionFiles';

/**
 * Get example Workspace EditorItems object
 *
 * Type: Array of {@link EditorItem}
 */
export const editorItems: () => EditorItem[] = () => [
  {
    name: 'test.go',
    path: '/test.go',
    type: 'file',
    content:
      'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n}',
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'test.js',
    path: '/test.js',
    type: 'file',
    content: 'console.log("Hello, world!");',
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'test.py',
    path: '/test.py',
    type: 'file',
    content: 'print("Hello, world!")',
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'test.sql',
    path: '/test.sql',
    type: 'file',
    content: 'SELECT * FROM users;',
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'findTop100AdClickingUsers.sql',
    path: '/findTop100AdClickingUsers.sql',
    type: 'file',
    content: exampleActionFiles.findTop100AdClickingUsers,
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'sendReceiptOnOrder.js',
    path: '/sendReceiptOnOrder.js',
    type: 'file',
    content: exampleActionFiles.sendReceiptOnOrder,
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'fetchAppUsageData.js',
    path: '/fetchAppUsageData.js',
    type: 'file',
    content: exampleActionFiles.fetchAppUsageData,
    last_modified: getRandomDateTimeString(10, 'past', 2),
  },
  {
    name: 'examples',
    path: '/examples',
    type: 'folder',
    last_modified: getRandomDateTimeString(10, 'past', 2),
    children: [
      {
        name: 'file1.js',
        path: '/examples/file1.js',
        type: 'file',
        content: 'console.log("Hello, world!");',
        last_modified: getRandomDateTimeString(10, 'past', 2),
      },
      {
        name: 'file2.js',
        path: '/examples/file2.js',
        type: 'file',
        content: 'console.log("Hello, world!");',
        last_modified: getRandomDateTimeString(10, 'past', 2),
      },
    ],
  },
];

const exampleScriptResult: ScriptResult = {
  structured_results: {
    'cities.json': [
      {
        store_id: 'store_1',
        city: 'New York',
        country: 'USA',
        annual_revenue: 500000,
        annual_cost: 600000,
      },
      {
        store_id: 'store_2',
        city: 'Los Angeles',
        country: 'USA',
        annual_revenue: 300000,
        annual_cost: 400000,
      },
    ],
    'users.json': [
      {
        user_id: 'user_1',
        name: 'John Doe',
      },
      {
        user_id: 'user_2',
        name: 'Jane Smith',
      },
    ],
    'orders.json': [
      {
        order_id: 'order_1',
        user_id: 'user_1',
        store_id: 'store_1',
        amount: 100,
      },
      {
        order_id: 'order_2',
        user_id: 'user_2',
        store_id: 'store_2',
        amount: 200,
      },
    ],
  },
  has_errors: false,
  duration: 120,
  started_at: '2023-10-01T12:00:00Z',
  finished_at: '2023-10-01T12:00:02Z',
  logs: ['Query executed successfully', 'Rows returned: 2'],
};

const exampleScriptResultWithErrors: ScriptResult = {
  has_errors: true,
  duration: 150,
  started_at: '2023-10-01T12:00:00Z',
  finished_at: '2023-10-01T12:00:02Z',
  logs: [
    'Query execution failed',
    'Error: Invalid SQL syntax near "WHERE annual_cost > annual_revenue"',
  ],
};

export const scriptResult = (): ScriptResult => {
  const random = Math.random();

  if (random < 0.5) {
    return exampleScriptResult;
  } else {
    return exampleScriptResultWithErrors;
  }
};
