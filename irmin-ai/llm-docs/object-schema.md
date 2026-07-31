# Object Schema

## Overview

The object schema is a JSON schema that describes the structure of the data in the object. It is used to validate the data in the object and to generate the documentation for the object.

Object Schemas are used to describe the structure of objects in Irmin. They are helpful for validation, transformation, visualisation and querying of data.

Object Schemas are useful for building queries, scripts, and workflows, as they provide a way to describe the structure of the data in the objects, without having to actually read the data.

## Connection Schemas

Using the `get_connection_schema` tool, you can get the schema of a connection. The schema describes what data can be read from or written to the connection.
To get fetch the connection schema, you need to specify the operation method. The operation method can be for example `pull` (data we read from the connection) or `push` (data we write to the connection).

## Repository Object Schemas

Using the `get_repository_object_schema` tool, you can get the schema of a repository and its objects. The schema describes what data exists in the repository and its objects, at a specific path and ref (branch, tag, commit).

## Type Definitions

```typescript
/**
 * Type definition for the schema of one of the objects
 */
export type ObjectSchema = {
  /** Name of the item object as a file with extension, like `users.json` */
  name: string;
  /** Path of the object */
  path: string;
  /** Last modified timestamp */
  last_modified?: string;
  /** (optional) A brief description of the object */
  description?: string;
} & (SchemaObjectBinaryItem | SchemaObjectGroup | SchemaObjectStructuredItem);

/**
 * Schema Object properties for structured items, like tables, which can be described using JSON Schema.
 */
type SchemaObjectStructuredItem = {
  /** Indicates that the object is a structured item */
  type: 'structured';
  /** Defines the schema of the structured object (like a table, json object, etc.) */
  schema: JSONSchema;
  /** (optional) size of the object in bytes */
  size: number;
  /** MIME type of the object's content, for example application/json, text/csv or application/vnd.apache.parquet. Can be unknown. */
  content_type?: string;
};

/**
 * Schema Object properties for binary items, like images, which can not be described using JSON Schema.
 */
type SchemaObjectBinaryItem = {
  /** Indicates that the object is a binary item */
  type: 'binary';
  /** (optional) size of the object in bytes */
  size: number;
  /** MIME type of the object's content, for example image/png, application/pdf or video/mp4. Can be unknown. */
  content_type?: string;
};

/**
 * Schema Object properties for groups of objects, like a folder, which can contain other objects.
 */
type SchemaObjectGroup = {
  /** Indicates that the object is a group of items */
  type: 'group';
  /** List of children objects in the group */
  children: ObjectSchema[];
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
export interface JSONSchema {
  /** Specifies the JSON Schema data type (e.g., 'object', 'array', 'string'). */
  type: 'array' | 'boolean' | 'null' | 'number' | 'object' | 'string';
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
}
```


## Example

```json
{
  "name": "examples",
  "path": "/examples",
  "description": "Example schema for demonstration",
  "type": "group",
  "children": [
    {
      "name": "events.json",
      "path": "/examples/events.json",
      "content_type": "application/json",
      "last_modified": "2021-09-01T12:00:00Z",
      "description": "List of events",
      "size": 2048,
      "type": "structured",
      "schema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "Unique identifier for each event"
            },
            "title": {
              "type": "string",
              "minLength": 3,
              "maxLength": 30,
              "description": "Name of the event"
            }
          },
          "required": ["id", "title"],
          "additionalProperties": false
        }
      }
    },
    {
      "name": "photos",
      "path": "/examples/photos",
      "description": "Photos taken at the events",
      "type": "group",
      "restrictions": {
        "children_allowed": true,
        "no_structured": true,
        "allowed_content_types": ["image/jpeg", "image/png"],
        "max_size": 1048576
      },
      "children": [
        {
          "name": "event-123.jpg",
          "path": "/examples/photos/event-123.jpg",
          "description": "Photo from event 123",
          "type": "binary",
          "last_modified": "2021-09-01T12:00:00Z",
          "content_type": "image/jpeg",
          "size": 2048
        },
        {
          "name": "event-456.jpg",
          "path": "/examples/photos/event-456.jpg",
          "description": "Photo from event 456",
          "type": "binary",
          "last_modified": "2021-09-01T12:00:00Z",
          "content_type": "image/jpeg",
          "size": 2048
        },
        {
          "name": "event-789.jpg",
          "path": "/examples/photos/event-789.jpg",
          "description": "Photo from event 789",
          "type": "binary",
          "last_modified": "2021-09-01T12:00:00Z",
          "content_type": "image/jpeg",
          "size": 2048
        }
      ]
    }
  ]
}
```