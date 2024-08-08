import { Bucket } from '@/types/api/Bucket';

import { exampleFiles, exampleFolders, exampleWorkspaces } from '.';

/**
 * Example Workspace Bucket object
 *
 * Type: {@link Bucket}
 */
export const bucket: Bucket = {
  slug: exampleWorkspaces[0].slug,
  folders: exampleFolders,
  files: exampleFiles,
};
