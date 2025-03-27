/**
 * Represents a repository tag object.
 */
export interface Tag {
  /** Tag name */
  name: string;
  /** Commit hash referenced in a tag */
  ref: string;
}
