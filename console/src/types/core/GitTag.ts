/**
 * Represents a repository tag object (Git-style tag with ref).
 */
export interface GitTag {
  /** Tag name */
  name: string;
  /** Commit hash referenced in a tag */
  ref: string;
}
