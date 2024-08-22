/** Field value type */
export type FieldValue = string | number | boolean | null;

/**
 * Object used to define a field for user to fill in
 */
export interface DynamicField {
  type:
    | 'text'
    | 'textarea'
    | 'password'
    | 'email'
    | 'checkbox'
    | 'integer'
    | 'float'
    | 'select'
    | 'radio'
    | 'file'
    | 'date'
    | 'time'
    | 'datetime';
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
