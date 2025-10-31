import type { JSONValue } from '../internal/GenericJSON';

// NOTE: Currently only Go-lang scripts are supported for execution
// Other languages are available for syntax highlighting and editing but not for script execution
export type IrminFileLanguage =
  | 'go'
  | 'js'
  | 'json'
  | 'md'
  | 'py'
  | 'sql'
  | 'txt';

// This list controls what file types users can SELECT when creating new files in the editor
// NOTE: Only Go-lang is currently supported for script execution
// Other languages (SQL, Markdown, etc.) are used programmatically in specific contexts
// (queries, documentation) but we don't want users creating script files in those languages
export const irminFileLanguages: {
  label: string;
  value: IrminFileLanguage;
}[] = [
  {
    label: 'Go-lang',
    value: 'go',
  },
  {
    label: 'Plaintext',
    value: 'txt',
  },
  // JavaScript, Python, SQL, Markdown, JSON are commented out for script creation
  // They're still supported for syntax highlighting if files exist in those formats
  // {
  //   label: 'JavaScript',
  //   value: 'js',
  // },
  // {
  //   label: 'Python',
  //   value: 'py',
  // },
  // {
  //   label: 'SQL',
  //   value: 'sql',
  // },
  // {
  //   label: 'Markdown',
  //   value: 'md',
  // },
  // {
  //   label: 'JSON',
  //   value: 'json',
  // },
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
  /** Parsed structured result files */
  structured_results?: Record<string, Record<string, JSONValue>[]>;
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
