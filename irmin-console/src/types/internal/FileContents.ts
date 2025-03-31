import { IrminFileLanguage } from '@/types/core/EditorItems';

/**
 * Internal type for managing file contents and file state in the editor
 */
export type FileContents = {
  /** Unique identifier for the file */
  id: string;
  /** Current contents of the file */
  contents: string;
  /** Original contents of the file */
  originalContents: string;
  /** Path to the file */
  path: string;
  /** Indicates if the file was created */
  created: boolean;
  /** Language of the file */
  language: IrminFileLanguage;
};
