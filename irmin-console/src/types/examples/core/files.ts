import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { EditorItemsFile } from '@/types/core/EditorItems';

import exampleActionFiles from '../exampleActionFiles';

/**
 * Get example file objects for the EditorItems
 *
 * Array of {@link EditorItemsFile}
 */
export const files: () => EditorItemsFile[] = () => [
  {
    workspace: 'example-workspace',
    name: 'file1.js',
    path: '/folder1/file1.js',
    type: 'js',
    contents: 'console.log("Hello, world!");',
    is_draft: false,
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    workspace: 'example-workspace',
    name: 'file2.py',
    path: '/folder1/folder2/file2.py',
    type: 'py',
    contents: 'print("Hello, world!")',
    is_draft: true,
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    workspace: 'example-workspace',
    name: 'file3.sql',
    path: '/folder1/file3.sql',
    type: 'sql',
    contents: 'SELECT * FROM users;',
    is_draft: false,
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    workspace: 'example-workspace',
    name: 'fetch-app-data.js',
    path: '/fetch-app-data.js',
    type: 'js',
    contents: exampleActionFiles.fetchAppUsageData.trim(),
    is_draft: false,
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    workspace: 'example-workspace',
    name: 'send-receipt-on-order.js',
    path: '/send-receipt-on-order.js',
    type: 'js',
    contents: exampleActionFiles.sendReceiptOnOrder.trim(),
    is_draft: false,
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    workspace: 'example-workspace',
    name: 'find-top-100-ad-clicking-users.sql',
    path: '/find-top-100-ad-clicking-users.sql',
    type: 'sql',
    contents: exampleActionFiles.findTop100AdClickingUsers.trim(),
    is_draft: false,
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
