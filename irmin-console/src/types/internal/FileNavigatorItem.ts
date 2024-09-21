import { BucketFile, BucketFolder } from '@/types/core/Bucket';

/**
 * File navigator item properties.
 *
 * Bucket object is transformed to this format to be used in the file navigator.
 *
 * @typeParam type - The type of the item, either 'file' or 'folder'
 * @typeParam original - The original bucket object
 * @typeParam current - The current bucket object
 * @typeParam children - The children of the folder
 */
export type FileNavigatorItem = FileNavigatorFileItem | FileNavigatorFolderItem;

/**
 * File navigator file item properties
 * @typeParam type - always 'file'
 * @typeParam original - The original bucket file
 * @typeParam current - The current bucket file
 */
export type FileNavigatorFileItem = {
  type: 'file';
  original: BucketFile | null;
  current: BucketFile | null;
};

/**
 * File navigator folder item properties
 * @typeParam type - always 'folder'
 * @typeParam original - The original bucket folder
 * @typeParam current - The current bucket folder
 * @typeParam children - The children of the folder
 */
export type FileNavigatorFolderItem = {
  type: 'folder';
  original: BucketFolder | null;
  current: BucketFolder | null;
  children: FileNavigatorItem[];
};
