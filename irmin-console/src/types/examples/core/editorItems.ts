import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { EditorItem } from '@/types/core/EditorItems';

import exampleActionFiles from '../exampleActionFiles';

/**
 * Get example Workspace EditorItems object
 *
 * Type: {@link EditorItems}
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
