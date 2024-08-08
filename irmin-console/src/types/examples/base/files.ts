import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { BucketFile } from '@/types/api/Bucket';

import exampleActionFiles from '../exampleActionFiles';

/**
 * Example file objects for the Bucket
 *
 * Array of {@link BucketFile}
 */
export const files: BucketFile[] = [
  {
    bucket: 'example-bucket',
    name: 'file1.js',
    path: '/folder1/file1.js',
    type: 'js',
    contents: 'console.log("Hello, world!");',
    is_draft: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    bucket: 'example-bucket',
    name: 'file2.py',
    path: '/folder1/folder2/file2.py',
    type: 'py',
    contents: 'print("Hello, world!")',
    is_draft: true,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    bucket: 'example-bucket',
    name: 'file3.sql',
    path: '/folder1/file3.sql',
    type: 'sql',
    contents: 'SELECT * FROM users;',
    is_draft: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    bucket: 'example-bucket',
    name: 'fetch-app-usage-data.js',
    path: '/fetch-app-usage-data.js',
    type: 'js',
    contents: exampleActionFiles.fetchAppUsageData,
    is_draft: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    bucket: 'example-bucket',
    name: 'send-receipt-on-order.js',
    path: '/send-receipt-on-order.js',
    type: 'js',
    contents: exampleActionFiles.sendReceiptOnOrder,
    is_draft: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    bucket: 'example-bucket',
    name: 'find-top-100-ad-clicking-users.sql',
    path: '/find-top-100-ad-clicking-users.sql',
    type: 'sql',
    contents: exampleActionFiles.findTop100AdClickingUsers,
    is_draft: false,
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
