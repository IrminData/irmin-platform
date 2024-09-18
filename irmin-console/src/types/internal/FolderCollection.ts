import { FileCollectionData, FileSchema } from './FileCollection';

/**
 * Interface for defining the schema of a folder item, which is a file.
 *
 * @typeParam type - Type of folder item
 * @typeParam file - File schema
 */
export interface FolderItemFile {
  type: 'file';
  file: FileSchema;
}

/**
 * Interface for defining the schema of a folder item, which is a folder.
 *
 * @typeParam type - Type of folder item
 * @typeParam name - Name of the folder
 * @typeParam created_at - Creation timestamp
 * @typeParam modified_at - Last modification timestamp
 * @typeParam children - Children of the folder, which can be files or folders
 */
export interface FolderItemFolder {
  type: 'folder';
  name: string;
  created_at: string;
  modified_at: string;
  children: FolderSchema;
}

/**
 * Type of folder item, which can be a file or a folder. This is used in the folder schema.
 */
export type FolderItem = FolderItemFile | FolderItemFolder;

/**
 * Interface for defining the schema of a folder.
 *
 * @typeParam type - Type of the schema, always 'folder' for FolderSchema
 * @typeParam items - List of items in the folder
 */
export interface FolderSchema {
  type: 'folder';
  items: FolderItem[];
}

/**
 * Type of folder item, which can be a file or a folder with content provided for files.
 */
type FolerItemWithContent =
  | (FolderItemFile & { content: FileCollectionData['content'] })
  | FolderItemFolder;

/**
 * Interface for defining the data in a folder collection.
 *
 * @typeParam type - Type of the data, always 'folder' for FolderCollectionData
 * @typeParam items - List of items in the folder
 */
export interface FolderCollectionData {
  type: 'folder';
  items: FolerItemWithContent[];
}
