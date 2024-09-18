/**
 * Type of collection in the repository
 */
export type CollectionType = 'table';

/**
 * Collection type
 *
 * Repositories consist of collections, which can be for example tables in the Lakehouse.
 *
 * @typeParam id - Collection ID
 * @typeParam name - Name of the Collection
 * @typeParam formatted_name - Formatted name of the Collection, to be used in queries
 * @typeParam original_repository - Slug of the original repository of the Collection
 * @typeParam type - Type of the Collection. Eg. 'table'
 */
export interface Collection {
  id: number;
  name: string;
  formatted_name: string;
  original_repository: string;
  type: CollectionType;
}
