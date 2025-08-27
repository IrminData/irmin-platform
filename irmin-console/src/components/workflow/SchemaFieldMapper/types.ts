export interface Field {
  path: string;
  name: string;
  type: string;
  format?: string;
  source: string; // full file path
  description?: string;
  required?: boolean;
}

export interface FileGroup {
  filePath: string;
  fields: Field[];
  fileType: 'binary' | 'group' | 'structured';
  contentType?: string;
  size?: number;
  description?: string;
}
