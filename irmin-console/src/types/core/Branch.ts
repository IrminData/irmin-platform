/**
 * Repository branch
 *
 * @typeParam id - ID of the branch
 * @typeParam name - Name of the branch
 * @typeParam default - Whether the branch is the default branch. Only one branch can be default, usually "main".
 */
export interface Branch {
  id: number;
  name: string;
  default: boolean;
}
