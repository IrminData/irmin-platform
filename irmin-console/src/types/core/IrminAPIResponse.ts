import type { JSONValue } from '@/types/internal/GenericJSON';

/**
 * Interface for the pagination metadata from Irmin Core API.
 * Supports both page-based and cursor-based pagination.
 */
export interface IrminAPIPaginationMetadata {
  /** Total number of items available (page-based pagination) */
  total?: number;
  /** Current page number (page-based pagination) */
  page?: number;
  /** Number of items per page */
  per_page?: number;
  /** Total number of pages (page-based pagination) */
  total_pages?: number;
  /** Whether there are more items available */
  has_more?: boolean;
  /** The next identifier (page number or cursor token) */
  next?: string;
  /** Cursor for the next page (cursor-based pagination) */
  nextCursor?: string | null;
  /** Limit used for the query */
  limit?: number;
}

/**
 * Type for the response from Irmin Core API
 */
export type IrminAPIResponse<T = unknown> = {
  /** Pagination metadata */
  pagination?: IrminAPIPaginationMetadata;
  /** Additional metadata from the API response (not used for pagination) */
  metadata?: { [key: string]: unknown };
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
export type IrminAPIBinaryResponse = Blob | JSONValue;
