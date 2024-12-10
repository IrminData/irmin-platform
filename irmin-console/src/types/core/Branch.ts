/**
 * Repository branch
 */
export interface Branch {
  /** Name of the branch */
  name: string;
  /** Whether the branch is the default branch. Only one branch can be default, usually "main" */
  default: boolean;
  /** Whether the branch is immutable and cannot be modified. Used for example for migrations */
  is_immutable: boolean;
}
