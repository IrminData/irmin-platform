import { FileCollectionData, FileSchema } from '@/types/core/FileCollection';
import {
  FolderCollectionData,
  FolderSchema,
} from '@/types/core/FolderCollection';
import {
  StreamCollectionData,
  StreamSchema,
} from '@/types/core/StreamCollection';
import { TableCollectionData, TableSchema } from '@/types/core/TableCollection';

/**
 * Type of collection in the repository
 */
export type CollectionType = 'table' | 'stream' | 'folder' | 'file';

/**
 * Generic Collection interface, where schema is optional.
 *
 * Repositories consist of Collections, which can be for example tables in the Lakehouse.
 *
 * @typeParam id - ID of the Collection
 * @typeParam name - Name of the Collection
 * @typeParam formatted_name - Formatted name of the Collection, to be used in queries
 * @typeParam original_repository - Slug of the original repository of the Collection
 * @typeParam type - Type of the Collection. Eg. 'table', 'stream', 'folder', 'file'
 * @typeParam workflow - ID of the workflow associated with the Collection, if any
 */
export interface Collection {
  id: number;
  name: string;
  formatted_name: string;
  original_repository: string;
  type: CollectionType;
  workflow?: number;
}

/**
 * CollectionData is the data in the Collection. It can be Table, Stream, Folder or File.
 */
export type CollectionData =
  | TableCollectionData
  | StreamCollectionData
  | FolderCollectionData
  | FileCollectionData;

/**
 * RepositoryCollection ensures schema is always present.
 *
 * @typeParam schema - Schema of the Collection based on the type
 */
export interface RepositoryCollection extends Collection {
  schema: TableSchema | StreamSchema | FolderSchema | FileSchema;
}

/**
 * RepositorySchema is an array of collections, where schema is required.
 */
export type RepositorySchema = RepositoryCollection[];
