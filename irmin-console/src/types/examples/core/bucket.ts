import { Bucket } from '@/types/core/Bucket';

import { files } from './files';
import { folders } from './folders';

/**
 * Get example Workspace Bucket object
 *
 * Type: {@link Bucket}
 */
export const bucket: () => Bucket = () => ({
  slug: 'example-bucket-slug',
  folders: folders(),
  files: files(),
});
