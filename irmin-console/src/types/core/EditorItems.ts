/**
 * Single Editor Items instance
 *
 * @param workspace - The workspace slug the items are for
 * @param folders - List of folders in the workspace
 * @param files - List of files in the workspace
 */
export interface EditorItems {
  workspace: string;
  folders: EditorItemsFolder[];
  files: EditorItemsFile[];
}

/**
 * EditorItems Folder type
 *
 * @param workspace - Slug of the workspace this folder is in
 * @param name - Name of the folder
 * @param path - Path of the file in the editor files
 * @param owner - ID of the user who owns the file
 * @param created_at - Folder creation date
 * @param updated_at - Folder update date
 */
export interface EditorItemsFolder {
  workspace: string;
  name: string;
  path: string;
  owner: string;
  created_at: string;
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
    name: 'SQL',
    extension: 'sql',
  },
];
export type IrminFileTypeWithDetails = (typeof irminFileTypes)[number];
export type IrminFileType = (typeof irminFileTypes)[number]['extension'];

/**
 * EditorItems File type
 *
 * @param workspace - Slug of the workspace this file is in
 * @param name - Name of the file
 * @param path - Path of the file in the editor files
 * @param type - Type of the file (file extension)
 * @param contents - Content of the file
 * @param is_draft - Is the file a draft
 * @param owner - ID of the user who owns the file
 * @param created_at - File creation date
 * @param updated_at - File update date
 */
export interface EditorItemsFile {
  workspace: string;
  name: string;
  path: string;
  type: IrminFileType;
  contents: string;
  is_draft: boolean;
  owner: string;
  created_at: string;
  updated_at: string;
}
