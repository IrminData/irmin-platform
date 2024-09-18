/**
 * Interface for defining a single row in a table.
 */
export interface TableRow {
  [key: string]: string | number | boolean;
}

/**
 * Interface for defining the data in a table.
 *
 * @typeParam type - Type of the data, always 'table' for TableCollectionData
 * @typeParam rows - List of rows in the table
 */
export interface TableCollectionData {
  type: 'table';
  rows: TableRow[];
}

/**
 * Interface for defining a column in a table.
 */
export interface TableColumn {
  name: string;
  type:
    | 'int'
    | 'bigint'
    | 'float'
    | 'decimal'
    | 'string'
    | 'text'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'timestamp'
    | 'json'
    | 'enum';
  isNullable?: boolean; // Optional: Can the column be null?
  length?: number; // Optional: Length for string-based types (e.g., varchar)
  precision?: number; // Optional: Precision for decimal types
  scale?: number; // Optional: Scale for decimal types
  enumValues?: string[]; // Optional: Values for enum types
}

/**
 * Interface for defining the schema of a table.
 *
 * @typeParam type - Type of the schema, always 'table' for TableSchema
 * @typeParam columns - List of columns in the table
 */
export interface TableSchema {
  type: 'table';
  columns: TableColumn[];
}
