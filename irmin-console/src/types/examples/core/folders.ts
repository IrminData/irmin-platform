import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { EditorItemsFolder } from '@/types/core/EditorItems';

/**
 * Get example EditorItemsFolder objects
 *
 * Array of {@link EditorItemsFolder}
 */
export const folders: () => EditorItemsFolder[] = () => [
  {
    workspace: 'example-workspace',
    name: 'folder1',
    path: '/folder1',
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
  {
    workspace: 'example-workspace',
    name: 'folder2',
    path: '/folder1/folder2',
    owner: '1',
    created_at: getRandomDateTimeString(500, 'past', 60),
    updated_at: getRandomDateTimeString(50, 'past', 10),
  },
];
