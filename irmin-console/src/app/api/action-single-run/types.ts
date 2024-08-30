import { IrminFileType } from '@/types/api/Bucket';
import { DatatableRow } from '@/types/internal/Datatable';

/**
 * The type of body request to the `POST /api/action-single-run` route
 * @typeParam type - The type of file to run the action on
 * @typeParam content - The content of the file to run the action on
 */
export type ActionSingleRunRequest = {
  type: IrminFileType;
  content: string;
};

/**
 * @typeParam result - The fetched data
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.message - A message about the fetch
 * @typeParam metadata.timeTaken - The time taken to fetch the data in seconds
 * @typeParam metadata.rowsReturned - The number of rows returned
 */
export interface ActionSingleRunData {
  result: DatatableRow[];
  metadata: {
    message: string;
    timeTaken: number;
    rowsReturned: number;
  };
}

/**
 * Response object type for the `POST /api/action-single-run` route
 * @typeParam data - The fetched data {@link ActionSingleRunData}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.errors.error - The error object
 * @typeParam metadata.errors.object - The object that the error occurred on
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface ActionSingleRunResponse {
  data: ActionSingleRunData;
  metadata: {
    errors: string[];
    workspace: string;
  };
}

/**
 * Empty {@link ActionSingleRunResponse} object to use as a base for the response
 */
export const emptyActionSingleRunResponse: ActionSingleRunResponse = {
  data: {
    result: [],
    metadata: {
      message: 'Data fetched successfully',
      timeTaken: 0,
      rowsReturned: 0,
    },
  },
  metadata: {
    errors: [],
    workspace: '',
  },
};
