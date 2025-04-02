import { JSONValue } from '../internal/GenericJSON';

export type IrminFileLanguage = 'js' | 'go' | 'py' | 'sql' | 'md' | 'txt';
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
    label: 'Markdown',
    value: 'md',
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

/**
 * Represents results of a script execution.
 * This can include the output of a script, errors, and other metadata.
 */
export interface ScriptResult {
  /** Columns of the result */
  columns?: string[];
  /** Data of the result */
  data?: Record<string, JSONValue>[];
  /** Indicates if there were errors */
  has_errors?: boolean;
  /** Duration of the script execution */
  duration?: number;
  /** Timestamp when the script started executing */
  started_at?: string;
  /** Timestamp when the script finished executing */
  finished_at?: string;
  /** Logs generated during the script execution */
  logs?: string[];
}
