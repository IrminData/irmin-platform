import { getRandomDateTimeString } from '@/utils/getRandomDateTimeString';

import { Object } from '@/types/core/Object';

/**
 * Get example Repository Objects
 *
 * Array of {@link Object}
 */
export const objects = (): Object[] => [
  {
    name: 'photos',
    path: '/photos',
    type: 'group',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'photo-123.jpg',
    path: '/photos/photo-123.jpg',
    type: 'binary',
    content_type: 'image/jpeg',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'photo-456.jpg',
    path: '/photos/photo-456.jpg',
    type: 'binary',
    content_type: 'image/jpeg',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'docs',
    path: '/docs',
    type: 'group',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'document.pdf',
    path: '/docs/document.pdf',
    type: 'binary',
    content_type: 'application/pdf',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'data.csv',
    path: '/data.csv',
    type: 'structured',
    content_type: 'text/csv',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'product-info.json',
    path: '/product-info.json',
    type: 'structured',
    content_type: 'application/json',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'data.parquet',
    path: '/data.parquet',
    type: 'structured',
    content_type: 'application/vnd.apache.parquet',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
  {
    name: 'example.txt',
    path: '/example.txt',
    type: 'binary',
    content_type: 'text/plain',
    last_modified: getRandomDateTimeString(60, 'past', 1),
  },
];
