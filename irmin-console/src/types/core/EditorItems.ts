export type IrminFileLanguage = 'js' | 'go' | 'py' | 'sql' | 'txt';
export const irminFileLanguages: {
  label: string;
  value: IrminFileLanguage;
}[] = [
  {
    label: 'JavaScript',
    value: 'js',
  },
  {
    label: 'Go-lang',
    value: 'go',
  },
  {
    label: 'Python',
    value: 'py',
  },
  {
    label: 'SQL',
    value: 'sql',
  },
  {
    label: 'Plaintext',
    value: 'txt',
  },
];

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
  /** (optional) Language of the item */
  language?: IrminFileLanguage;
  /** (optional) Children of the item (for folders) */
  children?: EditorItem[];
  /** Timestamp when the item was last modified */
  last_modified: string;
}
