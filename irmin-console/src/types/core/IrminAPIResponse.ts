/**
 * Interface for the response from Core Irmin API
 *
 * @typeParam metadata - Metadata from the API response
 * @typeParam message - Message from the API response
 * @typeParam errors - Errors from the API response
 * @typeParam data - Data from the API response
 */
export interface IrminAPIResponse {
  metadata?: {
    [key: string]: string;
  };
  message?: string;
  errors?: {
    [key: string]: string[];
  };
  data?: unknown[] | unknown;
}
