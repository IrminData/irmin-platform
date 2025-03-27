/**
 * Represents an item in the editor.
 */
export interface EditorItem {
  /** Name of the item */
  name: string;
  /** Path of the item */
  path: string;
  /** Type of the item (file or folder) */
  type: 'file' | 'folder';
  /** (optional) Content of the item */
  content?: string;
  /** Timestamp when the item was last modified */
  last_modified: string;
}
