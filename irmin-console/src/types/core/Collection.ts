import { FileCollectionData, FileSchema } from '@/types/core/FileCollection';
import {
  FolderCollectionData,
  FolderSchema,
} from '@/types/core/FolderCollection';
import { TableCollectionData, TableSchema } from '@/types/core/TableCollection';

/**
 * Type of collection in the repository
 */
export type CollectionType = 'table' | 'folder' | 'file';

/**
 * Generic Collection interface, where schema is optional.
 *
 * Repositories consist of Collections, which can be for example tables in the Lakehouse.
 *
 * @typeParam id - Hash ID of the Collection
 * @typeParam name - Name of the Collection
 * @typeParam formatted_name - Formatted name of the Collection, to be used in queries (ref can be added)
 * @typeParam repository - Slug of the repository of the Collection is part of
 * @typeParam type - Type of the Collection. Eg. 'table', 'folder', 'file'
 * @typeParam is_immutable -  If the Collection is_immutable, it cannot be changed or updated manually
 * @typeParam last_modified - Last modified timestamp of the Collection
 * @typeParam size - (optional) Size of the Collection in bytes
 * @typeParam workflow - (optional) ID of the workflow associated with the Collection
 */
export interface Collection {
  id: string;
  name: string;
  formatted_name: string;
  repository: string;
  type: CollectionType;
  is_immutable: boolean;
  last_modified: string;
  size?: number;
  workflow?: string;
}

/**
 * CollectionData is the data in the Collection. It can be Table, Folder or File.
 */
export type CollectionData =
  | TableCollectionData
  | FolderCollectionData
  | FileCollectionData;

/**
 * RepositoryCollection ensures schema is always present.
 *
 * @typeParam schema - Schema of the Collection based on the type
 */
export interface RepositoryCollection extends Collection {
  schema: TableSchema | FolderSchema | FileSchema;
}

/**
 * RepositorySchema is an array of collections, where schema is required.
 */
export type RepositorySchema = RepositoryCollection[];
