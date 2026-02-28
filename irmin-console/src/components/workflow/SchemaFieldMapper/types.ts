export interface Field {
  path: string;
  name: string;
  type: string;
  format?: string;
  source: string; // full file path
  description?: string;
  required?: boolean;
  /** Nesting depth for indentation (0 = top-level) */
  depth?: number;
  /** True when this field has deeper nested children that were truncated */
  truncated?: boolean;
}

/** Mode for the SchemaFieldMapper component */
export type SchemaFieldMapperMode = 'import_export' | 'standalone';

/** Manually added field (for standalone mode) */
export interface ManualField {
  name: string;
  filePath: string;
}

export interface FileGroup {
  filePath: string;
  fields: Field[];
  fileType: 'binary' | 'group' | 'structured';
  contentType?: string;
  size?: number;
  description?: string;
}
