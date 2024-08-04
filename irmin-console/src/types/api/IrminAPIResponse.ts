/**
 * Interface for the response from the Irmin API
 *
 * @see {@link https://github.com/IrminData/irmin-frontend/blob/development/src/types/examples/apiObjects.ts | examples/apiObjects.ts} - find object referencing this type to view example
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
