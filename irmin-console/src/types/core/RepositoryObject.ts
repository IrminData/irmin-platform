import type { Tag } from '@/types/core/Tag';

/**
 * Represents the target of a pointer object.
 * Used as part of the RepositoryObject type definition.
 */
interface PointerTarget {
  /** Target workspace slug. Empty string means same workspace. */
  target_workspace?: string;
  /** Target repository slug */
  target_repository: string;
  /** Path to the target object */
  target_path: string;
  /** Target branch name or commit hash */
  target_ref: string;
}

/**
 * Represents an object stored in the repository.
 */
export interface RepositoryObject {
  /** Unique identifier of the object */
  id: string;
  /** Name of the object */
  name: string;
  /** Path of the object */
  path: string;
  /** Type of the object, where "group" is a folder, "structured" is a tabular file we can parse or query (e.g. CSV, JSON, Parquet, etc.), "binary" is a file that we can't parse or query (e.g. image, video, audio, etc.) */
  type: 'binary' | 'group' | 'structured';
  /** Slug of the repository that contains the object */
  repository_slug: string;
  /** The branch or other reference that contains the object */
  ref: string;
  /** (optional) The MIME type of the object content, e.g. "application/json" or "text/plain" */
  content_type?: string;
  /** (optional) The location of the object on the underlying object store, formatted as a native URI (e.g. "s3://...", "gs://...", etc.) or as an HTTP URL when presigned */
  physical_address?: string;
  /** (optional) If present and nonzero, physical_address is a pre-signed URL that expires at this Unix Epoch time */
  physical_address_expiry?: number;
  /** (optional) The number of bytes in the object */
  size_bytes?: number;
  /** (optional) The last modified time of the object in RFC3339 format */
  last_modified?: string;
  /** (optional) Key-value pairs of metadata about the object */
  metadata?: { [key: string]: string };
  /** (optional) Tags associated with this object */
  tags?: Tag[];
  /** (optional) If the object is a group, this will contain the children objects */
  children?: RepositoryObject[];
  /** (optional) An example SQL selector for this object, like '$["workspace-slug;repository-slug;file.json@main"]' */
  sql_selector?: string;
  /** (optional) An example S3 path selector for this object, like "s3://workspace-slug-repository-slug/main/file.json" */
  s3_path_selector?: string;
  /** (optional) Whether this object is a pointer to another object */
  is_pointer?: boolean;
  /** (optional) If this is a pointer, contains the target information */
  pointer_target?: PointerTarget;
}
