import { EditorItem } from '@/types/core/EditorItems';

/**
 * File navigator file item properties
 */
export type FileNavigatorItem = {
  /** The original file object */
  original: EditorItem | null;
  /** The current file object */
  current: EditorItem | null;
};
