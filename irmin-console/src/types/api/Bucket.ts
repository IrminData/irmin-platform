export interface Bucket {
  id: number;
  folders: BucketFolder[];
  files: BucketFile[];
}

export interface BucketFolder {
  id: number;
  name: string;
  parent_id: number | null;
  bucket_id: number;
  created_at: string;
  updated_at: string;
}

type IrminFileType = 'js' | 'py' | 'sql';
export interface BucketFile {
  id: number;
  name: string;
  path: string;
  type: IrminFileType;
  content: string;
  parent_id: number | null;
  bucket_id: number;
  created_at: string;
  updated_at: string;
}
