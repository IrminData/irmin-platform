import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { BucketFolder } from '@/types/core/Bucket';

/**
 * Get example BucketFolder objects
 *
 * Array of {@link BucketFolder}
 */
export const folders: () => BucketFolder[] = () => [
  {
    bucket: 'example-bucket',
    name: 'folder1',
    path: '/folder1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    bucket: 'example-bucket',
    name: 'folder2',
    path: '/folder1/folder2',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
