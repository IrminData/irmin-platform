/**
 * Single Bucket type
 * @typeParam id - Bucket ID
 * @typeParam folders - Array of BucketFolder
 * @typeParam files - Array of BucketFile
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface Bucket {
  id: number;
  folders: BucketFolder[];
  files: BucketFile[];
}

/**
 * Bucket Folder type
 * @typeParam id - Folder ID
 * @typeParam name - Folder name
 * @typeParam parent_id - Parent folder ID
 * @typeParam bucket_id - Bucket ID
 * @typeParam created_at - Folder creation date
 * @typeParam updated_at - Folder update date
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface BucketFolder {
  id: number;
  name: string;
  parent_id: number | null;
  bucket_id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Types on files which can exist on Irmin
 */
type IrminFileType = 'js' | 'py' | 'sql';

/**
 * Bucket File type
 * @typeParam id - File ID
 * @typeParam name - File name
 * @typeParam path - File path
 * @typeParam type - File type
 * @typeParam content - File content
 * @typeParam parent_id - Parent folder ID
 * @typeParam bucket_id - Bucket ID
 * @typeParam created_at - File creation date
 * @typeParam updated_at - File update date
 * @example See `/src/lib/exampleObjects/apiObjects.ts`.ts - find object referencing this type
 */
export interface BucketFile {
  id: number;
  name: string;
  path: string;
  type: IrminFileType;
  content: string;
  parent_id: number | null;
  bucket_id: number;
  created_at: string;
  updated_at: string;
}
