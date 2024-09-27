/**
 * Repository commit type
 *
 * @typeParam hash - Hash of the commit
 * @typeParam message - Commit message
 * @typeParam timestamp - Commit timestamp
 * @typeParam author - Commit author
 * @typeParam previousHash - Previous commit hash, if any
 */
export interface Commit {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
  previousHash?: string;
}
