/**
 * Repository tag object
 */
export interface Tag {
  id: string;
  name: string;
  /** Commit hash referenced in a tag */
  ref: string;
}
