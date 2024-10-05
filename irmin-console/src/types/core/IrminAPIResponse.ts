import { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Interface for the pagination metadata from Core Irmin API
 *
 * @typeParam total - Total number of items
 * @typeParam per_page - Number of items per page
 * @typeParam current_page - Current page number
 * @typeParam last_page - Last page number
 * @typeParam first_page_url - URL of the first page
 * @typeParam last_page_url - URL of the last page
 * @typeParam next_page_url - URL of the next page
 * @typeParam prev_page_url - URL of the previous page
 */
export interface IrminAPIPaginationMetadata {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  first_page_url: string;
  last_page_url: string;
  next_page_url: string | null;
  prev_page_url: string | null;
}

/**
 * Type for the metadata from Core Irmin API.
 * Paginated or non-paginated metadata.
 */
export type IrminAPIResponseMetadata = {
  [key: string]: unknown;
};

/**
 * Interface for the response from Core Irmin API
 *
 * @typeParam metadata - Metadata from the API response
 * @typeParam message - Message from the API response
 * @typeParam errors - Errors from the API response
 * @typeParam data - Data from the API response
 */
export interface IrminAPIResponse {
  metadata?: IrminAPIResponseMetadata & IrminAPIPaginationMetadata;
  message?: string;
  errors?: string[];
  data?: unknown;
}

/**
 * Type for the unstructured response from Core Irmin API
 */
export type IrminAPIUnstructuredResponse = JSONValue | Blob;
