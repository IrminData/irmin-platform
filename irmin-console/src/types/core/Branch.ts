/**
 * Repository branch
 *
 * @typeParam name - Name of the branch
 * @typeParam default - Whether the branch is the default branch. Only one branch can be default, usually "main".
 * @typeParam is_immutable - Whether the branch is immutable. Immutable branches cannot be deleted, and their contents cannot be modified.
 */
export interface Branch {
  name: string;
  default: boolean;
  is_immutable: boolean;
}
