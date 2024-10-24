import { IrminFileType } from '@/types/core/EditorItems';

/**
 * Internal type for managing file contents and file state in the editor
 */
export type FileContents = {
  id: string;
  contents: string;
  originalContents: string;
  path: string;
  created: boolean;
  language: IrminFileType;
};
