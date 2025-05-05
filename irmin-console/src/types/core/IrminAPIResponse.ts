import { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Interface for the pagination metadata from Irmin Core API
 */
export interface IrminAPIPaginationMetadata {
  /** Total number of items available */
  total: number;
  /** Current page number */
  page?: number;
  /** Number of items per page */
  per_page: number;
  /** Total number of pages */
  total_pages: number;
  /** Whether there are more items available */
  has_more: boolean;
  /** The next identifier (page number or token) */
  next?: string;
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
  /** Pagination metadata */
  pagination?: IrminAPIPaginationMetadata;
  /** Metadata from the API response */
  metadata?: IrminAPIResponseMetadata;
  /** Message from the API response */
  message?: string;
  /** Errors from the API response */
  errors?: string[];
  /** Data from the API response */
  data?: T | null;
};

/**
 * Type for the binary response from Core Irmin API
 */
export type IrminAPIBinaryResponse = JSONValue | Blob;
