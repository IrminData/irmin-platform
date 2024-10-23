import { EditorItemsFile, EditorItemsFolder } from '@/types/core/EditorItems';

/**
 * File navigator item properties.
 *
 * EditorItems object is transformed to this format to be used in the file navigator.
 *
 * @typeParam type - The type of the item, either 'file' or 'folder'
 * @typeParam original - The original object
 * @typeParam current - The current object
 * @typeParam children - The children of the folder
 */
export type FileNavigatorItem = FileNavigatorFileItem | FileNavigatorFolderItem;

/**
 * File navigator file item properties
 * @typeParam type - always 'file'
 * @typeParam original - The original file
 * @typeParam current - The current file
 */
export type FileNavigatorFileItem = {
  type: 'file';
  original: EditorItemsFile | null;
  current: EditorItemsFile | null;
};

/**
 * File navigator folder item properties
 * @typeParam type - always 'folder'
 * @typeParam original - The original folder
 * @typeParam current - The current folder
 * @typeParam children - The children of the folder
 */
export type FileNavigatorFolderItem = {
  type: 'folder';
  original: EditorItemsFolder | null;
  current: EditorItemsFolder | null;
  children: FileNavigatorItem[];
};
