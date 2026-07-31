/**
 * Irmin repository commit type
 */
export interface Commit {
  /** Hash of the commit */
  hash: string;
  /** Commit message */
  message: string;
  /** Commit timestamp */
  timestamp: string;
  /** Commit author */
  author: string;
  /** (optional) Previous commit hash, if any */
  previous_hash?: string;
}

export type PathType = 'common_prefix' | 'object' | 'reset';
