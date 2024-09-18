/**
 * Interface for defining a single entry in a stream.
 */
interface StreamEntry {
  [key: string]: string | number | boolean;
}

/**
 * Interface for defining the data in a stream.
 *
 * @typeParam type - Type of the data, always 'stream' for StreamCollectionData
 * @typeParam entries - List of entries in the stream
 */
export interface StreamCollectionData {
  type: 'stream';
  entries: StreamEntry[];
}

/**
 * Interface for defining the schema of a stream.
 *
 * @typeParam fields - Defines the structure of each entry in the stream (e.g., timestamp, level, message)
 * @typeParam isLive - Optional: Whether the stream is live (real-time) or historical
 */
export interface StreamSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'timestamp';
  isNullable?: boolean;
}

/**
 * Interface for defining the schema of a stream.
 *
 * @typeParam type - Type of the schema, always 'stream' for StreamSchema
 * @typeParam fields - List of fields that describe the structure of each log entry
 * @typeParam isLive - Optional: Whether the stream is live (real-time) or historical
 */
export interface StreamSchema {
  type: 'stream';
  fields: StreamSchemaField[];
  isLive?: boolean;
}
