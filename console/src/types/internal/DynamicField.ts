/** Field value type */
type FieldValue = boolean | number | string | undefined;

/**
 * Object used to define a field for user to fill in
 */
export interface DynamicField {
  type:
    | 'checkbox'
    | 'date'
    | 'datetime'
    | 'email'
    | 'file'
    | 'float'
    | 'integer'
    | 'password'
    | 'radio'
    | 'select'
    | 'text'
    | 'textarea'
    | 'time';
  label: string;
  min?: FieldValue;
  max?: FieldValue;
  multiple?: boolean;
  options?: {
    key: string;
    value: string;
  }[];
  help_text?: string;
  example?: string; // Example value, used as placeholder
  default?: FieldValue | FieldValue[]; // Default value
  secret?: boolean;
  required?: boolean;
  required_with?: string[];
}

/**
 * List of dynamic fields for a form
 */
export interface DynamicFields {
  [key: string]: DynamicField;
}

/**
 * Resulting values from the dynamic fields
 */
export interface DynamicFieldValues {
  [key: string]: FieldValue | FieldValue[];
}
