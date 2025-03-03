/**
 * Repository tag object
 */
export interface Tag {
  /** Name of the tag */
  name: string;
  /** Commit hash referenced in a tag */
  ref: string;
}
