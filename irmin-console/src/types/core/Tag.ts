/**
 * Represents a workspace tag object for labeling entities.
 */
export interface Tag {
  /** Unique sqid for the tag */
  id: string;
  /** Tag name */
  name: string;
  /** Hex color code */
  color: string;
  /** Tag description */
  description: string;
}
