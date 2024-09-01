export interface DatatableRow {
  [key: string]: string | number | boolean;
}

// Updated interface for a column in the datatable
export interface DatatableColumn {
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
  isPrimaryKey?: boolean; // Optional: Is the column a primary key?
  isUnique?: boolean; // Optional: Does the column have a unique constraint?
  length?: number; // Optional: Length for string-based types (e.g., varchar)
  precision?: number; // Optional: Precision for decimal types
  scale?: number; // Optional: Scale for decimal types
  enumValues?: string[]; // Optional: Values for enum types
  foreignKey?: ForeignKeyRelation; // Optional: Defines a foreign key relation
}

// Interface for defining foreign key relations
export interface ForeignKeyRelation {
  referencedTable: string; // The table being referenced
  referencedColumn: string; // The column in the referenced table
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT'; // Optional: What happens on delete?
  onUpdate?: 'CASCADE' | 'RESTRICT'; // Optional: What happens on update?
}

// Updated interface for the datatable schema
export interface DatatableSchema {
  table: string; // Name of the table
  columns: DatatableColumn[]; // List of columns
  indexes?: string[]; // Optional: List of indexes on the table
  relations?: TableRelation[]; // Optional: Defines relationships to other tables
}

// Interface for defining table relations
export interface TableRelation {
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'; // Type of relation
  relatedTable: string; // The related table
  columns: string[]; // Columns involved in the relationship
  relatedColumns: string[]; // Corresponding columns in the related table
}
