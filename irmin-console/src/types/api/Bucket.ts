/**
 * Single Bucket type
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 */
export interface Bucket {
  slug: string;
  folders: BucketFolder[];
  files: BucketFile[];
}

/**
 * Bucket Folder type
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 *
 * @param bucket - Slug of the bucket this folder is in
 * @param name - Name of the folder
 * @param path - Path of the file in the bucket, relative to the workspace's bucket. / is the bucket's root
 * @param created_at - Folder creation date
 * @param updated_at - Folder update date
 */
export interface BucketFolder {
  bucket: string;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

/**
 * Available extensions for files on Irmin
 */
export const irminFileTypes = ['js', 'py', 'sql'];
export type IrminFileType = (typeof irminFileTypes)[number];

/**
 * Bucket File type
 *
 * @see `@/src/types/examples/apiObjects.ts` - find object referencing this type to view example
 *
 * @param bucket - Slug of the bucket this file is in
 * @param name - Name of the file
 * @param path - Path of the file in the bucket, relative to the workspace's bucket. / is the bucket's root
 * @param type - Type of the file (file extension)
 * @param contents - Content of the file
 * @param is_draft - Is the file a draft
 * @param created_at - File creation date
 * @param updated_at - File update date
 */
export interface BucketFile {
  bucket: string;
  name: string;
  path: string;
  type: IrminFileType;
  contents: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}
