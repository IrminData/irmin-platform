/**
 * ObjectType represents the type of the object ("group", "structured", or "binary").
 */
type ObjectType = 'group' | 'structured' | 'binary';

/**
 * Type definition for the schema of one of the objects
 */
export type ObjectSchema = {
  /** Name of the item object as a file with extension, like `users.json` */
  name: string;
  /** Path of the object */
  path: string;
  /** Type of the object */
  type: ObjectType;
  /** Last modified timestamp */
  last_modified?: string;
  /** (optional) A brief description of the object */
  description?: string;
  /** Defines the schema of the structured object (like a table, json object, etc.) */
  schema?: JSONSchema;
  /** (optional) size of the object in bytes */
  size?: number;
  /** MIME type of the object's content, for example application/json, text/csv or application/vnd.apache.parquet. Can be unknown. */
  content_type?: string;
  /** List of children objects in the group */
  children?: ObjectSchema[];
  /** (optional) restrictions on the group */
  restrictions?: GroupSchemaRestrictions;
};

/**
 * Object describing what kind of children can a given schema have
 */
type GroupSchemaRestrictions = {
  /** Property to determine whether the schema can have structured children */
  no_structured?: boolean;
  /** Property to determine whether the schema can have binary children */
  no_binary?: boolean;
  /** Property to determine whether the schema can have group children */
  no_groups?: boolean;
  /** Property to determine whether the schema can only have structured items as its chilren*/
  only_structured?: boolean;
  /** Property to determine whether the schema can only have binary items as its chilren*/
  only_binary?: boolean;
  /** Property to determine whether the schema can only have groups as its chilren*/
  only_groups?: boolean;
  /** List of allowed MIME types of object content. If not specified, assuming all are allowed. */
  allowed_content_types?: string[];
  /** List of restricted MIME types of object content. If not specified, assuming none are restricted. */
  restricted_content_types?: string[];
  /** Maximum allowed size of the object in bytes. If not specified, assuming no size limit. */
  max_size?: number;
  /** Minimum allowed size of the object in bytes. If not specified, assuming no size limit. */
  min_size?: number;
  /** Maximum allowed count of objects in the group. If not specified, assuming no count limit. */
  max_count?: number;
  /** Minimum allowed count of objects in the group. If not specified, assuming no count limit. */
  min_count?: number;
  /** A regex pattern for names to match. */
  name_pattern?: string;
};

/**
 * JSON Schema representation for structured data, following JSON Schema conventions.
 * @see https://json-schema.org/
 */
interface JSONSchema {
  /** Specifies the JSON Schema data type (e.g., 'object', 'array', 'string'). */
  type:
    | 'array'
    | 'boolean'
    | 'null'
    | 'number'
    | 'object'
    | 'string'
    | 'integer';
  /** Defines the fields and respective schemas when the type is 'object'. */
  properties?: Record<string, JSONSchema>;
  /** Lists the required fields within the object. */
  required?: string[];
  /** Describes the schema of items when the type is 'array'. */
  items?: JSONSchema;
  /** A brief description of the schema. */
  description?: string;
  /** Default value for the schema property. */
  default?: boolean | number | string | null;
  /** Possible values for the field, if constrained. */
  enum?: (boolean | number | string | null)[];
  /** Defines whether additional properties are allowed (when `type` is 'object'). */
  additionalProperties?: JSONSchema | boolean;
  /** Constrains the expected format, such as 'email', 'date', 'uri', etc. */
  format?: string;
  /** For numeric values, defines the minimum value. */
  minimum?: number;
  /** For numeric values, defines the maximum value. */
  maximum?: number;
  /** For string values, defines the minimum length. */
  minLength?: number;
  /** For string values, defines the maximum length. */
  maxLength?: number;
  /** For string values, defines a regex pattern to match. */
  pattern?: string;
  /** Content encoding for binary data (e.g., 'base64'). */
  contentEncoding?: string;
  /** Content media type for binary data (e.g., 'application/octet-stream'). */
  contentMediaType?: string;
  /** For array values, defines the minimum number of items. */
  minItems?: number;
  /** For array values, defines the maximum number of items. */
  maxItems?: number;
  /** Extension fields for metadata and traceability */
  /** Original DuckDB type information (e.g., 'DECIMAL(10,2)'). */
  'x-original-duckdb-type'?: string;
  /** Decimal precision for numeric types. */
  'x-decimal-precision'?: number;
  /** Decimal scale for numeric types. */
  'x-decimal-scale'?: number;
  /** DuckDB type information (e.g., 'INTERVAL'). */
  'x-duckdb-type'?: string;
  /** Irmin metadata (repository, path, ref). */
  'x-irmin'?: Record<string, string>;
  /** Irmin schema version. */
  'x-irmin-schema-version'?: string;
  /** How the schema was inferred (e.g., 'duckdb-information_schema'). */
  'x-inferred-by'?: string;
  /** List of unmapped types that couldn't be processed. */
  'x-unmapped-types'?: string[];
}
