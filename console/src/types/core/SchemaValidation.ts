/**
 * Categorizes the kind of validation failure.
 */
type SchemaValidationErrorType =
  | 'missing_required_field'
  | 'type_mismatch'
  | 'constraint_violation'
  | 'format_invalid'
  | 'unexpected_field'
  | 'null_not_allowed'
  | 'invalid_enum_value'
  | 'invalid_array_items';

/**
 * Represents a single validation failure with detailed context.
 */
export interface SchemaValidationError {
  /** Categorizes the validation failure */
  type: SchemaValidationErrorType;
  /** JSON path to the field that failed validation (e.g., "customers[0].email") */
  field_path: string;
  /** Human-readable description of the validation failure */
  message: string;
  /** Type expected according to the schema */
  expected_type?: string;
  /** Actual type found in the data */
  actual_type?: string;
  /** Actual value that failed validation */
  actual_value?: unknown;
  /** What was expected (for enum, format, constraint errors) */
  expected_value?: unknown;
  /** Actionable advice on how to fix the error */
  suggestion?: string;
  /** Which file in a multi-file validation contains the error */
  file_name?: string;
  /** Array index for errors in array items */
  row_index?: number;
}

/**
 * Represents the complete outcome of schema validation.
 */
export interface SchemaValidationResult {
  /** True if all data passed validation against the schema */
  valid: boolean;
  /** Detailed information about each validation failure */
  errors?: SchemaValidationError[];
  /** Non-fatal issues (e.g., deprecated fields, recommendations) */
  warnings?: string[];
  /** Maps file names to their error counts for multi-file validation */
  files_summary?: Record<string, number>;
  /** Count of records/rows that were validated */
  total_records_validated?: number;
  /** Count of records that had at least one error */
  failed_records?: number;
}

/**
 * Type of change detected between two schema versions.
 */
type SchemaChangeType =
  | 'added'
  | 'removed'
  | 'type_changed'
  | 'required_changed'
  | 'nullability_changed'
  | 'modified';

/**
 * Represents a single field-level difference between two schemas.
 */
export interface SchemaFieldDiff {
  /** JSON path to the field that differs */
  field_path: string;
  /** Type of change detected */
  change_type: SchemaChangeType;
  /** Type in the source schema */
  source_type?: string;
  /** Type in the target schema */
  target_type?: string;
  /** Human-readable description of the change */
  description?: string;
  /** Whether the field was required before */
  was_required?: boolean;
  /** Whether the field is required now */
  is_required?: boolean;
  /** Whether the field was nullable before */
  was_nullable?: boolean;
  /** Whether the field is nullable now */
  is_nullable?: boolean;
}

/**
 * Represents a comparison between two schemas.
 */
export interface SchemaDiff {
  /** True if the schemas are compatible (no breaking changes) */
  compatible: boolean;
  /** Changes that would break existing data/consumers */
  breaking_changes?: SchemaFieldDiff[];
  /** Changes that are backwards compatible */
  non_breaking_changes?: SchemaFieldDiff[];
  /** Human-readable summary of the diff */
  summary: string;
  /** Path of the source schema */
  source_schema_path?: string;
  /** Path of the target schema */
  target_schema_path?: string;
}

/**
 * Represents schema changes for a specific object path.
 */
export interface ObjectSchemaDiff {
  /** Path of the object whose schema changed */
  path: string;
  /** Schema diff details */
  diff: SchemaDiff;
}
