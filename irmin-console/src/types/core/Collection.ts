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
 * @typeParam name - Name of the Collection (unique within the repository)
 * @typeParam repository - Slug of the repository of the Collection is part of
 * @typeParam type - Type of the Collection. Eg. 'table', 'folder', 'file'
 * @typeParam is_immutable -  If the Collection is_immutable, it cannot be changed or updated manually
 * @typeParam last_modified - Last modified timestamp of the Collection
 * @typeParam size - (optional) Size of the Collection in bytes
 * @typeParam workflow - (optional) ID of the workflow associated with the Collection
 */
export interface Collection {
  name: string;
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
 * CollectionWithSchema ensures schema is always present.
 *
 * @typeParam schema - Schema of the Collection based on the type
 */
export interface CollectionWithSchema extends Collection {
  schema: TableSchema | FolderSchema | FileSchema;
}

/**
 * RepositorySchema is an array of collections, where schema is required.
 */
export type RepositorySchema = CollectionWithSchema[];
