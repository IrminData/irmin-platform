import { EditorItemsFile, EditorItemsFolder } from '@/types/core/EditorItems';

/**
 * File navigator item properties.
 *
 * EditorItems object is transformed to this format to be used in the file navigator.
 */
export type FileNavigatorItem = FileNavigatorFileItem | FileNavigatorFolderItem;

/**
 * File navigator file item properties
 */
export type FileNavigatorFileItem = {
  type: 'file';
  /** The original file object */
  original: EditorItemsFile | null;
  /** The current file object */
  current: EditorItemsFile | null;
};

/**
 * File navigator folder item properties
 */
export type FileNavigatorFolderItem = {
  type: 'folder';
  /** The original folder item object */
  original: EditorItemsFolder | null;
  /** The current folder item object */
  current: EditorItemsFolder | null;
  /** The children items of the folder */
  children: FileNavigatorItem[];
};
