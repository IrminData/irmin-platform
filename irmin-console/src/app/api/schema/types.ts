import { RepositorySchema } from '@/types/api/Collection';

/**
 * Response object type for the `GET /api/schema` route
 * @typeParam data - The fetched schema {@link RepositorySchema}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.collections - List of collections that schemas were fetched for
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface SchemaResponse {
  data: RepositorySchema;
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
  data: [],
  metadata: {
    errors: [],
    collections: [],
    workspace: '',
  },
};
