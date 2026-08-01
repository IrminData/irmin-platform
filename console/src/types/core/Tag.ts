import type { Connection } from './Connection';
import type { Repository } from './Repository';
import type { RepositoryObject } from './RepositoryObject';
import type { StoredScript } from './Script';
import type { StoredQuery } from './StoredQuery';
import type { Workflow } from './Workflow';

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

/**
 * Represents all assets associated with a specific tag
 */
interface TaggedAssets {
  /** Queries tagged with this tag */
  queries: StoredQuery[];
  /** Scripts tagged with this tag */
  scripts: StoredScript[];
  /** Repositories tagged with this tag */
  repositories: Repository[];
  /** Workflows tagged with this tag */
  workflows: Workflow[];
  /** Connections tagged with this tag */
  connections: Connection[];
  /** Repository objects tagged with this tag */
  repository_objects: RepositoryObject[];
}

/**
 * Represents a tag along with all its associated assets and counts
 */
export interface TagWithAssets {
  /** The tag information */
  tag: Tag;
  /** All assets associated with this tag */
  assets: TaggedAssets;
  /** Count of each asset type */
  counts: { [key: string]: number };
}

/**
 * Represents the type of entity that a tag can be applied to
 */
export type TagEntityType =
  | 'repositories'
  | 'queries'
  | 'scripts'
  | 'workflows'
  | 'connections'
  | 'repository_objects'
  | 'ai_applications';
