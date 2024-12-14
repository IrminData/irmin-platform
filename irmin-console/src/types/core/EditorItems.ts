/**
 * Single Editor Items instance
 */
export interface EditorItems {
  /** The workspace slug the items are for */
  workspace: string;
  /** List of folders in the workspace */
  folders: EditorItemsFolder[];
  /** List of files in the workspace */
  files: EditorItemsFile[];
}

/**
 * EditorItems Folder type
 */
export interface EditorItemsFolder {
  /** Slug of the workspace this folder is in */
  workspace: string;
  /** Name of the folder */
  name: string;
  /** Path of the file in the editor files */
  path: string;
  /** ID of the user who owns the file */
  owner: string;
  /** Folder creation date */
  created_at: string;
  /** Folder update date */
  updated_at: string;
}

/**
 * Available extensions for files on Irmin
 */
export const irminFileTypes = [
  {
    name: 'JavaScript',
    extension: 'js',
  },
  {
    name: 'Go-lang',
    extension: 'go',
  },
  {
    name: 'SQL',
    extension: 'sql',
  },
];
export type IrminFileTypeWithDetails = (typeof irminFileTypes)[number];
export type IrminFileType = (typeof irminFileTypes)[number]['extension'];

/**
 * EditorItems File type
 */
export interface EditorItemsFile {
  /** Slug of the workspace this file is in */
  workspace: string;
  /** Name of the file */
  name: string;
  /** Path of the file in the editor files */
  path: string;
  /** Type of the file (file extension) */
  type: IrminFileType;
  /** Content of the file */
  contents: string;
  /** Is the file a draft */
  is_draft: boolean;
  /** ID of the user who owns the file */
  owner: string;
  /** File creation date */
  created_at: string;
  /** File update date */
  updated_at: string;
}
