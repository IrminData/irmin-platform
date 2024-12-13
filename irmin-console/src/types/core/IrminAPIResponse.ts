import { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Interface for the pagination metadata from Irmin Core API
 */
export interface IrminAPIPaginationMetadata {
  /** Total number of items */
  total: number;
  /** Number of items per page */
  per_page: number;
  /** Current page number */
  current_page: number;
  /** Last page number */
  last_page: number;
  /** URL of the first page */
  first_page_url: string;
  /** URL of the last page */
  last_page_url: string;
  /** URL of the next page */
  next_page_url: string | null;
  /** URL of the previous page */
  prev_page_url: string | null;
}

/**
 * Type for the metadata from Irmin Core API.
 * Paginated or non-paginated metadata.
 */
export type IrminAPIResponseMetadata = {
  [key: string]: unknown;
};

/**
 * Type for the response from Irmin Core API
 */
export type IrminAPIResponse<T = unknown> = {
  /** Metadata from the API response */
  metadata?: IrminAPIResponseMetadata & IrminAPIPaginationMetadata;
  /** Message from the API response */
  message?: string;
  /** Errors from the API response */
  errors?: string[];
  /** Data from the API response */
  data?: T;
};

/**
 * Type for the binary response from Core Irmin API
 */
export type IrminAPIBinaryResponse = JSONValue | Blob;
