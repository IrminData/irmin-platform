import { DatatableSchema } from '@/types/internal/Datatable';

/**
 * @typeParam tables - The fetched schemas for the tables
 */
export interface SchemaResult {
  tables: DatatableSchema[];
}

/**
 * Response object type for the `GET /api/schema` route
 * @typeParam data - The fetched schema {@link SchemaResult}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.tables - List of tables that schemas were fetched for
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface SchemaResponse {
  data: SchemaResult;
  metadata: {
    errors: string[];
    tables: string[];
    workspace: string;
  };
}

/**
 * Empty {@link SchemaResponse} object to use as a base for the response
 */
export const emptySchemaResponse: SchemaResponse = {
  data: {
    tables: [],
  },
  metadata: {
    errors: [],
    tables: [],
    workspace: '',
  },
};
