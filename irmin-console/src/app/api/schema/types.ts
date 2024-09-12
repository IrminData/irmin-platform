import { CollectionSchema } from '@/types/internal/Collection';

/**
 * @typeParam collections - The fetched schemas for the collections
 */
export interface SchemaResult {
  collections: CollectionSchema[];
}

/**
 * Response object type for the `GET /api/schema` route
 * @typeParam data - The fetched schema {@link SchemaResult}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.collections - List of collections that schemas were fetched for
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface SchemaResponse {
  data: SchemaResult;
  metadata: {
    errors: string[];
    collections: string[];
    workspace: string;
  };
}

/**
 * Empty {@link SchemaResponse} object to use as a base for the response
 */
export const emptySchemaResponse: SchemaResponse = {
  data: {
    collections: [],
  },
  metadata: {
    errors: [],
    collections: [],
    workspace: '',
  },
};
