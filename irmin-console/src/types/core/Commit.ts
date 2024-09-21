/**
 * Repository commit type
 *
 * @typeParam hash - Hash of the commit
 * @typeParam message - Commit message
 * @typeParam description - Commit description
 * @typeParam timestamp - Commit timestamp
 * @typeParam author - Commit author
 * @typeParam previousHash - Previous commit hash
 * @typeParam branch - Branch the commit is on
 */
export interface Commit {
  hash: string;
  message: string;
  description: string;
  timestamp: string;
  author: string;
  previousHash: string;
  branch: string;
}
