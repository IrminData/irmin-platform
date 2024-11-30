/**
 * Type definition for an object in a repository
 */
export type Object = {
  /** Name of the object */
  name: string;
  /** Path of the object */
  path: string;
  /** MIME type of the object's content, for example application/json, text/csv or application/vnd.apache.parquet. */
  content_type?: string;
  /** Type of the object */
  type: 'group' | 'structured' | 'binary';
  /** Last modified typestamp */
  last_modified?: string;
};
