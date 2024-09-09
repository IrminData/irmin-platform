/**
 * Branch type
 *
 * @typeParam name - Name of the branch
 * @typeParam default - Whether the branch is the default branch. Only one branch can be default, usually "main".
 */
export interface Branch {
  name: string;
  default: boolean;
}
