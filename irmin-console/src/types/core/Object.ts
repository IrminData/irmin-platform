/**
 * Represents the type of the object: "group", "structured", or "binary".
 */
export type ObjectType = 'group' | 'structured' | 'binary';

/**
 * Represents an object stored in the repository.
 */
export interface Object {
  /** Unique identifier of the object */
  id: string;
  /** Name of the object */
  name: string;
  /** Path of the object */
  path: string;
  /** Type of the object */
  type: ObjectType;
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
  /** (optional) If the object is a group, this will contain the children objects */
  children?: Object[];
}
